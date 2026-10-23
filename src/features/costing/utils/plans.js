export const planPrice = plan => new Intl.NumberFormat('en-PH', {style: 'currency', currency: plan.currency || 'PHP', maximumFractionDigits: 2}).format(Number(plan.price));
export const planTerm = plan => Number(plan.duration_months) ? `${plan.duration_months} month${Number(plan.duration_months) === 1 ? '' : 's'}` : 'No expiry';
export const allowanceLabel = value => value === null ? 'Unlimited' : Number(value).toLocaleString();
const benefit = (value, singular, plural) => `${allowanceLabel(value)} ${value !== null && Number(value) === 1 ? singular : plural}`;
export const planBenefits = plan => [
  benefit(plan.inventory_limit, 'inventory record', 'inventory records'),
  benefit(plan.products_limit, 'registered product', 'registered products'),
  `${allowanceLabel(plan.competitor_crawl_limit)} Competitor ${plan.competitor_crawl_limit !== null && Number(plan.competitor_crawl_limit) === 1 ? 'Analysis' : 'Analyses'} (coming soon)`,
];
