import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';

async function page(mode,data){
  const file='../src/features/workspace/components/AffiliatesPage.tsx';
  const {code}=await transformWithOxc(await readFile(new URL(file,import.meta.url),'utf8'),file,{jsx:{runtime:'classic'}});
  let index=0;
  const states=[data,'',1,0,false];
  const Component=vm.runInNewContext(code.replace(/^import .*;\n/gm,'').replace(/^export default /gm,'')+'\nAffiliatesPage',{
    React:{createElement:(type,props,...children)=>({type,props:props||{},children})},
    useState:()=>[states[index++],()=>{}],useEffect:()=>{},
    ArrowRight:()=>null,Copy:()=>null,RefreshCw:()=>null,UsersRound:()=>null,Wallet:()=>null,
  });
  return Component({mode,onNavigate:()=>{}});
}
function text(node){
  if(typeof node==='string'||typeof node==='number')return String(node);
  if(Array.isArray(node))return node.map(text).join(' ');
  return (node?.children||[]).map(text).join(' ');
}
const empty={balance:0,total:0,affiliate_code:'A-0123456789ABCDEF',items:[],total_pages:0};

test('wallet shows an honest zero balance and a shareable affiliate code before any confirmation',async()=>{
  const content=text(await page('wallet',empty));
  assert.match(content,/₱0\.00/);assert.match(content,/No rewards yet/);assert.match(content,/A-0123456789ABCDEF/);
});

test('affiliate records show the paid customer, discount and confirmed reward',async()=>{
  const content=text(await page('records',{...empty,balance:100,total:1,items:[{id:1,customer_name:'New Customer',customer_username:'newcustomer',payment_amount:499,discount_amount:400,reward_amount:100,created_at:'2026-11-08T08:00:00Z'}]}));
  assert.match(content,/New Customer/);assert.match(content,/₱499\.00/);assert.match(content,/₱400\.00/);assert.match(content,/₱100\.00/);
});
