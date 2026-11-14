import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

test('reviews load every server page and preserve moderation on reload using workspace authentication',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});const previousFetch=globalThis.fetch,previousSession=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:key=>key==='kostaraa.token'?'workspace-token':null};
 const rows=Array.from({length:51},(_,index)=>({id:'review-'+index,product:'Product '+index,name:'Customer',email:'private@example.test',rating:'5',text:'Good product',status:'pending',createdAt:'2026-11-14T10:00:00Z'}));const calls=[];let fail=false;
 globalThis.fetch=async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer workspace-token');calls.push({url,options});
  if(fail)return new Response(JSON.stringify({message:'Review not found.'}),{status:404});
  if(options.method==='PATCH'){const id=url.split('/').at(-1);const status=JSON.parse(options.body).status;rows.find(row=>row.id===id).status=status;return new Response(JSON.stringify({type:'success',data:{status}}))}
  const query=new URL(url).searchParams;const status=query.get('status'),page=Number(query.get('page'));return new Response(JSON.stringify({type:'success',data:rows.filter(row=>row.status===status).slice((page-1)*50,page*50)}));
 };
 try{
  const api=await server.ssrLoadModule('/src/features/sales-channel/reviews-api.js');
  let result=await api.listReviews();assert.equal(result.length,51);assert.equal(result[0].rating,5);assert.ok(calls.some(call=>call.url.includes('status=pending&page=2')));
  assert.equal(api.reviewsView(result,'pending',' product 50 ',1).filtered.length,1);
  const view=api.reviewsView(result,'pending','',99);assert.equal(view.safePage,6);assert.equal(view.start,51);assert.equal(view.end,51);
  for(const status of ['approved','rejected','pending']){await api.moderateReview('review-0',status);result=await api.listReviews();assert.equal(result.find(row=>row.id==='review-0').status,status)}
  const before=calls.length;await assert.rejects(api.moderateReview('review-0','deleted'),/valid review status/);assert.equal(calls.length,before);
  fail=true;await assert.rejects(api.moderateReview('review-0','approved'),/Review not found/);await assert.rejects(api.listReviews(),/Review not found/);
 }finally{globalThis.fetch=previousFetch;globalThis.sessionStorage=previousSession;await server.close()}
});
test('review filters search customer/comment fields, exclude other statuses, and bound empty pages',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});
 try{const {reviewsView}=await server.ssrLoadModule('/src/features/sales-channel/reviews-api.js');const rows=[{id:'1',status:'pending',name:'Maya',product:'Matcha',text:'Great taste',email:'maya@example.test'},{id:'2',status:'approved',name:'Dee',product:'Tea',text:'Excellent',email:'dee@example.test'}];assert.equal(reviewsView(rows,'all',' EXCELLENT ',1).rows[0].id,'2');assert.equal(reviewsView(rows,'pending','dee',1).rows.length,0);assert.equal(reviewsView(rows,'all','maya@example.test',1).rows[0].id,'1');const empty=reviewsView(rows,'rejected','',99);assert.equal(empty.start,0);assert.equal(empty.end,0);assert.equal(empty.safePage,1)}finally{await server.close()}
});
