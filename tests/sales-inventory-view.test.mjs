import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inventoryView,matchesInventoryFilter} from '../src/features/sales-channel/inventory-view.js';
import {mergeStoreProducts,normalizeProduct} from '../src/features/sales-channel/inventory-data.js';
const product={id:'1',name:'Matcha Latte',sku:'MATCHA-12',variant:'12 oz',sourceStatus:'active',price:95,cost:35,onHand:20,reserved:2,lowStock:5,hasStoreProduct:true,status:'Active'};
test('inventory filters keep archive separate and flag missing information and low stock',()=>{
 assert.equal(matchesInventoryFilter(product,'All active products'),true);
 assert.equal(matchesInventoryFilter(product,'Needs attention'),false);
 assert.equal(matchesInventoryFilter({...product,onHand:5},'Needs attention'),true);
 assert.equal(matchesInventoryFilter({...product,price:null},'Missing information'),true);
 assert.equal(matchesInventoryFilter({...product,sku:''},'Missing information'),true);
 assert.equal(matchesInventoryFilter({...product,sourceStatus:'archived'},'All active products'),false);
 assert.equal(matchesInventoryFilter({...product,sourceStatus:'archived'},'Needs attention'),false);
 assert.equal(matchesInventoryFilter({...product,sourceStatus:'archived'},'Archived'),true);
});
test('search trims whitespace, matches name and SKU, and pagination clamps after items change',()=>{
 const products=Array.from({length:23},(_,index)=>({...product,id:String(index),name:`Product ${index}`}));
 let view=inventoryView(products,'All active products','',2);
 assert.equal(view.start,11);assert.equal(view.end,20);assert.equal(view.rows.length,10);assert.equal(view.totalPages,3);
 view=inventoryView(products,'All active products','',99);assert.equal(view.safePage,3);assert.equal(view.start,21);assert.equal(view.end,23);
 view=inventoryView([product],'All active products',' matcha ',2);assert.equal(view.rows.length,1);assert.equal(view.safePage,1);
 assert.equal(inventoryView([product],'All active products','matcha-12',1).rows.length,1);
 view=inventoryView([product],'Archived','',1);assert.equal(view.start,0);assert.equal(view.end,0);assert.equal(view.rows.length,0);
});
test('archived library items cannot inherit an active store listing',()=>{
 const archived=normalizeProduct({id:7,item_name:'Archived product',status:'archived',target_selling_price:95});
 const [merged]=mergeStoreProducts([archived],[{product_library_item_id:7,visibility:'active',on_hand:5,reserved:0}]);
 assert.equal(merged.status,'Archived');assert.equal(merged.hasStoreProduct,false);assert.equal(merged.published,false);
});
