import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function screen(mode,request){
 const file='../src/features/workspace/components/AffiliatesPage.tsx';
 const {code}=await transformWithOxc(await readFile(new URL(file,import.meta.url),'utf8'),file,{jsx:{runtime:'classic'}});
 const states=[null,'',1,0,false],events={},calls=[];let hook=0,effect,timer,cleared=false,interval;
 const document={visibilityState:'visible',addEventListener:(name,callback)=>{events[name]=callback;},removeEventListener:name=>{delete events[name];}};
 const Component=vm.runInNewContext(code.replace(/^import .*;\n/gm,'').replace(/^export default /gm,'')+'\nAffiliatesPage',{
  React:{createElement:(type,props,...children)=>({type,props:props||{},children})},
  useState:()=>{const index=hook++;return[states[index],value=>{states[index]=value;}];},useEffect:callback=>{effect=callback;},
  document,window:{setInterval:(callback,ms)=>{timer=callback;interval=ms;return 1;},clearInterval:()=>{cleared=true;},addEventListener:(name,callback)=>{events[name]=callback;},removeEventListener:name=>{delete events[name];}},
  apiJson:path=>{calls.push(path);return request(calls.length);},ArrowRight:()=>{},Copy:()=>{},RefreshCw:()=>{},UsersRound:()=>{},Wallet:()=>{},
 });
 Component({mode,onNavigate:()=>{}});const cleanup=effect();
 return{states,events,calls,document,cleanup,tick:()=>timer(),get interval(){return interval;},get cleared(){return cleared;}};
}
for(const mode of ['wallet','records'])test(`${mode} refreshes on focus and every 30 seconds while visible without clearing displayed data`,async()=>{
 const f=await screen(mode,async count=>({result:{balance:count===1?0:100}}));await settle();
 assert.equal(f.states[0].balance,0);assert.equal(f.interval,30000);
 const previous=f.states[0];f.events.focus();assert.equal(f.states[0],previous);await settle();assert.equal(f.states[0].balance,100);
 f.tick();await settle();assert.equal(f.calls.length,3);
 f.document.visibilityState='hidden';f.tick();await settle();assert.equal(f.calls.length,3);
 f.document.visibilityState='visible';f.events.visibilitychange();await settle();assert.equal(f.calls.length,4);
 assert.ok(f.calls.every(path=>path===`/api/affiliates/${mode}?page=1`));
 f.cleanup();assert.equal(f.cleared,true);assert.deepEqual(Object.keys(f.events),[]);
});
test('out-of-order responses and unmounted pages cannot overwrite newer wallet data',async()=>{
 const pending=[];const f=await screen('wallet',()=>new Promise(resolve=>pending.push(resolve)));
 f.events.focus();pending[1]({result:{balance:100}});await settle();pending[0]({result:{balance:0}});await settle();assert.equal(f.states[0].balance,100);
 f.events.focus();f.cleanup();pending[2]({result:{balance:200}});await settle();assert.equal(f.states[0].balance,100);
});
test('network failures retain last balance; approval failures clear restricted content',async()=>{
 const f=await screen('wallet',async count=>{if(count===1)return{result:{balance:100}};throw Object.assign(Error('Unavailable'),{status:count===3?403:503});});await settle();
 f.events.focus();await settle();assert.equal(f.states[0].balance,100);assert.equal(f.states[1],'Unavailable');
 f.events.focus();await settle();assert.equal(f.states[0],null);f.cleanup();
});
