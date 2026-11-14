import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

test('workspace store integration persists details and stock and reloads target price from the library',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});
 const originalFetch=globalThis.fetch,originalSession=globalThis.sessionStorage;
 const calls=[];let rows=[];let price=95;
 globalThis.sessionStorage={getItem:key=>key==='kostaraa.token'?'test-token':key==='kostaraa.user'?JSON.stringify({id:41}):null};
 globalThis.fetch=async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer test-token');calls.push({url,options});
  if(url.includes('/product-library/items'))return new Response(JSON.stringify({result:[{id:7,item_name:'Matcha',item_type:'product',status:'active',total_cost_of_goods:35,target_selling_price:price}],total_rows:1}));
  if(options.method==='PUT'){
   const body=JSON.parse(options.body);assert.equal(body.price,price);assert.equal(body.name,'Matcha');
   rows=[{product_library_item_id:7,public_id:'store-7',storefront_name:body.name,description:body.description,visibility:body.visibility,sku:body.sku,on_hand:body.stock,reserved:2,low_stock:body.lowStock}];
  }
  if(options.method==='POST'){const body=JSON.parse(options.body);rows[0].on_hand+=body.direction==='add'?body.quantity:-body.quantity;}
  return new Response(JSON.stringify({type:'success',data:rows}));
 };
 try{
  const api=await server.ssrLoadModule('/src/features/sales-channel/store-api.js');
  let result=await api.loadProducts();assert.equal(result.storeAvailable,true);assert.equal(result.products[0].targetPrice,95);
  await api.saveProduct(result.products[0],{description:'Website description',visibility:'active',sku:'MATCHA',stock:10,lowStock:3});
  result=await api.loadProducts();assert.equal(result.products[0].description,'Website description');assert.equal(result.products[0].published,true);assert.equal(result.products[0].onHand,10);
  await api.adjustStock(result.products[0],{quantity:3,direction:'add'});price=110;
  result=await api.loadProducts();assert.equal(result.products[0].onHand,13);assert.equal(result.products[0].price,110);assert.equal(result.products[0].cost,35);
  await api.saveProduct(result.products[0],{visibility:'hidden',description:'Hidden listing'});
  result=await api.loadProducts();assert.equal(result.products[0].published,false);assert.equal(result.products[0].status,'Hidden');
 }finally{globalThis.fetch=originalFetch;globalThis.sessionStorage=originalSession;await server.close()}
});

test('store API failure preserves library products but disables store editing; failed writes never report success',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});
 const originalFetch=globalThis.fetch,originalSession=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:key=>key==='kostaraa.token'?'test-token':null};
 globalThis.fetch=async(url)=>url.includes('/product-library/items')?new Response(JSON.stringify({result:[{id:7,item_name:'Matcha',item_type:'product',target_selling_price:95}],total_rows:1})):new Response(JSON.stringify({message:'Activate an online sales channel first.'}),{status:409});
 try{
  const api=await server.ssrLoadModule('/src/features/sales-channel/store-api.js');
  const result=await api.loadProducts();assert.equal(result.storeAvailable,false);assert.equal(result.products[0].onHand,null);assert.equal(result.products[0].status,'Unavailable');assert.match(result.storeWarning,/Activate/);
  await assert.rejects(api.saveProduct(result.products[0],{}),/Activate/);
 }finally{globalThis.fetch=originalFetch;globalThis.sessionStorage=originalSession;await server.close()}
});

test('unified popup adds ten stock through deployed stock endpoint rather than ignored details fields',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});
 const previousFetch=globalThis.fetch,previousSession=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:key=>key==='kostaraa.token'?'token':null};
 let stock=5;let rejectStock=false;let stockCalls=0;
 globalThis.fetch=async(url,options)=>{
  if(options.method==='PUT'){assert.equal(JSON.parse(options.body).stockAdjustment,undefined);}
  if(options.method==='POST'){
   stockCalls++;assert.ok(url.endsWith('/7/stock'));assert.deepEqual(JSON.parse(options.body),{direction:'add',quantity:10});
   if(rejectStock)return new Response(JSON.stringify({message:'Stock unavailable'}),{status:503});
   stock+=10;
  }
  return new Response(JSON.stringify({type:'success',data:[{product_library_item_id:7,on_hand:stock,reserved:0}]}));
 };
 try{
  const api=await server.ssrLoadModule('/src/features/sales-channel/store-api.js');const product={sourceId:7,name:'Product',targetPrice:95};
  const details={description:'Updated',stockAdjustment:{direction:'add',quantity:10}};
  const rows=await api.saveManagedProduct(product,details);assert.equal(rows[0].on_hand,15);assert.equal(stockCalls,1);
  rejectStock=true;
  await assert.rejects(api.saveManagedProduct(product,details),error=>{assert.equal(error.stockUnconfirmed,true);assert.equal(error.savedRows[0].on_hand,15);return /could not be confirmed/.test(error.message)});
  assert.equal(stock,15);assert.equal(stockCalls,2);
 }finally{globalThis.fetch=previousFetch;globalThis.sessionStorage=previousSession;await server.close()}
});
