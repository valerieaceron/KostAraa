import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';

function find(node, predicate) {
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== 'object') return;
  return predicate(node) ? node : find(node.children, predicate);
}

test('shared success notice resets timers for new actions, bounces out, and cleans up on unmount', async () => {
  const {code} = await transformWithOxc(await readFile(new URL('../src/features/costing/components/SuccessMessage.jsx', import.meta.url), 'utf8'), 'SuccessMessage.jsx', {jsx:{runtime:'classic'}});
  const state=[], effects=[], listeners=new Map(), timers=new Map();
  let hook=0, effectIndex=0, nextTimer=0;
  const Component=vm.runInNewContext(code.replace(/^import .*;\n/gm,'').replace('export default ', '')+'\nSuccessMessage', {
    React:{createElement:(type,props,...children)=>({type,props:props||{},children})},
    useRef:()=>{const index=hook++;return state[index]??={current:0};},
    useState:initial=>{const index=hook++;if(!(index in state))state[index]=initial;return [state[index],value=>{state[index]=value;}];},
    useEffect:(callback,deps)=>{
      const index=effectIndex++, previous=effects[index];
      if (!previous || deps.some((dep,i)=>dep!==previous.deps[i])) {
        previous?.cleanup?.();effects[index]={deps,callback};
      }
    },
    window:{addEventListener:(name,callback)=>listeners.set(name,callback),removeEventListener:name=>listeners.delete(name)},
    setTimeout:(callback,delay)=>{const id=++nextTimer;timers.set(id,{callback,delay});return id;},
    clearTimeout:id=>timers.delete(id),
    successMessageEvent:'success',createPortal:value=>value,document:{body:{}},CheckCircle2:()=>{},X:()=>{},
  });
  const render=()=>{
    hook=0;effectIndex=0;const tree=Component();
    for(const effect of effects)if(effect.callback){const callback=effect.callback;effect.callback=null;effect.cleanup=callback();}
    return tree;
  };
  const runTimer=delay=>{for(const [id,timer] of [...timers])if(timer.delay===delay){timers.delete(id);timer.callback();}};
  assert.equal(render(),null);
  listeners.get('success')({detail:{title:'Material added',message:'Flour saved'}});
  let tree=render();
  assert.ok(find(tree,node=>node.type==='h2'&&node.children[0]==='Material added'));
  assert.deepEqual([...timers.values()].map(timer=>timer.delay),[2000]);
  runTimer(2000);tree=render();assert.match(tree.props.className,/is-closing/);
  assert.deepEqual([...timers.values()].map(timer=>timer.delay),[300]);
  // A new successful action during bounce-out must cancel the old removal.
  listeners.get('success')({detail:{title:'Product saved',message:'Coffee saved'}});
  tree=render();assert.doesNotMatch(tree.props.className,/is-closing/);
  assert.deepEqual([...timers.values()].map(timer=>timer.delay),[2000]);
  runTimer(2000);render();runTimer(300);assert.equal(render(),null);
  listeners.get('success')({detail:{title:'Done',message:'Saved'}});
  tree=render();find(tree,node=>node.props['aria-label']==='Dismiss success message').props.onClick();
  tree=render();assert.match(tree.props.className,/is-closing/);
  for(const effect of effects)effect.cleanup?.();
  assert.equal(timers.size,0);assert.equal(listeners.size,0);
});
