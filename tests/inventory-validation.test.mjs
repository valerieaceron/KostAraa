import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inventoryPurchaseErrors} from '../src/features/costing/utils/inventory-validation.js';

test('purchase costs that round to zero cannot reach the inventory API', () => {
  for (const value of ['', 0, -1, 0.0001, '0.0004', 'invalid', NaN, Infinity, '1e309', 1000000000000]) {
    assert.ok(inventoryPurchaseErrors(value, 1).itemCost, String(value));
  }
  for (const value of [0.001, '0.001', '0.004', 0.01, '0.01', 100, '125.50', 999999999999.99]) {
    assert.equal(inventoryPurchaseErrors(value, 1).itemCost, '', String(value));
  }
});

test('purchase quantities must remain positive at database precision', () => {
  for (const value of ['', 0, -1, 0.00001, 'invalid', NaN, Infinity, 10000000000]) {
    assert.ok(inventoryPurchaseErrors(1, value).qty, String(value));
  }
  for (const value of [0.0001, '0.25', 1, 9999999999.9999]) {
    assert.equal(inventoryPurchaseErrors(1, value).qty, '', String(value));
  }
});
