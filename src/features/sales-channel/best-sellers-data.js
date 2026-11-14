export function customerLeaderboard(orders){
 const grouped=new Map();const seen=new Set();
 for(const order of orders){
  const id=String(order.serverId??order.id??'');if(!id||seen.has(id))continue;seen.add(id);
  if(order.paymentStatus!=='Paid'||!['Order Received','Processing','Waiting for Courier','In Transit','Completed'].includes(order.orderStatus)||order.fulfillmentStatus==='Returned')continue;
  const email=String(order.email||'').trim().toLowerCase();if(!email||!email.includes('@'))continue;
  const customer=grouped.get(email)||{email,name:order.customer||'Customer',orders:0,totalCents:0,lastOrder:''};
  customer.orders++;customer.totalCents+=Math.round((Number(order.total)||0)*100);
  if(String(order.placedAt||'')>=customer.lastOrder){customer.lastOrder=String(order.placedAt||'');customer.name=order.customer||customer.name}
  grouped.set(email,customer);
 }
 return [...grouped.values()].sort((a,b)=>b.orders-a.orders||b.totalCents-a.totalCents||a.email.localeCompare(b.email)).map((customer,index)=>({...customer,rank:index+1,type:customer.orders>1?'Returning':'New',total:customer.totalCents/100}));
}
export function leaderboardView(rows,query,page,pageSize=10){
 const search=query.trim().toLowerCase();const filtered=rows.filter(row=>[row.name,row.email].join(' ').toLowerCase().includes(search));
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));const safePage=Math.min(Math.max(1,page),totalPages);
 return {filtered,totalPages,safePage,rows:filtered.slice((safePage-1)*pageSize,safePage*pageSize),start:filtered.length?(safePage-1)*pageSize+1:0,end:Math.min(safePage*pageSize,filtered.length)};
}
