import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
test('workspace capability uses session auth and requires a boolean server decision',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});const previousFetch=globalThis.fetch,previousSession=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:key=>key==='kostaraa.token'?'session-token':null};let payload={type:'success',data:{allowed:true}};let status=200;
 globalThis.fetch=async(url,options)=>{assert.ok(url.endsWith('/api/sales-channel/access'));assert.equal(options.headers.Authorization,'Bearer session-token');assert.equal(options.cache,'no-store');return new Response(JSON.stringify(payload),{status})};
 try{
  const api=await server.ssrLoadModule('/src/features/sales-channel/useSalesChannelAccess.js');assert.equal(await api.fetchSalesChannelAccess(),true);
  payload={type:'success',data:{allowed:false}};assert.equal(await api.fetchSalesChannelAccess(),false);
  payload={type:'success',data:{allowed:'true'}};await assert.rejects(api.fetchSalesChannelAccess(),/could not be verified/);
  payload={message:'Not found'};status=404;await assert.rejects(api.fetchSalesChannelAccess(),/Not found/);
  for(const page of ['sales-inventory','sales-orders','sales-promotions','sales-reviews','sales-best-sellers'])assert.equal(api.isSalesChannelPage(page),true);
  for(const page of ['dashboard','inventory','products','calculator','grid'])assert.equal(api.isSalesChannelPage(page),false);
 }finally{globalThis.fetch=previousFetch;globalThis.sessionStorage=previousSession;await server.close()}
});
