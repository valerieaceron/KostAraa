import {apiJson,isOfflineUser} from '../costing/utils/api.js';
export const reviewStatuses={pending:'Pending approval',approved:'Published',rejected:'Rejected'};
async function request(path='',options={}){
 if(isOfflineUser())throw new Error('Sign in with an online Kostaraa account to manage product reviews.');
 try{const result=await apiJson('/api/sales-channel/reviews'+path,{cache:'no-store',...options});if(result.type!=='success')throw new Error('The product reviews API returned an unexpected response.');return result.data}catch(error){if(error.status===401)error.message='Your session expired. Please log in again.';throw error}
}
async function listStatus(status,signal){
 const rows=new Map();
 for(let page=1;page<=10000;page++){
  const result=await request(`?status=${status}&page=${page}`,{signal});
  if(!Array.isArray(result))throw new Error('The product reviews API returned an unexpected list.');
  for(const row of result)rows.set(row.id,{...row,rating:Number(row.rating)});
  if(result.length<50)return [...rows.values()];
 }
 throw new Error('Too many review pages. Please contact support.');
}
export async function listReviews(signal){const groups=await Promise.all(Object.keys(reviewStatuses).map(status=>listStatus(status,signal)));const rows=new Map();for(const row of groups.flat())rows.set(row.id,row);return [...rows.values()].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))}
export async function moderateReview(id,status){
 if(!Object.hasOwn(reviewStatuses,status))throw new Error('Choose a valid review status.');
 const data=await request('/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status})});
 if(data?.status!==status)throw new Error('The review status was not confirmed. Refresh before trying again.');
 return data;
}
export function reviewsView(reviews,status,query,page){
 const search=query.trim().toLowerCase();const filtered=reviews.filter(review=>(status==='all'||review.status===status)&&[review.product,review.name,review.email,review.text,review.channel].join(' ').toLowerCase().includes(search));
 const totalPages=Math.max(1,Math.ceil(filtered.length/10));const safePage=Math.min(Math.max(1,page),totalPages);
 return {filtered,totalPages,safePage,rows:filtered.slice((safePage-1)*10,safePage*10),start:filtered.length?(safePage-1)*10+1:0,end:Math.min(safePage*10,filtered.length)};
}
