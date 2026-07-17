import { formatCurrency } from './calculations';

export function buildRecommendations(product, results, business) {
  const total = results.totalVariableCost || 1;
  const packagingShare = ((product.otherCosts.packaging || 0) / total) * 100;
  const laborShare = ((product.otherCosts.labor || 0) / total) * 100;
  const fixedPressure = Number(product.fixedCosts || 0) / Math.max(1, Number(product.expectedSales || 0));
  const issues = [];

  if (results.profitMargin < 30) issues.push('Your price may be too low, or your per-unit costs are too high for a stable business.');
  if (packagingShare > 20) issues.push('Packaging is taking more than 20% of your product cost.');
  if (laborShare > 20) issues.push('Labor is a major cost driver, so batching and prep flow matter.');
  if (fixedPressure > results.grossProfit) issues.push('Fixed costs are heavy compared with your expected sales volume.');
  if (!issues.length) issues.push('Your product has a healthy margin. The next move is controlled growth.');

  return {
    summary: `${business.name || 'Your business'} is pricing ${product.productName || 'this product'} at ${formatCurrency(product.sellingPrice)} with a ${results.profitMargin.toFixed(1)}% margin.`,
    mainIssue: issues[0],
    recommendedPrice: formatCurrency(results.suggestedPrice),
    costCutting: packagingShare > 20 ? 'Review packaging suppliers or simplify cup, label, and bag choices.' : laborShare > 20 ? 'Batch production and standardize prep steps to reduce labor per unit.' : 'Keep supplier price checks monthly and protect your ingredient yield.',
    nextActions: results.profitMargin < 30
      ? ['Raise the selling price closer to the suggested price.', 'Find cheaper suppliers for the highest-cost ingredient.', 'Retest margin after every recipe or packaging change.']
      : ['Create bundles to increase average order value.', 'Track weekly sales against break-even units.', 'Prepare a simple promo plan for your strongest channel.'],
  };
}
