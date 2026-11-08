import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clearPlanIntent,paymentJourneyState,readPlanIntent,savePlanIntent} from '../src/features/workspace/plan-intent.js';

function storage() {
  const values = new Map();
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
}

test('pay-later intent survives login and stays account scoped', () => {
  const local = storage();
  savePlanIntent(local, {id: 12}, 2);
  assert.equal(readPlanIntent(local, {id: 13}), '');
  assert.equal(readPlanIntent(local, {id: 12}), '2');
  savePlanIntent(local, {id: 13}, 4);
  clearPlanIntent(local, {id: 12});
  assert.equal(readPlanIntent(local, {id: 12}), '');
  assert.equal(readPlanIntent(local, {id: 13}), '4');
});

test('payment reminders distinguish unpaid, rejected, pending, active and expired access', () => {
  const free = {plan: 'free'};
  assert.equal(paymentJourneyState(null), 'unpaid');
  assert.equal(paymentJourneyState({subscription: free, payments: [{status: 'rejected'}]}), 'unpaid');
  assert.equal(paymentJourneyState({subscription: free, payments: [{status: 'pending'}]}), 'pending');
  assert.equal(paymentJourneyState({payments: [{status: 'pending'}]}), 'pending');
  assert.equal(paymentJourneyState({subscription: {plan: 'paid', expires_at: '2099-01-01'}}), 'active');
  assert.equal(paymentJourneyState({subscription: {plan_details: {price: 899}, expires_at: '2099-01-01'}}), 'active');
  assert.equal(paymentJourneyState({subscription: {plan: 'paid', expires_at: '2000-01-01'}}), 'unpaid');
  assert.equal(paymentJourneyState({subscription: {membership_type: 'beta'}}), 'active');
});
