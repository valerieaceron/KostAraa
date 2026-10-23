import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apiJson, getApiItem, getCreatedInventoryItem} from '../src/features/costing/utils/api.js';

const material = {id: '45d3a725-e778-47d1-807d-c4802c7416f5', material: 'Test flour', itemCost: 100, qty: 100, baseUnit: 'g'};

test('new and duplicated materials replace temporary IDs with the server insert ID', () => {
  for (const result of [42, '42', {id: 42}, {inventory_item_id: '42'}]) {
    const saved = getCreatedInventoryItem({type: 'success', result}, material);
    assert.equal(String(saved.id), '42');
    assert.equal(saved.material, material.material);
    assert.equal(saved.qty, 100);
    assert.equal(material.id, '45d3a725-e778-47d1-807d-c4802c7416f5');
  }
  assert.equal(getCreatedInventoryItem({data: {item: {id: 43}}}, material).id, 43);
});

test('missing or invalid creation IDs cannot silently retain a temporary UUID', () => {
  for (const result of [undefined, null, {}, [], 0, -1, true, 1.5, material.id]) {
    assert.throws(() => getCreatedInventoryItem({type: 'success', result}, material), /Refresh Inventory/);
  }
});

test('an immediate delete after creation uses the saved ID without a refresh', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.sessionStorage;
  const calls = [];
  globalThis.sessionStorage = {getItem: () => null};
  globalThis.fetch = async (url, options) => {
    calls.push({url, method: options.method});
    return {ok: true, text: async () => JSON.stringify({type: 'success', result: options.method === 'POST' ? 42 : 1})};
  };
  try {
    const data = await apiJson('/api/inventory/add', {method: 'POST', body: JSON.stringify(material)});
    const saved = getCreatedInventoryItem(data, material);
    await apiJson(`/api/inventory/delete/${encodeURIComponent(saved.id)}`, {method: 'DELETE'});
    assert.equal(calls.length, 2);
    assert.equal(new URL(calls[1].url).pathname, '/api/inventory/delete/42');
    assert.equal(calls[1].method, 'DELETE');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = originalStorage;
  }
});

test('update affected-row counts do not replace an existing database ID', () => {
  const existing = {...material, id: 42};
  const saved = {...existing, ...getApiItem({type: 'success', result: 1})};
  assert.equal(saved.id, 42);
});
