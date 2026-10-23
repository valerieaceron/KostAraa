import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateGridProduct, createGridProduct, createGridMaterial, gridSignature, gridStorageKey, gridValidation, selectGridMaterial} from '../src/features/costing/utils/grid-model.js';
import {buildSavedItem, calculateProduct, calculateSellingPrice} from '../src/features/costing/utils/calculations.js';
const business = {labor:{monthlyCost:2000,workingDays:20,outputPerDay:10},overhead:{rent:500,utilities:200,miscellaneous:300}};
const inventory = [{id:1,material:'Paper',itemCost:100,qty:10,baseUnit:'pcs'},{id:2,material:'Box',itemCost:50,qty:10,baseUnit:'pcs'}];
function example(){const row=createGridProduct();return {...row,name:'Sample',marketing:10,markup:50,targetPrice:80,materials:[{...row.materials[0],materialId:1,name:'Paper',usedQuantity:2},{...createGridMaterial('packaging'),materialId:2,name:'Box',usedQuantity:1}]};}
test('spreadsheet product matches calculator costing and pricing with multiple components',()=>{
 const row=example();const calc=calculateGridProduct(row,inventory,business);
 assert.equal(calc.results.materialCost,20);assert.equal(calc.results.packagingCost,5);
 assert.equal(calc.results.costBreakdown.Labor,10);assert.equal(calc.results.overheadCost,5);
 assert.equal(calc.results.totalVariableCost,40);assert.equal(calc.pricing.marketingAmount,4);
 assert.equal(calc.pricing.suggestedSellingPrice,66);assert.equal(calc.profit,36);assert.equal(calc.margin,45);
 assert.deepEqual(calc.results,calculateProduct(calc.draft,inventory));
 const regular=calculateSellingPrice({costOfGoods:40,marketingPercentage:10,markupPercentage:50,targetSellingPrice:80});
 assert.equal(calc.price,regular.targetPrice);assert.equal(calc.profit,regular.targetProfitPerUnit);
 const saved=buildSavedItem(calc.draft,calc.results,business,calc.metadata);
 assert.equal(saved.sellingPrice,80);assert.equal(saved.materials.length,1);assert.equal(saved.packagingMaterials.length,1);assert.equal(saved.pricingInputs.marketingAmount,4);
});
test('tax, markup, and chosen price are independently recalculated per product',()=>{
 const row={...example(),taxMode:'vat',taxPercentage:12,targetPrice:''};
 const calc=calculateGridProduct(row,inventory,business);
 assert.ok(Math.abs(calc.price-73.92)<1e-8);
 assert.ok(Math.abs(calc.metadata.pricing.taxAmount-7.92)<1e-8);
 assert.ok(Math.abs(calc.profit-22)<1e-8);
 assert.equal(calculateGridProduct({...row,markup:100},inventory,business).pricing.suggestedSellingPrice,98.56);
});
test('validation catches unknown inventory, incompatible units and missing business production',()=>{
 const row=example();assert.equal(gridValidation(row,inventory,business),'');
 assert.match(gridValidation({...row,name:''},inventory,business),/product name/);
 assert.match(gridValidation({...row,materials:[{...row.materials[0],materialId:'',name:'Missing'}]},inventory,business),/Inventory/);
 assert.match(gridValidation({...row,materials:[{...row.materials[0],usedUnit:'kg'}]},inventory,business),/quantity and unit/);
 assert.match(gridValidation({...row,materials:[{...row.materials[0],usedQuantity:0}]},inventory,business),/greater than zero/);
 assert.match(gridValidation(row,inventory,{...business,labor:{workingDays:20,outputPerDay:0}}),/produced per month/);
 assert.match(gridValidation({...row,taxPercentage:100},inventory,business),/below 100/);
});
test('saved row detects changes in inputs, settings and inventory; subsequent saves retain identity',()=>{
 const row=example();const calc=calculateGridProduct(row,inventory,business);const signature=gridSignature(row,calc);
 const saved={...row,savedItem:{id:123},savedSignature:signature};
 assert.equal(gridSignature(saved,calculateGridProduct(saved,inventory,business)),signature);
 assert.equal(calculateGridProduct(saved,inventory,business).metadata.existingItemId,123);
 assert.notEqual(gridSignature(saved,calculateGridProduct(saved,inventory,{...business,labor:{...business.labor,monthlyCost:4000}})),signature);
 assert.notEqual(gridSignature(saved,calculateGridProduct(saved,[{...inventory[0],itemCost:200},inventory[1]],business)),signature);
});
test('material selection resolves exact names and local drafts stay scoped to an account',()=>{
 const material=selectGridMaterial(createGridMaterial(),'paper',inventory);
 assert.equal(material.materialId,1);assert.equal(material.usedUnit,'pcs');
 assert.equal(selectGridMaterial(material,'unknown',inventory).materialId,'');
 assert.notEqual(gridStorageKey({id:1}),gridStorageKey({id:2}));assert.equal(gridStorageKey({}),null);
});
