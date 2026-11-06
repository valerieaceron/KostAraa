import {test} from 'node:test';
import assert from 'node:assert/strict';
import {featureVisitCount, recordFeatureVisit} from '../src/features/costing/utils/feature-usage.js';

test('module visits persist per account and count module entries rather than saves', () => {
  const original = globalThis.localStorage;
  const entries = new Map();
  globalThis.localStorage = {getItem:key=>entries.get(key) || null,setItem:(key,value)=>entries.set(key,value)};
  try {
    const first={id:'usage-first'},second={id:'usage-second'};
    for(let visit=1;visit<=4;visit++) {
      recordFeatureVisit('grid',first);
      assert.equal(featureVisitCount('grid',first),visit);
      assert.equal(featureVisitCount('grid',first),visit);
    }
    assert.equal(featureVisitCount('grid',second),0);
    recordFeatureVisit('inventory',first);
    recordFeatureVisit('grid',second);
    assert.equal(featureVisitCount('grid',first),4);
    assert.equal(featureVisitCount('inventory',first),1);
    assert.equal(featureVisitCount('grid',second),1);
    assert.equal(featureVisitCount('grid',{id:'usage-first'}),4);
    recordFeatureVisit('grid',{});
    assert.equal(featureVisitCount('grid',{}),0);
  } finally {
    if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;
  }
});

test('unavailable storage retains counts during the session without breaking Grid', () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = {getItem:()=>{throw new Error('Unavailable');},setItem:()=>{throw new Error('Unavailable');}};
  try {
    const user={id:'storage-unavailable'};
    for(let visit=1;visit<=4;visit++)recordFeatureVisit('grid',user);
    assert.equal(featureVisitCount('grid',user),4);
  } finally {
    if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;
  }
});
