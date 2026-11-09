import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
function find(node,predicate){if(Array.isArray(node))return node.map(child=>find(child,predicate)).find(Boolean);if(!node||typeof node!=='object')return;return predicate(node)?node:find(node.children,predicate);}
function text(node){if(typeof node==='string')return node;if(Array.isArray(node))return node.map(text).join(' ');return text(node?.children||[]);}
async function form({status=null,signedIn=true,values={}}={}){
  const file='../src/features/workspace/components/AffiliateApplicationForm.tsx';
  const {code}=await transformWithOxc(await readFile(new URL(file,import.meta.url),'utf8'),file,{jsx:{runtime:'classic'}});
  const states={0:status?{status,review_note:'Please update your profiles.'}:null,1:false,...values};let hook=0;const calls=[];
  const Component=vm.runInNewContext(code.replace(/^import .*;\n/gm,'').replace(/^export default /gm,'')+'\nAffiliateApplicationForm',{
    React:{createElement:(type,props,...children)=>({type,props:props||{},children})},useState:initial=>{const index=hook++;if(!(index in states))states[index]=initial;return[states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];},useEffect:()=>{},sessionStorage:{getItem:()=>signedIn?'test-token':null},apiJson:async(path,options)=>{calls.push({path,options});return{result:{id:42,status:'pending'}};},
  });
  return{render:()=>{hook=0;return Component();},calls,states};
}
test('form asks for experience, channel-specific links, payout details and consent',async()=>{
  const f=await form({values:{7:['facebook'],8:{facebook:'https://facebook.com/example'}}});const tree=f.render();
  const content=text(tree);assert.match(content,/GCash mobile number/);assert.match(content,/15th and 30th/);assert.match(content,/Facebook\s+profile or channel link/);assert.doesNotMatch(content,/TikTok\s+profile or channel link/);
  assert.ok(find(tree,n=>n.type==='a'&&n.props.href==='/terms'));assert.ok(find(tree,n=>n.type==='a'&&n.props.href==='/privacy'));
});
test('submission uses the signed-in API and drops hidden platform answers',async()=>{
  const f=await form({values:{6:'beginner',7:['facebook'],8:{facebook:'https://facebook.com/example',tiktok:'https://tiktok.com/@hidden'},9:'09171234567',10:'Example Owner',11:true,12:true}});
  await find(f.render(),n=>n.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(f.calls[0].path,'/api/affiliates/application');const payload=JSON.parse(f.calls[0].options.body);assert.equal(payload.social_links.tiktok,undefined);assert.equal(payload.payout_agreed,true);assert.equal(payload.terms_agreed,true);assert.equal(payload.user_id,undefined);
  assert.equal(f.states[9],'');assert.equal(f.states[10],'');assert.match(text(f.render()),/Your application is under review/);
});
test('pending and approved applicants do not get a duplicate form; declined applicants can reapply',async()=>{
  for(const status of ['pending','approved']){const f=await form({status});assert.equal(find(f.render(),n=>n.type==='form'),undefined);}
  const declined=await form({status:'declined'});assert.ok(find(declined.render(),n=>n.type==='form'));assert.match(text(declined.render()),/Please update your profiles/);
  const signedOut=await form({signedIn:false});assert.equal(find(signedOut.render(),n=>n.type==='form'),undefined);assert.ok(find(signedOut.render(),n=>n.type==='a'&&n.props.href==='/login'));
});
