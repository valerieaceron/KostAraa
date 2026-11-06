import {blankProduct} from '../data/demoData.js';
import {calculateProduct, calculateSellingPrice, getInventoryCostUnit, getInventoryUnitCost, computeInventoryMaterialCost, savedItemToProduct} from './calculations.js';

export const gridUnits = ['pcs', 'mg', 'g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz', 'mm', 'cm', 'm', 'inch', 'ft', 'yard', 'dozen', 'pack', 'box'];
export const createGridMaterial = (kind = 'material') => ({id: crypto.randomUUID(), kind, materialId: '', name: '', usedQuantity: '', usedUnit: 'pcs'});
export const createGridProduct = () => ({
  id: crypto.randomUUID(), name: '', itemType: 'Product', category: 'Other',
  materials: [createGridMaterial()], marketing: '', markup: '', targetPrice: '',
  taxMode: 'exempt', taxPercentage: 0, targetMargin: 30, platform: 0, other: 0, notes: '',
});

export function libraryItemSignature(item) {
  if (!item) return '';
  return JSON.stringify(item);
}

export function libraryItemToGridProduct(item, inventory = []) {
  const product = savedItemToProduct(item, inventory);
  const materials = [
    ...(product.ingredients || []).map(material => ({...material, id: material.id || crypto.randomUUID(), kind: 'material'})),
    ...(product.packaging || []).map(material => ({...material, id: material.id || crypto.randomUUID(), kind: 'packaging'})),
  ];
  const pricing = item.pricingInputs || {};
  const savedTargetPrice = Number(pricing.targetSellingPrice) > 0 ? Number(pricing.targetSellingPrice) : Number(item.sellingPrice) || '';
  return {
    ...createGridProduct(),
    id: `library-${String(item.id)}`,
    name: product.productName || '',
    itemType: item.itemType || 'Product',
    category: product.productCategory || item.category || 'Other',
    materials: materials.length ? materials : [createGridMaterial()],
    marketing: Number(pricing.marketingPercentage) || 0,
    markup: Number(pricing.markupTopup ?? item.markup) || 0,
    targetPrice: savedTargetPrice,
    taxMode: pricing.taxMode || 'exempt',
    taxPercentage: Number(pricing.taxPercentage) || 0,
    targetMargin: Number(item.targetProfitMargin ?? product.targetMargin) || 0,
    platform: Number(product.otherCosts?.platform) || 0,
    other: Number(product.otherCosts?.other) || 0,
    notes: item.notes || '',
    savedItem: item,
    librarySignature: libraryItemSignature(item),
  };
}

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

export function gridValidationIssue(row, inventory, business) {
  const issue = (column, message, extra = {}) => ({column, message, ...extra});
  if (!row.name.trim()) return issue('name', 'Enter a product name.');
  if (!row.materials.some(material => material.materialId)) return issue('material', 'Choose a material from Inventory.', {materialIndex: 0, action: 'inventory', hint: 'Choose Raw or Pack, then select a material from the list. If it’s missing, add it below.'});
  for (const [materialIndex, material] of row.materials.entries()) {
    const extra = {materialIndex};
    if (!material.materialId && material.name.trim()) return issue('material', `Choose “${material.name}” from Inventory first.`, {...extra, action: 'inventory'});
    if (!material.materialId) continue;
    const item = inventory.find(entry => String(entry.id) === String(material.materialId));
    if (!item) return issue('material', `${material.name || 'A material'} is no longer in Inventory.`, {...extra, action: 'inventory'});
    if (!String(material.usedQuantity ?? '').trim()) return issue('quantity', 'Quantity is required.', {...extra, hint: `Quantity is required. Enter how much ${material.name || item.material} you use for one product, measured in ${material.usedUnit}.`});
    if (!Number.isFinite(Number(material.usedQuantity)) || Number(material.usedQuantity) <= 0) return issue('quantity', 'Material quantities must be greater than zero.', {...extra, hint: `Enter how much ${material.name || item.material} you use for one product, measured in ${material.usedUnit}. Use a number greater than 0.`});
    if (!(getInventoryUnitCost(item) > 0)) return issue('material', `Add a purchase cost and quantity for ${item.material} in Inventory.`, {...extra, action: 'inventory', inventoryId: item.id});
    if (!(computeInventoryMaterialCost(material, inventory) > 0)) return issue('unit', `Check the quantity and unit for ${item.material}.`, {...extra, hint: `Choose a unit that matches this material (${getInventoryCostUnit(item)}).`});
  }
  if (!((Number(business.labor?.workingDays) || 0) * (Number(business.labor?.outputPerDay) || 0) > 0)) return issue('labor', 'Set items produced per month in Business Settings.', {action: 'production', hint: 'Add your production quantity to calculate labor and operating costs.'});
  if (!String(row.marketing ?? '').trim()) return issue('marketing', 'Marketing % is required.', {hint: 'Marketing % is required. Enter the percentage of your selling price to set aside for marketing, including product discounts and promotions, or 0 if none.'});
  if (!String(row.markup ?? '').trim()) return issue('markup', 'Markup % is required.', {hint: 'Markup % is required. Enter the percentage to add on top of your cost to earn a profit.'});
  if (!String(row.targetPrice ?? '').trim()) return issue('targetPrice', 'Target price is required.', {hint: 'Target price is required. Enter the price you plan to charge for one product.'});
  if (!Number.isFinite(Number(row.targetPrice)) || Number(row.targetPrice) <= 0) return issue('targetPrice', 'Target price must be greater than 0.', {hint: 'Enter the price you plan to charge for one product. Use a number greater than 0.'});
  for (const field of ['marketing', 'markup', 'targetPrice', 'taxPercentage', 'targetMargin', 'platform', 'other']) {
    if (!Number.isFinite(Number(row[field])) || Number(row[field]) < 0) return issue(field, 'Enter 0 or a number greater than 0.');
  }
  if (Number(row.taxPercentage) >= 100) return issue('taxPercentage', 'Enter a percentage below 100%.');
  if (Number(row.targetMargin) >= 100) return issue('targetMargin', 'Enter a percentage below 100%.');
  return null;
}

export function gridValidation(row, inventory, business) {
  return gridValidationIssue(row, inventory, business)?.message || '';
}

export function gridStorageKey(user) {
  const id = user?.id || user?.username || user?.email;
  return id ? `kostaraa.grid.v3.${encodeURIComponent(String(id))}` : null;
}

export function gridSignature(row, calculated) {
  const {savedItem, savedSignature, librarySignature, ...inputs} = row;
  // Compare the saved business cost basis as well as the editable cells.
  return JSON.stringify([inputs, calculated.draft, calculated.results, calculated.metadata.pricing]);
}
