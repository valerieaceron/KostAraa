import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/features/costing/pages/Calculator.jsx', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('  const saveWithMeta = '), source.indexOf('  const resetAll = '));
function setup(onSaveItem, editingItem = null) {
  const state = {saving:false, error:'', open:true, success:null};
  const globals = {
    saving:false, product:{productName:'Iced coffee'}, editingItem, meta:{itemType:'Product'}, onSaveItem,
    setSaving:value => {state.saving=value;}, setSaveError:value => {state.error=value;},
    setSaveOpen:value => {state.open=value;},
    notifySuccess:(title,message) => {state.success={title,message};},
    finalSellingPrice:150, totalCostOfGoods:100, finalProfitPerUnit:50, finalGrossMargin:33,
    markupTopup:50, breakEvenUnits:0, suggestedSellingPrice:150, breakEvenSellingPrice:100,
    taxPercentage:0, taxMode:'exempt', finalTaxAmount:0, marketingPercentage:0,
    marketingAmount:0, hasTargetPrice:false, targetPrice:0,
  };
  const save = vm.runInNewContext(`${handler}\nsaveWithMeta`, globals);
  return {state, save, globals};
}

test('save confirmation waits for successful persistence and keeps the product name after reset', async () => {
  let finish;
  const {state, save, globals} = setup(() => new Promise(resolve => {finish=resolve;}));
  const pending = save();
  assert.equal(state.saving,true);
  assert.equal(state.success,null);
  assert.equal(state.open,true);
  globals.product={productName:''}; // Workspace clears the calculator after persistence.
  finish();await pending;
  assert.equal(state.open,false);
  assert.equal(state.success.message,'Iced coffee was saved successfully.');
  assert.equal(state.success.title,'Saved to Product Library');
  assert.equal(state.saving,false);
});

test('failed saves leave the review open and never show a success notice', async () => {
  const {state, save} = setup(async () => {throw new Error('Unable to save');});
  await save();
  assert.equal(state.error,'Unable to save');
  assert.equal(state.success,null);
  assert.equal(state.open,true);
  assert.equal(state.saving,false);
});

test('successful library edits use the update confirmation', async () => {
  const {state, save} = setup(async () => {}, {id:42});
  await save();
  assert.equal(state.success.title,'Library item updated');
  assert.equal(state.success.message,'Iced coffee was updated successfully.');
});
