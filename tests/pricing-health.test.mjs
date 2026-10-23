import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pricingHealth,needsPricingAttention} from '../src/features/costing/utils/pricing-health.js';
test('dashboard attention and library filter include incomplete, below-target and risky products',()=>{
 const items=[
 {id:1,sellingPrice:120,costPerProduct:75,profitMargin:20},
 {id:2,sellingPrice:120,costPerProduct:75,profitMargin:20,targetProfitMargin:30},
 {id:3,sellingPrice:50,costPerProduct:75,profitMargin:-50,targetProfitMargin:30},
 {id:4,sellingPrice:120,costPerProduct:75,profitMargin:35,targetProfitMargin:30},
 {id:5,status:'Archived',sellingPrice:0},
 ];
 const dashboard=items.filter(i=>i.status!=='Archived').map(i=>({...i,pricingHealth:pricingHealth(i)})).filter(needsPricingAttention);
 const library=items.filter(needsPricingAttention);
 assert.deepEqual(library.map(i=>i.id),[1,2,3]);
 assert.deepEqual(dashboard.map(i=>i.id),library.map(i=>i.id));
});
