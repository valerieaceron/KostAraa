import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
import {receiptReferenceError,receiptValidationError} from '../src/features/marketing/lib/payment-receipt.js';
import {affiliateOfferCountdown} from '../src/features/workspace/affiliate-offer.js';
import {planPrice,planTerm} from '../src/features/costing/utils/plans.js';

async function modal({scanState='ready',reference='123456789012',validateReceipt=true,testMode=false,development=false,affiliateCode="",affiliateQuote=null,effects=[],fetch=()=>assert.fail('Must not upload an unvalidated receipt')}={}) {
  const file='../src/features/marketing/components/AnnualPaymentModal.tsx';
  const {code}=await transformWithOxc(await readFile(new URL(file,import.meta.url),'utf8'),file,{jsx:{runtime:'classic'}});
  const receipt={type:'image/png',size:100};
  const states=[['123456789012'],scanState,'',receipt,reference,'',false,'',affiliateCode,affiliateQuote,'',false];
  let hook=0,submitted=false;
  const changes=[];
  const Component=vm.runInNewContext(code.replace(/^import .*;\n/gm,'').replace(/^export /gm,'').replaceAll('import.meta.env.DEV','__DEV__')+'\nAnnualPaymentModal',{
    React:{createElement:(type,props,...children)=>({type,props:props||{},children})},
    useState:initial=>{const index=hook++;return [index<states.length?states[index]:typeof initial==='function'?initial():initial,value=>changes.push({index,value})];},
    useRef:()=>({current:null}),useEffect:effect=>effects.push(effect),useLayoutEffect:()=>{},
    X:()=>null,Upload:()=>null,Clock3:()=>null,API_BASE_URL:'http://api.test',fetch,
    __DEV__:development,sessionStorage:{getItem:()=>null},receiptReferenceError,receiptValidationError,planPrice,planTerm,affiliateOfferCountdown,
    FormData:class {fields=new Map();append(key,value) {this.fields.set(key,value);}},
  });
  return {tree:Component({validateReceipt,testMode,checkoutToken:'checkout',plan:{id:2,name:'Business Plus',price:899,duration_months:12,currency:'PHP'},instructions:{qr_url:'',account_name:''},onClose:()=>{},onSubmitted:()=>{submitted=true;}}),changes,effects,isSubmitted:()=>submitted};
}
function find(node,predicate) {
  if(!node||typeof node!=='object')return undefined;
  if(predicate(node))return node;
  return (node.children||[]).map(child=>find(child,predicate)).find(Boolean);
}

test('the payment modal blocks uploading while scanning, even if submit is triggered directly',async()=>{
  const {tree,changes}=await modal({scanState:'scanning'});
  assert.equal(find(tree,node=>node.props.className==='button annual-payment-primary').props.disabled,true);
  await find(tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.ok(changes.some(change=>typeof change.value==='string'&&change.value.includes('scan to finish')));
});

test('a reference mismatch blocks both the submit button and the submit handler',async()=>{
  const {tree,changes}=await modal({reference:'999999999999'});
  assert.equal(find(tree,node=>node.props.className==='button annual-payment-primary').props.disabled,true);
  await find(tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.ok(changes.some(change=>typeof change.value==='string'&&change.value.includes('does not match')));
});

test('a matched reference can be submitted to the existing signup checkout API',async()=>{
  let uploads=0;
  const {tree,isSubmitted}=await modal({fetch:async url=>{
    assert.equal(url,'http://api.test/api/payments/signup-checkout');uploads++;
    return {ok:true,json:async()=>({type:'success',result:{acknowledgment_email_sent:true}})};
  }});
  assert.equal(find(tree,node=>node.props.className==='button annual-payment-primary').props.disabled,false);
  await find(tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(uploads,1);assert.equal(isSubmitted(),true);
});

test('receipt scanning does not block payment forms outside the requested payment page',async()=>{
  const {tree}=await modal({validateReceipt:false,scanState:'idle'});
  assert.equal(find(tree,node=>node.props.className==='button annual-payment-primary').props.disabled,false);
});

test('development test mode skips scanning and sends the explicit test marker',async()=>{
  let uploads=0;
  const {tree}=await modal({testMode:true,development:true,scanState:'idle',fetch:async (url,options)=>{
    assert.equal(options.body.fields.get('receipt_validation_mode'),'test');uploads++;
    return {ok:true,json:async()=>({type:'success',result:{acknowledgment_email_sent:false}})};
  }});
  assert.equal(find(tree,node=>node.props.className==='button annual-payment-primary').props.disabled,false);
  assert.ok(find(tree,node=>node.props.role==='status'&&node.children.includes('Development test mode: receipt scanning is skipped.')));
  await find(tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(uploads,1);
});

test('production ignores test mode and still blocks an unscanned receipt',async()=>{
  const {tree}=await modal({testMode:true,development:false,scanState:'idle'});
  assert.equal(find(tree,node=>node.props.className==='button annual-payment-primary').props.disabled,true);
  await find(tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});
});

test('a typed affiliate code must be validated or removed before payment submission',async()=>{
  const {tree,changes}=await modal({affiliateCode:'A-0123456789ABCDEF'});
  assert.equal(find(tree,node=>node.props.className==='button annual-payment-primary').props.disabled,true);
  await find(tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.ok(changes.some(change=>typeof change.value==='string'&&change.value.includes('Apply your affiliate code')));
});

test('an approved 40% affiliate quote submits PHP 539.40 and the canonical affiliate code',async()=>{
  const code='A-0123456789ABCDEF';
  let uploads=0;
  const {tree}=await modal({affiliateCode:code,affiliateQuote:{affiliate_code:code,amount:539.4,discount_amount:359.6,discount_percent:40},fetch:async(url,options)=>{
    assert.equal(options.body.fields.get('quoted_amount'),'539.4');
    assert.equal(options.body.fields.get('affiliate_code'),code);uploads++;
    return {ok:true,json:async()=>({type:'success',result:{acknowledgment_email_sent:true}})};
  }});
  assert.equal(find(tree,node=>node.props.className==='button annual-payment-primary').props.disabled,false);
  await find(tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(uploads,1);
});

test('applying an invalid affiliate code displays the server validation message',async()=>{
  const {tree,changes}=await modal({affiliateCode:'A-FFFFFFFFFFFFFFFF',fetch:async(url,options)=>{
    assert.equal(url,'http://api.test/api/payments/signup-checkout/affiliate-quote');
    assert.equal(JSON.parse(options.body).affiliate_code,'A-FFFFFFFFFFFFFFFF');
    return {ok:false,json:async()=>({type:'error',message:'This affiliate referral code is invalid or unavailable.'})};
  }});
  await find(tree,node=>node.props.className==='annual-payment-affiliate-button').props.onClick();
  assert.ok(changes.some(change=>change.index===10&&change.value.includes('invalid or unavailable')));
});

test('an attached affiliate code cannot be edited or removed from the payment form',async()=>{
  const code='A-0123456789ABCDEF';
  const {tree}=await modal({affiliateCode:code,affiliateQuote:{affiliate_code:code,amount:539.4,discount_amount:359.6,locked:true}});
  assert.equal(find(tree,node=>node.type==='input'&&node.props.maxLength===18).props.disabled,true);
  assert.equal(find(tree,node=>node.props.className==='annual-payment-affiliate-button').props.disabled,true);
  assert.ok(find(tree,node=>node.props.className==='annual-payment-affiliate-button').children.includes('Code attached'));
});

test('an expired discount submits full price with the original affiliate still attached',async()=>{
  const code='A-0123456789ABCDEF';
  let uploaded=false;
  const {tree}=await modal({affiliateCode:code,affiliateQuote:{affiliate_code:code,amount:899,discount_amount:0,expired:true,locked:true},fetch:async(url,options)=>{
    assert.equal(options.body.fields.get('quoted_amount'),'899');
    assert.equal(options.body.fields.get('affiliate_code'),code);uploaded=true;
    return {ok:true,json:async()=>({type:'success',result:{acknowledgment_email_sent:true}})};
  }});
  await find(tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(uploaded,true);
});


test('reopening payment after pay later restores the locked code and original expiry from the API',async()=>{
  const code='A-0123456789ABCDEF';
  const calls=[];
  const quote={affiliate_code:code,amount:539.4,discount_amount:359.6,locked:true,expires_at:'2026-11-11T08:00:00.000Z',server_time:'2026-11-08T08:00:00.000Z'};
  const {effects,changes}=await modal({fetch:async(url,options)=>{
    calls.push(url);
    return {ok:true,json:async()=>({type:'success',result:options?.method==='POST'?quote:{affiliate_code:code,plan_id:2,expires_at:quote.expires_at,active:true}})};
  }});
  const cleanup=effects[0]();
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,['http://api.test/api/payments/signup-checkout/affiliate-offer','http://api.test/api/payments/signup-checkout/affiliate-quote']);
  assert.ok(changes.some(change=>change.index===8&&change.value===code));
  assert.ok(changes.some(change=>change.index===9&&change.value.expires_at===quote.expires_at));
  assert.ok(changes.some(change=>change.index===12&&change.value===true));
  cleanup();
});
