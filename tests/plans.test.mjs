import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planBenefits, planPrice, planTerm} from '../src/features/costing/utils/plans.js';

test('plan cards and payment quotes format configured prices and terms', () => {
  assert.equal(planPrice({price: 299.5, currency: 'PHP'}), '₱299.50');
  assert.equal(planTerm({duration_months: 3}), '3 months');
  assert.equal(planTerm({duration_months: 1}), '1 month');
  assert.equal(planTerm({duration_months: 0}), 'No expiry');
});
test('pricing and customer benefits preserve zero, custom limits and unlimited values', () => {
  assert.deepEqual(planBenefits({inventory_limit: 23, products_limit: null, competitor_crawl_limit: 0}), ['23 inventory records', 'Unlimited registered products', '0 Competitor Analyses (coming soon)']);
  assert.equal(planBenefits({inventory_limit: 5, products_limit: 3, competitor_crawl_limit: 1})[2], '1 Competitor Analysis (coming soon)');
});
