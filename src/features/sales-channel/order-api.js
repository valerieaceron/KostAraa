import {apiJson,apiBlob,isOfflineUser} from '../costing/utils/api.js';

export const label=value=>String(value||'').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase());
export function deliveryState(row){
 return {
  orderStatus:row.order_status==='completed'?'Completed':row.fulfillment_status==='in_transit'?'In Transit':row.fulfillment_status==='preparing'&&row.tracking_reference?'Waiting for Courier':label(row.order_status),
  fulfillmentStatus:label(row.fulfillment_status),carrierName:row.carrier_name,trackingNumber:row.tracking_reference,
  estimatedDeliveryDate:row.estimated_delivery_at?.slice?.(0,10)||null,
  confirmationStatus:row.customer_confirmation_status,customerConfirmedAt:row.customer_confirmed_at,autoCompleteAt:row.auto_complete_at,
 };
}
export function normalizeOrder(row){
 const order={id:row.order_reference,serverId:row.id,customer:row.customer_name_snapshot,email:row.customer_email_snapshot,placedAt:row.placed_at,date:row.placed_at?.slice(0,10),total:Number(row.total_amount),items:Number(row.item_count),channel:row.channel_name,paymentStatus:label(row.payment_status),delivery:label(row.fulfillment_method),...deliveryState(row)};
 if(row.payments?.length)order.payment={orderId:order.id,amount:row.payments.reduce((sum,payment)=>sum+Number(payment.amount),0),reference:row.payments.map(payment=>payment.transaction_reference).filter(Boolean).join(', '),submitted:row.payments.at(-1).submitted_at?.slice(0,10)};
 return order;
}
async function request(path,options={}){
 if(isOfflineUser())throw new Error('Sign in with an online Kostaraa account to manage live orders.');
 try{
  const result=await apiJson(`/api/sales-channel/${path}`,{cache:'no-store',...options});
  if(result.type!=='success')throw new Error('The orders API returned an unexpected response. Refresh and try again.');
  return result;
 }catch(error){if(error.status===401)error.message='Your session expired. Please log in again.';throw error}
}
export async function listOrders(signal){
 const orders=new Map();
 for(let page=1;page<=10000;page++){
  const result=await request(`orders?page=${page}`,{signal});
  if(!Array.isArray(result.data))throw new Error('The orders API returned an unexpected list.');
  for(const row of result.data)orders.set(String(row.id),normalizeOrder(row));
  if(!result.has_more||!result.data.length)return [...orders.values()];
 }
 throw new Error('Too many order pages. Please contact support.');
}
export async function orderDetails(id,signal){
 const result=await request(`orders/${encodeURIComponent(id)}/receipts`,{signal});
 if(!result.order||!Array.isArray(result.data)||!Array.isArray(result.items))throw new Error('Order details are incomplete. Please reload the order.');
 let address=result.order.delivery_address_snapshot;
 if(typeof address==='string'){try{address=JSON.parse(address)}catch{address=null}}
 return {order:result.order,address,items:result.items,receipts:result.data.map(row=>({...row,amount:Number(row.amount),status:label(row.payment_status)}))};
}
export const fetchReceipt=(id,signal)=>apiBlob(`/api/sales-channel/receipts/${encodeURIComponent(id)}`,{signal});
export async function verifyPayment(id){const result=await request(`orders/${encodeURIComponent(id)}/verify-payment`,{method:'POST'});return {orderStatus:label(result.order_status),paymentStatus:label(result.payment_status)}}
export async function updateOrderStatus(id,status){const result=await request(`orders/${encodeURIComponent(id)}/status`,{method:'PATCH',body:JSON.stringify({status})});return {orderStatus:label(result.order_status),fulfillmentStatus:label(result.fulfillment_status)}}
async function fulfillment(id,path,body){const result=await request(`orders/${encodeURIComponent(id)}/fulfillment/${path}`,{method:'POST',body:JSON.stringify(body)});if(!result.data)throw new Error('Delivery details were not returned. Refresh this order.');return deliveryState(result.data)}
export const saveOrderTracking=(id,tracking)=>fulfillment(id,'tracking',{tracking_number:tracking});
export const markOrderInTransit=(id,date)=>fulfillment(id,'in-transit',{estimated_delivery_date:date});
export const confirmOrderDelivery=(id,received)=>fulfillment(id,'confirmation',{received});
