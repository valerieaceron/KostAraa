import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateGridProduct, createGridProduct, createGridMaterial, gridSignature, gridStorageKey, gridValidation, gridValidationIssue, libraryItemSignature, libraryItemToGridProduct, selectGridMaterial} from '../src/features/costing/utils/grid-model.js';
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
 assert.notEqual(gridStorageKey({id:1}),gridStorageKey({id:2}));assert.match(gridStorageKey({id:1}),/^kostaraa\.grid\.v3\./);assert.equal(gridStorageKey({}),null);
});
test('library records become editable grid rows without losing their identity',()=>{
 const original=example();const calculated=calculateGridProduct(original,inventory,business);
 const saved={...buildSavedItem(calculated.draft,calculated.results,business,calculated.metadata),id:'library-item-1'};
 const row=libraryItemToGridProduct(saved,inventory);
 assert.equal(row.name,'Sample');assert.equal(row.savedItem.id,'library-item-1');
 assert.equal(row.librarySignature,libraryItemSignature(saved));
 assert.equal(row.materials.filter(item=>item.kind==='material').length,1);
 assert.equal(row.materials.filter(item=>item.kind==='packaging').length,1);
 assert.equal(calculateGridProduct(row,inventory,business).metadata.existingItemId,'library-item-1');
 const suggestedOnly=libraryItemToGridProduct({...saved,sellingPrice:125,pricingInputs:{...saved.pricingInputs,targetSellingPrice:0}},inventory);
 assert.equal(suggestedOnly.targetPrice,125);
});
test('library signatures change when a saved product changes without making a grid row dirty',()=>{
 const original=example();const calculated=calculateGridProduct(original,inventory,business);
 const saved={...buildSavedItem(calculated.draft,calculated.results,business,calculated.metadata),id:'library-item-1'};
 const row=libraryItemToGridProduct(saved,inventory);
 const signature=gridSignature(row,calculateGridProduct(row,inventory,business));
 assert.equal(gridSignature({...row,librarySignature:'new-library-version'},calculateGridProduct(row,inventory,business)),signature);
 assert.notEqual(libraryItemSignature(saved),libraryItemSignature({...saved,productName:'Updated in Library'}));
});


test('field guidance identifies the exact missing field and material line, one issue at a time',()=>{
 const row=example();
 assert.equal(gridValidationIssue({...row,name:''},inventory,business).column,'name');
 const missing={...row,materials:[createGridMaterial()]};
 const issue=gridValidationIssue(missing,inventory,business);
 assert.equal(issue.column,'material');assert.equal(issue.materialIndex,0);assert.equal(issue.action,'inventory');
 assert.match(issue.hint,/Raw/);assert.match(issue.hint,/select a material/);
 const invalidQuantity={...row,materials:[row.materials[0],{...row.materials[1],usedQuantity:0}]};
 const quantityIssue=gridValidationIssue(invalidQuantity,inventory,business);
 assert.equal(quantityIssue.column,'quantity');assert.equal(quantityIssue.materialIndex,1);
 assert.equal(gridValidationIssue({...row,materials:[{...row.materials[0],usedUnit:'kg'}]},inventory,business).column,'unit');
 const noCost=gridValidationIssue(row,[{...inventory[0],itemCost:0},inventory[1]],business);
 assert.equal(noCost.inventoryId,1);assert.equal(noCost.action,'inventory');
 const noProduction=gridValidationIssue(row,inventory,{...business,labor:{workingDays:26,outputPerDay:0}});
 assert.equal(noProduction.column,'labor');assert.equal(noProduction.action,'production');
 assert.equal(gridValidationIssue({...row,platform:-1},inventory,business).column,'platform');
 assert.equal(gridValidationIssue({...row,taxPercentage:100,targetMargin:100},inventory,business).column,'taxPercentage');
 assert.equal(gridValidationIssue({...row,targetMargin:100},inventory,business).column,'targetMargin');
 assert.equal(gridValidationIssue(row,inventory,business),null);
});


test('new materials start with an empty quantity and guide users to fill it before saving',()=>{
 assert.equal(createGridProduct().materials[0].usedQuantity,'');
 assert.equal(createGridMaterial('packaging').usedQuantity,'');
 const row=example();
 for(const value of ['', ' ', null, undefined]) {
  const incomplete={...row,materials:[{...row.materials[0],usedQuantity:value}]};
  const issue=gridValidationIssue(incomplete,inventory,business);
  assert.equal(issue.column,'quantity');
  assert.equal(issue.message,'Quantity is required.');
  assert.equal(issue.materialIndex,0);
  assert.match(issue.hint,/one product/);
  assert.match(issue.hint,/pcs/);
 }
 const selected=selectGridMaterial(createGridMaterial(),'Paper',inventory);
 assert.equal(selected.usedQuantity,'');
 assert.equal(gridValidationIssue({...row,materials:[{...selected,usedQuantity:0.001}]},inventory,business),null);
 assert.equal(libraryItemToGridProduct(buildSavedItem(calculateGridProduct(row,inventory,business).draft,calculateGridProduct(row,inventory,business).results,business,calculateGridProduct(row,inventory,business).metadata),inventory).materials[0].usedQuantity,2);
});


test('marketing and markup start blank and require an explicit percentage, including zero',()=>{
 const blank=createGridProduct();
 assert.equal(blank.marketing,'');assert.equal(blank.markup,'');
 const row=example();
 for(const value of ['', ' ', null, undefined]) {
  const marketing=gridValidationIssue({...row,marketing:value},inventory,business);
  assert.equal(marketing.column,'marketing');assert.equal(marketing.message,'Marketing % is required.');
  assert.match(marketing.hint,/selling price/);assert.match(marketing.hint,/0 if none/);
  const markup=gridValidationIssue({...row,markup:value},inventory,business);
  assert.equal(markup.column,'markup');assert.equal(markup.message,'Markup % is required.');
  assert.match(markup.hint,/on top of your cost/);assert.doesNotMatch(markup.hint,/0 for no markup/);
 }
 assert.equal(gridValidationIssue({...row,marketing:'',markup:''},inventory,business).column,'marketing');
 assert.equal(gridValidationIssue({...row,marketing:0,markup:''},inventory,business).column,'markup');
 assert.equal(gridValidationIssue({...row,marketing:0,markup:0},inventory,business),null);
 assert.equal(gridValidationIssue({...row,marketing:'0',markup:'0'},inventory,business),null);
 const calculated=calculateGridProduct(row,inventory,business);
 const restored=libraryItemToGridProduct(buildSavedItem(calculated.draft,calculated.results,business,calculated.metadata),inventory);
 assert.equal(restored.marketing,10);assert.equal(restored.markup,50);
});


test('target price starts blank and points to the selling-price field when saving',()=>{
 assert.equal(createGridProduct().targetPrice,'');
 const row=example();
 for(const value of ['', ' ', null, undefined]) {
  const issue=gridValidationIssue({...row,targetPrice:value},inventory,business);
  assert.equal(issue.column,'targetPrice');
  assert.equal(issue.message,'Target price is required.');
  assert.match(issue.hint,/charge for one product/);
 }
 for(const value of [0,-1,'invalid',Infinity]) {
  const issue=gridValidationIssue({...row,targetPrice:value},inventory,business);
  assert.equal(issue.column,'targetPrice');assert.match(issue.message,/greater than 0/);
 }
 assert.equal(gridValidationIssue({...row,targetPrice:0.001},inventory,business),null);
 assert.equal(gridValidationIssue({...row,targetPrice:100},inventory,business),null);
});
