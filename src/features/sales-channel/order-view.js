export const orderFilters=['All orders','For Payment Verification','Order Received','Payment Rejected','Processing','Waiting for Courier','In Transit','Completed','Cancelled'];
export function ordersView(orders,filter,query,page){
 const search=query.trim().toLowerCase();
 const filtered=orders.filter(order=>(filter==='All orders'||order.orderStatus===filter)&&[order.id,order.customer,order.email,order.trackingNumber].join(' ').toLowerCase().includes(search));
 const totalPages=Math.max(1,Math.ceil(filtered.length/10));const safePage=Math.min(Math.max(1,page),totalPages);
 return {filtered,totalPages,safePage,rows:filtered.slice((safePage-1)*10,safePage*10),start:filtered.length?(safePage-1)*10+1:0,end:Math.min(safePage*10,filtered.length)};
}
export function orderActions(order){
 const paid=order.paymentStatus==='Paid';const pickup=order.delivery==='Pickup';
 return {verify:order.paymentStatus==='Pending Verification'&&order.orderStatus==='For Payment Verification',
  nextStatus:paid&&pickup?({'Order Received':'processing',Processing:'completed'}[order.orderStatus]||null):null,
  tracking:paid&&!pickup&&!order.trackingNumber&&['Order Received','Processing'].includes(order.orderStatus),
  transit:paid&&!pickup&&order.orderStatus==='Waiting for Courier',
  confirmation:paid&&!pickup&&order.orderStatus==='In Transit'};
}
export function canVerifyReceipts(order,detail,images,loading){
 return orderActions(order).verify&&!loading&&Boolean(detail?.receipts.length)&&detail.receipts.every(receipt=>receipt.id&&images[receipt.id])&&detail.receipts.reduce((sum,receipt)=>sum+Math.round(receipt.amount*100),0)===Math.round(order.total*100);
}
export function manilaToday(){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));return `${parts.year}-${parts.month}-${parts.day}`}

export function orderStatusChoices(order){
 const actions=orderActions(order);
 const choices=[];
 if(actions.verify)choices.push({value:'review-payment',label:'Order Received',review:true});
 if(order.paymentStatus==='Paid'&&order.orderStatus==='Order Received')choices.push({value:'processing',label:'Processing'});
 if(actions.nextStatus==='completed')choices.push({value:'completed',label:'Completed'});
 if(actions.tracking)choices.push({value:'add-tracking',label:'Waiting for Courier',review:true});
 if(actions.transit)choices.push({value:'set-transit',label:'In Transit',review:true});
 if(actions.confirmation)choices.push({value:'confirm-delivery',label:'Completed'});
 return choices;
}
