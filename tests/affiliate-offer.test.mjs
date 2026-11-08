import {test} from 'node:test';
import assert from 'node:assert/strict';
import {affiliateOfferCountdown} from '../src/features/workspace/affiliate-offer.js';
const now=Date.parse('2026-11-08T08:00:00Z');

test('affiliate countdown renders three days and decrements without changing the stored deadline',()=>{
  const expires='2026-11-11T08:00:00Z';
  assert.deepEqual(affiliateOfferCountdown(expires,now),{expired:false,label:'3d 0h 0m 0s'});
  assert.equal(affiliateOfferCountdown(expires,now+1000).label,'2d 23h 59m 59s');
  assert.equal(affiliateOfferCountdown(expires,now+2*86400000).label,'1d 0h 0m 0s');
});

test('affiliate countdown expires at the exact deadline and never displays negative time',()=>{
  const expires='2026-11-11T08:00:00Z';
  const deadline=Date.parse(expires);
  assert.deepEqual(affiliateOfferCountdown(expires,deadline),{expired:true,label:'Expired'});
  assert.deepEqual(affiliateOfferCountdown(expires,deadline+1000),{expired:true,label:'Expired'});
  assert.equal(affiliateOfferCountdown(expires,deadline-1).label,'0d 0h 0m 1s');
  assert.equal(affiliateOfferCountdown('invalid',now).expired,true);
});
