import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {canVerifyReceipts,orderActions,ordersView} from '../src/features/sales-channel/order-view.js';
const pending={id:'ORD-1',serverId:1,customer:'Maya Cruz',email:'maya@example.test',total:100,paymentStatus:'Pending Verification',orderStatus:'For Payment Verification',delivery:'Pickup'};

test('order workflow gates payment, pickup progression, tracking and delivery actions',()=>{
 assert.equal(orderActions(pending).verify,true);assert.equal(orderActions(pending).nextStatus,null);assert.equal(orderActions({...pending,delivery:'Delivery'}).tracking,false);
 assert.equal(orderActions({...pending,paymentStatus:'Paid',orderStatus:'Order Received'}).nextStatus,'processing');
 assert.equal(orderActions({...pending,paymentStatus:'Paid',orderStatus:'Processing'}).nextStatus,'completed');
 assert.equal(orderActions({...pending,paymentStatus:'Paid',orderStatus:'Completed'}).nextStatus,null);
 const delivery={...pending,paymentStatus:'Paid',delivery:'Delivery',orderStatus:'Order Received'};
 assert.equal(orderActions(delivery).tracking,true);assert.equal(orderActions(delivery).nextStatus,null);
 assert.equal(orderActions({...delivery,orderStatus:'Waiting for Courier',trackingNumber:'JT12345'}).transit,true);
 assert.equal(orderActions({...delivery,orderStatus:'In Transit'}).confirmation,true);
 assert.equal(orderActions({...delivery,orderStatus:'Completed'}).confirmation,false);
});
test('verification requires readable receipts totaling the order amount',()=>{
 const detail={receipts:[{id:4,amount:60},{id:5,amount:40}]};const images={4:'blob:4',5:'blob:5'};
 assert.equal(canVerifyReceipts(pending,detail,images,false),true);
 for(const [data,files,loading] of [[null,images,false],[{receipts:[]},images,false],[detail,{4:'blob:4'},false],[{receipts:[{id:null,amount:100}]},images,false],[{receipts:[{id:4,amount:99}]},images,false],[detail,images,true]])assert.equal(canVerifyReceipts(pending,data,files,loading),false);
 assert.equal(canVerifyReceipts({...pending,paymentStatus:'Paid'},detail,images,false),false);
});
test('orders search and status filtering include delivery phases with bounded pagination',()=>{
 const orders=Array.from({length:24},(_,id)=>({...pending,serverId:id,id:`ORD-${id}`}));
 let view=ordersView(orders,'All orders','',3);assert.equal(view.start,21);assert.equal(view.end,24);assert.equal(view.rows.length,4);
 view=ordersView(orders,'All orders',' maya ',99);assert.equal(view.safePage,3);
 assert.equal(ordersView([{...pending,trackingNumber:'JT12345',orderStatus:'Waiting for Courier'}],'Waiting for Courier','jt12345',1).rows.length,1);
 view=ordersView(orders,'Completed','',1);assert.equal(view.start,0);assert.equal(view.end,0);
});
test('workspace order API round trip uses session auth and persists pickup and delivery transitions',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});
 const previousFetch=globalThis.fetch,previousSession=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:key=>key==='kostaraa.token'?'workspace-token':key==='kostaraa.user'?JSON.stringify({id:42}):null};
 let row={id:1,order_reference:'ORD-1',customer_name_snapshot:'Maya',total_amount:'100.00',item_count:'2',placed_at:'2026-11-14T10:00:00Z',order_status:'for_payment_verification',payment_status:'pending_verification',fulfillment_status:'unfulfilled',fulfillment_method:'pickup',payments:[{amount:'100.00',transaction_reference:'REF-1',receipt_id:4}]};
 const calls=[];
 globalThis.fetch=async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer workspace-token');calls.push({url,options});
  if(url.includes('/receipts/4'))return new Response(new Blob(['image'],{type:'image/png'}));
  if(url.includes('/orders?page='))return new Response(JSON.stringify({type:'success',data:[row],has_more:false}));
  if(url.endsWith('/orders/1/receipts'))return new Response(JSON.stringify({type:'success',order:{...row,delivery_address_snapshot:JSON.stringify({city_municipality:'Manila'})},items:[{id:1,name:'Product',quantity:2,unit_price:50,line_total:100}],data:[{payment_id:10,id:4,amount:'100.00',reference:'REF-1',payment_status:row.payment_status}]}));
  if(url.endsWith('/verify-payment')){assert.equal(options.method,'POST');row={...row,order_status:'order_received',payment_status:'paid'};return new Response(JSON.stringify({type:'success',order_status:row.order_status,payment_status:row.payment_status}))}
  if(url.endsWith('/status')){assert.equal(options.method,'PATCH');row={...row,order_status:JSON.parse(options.body).status,fulfillment_status:JSON.parse(options.body).status==='completed'?'picked_up':'preparing'};return new Response(JSON.stringify({type:'success',order_status:row.order_status,fulfillment_status:row.fulfillment_status}))}
  if(url.endsWith('/fulfillment/tracking')){row={...row,fulfillment_method:'delivery',order_status:'processing',fulfillment_status:'preparing',tracking_reference:JSON.parse(options.body).tracking_number};}
  else if(url.endsWith('/fulfillment/in-transit')){row={...row,fulfillment_status:'in_transit',estimated_delivery_at:JSON.parse(options.body).estimated_delivery_date+'T15:59:59Z'};}
  else if(url.endsWith('/fulfillment/confirmation')){const received=JSON.parse(options.body).received;row={...row,order_status:received?'completed':'processing',fulfillment_status:received?'delivered':'in_transit',customer_confirmation_status:received?'received':'not_received'};}
  else throw new Error('Unexpected request '+url);
  return new Response(JSON.stringify({type:'success',data:row}));
 };
 try{
  const api=await server.ssrLoadModule('/src/features/sales-channel/order-api.js');
  let [order]=await api.listOrders();assert.equal(order.total,100);assert.equal(order.payment.reference,'REF-1');
  const detail=await api.orderDetails(1);assert.equal(detail.address.city_municipality,'Manila');assert.equal(detail.receipts[0].amount,100);assert.equal((await api.fetchReceipt(4)).type,'image/png');
  await api.verifyPayment(1);[order]=await api.listOrders();assert.equal(order.paymentStatus,'Paid');assert.equal(order.orderStatus,'Order Received');
  await api.updateOrderStatus(1,'processing');await api.updateOrderStatus(1,'completed');[order]=await api.listOrders();assert.equal(order.fulfillmentStatus,'Picked Up');
  row={...row,fulfillment_method:'delivery',order_status:'order_received',fulfillment_status:'unfulfilled'};
  assert.equal((await api.saveOrderTracking(1,'JT123456')).orderStatus,'Waiting for Courier');
  assert.equal((await api.markOrderInTransit(1,'2026-11-20')).estimatedDeliveryDate,'2026-11-20');
  assert.equal((await api.confirmOrderDelivery(1,false)).confirmationStatus,'not_received');
  assert.equal((await api.confirmOrderDelivery(1,true)).orderStatus,'Completed');
  assert.ok(calls.some(call=>call.url.endsWith('/orders/1/verify-payment')));
 }finally{globalThis.fetch=previousFetch;globalThis.sessionStorage=previousSession;await server.close()}
});
test('order API surfaces failures instead of successful-looking mutations or empty results',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});
 const previousFetch=globalThis.fetch,previousSession=globalThis.sessionStorage;let status=409;
 globalThis.sessionStorage={getItem:key=>key==='kostaraa.token'?'token':null};
 globalThis.fetch=async()=>new Response(JSON.stringify({message:'Verify payment first.'}),{status});
 try{const api=await server.ssrLoadModule('/src/features/sales-channel/order-api.js');await assert.rejects(api.verifyPayment(1),/Verify payment first/);await assert.rejects(api.listOrders(),/Verify payment first/);status=401;await assert.rejects(api.orderDetails(1),/session expired/);await assert.rejects(api.fetchReceipt(4),/session expired/)}finally{globalThis.fetch=previousFetch;globalThis.sessionStorage=previousSession;await server.close()}
});
