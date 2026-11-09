import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
const element=(type,props,...children)=>({type,props:props||{},children});
function find(node,predicate){if(Array.isArray(node))return node.map(child=>find(child,predicate)).find(Boolean);if(!node||typeof node!=='object')return;return predicate(node)?node:find(node.children,predicate);}
function text(node){if(typeof node==='string')return node;if(Array.isArray(node))return node.map(text).join(' ');return text(node?.children||[]);}
async function source(file,name,globals){
  const {code}=await transformWithOxc(await readFile(new URL(file,import.meta.url),'utf8'),file,{jsx:{runtime:'classic'}});
  return vm.runInNewContext(code.replace(/^import .*;\n/gm,'').replace(/^export default /gm,'')+'\n'+name,{React:{createElement:element},...globals});
}
async function settings(approval="approved"){
  const states=[],navigation=[];let hook=0;
  const AffiliatesPage=()=>{},AffiliateApplication=()=>{};
  const Component=await source('../src/features/workspace/components/Subscription.tsx','Subscription',{
    useState:initial=>{const index=hook++;if(!(index in states))states[index]=index===0?(approval?{status:approval}:null):typeof initial==='function'?initial():initial;return[states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];},
    useRef:()=>({current:null}),useEffect:()=>{},URLSearchParams,location:{search:'?page=account'},
    sessionStorage:{getItem:()=>null},localStorage:{},readPlanIntent:()=>'',paymentJourneyState:()=> 'unpaid',
    AffiliatesPage,AffiliateApplication,ArrowRight:()=>{},BadgeCheck:()=>{},CreditCard:()=>{},KeyRound:()=>{},Pencil:()=>{},RefreshCw:()=>{},Send:()=>{},UserRound:()=>{},UsersRound:()=>{},Wallet:()=>{},X:()=>{},
  });
  return {render:()=>{hook=0;return Component({onNavigate:page=>navigation.push(page)});},navigation,AffiliatesPage,AffiliateApplication};
}
for(const [title,mode] of [['Wallet','wallet'],['Affiliate Referrals','records']]){
  test(`${title} opens its full embedded content directly without navigating`,async()=>{
    const f=await settings();let tree=f.render();
    find(tree,n=>n.props.className==='account-settings-list-copy'&&text(n).includes(title)).props.onClick();
    tree=f.render();
    const dialog=find(tree,n=>n.props.role==='dialog');
    assert.ok(dialog);assert.match(dialog.props.className,/is-wide.*is-affiliate/);
    const page=find(dialog,n=>n.type===f.AffiliatesPage);
    assert.equal(page.props.mode,mode);assert.equal(page.props.embedded,true);
    assert.doesNotMatch(text(dialog),/Open Affiliate Wallet|Open Affiliate Record|View Affiliate Application/);
    assert.deepEqual(f.navigation,[]);
    page.props.onNavigate(mode==='wallet'?'affiliate-records':'wallet');
    tree=f.render();
    assert.equal(find(tree,n=>n.type===f.AffiliatesPage).props.mode,mode==='wallet'?'records':'wallet');
    assert.deepEqual(f.navigation,[]);
    find(tree,n=>n.props.className==='account-modal-close').props.onClick();
    assert.equal(find(f.render(),n=>n.props.role==='dialog'),undefined);
  });
}
test('Affiliate Application opens in the modal and its back callback closes it',async()=>{
  const f=await settings(null);let tree=f.render();
  find(tree,n=>n.props.className==='account-settings-list-copy'&&text(n).includes('Affiliate Application')).props.onClick();
  tree=f.render();const application=find(tree,n=>n.type===f.AffiliateApplication);
  assert.equal(application.props.embedded,true);assert.deepEqual(f.navigation,[]);
  application.props.onBack();assert.equal(find(f.render(),n=>n.props.role==='dialog'),undefined);
});
test('embedded application retains its benefits and application links without a page-back button',async()=>{
  const icons=Object.fromEntries(['ArrowLeft','ArrowUpRight','BadgeDollarSign','ChartNoAxesCombined','Handshake','Link2','Megaphone'].map(name=>[name,()=>{}]));
  const Application=await source('../src/features/workspace/components/AffiliateApplication.tsx','AffiliateApplication',icons);
  const embedded=Application({embedded:true,onBack:()=>{}});
  assert.equal(find(embedded,n=>n.props.className==='affiliate-application-back'),undefined);
  assert.equal(find(embedded,n=>n.type==='h1'),undefined);
  assert.ok(text(embedded).includes('Earn With Every Referral.'));
  assert.equal(find(embedded,n=>n.type==='a'&&n.children.includes('Apply Now ')).props.href,'/affiliate-application');
  assert.ok(find(Application({onBack:()=>{}}),n=>n.props.className==='affiliate-application-back'));
});

test('wallet and referrals stay hidden until the server reports approval',async()=>{
  for(const status of [null,'pending','declined']){
    const f=await settings(status);const tree=f.render();
    assert.equal(find(tree,n=>n.props.className==='account-settings-list-copy'&&text(n).trim()==='Wallet'),undefined);
    assert.equal(find(tree,n=>n.props.className==='account-settings-list-copy'&&text(n).includes('Affiliate Referrals')),undefined);
    assert.ok(find(tree,n=>n.props.className==='account-settings-list-copy'&&text(n).includes('Apply for Affiliate Application')));
  }
});

test('approved affiliates see wallet and referrals without the application option',async()=>{
  const f=await settings('approved');const tree=f.render();
  assert.equal(find(tree,n=>n.props.className==='account-settings-list-copy'&&text(n).includes('Apply for Affiliate Application')),undefined);
  assert.ok(find(tree,n=>n.props.className==='account-settings-list-copy'&&text(n).trim()==='Wallet'));
  assert.ok(find(tree,n=>n.props.className==='account-settings-list-copy'&&text(n).includes('Affiliate Referrals')));
});
