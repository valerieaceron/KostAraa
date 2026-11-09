import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
import {isNewProductTourUser, productTourSteps, readProductTour, writeProductTour} from '../src/features/workspace/product-tour.js';
import {createProductTourSync} from '../src/features/workspace/product-tour-sync.js';
import {readGuideProgress} from '../src/features/workspace/getting-started.js';
const memory = () => {const values = new Map(); return {getItem:key => values.get(key) ?? null, setItem:(key,value) => values.set(key,value)};};

test('new account matching does not confuse another account or automatically tour established users', () => {
  assert.equal(isNewProductTourUser({userId:7},{id:7},{},0), true);
  assert.equal(isNewProductTourUser({userId:7},{id:8},{},0), false);
  assert.equal(Boolean(isNewProductTourUser(null,{id:8},{finished:false,skipped:false},0)), false);
  assert.equal(isNewProductTourUser(null,{id:7},{finished:true},0), true);
  assert.equal(isNewProductTourUser(null,{id:7},{finished:true},3), false);
});
test('progress resumes per account and survives malformed or unavailable storage', () => {
  const storage = memory();
  writeProductTour(storage,'user:1',4,'active');
  assert.deepEqual(readProductTour(storage,'user:1'),{index:4,status:'active'});
  assert.deepEqual(readProductTour(storage,'user:2'),{index:0,status:''});
  for(const value of ['null','bad JSON','{"index":999,"status":"completed"}']) {
    storage.setItem('user:1',value);
    const saved = readProductTour(storage,'user:1');
    assert.ok(saved.index >= 0 && saved.index < productTourSteps.length);
  }
  const unavailable={getItem(){throw Error();},setItem(){throw Error();}};
  assert.deepEqual(readProductTour(unavailable,'key'),{index:0,status:''});
  assert.doesNotThrow(() => writeProductTour(unavailable,'key',0,'dismissed'));
});

async function tour({status='',editingItem=null,newAccount=true,paused=false,remoteIndex=0,failLoad=false}={}) {
  const localStorage = memory(), sessionStorage = memory();
  const key = 'kostaraa.gettingStarted:7.product-tour';
  sessionStorage.setItem('kostaraa.user',JSON.stringify({id:7}));
  sessionStorage.setItem('kostaraa.token','test-user-token');
  if(newAccount)sessionStorage.setItem('kostaraa.signup',JSON.stringify({userId:7}));
  let remote=status?{index:remoteIndex,status}:null;
  let hook=0,refHook=0;
  const states=[],refs=[],effects=[];
  const calls=[];
  const {code}=await transformWithOxc(await readFile(new URL('../src/features/costing/pages/ProductTour.jsx',import.meta.url),'utf8'),'ProductTour.jsx',{jsx:{runtime:'classic'}});
  const component=vm.runInNewContext(code.replace(/^import .*;\n/gm,'').replace(/^export default /gm,'')+'\nProductTour',{
    React:{createElement:(type,props,...children)=>({type,props:props||{},children})},
    useState:initial=>{const index=hook++;if(!(index in states))states[index]=index===8?false:typeof initial==='function'?initial():initial;return[states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];},
    useRef:initial=>refs[refHook++]??={current:initial},useEffect:callback=>effects.push(callback),useLayoutEffect:()=>{},createPortal:value=>value,X:()=>{},
    localStorage,sessionStorage,currentGuideKey:()=> 'kostaraa.gettingStarted:7',readGuideProgress,
    isNewProductTourUser,productTourSteps,readProductTour,createProductTourSync,isOfflineUser:()=>false,
    apiJson:async(path,options)=>{calls.push({path,options});if(options.method==='PATCH'){remote=JSON.parse(options.body);return{result:remote};}if(failLoad)throw Error('offline');return{result:{progress:remote,eligible:newAccount}};},
    document:{body:{}},
  });
  const render=()=>{hook=0;refHook=0;effects.length=0;return component({root:{current:null},editingItem,savedProductCount:0,paused});};
  const initialTree=render();
  const cleanup=effects[0]();
  cleanup();effects[0](); // StrictMode must reuse the same server read.
  await new Promise(resolve=>setImmediate(resolve));
  return {render,initialTree,storage:localStorage,key,calls};
}
function find(node,predicate){if(Array.isArray(node))return node.map(child=>find(child,predicate)).find(Boolean);if(!node||typeof node!=='object')return;return predicate(node)?node:find(node.children,predicate);}

test('new accounts see the floating guide; established and editing accounts can start it manually',async()=>{
  for(const options of [{},{newAccount:false},{editingItem:{id:1}},{status:'completed'},{status:'dismissed'}]){
    const f=await tour(options);let tree=f.render();
    assert.equal(Boolean(find(tree,n=>n.props.role==='dialog')),Object.keys(options).length===0);
    find(tree,n=>n.type==='button'&&n.children.includes('Tour Guide')).props.onClick();
    tree=f.render();assert.ok(find(tree,n=>n.props.role==='dialog'));
  }
});
test('steps support back, skip, replay and finish without saving a product',async()=>{
  const f=await tour();let tree=f.render();
  find(tree,n=>n.type==='button'&&n.children.includes('Next')).props.onClick();
  tree=f.render();assert.ok(find(tree,n=>n.type==='h2').children.includes(productTourSteps[1].title));
  find(tree,n=>n.type==='button'&&n.children.includes('Back')).props.onClick();
  tree=f.render();assert.ok(find(tree,n=>n.type==='h2').children.includes(productTourSteps[0].title));
  find(tree,n=>n.type==='button'&&n.children.includes('Skip tour')).props.onClick();
  assert.equal(readProductTour(f.storage,f.key).status,'dismissed');
  tree=f.render();assert.equal(find(tree,n=>n.props.role==='dialog'),undefined);
  find(tree,n=>n.type==='button'&&n.children.includes('Tour Guide')).props.onClick();
  for(let i=0;i<productTourSteps.length-1;i++){tree=f.render();find(tree,n=>n.type==='button'&&n.children.includes('Next')).props.onClick();}
  tree=f.render();find(tree,n=>n.type==='button'&&n.children.includes('Finish tour')).props.onClick();
  assert.equal(readProductTour(f.storage,f.key).status,'completed');
});
test('guide pauses while a material or review dialog is open',async()=>{
  const f=await tour({paused:true});assert.equal(find(f.render(),n=>n.props.role==='dialog'),undefined);
});

test('server progress is loaded before showing a tour or enabling replay',async()=>{
  const f=await tour({status:'completed'});
  assert.equal(find(f.initialTree,n=>n.props.role==='dialog'),undefined);
  assert.equal(find(f.initialTree,n=>n.children?.includes('Tour Guide')).props.disabled,true);
  assert.equal(find(f.render(),n=>n.props.role==='dialog'),undefined);
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].options.headers.Authorization,'Bearer test-user-token');
});
test('a different browser resumes the server step even with no local signup marker',async()=>{
  const f=await tour({newAccount:false,status:'active',remoteIndex:5});
  assert.ok(find(f.render(),n=>n.type==='h2').children.includes(productTourSteps[5].title));
});
test('an unavailable server does not automatically repeat the tour and offers retry',async()=>{
  const f=await tour({failLoad:true});const tree=f.render();
  assert.equal(find(tree,n=>n.props.role==='dialog'),undefined);
  assert.ok(find(tree,n=>n.type==='button'&&n.children.includes('Retry')));
});
