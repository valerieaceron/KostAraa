import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {customerLeaderboard,leaderboardView} from '../src/features/sales-channel/best-sellers-data.js';
const base={serverId:1,id:'ORD-1',customer:'Maya',email:' Maya@Example.test ',paymentStatus:'Paid',orderStatus:'Completed',fulfillmentStatus:'Delivered',total:100.10,placedAt:'2026-11-14T10:00:00Z'};
test('customer leaderboard merges email case and spaces, classifies by paid orders, and deduplicates orders',()=>{
 const rows=customerLeaderboard([base,{...base},{...base,serverId:2,email:'maya@example.test',total:200.20,placedAt:'2026-11-15T10:00:00Z'},{...base,serverId:3,email:'new@example.test',customer:'New buyer',total:900}]);
 assert.equal(rows.length,2);assert.equal(rows[0].email,'maya@example.test');assert.equal(rows[0].orders,2);assert.equal(rows[0].type,'Returning');assert.equal(rows[0].total,300.30);assert.equal(rows[0].rank,1);assert.equal(rows[1].type,'New');
});
test('unpaid, cancelled, returned, and unidentifiable orders do not become customer purchases',()=>{
 assert.equal(customerLeaderboard([{...base,paymentStatus:'Pending Verification'},{...base,serverId:2,orderStatus:'Cancelled'},{...base,serverId:3,fulfillmentStatus:'Returned'},{...base,serverId:4,email:''},{...base,serverId:5,email:null}]).length,0);
 const rows=customerLeaderboard([{...base,serverId:10,email:'b@example.test',total:50},{...base,serverId:11,email:'a@example.test',total:100}]);assert.equal(rows[0].email,'a@example.test');
});
test('leaderboard pagination clamps and search handles names and emails',()=>{
 const rows=Array.from({length:22},(_,id)=>({name:`Product ${id}`}));const view=leaderboardView(rows,'',99);assert.equal(view.safePage,3);assert.equal(view.start,21);assert.equal(view.end,22);assert.equal(leaderboardView([{name:'Maya',email:'maya@example.test'}],' MAYA@EXAMPLE ',1).rows.length,1);assert.equal(leaderboardView(rows,'missing',1).start,0);
});
test('best seller endpoint uses workspace auth and preserves backend ranks and numeric metrics',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});const previousFetch=globalThis.fetch,previousSession=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:key=>key==='kostaraa.token'?'workspace-token':null};let fail=false;
 globalThis.fetch=async(url,options)=>{assert.ok(url.endsWith('/api/sales-channel/best-sellers'));assert.equal(options.headers.Authorization,'Bearer workspace-token');return fail?new Response(JSON.stringify({message:'Activate an online sales channel first.'}),{status:409}):new Response(JSON.stringify({type:'success',data:[{productId:'p1',name:'Tea',rank:1,unitsPurchased:'12',orderCount:'3'}]}))};
 try{const {listBestSellers}=await server.ssrLoadModule('/src/features/sales-channel/best-sellers-api.js');const rows=await listBestSellers();assert.equal(rows[0].unitsPurchased,12);assert.equal(rows[0].orderCount,3);assert.equal(rows[0].rank,1);fail=true;await assert.rejects(listBestSellers(),/Activate an online/)}finally{globalThis.fetch=previousFetch;globalThis.sessionStorage=previousSession;await server.close()}
});
