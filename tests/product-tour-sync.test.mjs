import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProductTourSync} from '../src/features/workspace/product-tour-sync.js';
import {readProductTour, writeProductTour} from '../src/features/workspace/product-tour.js';
const memory=()=>{const values=new Map();return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
const setup=(request,storage=memory(),key='user:7')=>({storage,key,sync:createProductTourSync({request,storage,key})});
test('a fresh browser loads remote completion or dismissal without replaying local progress',async()=>{
  for(const status of ['completed','dismissed']){
    const f=setup(async()=>({result:{progress:{index:11,status},eligible:true}}));
    const result=await f.sync.load();assert.equal(result.progress.status,status);
    assert.equal(readProductTour(f.storage,f.key).status,status);
  }
});
test('existing browser progress migrates only when it does not overwrite newer server progress',async()=>{
  const storage=memory();writeProductTour(storage,'user:7',4,'active');const writes=[];
  const f=setup(async(_,options)=>{if(!options)return{result:{progress:null,eligible:true}};writes.push(JSON.parse(options.body));return{result:writes.at(-1)};},storage);
  assert.equal((await f.sync.load()).progress.index,4);assert.equal(writes.length,1);
  const remote=setup(async()=>({result:{progress:{index:8,status:'active'},eligible:true}}),storage);
  assert.equal((await remote.sync.load()).progress.index,8);
});
test('a previously unsynced completion takes precedence over active progress',async()=>{
  const storage=memory();writeProductTour(storage,'user:7',11,'completed');let updated=false;
  const f=setup(async(_,options)=>{if(!options)return{result:{progress:{index:2,status:'active'},eligible:true}};updated=true;return{result:JSON.parse(options.body)};},storage);
  assert.equal((await f.sync.load()).progress.status,'completed');assert.equal(updated,true);
});
test('rapid steps and completion are queued and older responses cannot overwrite local completion',async()=>{
  const calls=[],resolvers=[];
  const f=setup((_,options)=>new Promise(resolve=>{calls.push(JSON.parse(options.body));resolvers.push(resolve);}));
  const first=f.sync.save({index:1,status:'active'});
  const final=f.sync.save({index:11,status:'completed'});
  await Promise.resolve();assert.equal(calls.length,1);
  resolvers[0]({result:{index:1,status:'active'}});await first;
  assert.equal(readProductTour(f.storage,f.key).status,'completed');
  await Promise.resolve();assert.equal(calls.length,2);
  resolvers[1]({result:{index:11,status:'completed'}});await final;
  assert.deepEqual(calls,[{index:1,status:'active'},{index:11,status:'completed'}]);
});
test('failed writes can retry and a manual replay preserves terminal cached status',async()=>{
  let fail=true;
  const f=setup(async(_,options)=>{if(fail)throw Error('offline');return{result:JSON.parse(options.body)};});
  await assert.rejects(f.sync.save({index:11,status:'completed'}),/offline/);
  assert.equal(readProductTour(f.storage,f.key).status,'completed');
  fail=false;await f.sync.save({index:11,status:'completed'});
  const replay=f.sync.save({index:0,status:'active'});
  assert.equal(readProductTour(f.storage,f.key).status,'completed');
  await replay;
});
test('offline accounts do not call an API and cached progress remains per user',async()=>{
  const storage=memory();const sync=createProductTourSync({storage,key:'offline:1',offline:true,request:()=>assert.fail()});
  await sync.save({index:2,status:'dismissed'});assert.equal((await sync.load()).progress.status,'dismissed');
  assert.equal(readProductTour(storage,'offline:2').status,'');
});
