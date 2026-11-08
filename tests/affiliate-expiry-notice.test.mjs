import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
import {affiliateOfferCountdown} from '../src/features/workspace/affiliate-offer.js';
const now=Date.parse('2026-11-08T08:00:00Z');
const saved={affiliate_code:'A-0123456789ABCDEF',plan_id:2,expires_at:'2026-11-11T08:00:00Z',active:true,expired:false};
async function notice(offer,clock=now,offset=0){
  const file='../src/features/workspace/components/AffiliateExpiryNotice.tsx';
  const {code}=await transformWithOxc(await readFile(new URL(file,import.meta.url),'utf8'),file,{jsx:{runtime:'classic'}});
  let hook=0;
  const states=[offer,clock,offset];
  const Component=vm.runInNewContext(code.replace(/^import .*;\n/gm,'').replace(/^export default /gm,'')+'\nAffiliateExpiryNotice',{
    React:{createElement:(type,props,...children)=>({type,props:props||{},children})},
    useState:()=>[states[hook++],()=>{}],useEffect:()=>{},Clock3:()=>null,affiliateOfferCountdown,
  });
  return Component();
}
function content(node){if(typeof node==='string')return node;if(Array.isArray(node))return node.map(content).join(' ');return (node?.children||[]).map(content).join(' ');}

test('sidebar countdown links back to payment and accounts for client clock differences',async()=>{
  const tree=await notice(saved,now+86400000,-86400000);
  assert.equal(tree.props.href,'/workspace?page=subscription&plan=2');
  assert.match(content(tree),/3d 0h 0m 0s/);
  assert.match(content(tree),/40% discount/);
});

test('expired sidebar offers explain that the affiliate stays attached',async()=>{
  const tree=await notice(saved,Date.parse(saved.expires_at));
  assert.match(tree.props.className,/is-expired/);
  assert.match(content(tree),/affiliate stays attached/);
  assert.match(content(tree),/regular price/);
});

test('countdown notes are hidden once a receipt is submitted or the payment is confirmed',async()=>{
  assert.equal(await notice(null),null);
  assert.equal(await notice({...saved,submitted:true}),null);
  assert.equal(await notice({...saved,completed:true}),null);
});
