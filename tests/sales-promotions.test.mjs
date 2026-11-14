import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {generatePromoCode,promotionStatus,promotionsView,validatePromotion} from '../src/features/sales-channel/promotions-data.js';
import {orderStatusChoices} from '../src/features/sales-channel/order-view.js';
const promotion={name:'Weekend offer',code:'TEST55',type:'percentage',discountPercent:10,startsOn:'2026-11-14',endsOn:'2026-11-16'};
test('promotions use inclusive dates and validate discount precision, dates, and duplicate codes',()=>{
 assert.equal(promotionStatus(promotion,'2026-11-13'),'Scheduled');assert.equal(promotionStatus(promotion,'2026-11-14'),'Active');assert.equal(promotionStatus(promotion,'2026-11-16'),'Active');assert.equal(promotionStatus(promotion,'2026-11-17'),'Expired');
 assert.equal(validatePromotion(promotion),'');assert.equal(validatePromotion({...promotion,discountPercent:100}),'');
 for(const discountPercent of [0,-1,101,1.123,null,''])assert.ok(validatePromotion({...promotion,discountPercent}));
 assert.ok(validatePromotion({...promotion,startsOn:'2026-02-30'}));assert.ok(validatePromotion({...promotion,endsOn:'2026-11-13'}));assert.ok(validatePromotion(promotion,[promotion]));
 assert.match(generatePromoCode([promotion]),/^[A-Z0-9]{6}$/);
});
test('promotion search and filters paginate and clamp correctly',()=>{
 const rows=Array.from({length:23},(_,index)=>({...promotion,code:String(index)}));
 const view=promotionsView(rows,'Active','weekend',3,'2026-11-14');assert.equal(view.rows.length,3);assert.equal(view.start,21);assert.equal(view.end,23);
 assert.equal(promotionsView(rows,'Scheduled','',1,'2026-11-14').start,0);
 assert.equal(promotionsView([promotion],'All promotions',' test55 ',99,'2026-11-14').safePage,1);
});
test('promotion API uses workspace auth and persists created offers on reload',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});const originalFetch=globalThis.fetch,originalSession=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:key=>key==='kostaraa.token'?'workspace-token':null};let rows=[];let failure=false;let writes=0;
 globalThis.fetch=async(url,options)=>{assert.ok(url.endsWith('/api/sales-channel/promotions'));assert.equal(options.headers.Authorization,'Bearer workspace-token');if(failure)return new Response(JSON.stringify({message:'That code already exists.'}),{status:409});if(options.method==='POST'){writes++;const body=JSON.parse(options.body);rows.unshift(body);return new Response(JSON.stringify({type:'success',data:body}))}return new Response(JSON.stringify({type:'success',data:rows}))};
 try{const api=await server.ssrLoadModule('/src/features/sales-channel/promotions-api.js');assert.equal((await api.listPromotions()).length,0);assert.equal((await api.createPromotion(promotion)).discountPercent,10);assert.equal((await api.listPromotions())[0].code,'TEST55');await assert.rejects(api.createPromotion({...promotion,discountPercent:101}),/discount/);assert.equal(writes,1);failure=true;await assert.rejects(api.createPromotion(promotion),/already exists/)}finally{globalThis.fetch=originalFetch;globalThis.sessionStorage=originalSession;await server.close()}
});
test('order status dropdown routes prerequisites to review and excludes unsupported jumps',()=>{
 const order={paymentStatus:'Paid',delivery:'Pickup',orderStatus:'Order Received'};
 assert.deepEqual(orderStatusChoices(order).map(choice=>choice.value),['processing']);
 assert.deepEqual(orderStatusChoices({...order,orderStatus:'Completed'}),[]);
 assert.equal(orderStatusChoices({...order,paymentStatus:'Pending Verification',orderStatus:'For Payment Verification'})[0].review,true);
 assert.ok(orderStatusChoices({...order,delivery:'Delivery'}).find(choice=>choice.value==='add-tracking')?.review);
 assert.equal(orderStatusChoices({...order,delivery:'Delivery',orderStatus:'In Transit'})[0].value,'confirm-delivery');
});
