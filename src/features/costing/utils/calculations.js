const unitBase = {
  mg: { family: 'weight', factor: 0.001, base: 'g' },
  g: { family: 'weight', factor: 1, base: 'g' },
  gram: { family: 'weight', factor: 1, base: 'g' },
  grams: { family: 'weight', factor: 1, base: 'g' },
  kg: { family: 'weight', factor: 1000, base: 'g' },
  oz: { family: 'weight', factor: 28.349523125, base: 'g' },
  lb: { family: 'weight', factor: 453.59237, base: 'g' },
  ml: { family: 'volume', factor: 1, base: 'ml' },
  l: { family: 'volume', factor: 1000, base: 'ml' },
  liter: { family: 'volume', factor: 1000, base: 'ml' },
  tsp: { family: 'volume', factor: 5, base: 'ml' },
  tbsp: { family: 'volume', factor: 15, base: 'ml' },
  cup: { family: 'volume', factor: 240, base: 'ml' },
  'fl oz': { family: 'volume', factor: 29.5735295625, base: 'ml' },
  mm: { family: 'length', factor: 1, base: 'mm' },
  cm: { family: 'length', factor: 10, base: 'mm' },
  m: { family: 'length', factor: 1000, base: 'mm' },
  inch: { family: 'length', factor: 25.4, base: 'mm' },
  ft: { family: 'length', factor: 304.8, base: 'mm' },
  yard: { family: 'length', factor: 914.4, base: 'mm' },
  pcs: { family: 'count', factor: 1, base: 'pcs' },
  dozen: { family: 'count', factor: 12, base: 'pcs' },
};
const unitMeta = (unit, item) => {
  const normalized = String(unit || 'pcs').trim().toLowerCase();
  if (normalized === 'pack' || normalized === 'box') return { family: 'count', factor: Number(item?.piecesPerUnit) || 1, base: 'pcs' };
  return unitBase[normalized] || unitBase.pcs;
};

export function calculateSellingPrice({
  costOfGoods = 0,
  marketingPercentage = 0,
  markupPercentage = 0,
  taxMode = 'exempt',
  taxPercentage = 0,
  targetSellingPrice = 0,
} = {}) {
  const cogs = Math.max(0, Number(costOfGoods) || 0);
  const marketingRate = Math.max(0, Number(marketingPercentage) || 0) / 100;
  const markupRate = Math.max(0, Number(markupPercentage) || 0) / 100;
  const taxRate = Math.min(0.9999, Math.max(0, Number(taxPercentage) || 0) / 100);
  const marketingAmount = cogs * marketingRate;
  const priceBeforeMarkup = cogs + marketingAmount;
  const priceBeforeTax = priceBeforeMarkup * (1 + markupRate);
  const isVat = taxMode === 'vat';
  const addTax = (netPrice) => (isVat ? netPrice * (1 + taxRate) : netPrice / (1 - taxRate));
  const extractTax = (customerPrice) => (isVat ? customerPrice - customerPrice / (1 + taxRate) : customerPrice * taxRate);
  const suggestedSellingPrice = addTax(priceBeforeTax);
  const breakEvenSellingPrice = addTax(priceBeforeMarkup);
  const taxAmount = extractTax(suggestedSellingPrice);
  const profitPerUnit = suggestedSellingPrice - priceBeforeMarkup - taxAmount;
  const grossMargin = suggestedSellingPrice > 0 ? (profitPerUnit / suggestedSellingPrice) * 100 : 0;
  const targetPrice = Math.max(0, Number(targetSellingPrice) || 0);
  const targetTaxAmount = extractTax(targetPrice);
  const targetProfitPerUnit = targetPrice - priceBeforeMarkup - targetTaxAmount;
  const targetGrossMargin = targetPrice > 0 ? (targetProfitPerUnit / targetPrice) * 100 : 0;

  return {
    marketingAmount,
    priceBeforeMarkup,
    priceBeforeTax,
    suggestedSellingPrice,
    breakEvenSellingPrice,
    taxAmount,
    profitPerUnit,
    grossMargin,
    targetPrice,
    targetTaxAmount,
    targetProfitPerUnit,
    targetGrossMargin,
    targetDifference: targetPrice - suggestedSellingPrice,
  };
}

export function computeIngredientCost(row) {
  const purchaseMeta = unitBase[row.unit] || unitBase.pcs;
  const usedMeta = unitBase[row.usedUnit || row.unit] || purchaseMeta;
  const purchaseQuantity = Number(row.purchaseQuantity) || 0;
  const purchaseCost = Number(row.purchaseCost) || 0;
  const usedQuantity = Number(row.usedQuantity) || 0;
  const basePurchaseQty = purchaseQuantity * purchaseMeta.factor;
  const baseUsedQty = usedQuantity * usedMeta.factor;

  if (!basePurchaseQty || purchaseMeta.family !== usedMeta.family) return 0;
  return (purchaseCost / basePurchaseQty) * baseUsedQty;
}

export function getInventoryUnitCost(item) {
  const qty = Number(item?.qty) || 0;
  const purchaseMeta = unitMeta(item?.baseUnit, item);
  const canonicalQty = qty * purchaseMeta.factor;
  if (!canonicalQty) return 0;
  return (Number(item.itemCost) || 0) / canonicalQty;
}

export function getInventoryCostUnit(item) {
  return unitMeta(item?.baseUnit, item).base;
}

export function computeInventoryMaterialCost(row, inventory = []) {
  const material = inventory.find((item) => item.id === row.materialId) || inventory.find((item) => item.material === row.name);
  if (!material) return (Number(row.unitCost) || 0) * (Number(row.usedQuantity) || 0);
  const purchaseMeta = unitMeta(material.baseUnit, material);
  const usedMeta = unitMeta(row.usedUnit || material.baseUnit, material);
  const purchaseQty = (Number(material.qty) || 0) * purchaseMeta.factor;
  const usedQty = (Number(row.usedQuantity) || 0) * usedMeta.factor;
  if (!purchaseQty || !usedQty) return 0;
  if (purchaseMeta.family === usedMeta.family) return ((Number(material.itemCost) || 0) / purchaseQty) * usedQty;
  const gramsPerCup = Number(material.gramsPerCup) || 0;
  if (gramsPerCup > 0 && purchaseMeta.family === 'weight' && usedMeta.family === 'volume') {
    const gramsUsed = (usedQty / 240) * gramsPerCup;
    return ((Number(material.itemCost) || 0) / purchaseQty) * gramsUsed;
  }
  if (gramsPerCup > 0 && purchaseMeta.family === 'volume' && usedMeta.family === 'weight') {
    const mlUsed = (usedQty / gramsPerCup) * 240;
    return ((Number(material.itemCost) || 0) / purchaseQty) * mlUsed;
  }
  return 0;
}

export function calculateProduct(product, inventory = []) {
  const hydrateInventoryRow = (item) => {
    const material = inventory.find((inventoryItem) => inventoryItem.id === item.materialId);
    return {
      ...item,
      name: material?.material || item.name,
      unitCost: getInventoryUnitCost(material) || Number(item.unitCost) || 0,
      computedCost: item.materialId ? computeInventoryMaterialCost(item, inventory) : computeIngredientCost(item),
    };
  };
  const ingredientRows = (product.ingredients || []).map((item) => ({
    ...hydrateInventoryRow(item),
  }));
  const packagingRows = (product.packaging || []).map((item) => hydrateInventoryRow(item));
  const materialCost = ingredientRows.reduce((sum, item) => sum + item.computedCost, 0);
  const packagingRowCost = packagingRows.reduce((sum, item) => sum + item.computedCost, 0);
  const otherCosts = product.otherCosts || {};
  const packaging = packagingRowCost + (Number(otherCosts.packaging) || 0);
  const laborConfig = product.labor || {};
  const laborUnits = (Number(laborConfig.workingDays) || 0) * (Number(laborConfig.outputPerDay) || 0);
  const computedLabor = laborUnits > 0 ? (Number(laborConfig.monthlyCost) || 0) / laborUnits : 0;
  const labor = computedLabor;
  const platform = Number(otherCosts.platform) || 0;
  const marketing = Number(otherCosts.marketing) || 0;
  const other = Number(otherCosts.other) || 0;
  const overheadConfig = product.overhead || {};
  const overheadMonthly =
    (Number(overheadConfig.rent) || 0) +
    (Number(overheadConfig.utilities) || 0) +
    (Number(overheadConfig.miscellaneous) || 0);
  const monthlyProductionOutput = laborUnits;
  const baselineOverheadCost = monthlyProductionOutput > 0 ? overheadMonthly / monthlyProductionOutput : 0;
  const overheadCost = baselineOverheadCost;
  const totalVariableCost = materialCost + packaging + labor + overheadCost + platform + marketing + other;
  const sellingPrice = Number(product.sellingPrice) || 0;
  const grossProfit = sellingPrice - totalVariableCost;
  const profitMargin = sellingPrice ? (grossProfit / sellingPrice) * 100 : 0;
  const markup = totalVariableCost ? (grossProfit / totalVariableCost) * 100 : 0;
  const fixedCosts = overheadMonthly || Number(product.fixedCosts) || 0;
  const breakEvenUnits = grossProfit > 0 ? Math.ceil(fixedCosts / grossProfit) : Infinity;
  const targetMarginDecimal = (Number(product.targetMargin) || 0) / 100;
  const suggestedPrice = targetMarginDecimal < 1 ? totalVariableCost / (1 - targetMarginDecimal) : 0;
  const projectedProfit = grossProfit * monthlyProductionOutput - fixedCosts;
  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      Math.round((profitMargin >= 50 ? 38 : profitMargin >= 30 ? 25 : 10) + (monthlyProductionOutput >= breakEvenUnits ? 32 : 12) + (projectedProfit > 0 ? 20 : 8) + 10)
    )
  );

  return {
    ingredientRows,
    packagingRows,
    materialCost,
    packagingCost: packaging,
    overheadMonthly,
    overheadCost,
    monthlyProductionOutput,
    costBreakdown: {
      Materials: materialCost,
      Packaging: packaging,
      Labor: labor,
      Rent: monthlyProductionOutput ? (Number(overheadConfig.rent) || 0) / monthlyProductionOutput : 0,
      Utilities: monthlyProductionOutput ? (Number(overheadConfig.utilities) || 0) / monthlyProductionOutput : 0,
      Miscellaneous: monthlyProductionOutput ? (Number(overheadConfig.miscellaneous) || 0) / monthlyProductionOutput : 0,
      'Platform Fees': platform,
    },
    totalVariableCost,
    grossProfit,
    profitMargin,
    markup,
    breakEvenUnits,
    suggestedPrice,
    projectedProfit,
    readinessScore,
    pricingStatus: profitMargin >= 50 ? 'Healthy' : profitMargin >= 30 ? 'Warning' : 'Risky',
  };
}

export function getRedFlags(product, results) {
  const flags = [];
  const packaging = results.packagingCost || Number(product.otherCosts?.packaging) || 0;
  const totalCost = results.totalVariableCost || 0;

  if (results.profitMargin < 30) {
    flags.push('Low profit margin. Your price may be too low or your costs may be too high.');
  }
  if (totalCost > 0 && packaging / totalCost > 0.2) {
    flags.push('Packaging cost is high. Consider reviewing suppliers or buying in bulk.');
  }
  if (results.grossProfit <= 0) {
    flags.push('This item is currently losing money.');
  }
  if (results.suggestedPrice > (Number(product.sellingPrice) || 0)) {
    flags.push('Current price is below your target margin. Consider increasing price.');
  }
  if (results.breakEvenUnits > (results.monthlyProductionOutput || Number(product.expectedSales) || 0)) {
    flags.push('Expected sales may not cover fixed costs.');
  }

  return flags;
}

export function buildSavedItem(product, results, business, metadata = {}, existing = null) {
  const now = new Date().toISOString();
  const pricing = metadata.pricing || {};
  const savedCostPerProduct = Number.isFinite(pricing.costPerProduct) ? pricing.costPerProduct : results.totalVariableCost;
  const savedSellingPrice = Number.isFinite(pricing.sellingPrice) ? pricing.sellingPrice : Number(product.sellingPrice) || 0;
  const savedGrossProfit = Number.isFinite(pricing.grossProfit) ? pricing.grossProfit : results.grossProfit;
  const savedProfitMargin = Number.isFinite(pricing.profitMargin) ? pricing.profitMargin : results.profitMargin;
  const savedMarkup = Number.isFinite(pricing.markup) ? pricing.markup : results.markup;
  const fallbackBreakEvenUnits = Number.isFinite(results.breakEvenUnits) ? results.breakEvenUnits : 0;
  const savedBreakEvenUnits = Number.isFinite(pricing.breakEvenUnits) ? pricing.breakEvenUnits : fallbackBreakEvenUnits;
  const savedSuggestedPrice = Number.isFinite(pricing.suggestedSellingPrice) ? pricing.suggestedSellingPrice : results.suggestedPrice;
  const savedPricingStatus = savedProfitMargin >= 50 ? 'Healthy' : savedProfitMargin >= 30 ? 'Warning' : 'Risky';
  const savedTaxPercentage = Number.isFinite(pricing.taxPercentage) ? pricing.taxPercentage : existing?.pricingInputs?.taxPercentage || 0;
  const savedMarketingPercentage = Number.isFinite(pricing.marketingPercentage) ? pricing.marketingPercentage : existing?.pricingInputs?.marketingPercentage || 0;
  const savedMarkupTopup = Number.isFinite(pricing.markup) ? pricing.markup : existing?.pricingInputs?.markupTopup || 0;
  const savedResults = {
    ...results,
    totalVariableCost: savedCostPerProduct,
    grossProfit: savedGrossProfit,
    profitMargin: savedProfitMargin,
    markup: savedMarkup,
    breakEvenUnits: savedBreakEvenUnits,
    suggestedPrice: savedSuggestedPrice,
    pricingStatus: savedPricingStatus,
  };
  const redFlags = getRedFlags({ ...product, sellingPrice: savedSellingPrice }, savedResults);

  return {
    id: existing?.id || crypto.randomUUID(),
    businessId: business.id || business.name || 'default-business',
    productName: product.productName || 'Untitled item',
    itemType: metadata.itemType || existing?.itemType || 'Product',
    category: metadata.category || product.productCategory || existing?.category || 'Other',
    status: metadata.status || existing?.status || 'Active',
    sellingPrice: savedSellingPrice,
    targetProfitMargin: Number(product.targetMargin) || 0,
    monthlyFixedCosts: results.overheadMonthly || Number(product.fixedCosts) || 0,
    expectedMonthlySales: results.monthlyProductionOutput || 0,
    materials: results.ingredientRows.map((row) => ({ ...row })),
    packagingMaterials: results.packagingRows.map((row) => ({ ...row })),
    otherVariableCosts: { ...product.otherCosts },
    laborConfig: { ...product.labor },
    overheadConfig: {
      rent: Number(product.overhead?.rent) || 0,
      utilities: Number(product.overhead?.utilities) || 0,
      miscellaneous: Number(product.overhead?.miscellaneous) || 0,
    },
    operationalOverride: {
      enabled: Boolean(product.operationalOverride?.enabled),
      laborCostPerUnit: Number(product.operationalOverride?.laborCostPerUnit) || 0,
      overheadCostPerUnit: Number(product.operationalOverride?.overheadCostPerUnit) || 0,
    },
    pricingInputs: {
      taxPercentage: savedTaxPercentage,
      taxMode: pricing.taxMode || existing?.pricingInputs?.taxMode || (savedTaxPercentage === 12 ? 'vat' : savedTaxPercentage === 3 ? 'percentage' : 'exempt'),
      taxAmount: Number.isFinite(pricing.taxAmount) ? pricing.taxAmount : 0,
      marketingPercentage: savedMarketingPercentage,
      marketingAmount: Number.isFinite(pricing.marketingAmount) ? pricing.marketingAmount : 0,
      markupTopup: savedMarkupTopup,
      breakEvenSellingPrice: Number.isFinite(pricing.breakEvenSellingPrice) ? pricing.breakEvenSellingPrice : 0,
      targetSellingPrice: Number.isFinite(pricing.targetSellingPrice) ? pricing.targetSellingPrice : existing?.pricingInputs?.targetSellingPrice || 0,
    },
    costPerProduct: savedCostPerProduct,
    finalCost: savedCostPerProduct,
    finalCostInMind: savedCostPerProduct,
    grossProfit: savedGrossProfit,
    profitMargin: savedProfitMargin,
    markup: savedMarkup,
    breakEvenUnits: savedBreakEvenUnits,
    suggestedSellingPrice: savedSuggestedPrice,
    pricingStatus: savedPricingStatus,
    redFlags,
    notes: metadata.notes ?? existing?.notes ?? '',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

export function savedItemToProduct(item, inventory = []) {
  const findInventoryItem = (...terms) =>
    inventory.find((inventoryItem) => {
      const name = String(inventoryItem.material || '').toLowerCase();
      return terms.some((term) => name.includes(term));
    });
  const makeInventoryRow = (inventoryItem, usedQuantity) =>
    inventoryItem
      ? {
          id: crypto.randomUUID(),
          materialId: inventoryItem.id,
          name: inventoryItem.material,
          usedQuantity,
          usedUnit: inventoryItem.baseUnit || 'pcs',
        }
      : null;
  const legacyDemoRecipe = () => {
    const productName = String(item.productName || '').toLowerCase();
    const rows = [];
    const add = (inventoryItem, quantity) => {
      const row = makeInventoryRow(inventoryItem, quantity);
      if (row) rows.push(row);
    };

    if (productName.includes('fruit soda')) {
      add(findInventoryItem('soda'), 200);
    } else {
      add(findInventoryItem('jersey milk'), 200);
    }
    if (productName.includes('strawberry')) add(findInventoryItem('strawberry'), 30);
    if (productName.includes('mango')) add(findInventoryItem('mango'), 30);
    if (productName.includes('blueberry')) add(findInventoryItem('blueberry'), 30);
    if (productName.includes('matcha')) add(findInventoryItem('matcha'), 10);
    if (productName.includes('vanilla latte')) {
      add(findInventoryItem('sagada', 'beans'), 18);
      add(findInventoryItem('vanilla'), 15);
    }
    if (productName.includes('chocolate')) add(findInventoryItem('chocolate sauce'), 20);
    add(findInventoryItem('ice'), 150);
    return rows;
  };
  const legacyDemoPackaging = () =>
    [
      makeInventoryRow(findInventoryItem('u-cup', 'cup'), 1),
      makeInventoryRow(findInventoryItem('flat lids', 'lid'), 1),
      makeInventoryRow(findInventoryItem('thin straw', 'straw'), 1),
    ].filter(Boolean);
  const restoreMaterial = (material) => {
    const matchedInventoryItem =
      inventory.find((inventoryItem) => inventoryItem.id === material.materialId) ||
      inventory.find(
        (inventoryItem) =>
          String(inventoryItem.material || '').trim().toLowerCase() ===
          String(material.name || '').trim().toLowerCase()
      );
    const nextMaterial = {
      ...material,
      id: material.id || crypto.randomUUID(),
      materialId: matchedInventoryItem?.id || material.materialId || '',
      name: matchedInventoryItem?.material || material.name || '',
      usedUnit: material.usedUnit === 'grams' ? 'g' : material.usedUnit || matchedInventoryItem?.baseUnit || 'pcs',
    };
    delete nextMaterial.computedCost;
    return nextMaterial;
  };
  const savedMaterials = item.materials || item.rawMaterials || item.ingredients || item.product?.ingredients || [];
  const savedPackaging = item.packagingMaterials || item.packaging || item.product?.packaging || [];
  const hasLegacyFinalCost =
    savedMaterials.length === 1 &&
    String(savedMaterials[0]?.name || '').trim().toLowerCase() === 'final cost allocation';
  const ingredients = hasLegacyFinalCost ? legacyDemoRecipe() : savedMaterials.map(restoreMaterial);
  const packaging =
    hasLegacyFinalCost && !savedPackaging.length
      ? legacyDemoPackaging()
      : savedPackaging.map(restoreMaterial);

  return {
    productName: item.productName,
    productCategory: item.category || 'Drinks',
    sellingPrice: item.sellingPrice,
    targetMargin: item.targetProfitMargin,
    fixedCosts: item.monthlyFixedCosts,
    expectedSales: item.expectedMonthlySales,
    ingredients,
    packaging,
    otherCosts: { ...item.otherVariableCosts },
    labor: item.laborConfig || { monthlyCost: 0, workingDays: 0, outputPerDay: 0 },
    overhead: item.overheadConfig || { rent: item.monthlyFixedCosts || 0, utilities: 0, miscellaneous: 0 },
    operationalOverride: item.operationalOverride || { enabled: false, laborCostPerUnit: 0, overheadCostPerUnit: 0 },
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(value) : 'N/A';
}
