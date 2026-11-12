import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readInventoryTour, writeInventoryTour} from '../src/features/workspace/inventory-tour.js';
import {guideStorageKey} from '../src/features/workspace/getting-started.js';

test('inventory progress is separate for each account and from product tour progress', () => {
  const values = new Map();
  const storage = {getItem:key => values.get(key), setItem:(key,value) => values.set(key,value)};
  const first = `${guideStorageKey({id:1})}.inventory-tour`;
  const second = `${guideStorageKey({id:2})}.inventory-tour`;
  writeInventoryTour(storage, first, 4, 'completed');
  assert.deepEqual(readInventoryTour(storage, first), {index:4, status:'completed'});
  assert.deepEqual(readInventoryTour(storage, second), {index:0, status:''});
  assert.deepEqual(readInventoryTour(storage, first.replace('inventory-tour','product-tour')), {index:0, status:''});
});

test('inventory tour tolerates invalid storage and clamps progress when measurement step is absent', () => {
  for (const value of ['invalid', 'null', '{"index":-3,"status":"unknown"}']) {
    assert.deepEqual(readInventoryTour({getItem:() => value}, 'tour'), {index:0, status:''});
  }
  assert.deepEqual(readInventoryTour({getItem:() => '{"index":20,"status":"active"}'}, 'tour', 6), {index:5, status:'active'});
  const blocked = {getItem:() => {throw new Error('blocked');}, setItem:() => {throw new Error('blocked');}};
  assert.deepEqual(readInventoryTour(blocked, 'tour'), {index:0, status:''});
  assert.doesNotThrow(() => writeInventoryTour(blocked, 'tour', 0, 'dismissed'));
});
