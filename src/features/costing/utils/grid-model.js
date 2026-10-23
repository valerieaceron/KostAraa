import {blankProduct} from '../data/demoData.js';
import {calculateProduct, calculateSellingPrice, getInventoryCostUnit, getInventoryUnitCost, computeInventoryMaterialCost} from './calculations.js';

export const gridUnits = ['pcs', 'mg', 'g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz', 'mm', 'cm', 'm', 'inch', 'ft', 'yard', 'dozen', 'pack', 'box'];
export const createGridMaterial = (kind = 'material') => ({id: crypto.randomUUID(), kind, materialId: '', name: '', usedQuantity: 1, usedUnit: 'pcs'});
export const createGridProduct = () => ({
  id: crypto.randomUUID(), name: '', itemType: 'Product', category: 'Other',
  materials: [createGridMaterial()], marketing: 0, markup: 50, targetPrice: '',
  taxMode: 'exempt', taxPercentage: 0, targetMargin: 30, platform: 0, other: 0, notes: '',
});

export function selectGridMaterial(row, text, inventory) {
  const item = inventory.find(entry => String(entry.material || '').toLowerCase() === text.trim().toLowerCase());
  return {...row, name: text, materialId: item?.id ?? '', usedUnit: item ? getInventoryCostUnit(item) : row.usedUnit};
}

export function calculateGridProduct(row, inventory, business) {
  const draft = {
    ...blankProduct, productName: row.name.trim(), productCategory: row.category,
    targetMargin: Number(row.targetMargin),
    ingredients: row.materials.filter(material => material.kind === 'material' && material.materialId),
    packaging: row.materials.filter(material => material.kind === 'packaging' && material.materialId),
    labor: {...business.labor}, overhead: {...business.overhead},
    otherCosts: {...blankProduct.otherCosts, platform: Number(row.platform) || 0, other: Number(row.other) || 0},
  };
  const results = calculateProduct(draft, inventory);
  const pricing = calculateSellingPrice({costOfGoods: results.totalVariableCost, marketingPercentage: row.marketing, markupPercentage: row.markup,
    taxMode: row.taxMode, taxPercentage: row.taxPercentage, targetSellingPrice: row.targetPrice});
  const hasTarget = Number(row.targetPrice) > 0;
  const price = hasTarget ? pricing.targetPrice : pricing.suggestedSellingPrice;
  const profit = hasTarget ? pricing.targetProfitPerUnit : pricing.profitPerUnit;
  const margin = hasTarget ? pricing.targetGrossMargin : pricing.grossMargin;
  const breakEvenUnits = profit > 0 ? Math.ceil(results.overheadMonthly / profit) : null;
  const metadata = {
    itemType: row.itemType, category: row.category || 'Other', status: 'Active', notes: row.notes,
    existingItemId: row.savedItem?.id,
    pricing: {sellingPrice: price, costPerProduct: results.totalVariableCost, grossProfit: profit, profitMargin: margin,
      markup: Number(row.markup), breakEvenUnits: breakEvenUnits ?? 0, suggestedSellingPrice: pricing.suggestedSellingPrice,
      breakEvenSellingPrice: pricing.breakEvenSellingPrice, taxMode: row.taxMode, taxPercentage: Number(row.taxPercentage),
      taxAmount: hasTarget ? pricing.targetTaxAmount : pricing.taxAmount, marketingPercentage: Number(row.marketing),
      marketingAmount: pricing.marketingAmount, targetSellingPrice: Number(row.targetPrice) || 0},
  };
  return {draft, results, pricing, price, profit, margin, breakEvenUnits, metadata};
}

export function gridValidation(row, inventory, business) {
  if (!row.name.trim()) return 'Enter a product name.';
  if (!row.materials.some(material => material.materialId)) return 'Choose a material from Inventory.';
  for (const material of row.materials) {
    if (!material.materialId && material.name.trim()) return `Choose “${material.name}” from Inventory first.`;
    if (!material.materialId) continue;
    const item = inventory.find(entry => String(entry.id) === String(material.materialId));
    if (!item) return `${material.name || 'A material'} is no longer in Inventory.`;
    if (!Number.isFinite(Number(material.usedQuantity)) || Number(material.usedQuantity) <= 0) return 'Material quantities must be greater than zero.';
    if (!(getInventoryUnitCost(item) > 0)) return `Add a purchase cost and quantity for ${item.material} in Inventory.`;
    if (!(computeInventoryMaterialCost(material, inventory) > 0)) return `Check the quantity and unit for ${item.material}.`;
  }
  if (!((Number(business.labor?.workingDays) || 0) * (Number(business.labor?.outputPerDay) || 0) > 0)) return 'Set items produced per month in Business Settings.';
  for (const field of ['marketing', 'markup', 'targetPrice', 'taxPercentage', 'targetMargin', 'platform', 'other']) {
    if (!Number.isFinite(Number(row[field])) || Number(row[field]) < 0) return 'Prices, costs and percentages must be positive or zero.';
  }
  if (Number(row.taxPercentage) >= 100 || Number(row.targetMargin) >= 100) return 'Tax and target margin must be below 100%.';
  return '';
}

export function gridStorageKey(user) {
  const id = user?.id || user?.username || user?.email;
  return id ? `kostaraa.grid.v2.${encodeURIComponent(String(id))}` : null;
}

export function gridSignature(row, calculated) {
  const {savedItem, savedSignature, ...inputs} = row;
  // Compare the saved business cost basis as well as the editable cells.
  return JSON.stringify([inputs, calculated.draft, calculated.results, calculated.metadata.pricing]);
}
