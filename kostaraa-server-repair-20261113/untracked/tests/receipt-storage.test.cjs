const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const crypto=require('node:crypto');
const image=Buffer.from('private receipt bytes');const digest=crypto.createHash('sha256').update(image).digest('hex');
const proof={id:4,business_profile_id:15,mime_type:'image/jpeg',file_path:'private-sales-channel-receipts/a189c172-5a8e-4d72-8a10-c059bd67a9ee'};
function storage({stored=null,missing=false}={}){
 const module={exports:{}};const calls=[];let reads=0;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../helpers/receipt_storage.js'),'utf8'),{module,exports:module.exports,Buffer,process:{env:{}},__dirname:path.join(__dirname,'../helpers'),require(name){if(name==='node:fs/promises')return {readFile:async()=>{reads++;if(missing)throw Object.assign(new Error('missing'),{code:'ENOENT'});return image;}};return require(name);}});
 const connection={execute:async(sql,values)=>{calls.push({sql,values});return sql.startsWith('SELECT')?[[...(stored?[stored]:[])]]:[{affectedRows:1}];}};
 return {...module.exports,connection,calls,reads:()=>reads};
}
test('durable receipt bytes load without needing the deployment filesystem',async()=>{
 const s=storage({stored:{content:image,sha256:digest},missing:true});assert.deepEqual(await s.readReceipt(s.connection,proof),image);assert.equal(s.reads(),0);assert.deepEqual(Array.from(s.calls[0].values),[4,15]);
});
test('legacy receipt is copied into private database storage before being returned',async()=>{
 const s=storage();assert.deepEqual(await s.readReceipt(s.connection,proof),image);assert.equal(s.calls.length,2);assert.match(s.calls[1].sql,/INSERT INTO sales_channel_payment_proof_files/);assert.equal(s.calls[1].values[0],4);assert.equal(s.calls[1].values[1],15);assert.equal(s.calls[1].values[3],digest);
});
test('missing original is reported without substituting another image',async()=>{
 const s=storage({missing:true});assert.equal(await s.readReceipt(s.connection,proof),null);assert.equal(s.calls.length,1);
});
test('invalid paths and MIME types cannot read arbitrary files',async()=>{
 const s=storage();assert.equal(await s.readReceipt(s.connection,{...proof,file_path:'../../.env'}),null);assert.equal(s.reads(),0);assert.equal(await s.readReceipt(s.connection,{...proof,mime_type:'text/html'}),null);
});
test('corrupt durable content is rejected',async()=>{
 const s=storage({stored:{content:image,sha256:'wrong'}});await assert.rejects(s.readReceipt(s.connection,proof),/integrity/);
});
test('new receipt storage is bounded and includes a checksum',async()=>{
 const s=storage();await s.saveReceipt(s.connection,4,15,image);assert.equal(s.calls[0].values[3],digest);await assert.rejects(s.saveReceipt(s.connection,4,15,Buffer.alloc(0)),/size/);await assert.rejects(s.saveReceipt(s.connection,4,15,Buffer.alloc(5*1024*1024+1)),/size/);
});
function controller(row){
 const exports={};let storageCalls=0;let sql;const c={execute:async(query)=>{sql=query;return [[...(row?[row]:[])]];}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../controllers/sales_channel_orders.js'),'utf8'),{exports,process:{env:{}},console,require(name){if(name==='node:path')return path;if(name==='../config/database')return {};if(name==='../helpers')return {withTransaction:async(_,fn)=>fn(c)};if(name==='../helpers/receipt_storage')return {readReceipt:async()=>{storageCalls++;return image;}};throw new Error(name);}});
 const response={code:200,headers:{},set(headers){Object.assign(this.headers,headers);return this;},status(code){this.code=code;return this;},type(type){this.mime=type;return this;},send(body){this.body=body;return this;},json(body){this.body=body;return this;},sendStatus(code){this.code=code;return this;}};
 return{async request(){await exports.receipt({params:{id:'4'},decoded:{id:43}},response);return response;},storageCalls:()=>storageCalls,sql:()=>sql};
}
test('receipt endpoint keeps owner-scoped authentication and private cache headers',async()=>{
 const c=controller(proof);const r=await c.request();assert.equal(r.code,200);assert.equal(r.headers['Cache-Control'],'private, no-store');assert.equal(r.headers['X-Content-Type-Options'],'nosniff');assert.equal(r.mime,'image/jpeg');assert.deepEqual(r.body,image);assert.match(c.sql(),/b\.user_id=\?/);
});
test('unowned receipt never reaches private storage',async()=>{
 const c=controller(null);assert.equal((await c.request()).code,404);assert.equal(c.storageCalls(),0);
});
