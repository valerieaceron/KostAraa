export const demoBusiness = {
  id: 'biz-empty-profile',
  name: '',
  type: '',
  stage: '',
  structure: '',
  location: '',
  address: '',
  years: 0,
  employees: 0,
  channels: [],
  offerings: '',
  labor: {
    staffCount: 1,
    monthlyCost: 18000,
    workingDays: 26,
    outputPerDay: 0,
  },
  overhead: {
    rent: 20000,
    utilities: 10000,
    miscellaneous: 3000,
  },
};

export const demoInventory = [
  { id: 'demo-inv-01-jersey-milk', material: 'Jersey Milk', itemCost: 95, qty: 1000, baseUnit: 'ml' },
  { id: 'demo-inv-02-strawberry-dooking-jam', material: 'Strawberry Dooking Jam', itemCost: 290, qty: 3000, baseUnit: 'grams' },
  { id: 'demo-inv-03-mango-dooking-jam', material: 'Mango Dooking Jam', itemCost: 290, qty: 3000, baseUnit: 'grams' },
  { id: 'demo-inv-04-blueberry-dooking-jam', material: 'Blueberry Dooking Jam', itemCost: 290, qty: 3000, baseUnit: 'grams' },
  { id: 'demo-inv-05-16oz-u-cup', material: '16oz U-Cup', itemCost: 1895, qty: 1000, baseUnit: 'pcs' },
  { id: 'demo-inv-06-flat-lids', material: 'Flat Lids', itemCost: 65, qty: 100, baseUnit: 'pcs' },
  { id: 'demo-inv-07-thin-straw', material: 'Thin Straw', itemCost: 75, qty: 100, baseUnit: 'pcs' },
  { id: 'demo-inv-08-sinker', material: 'Sinker', itemCost: 350, qty: 3000, baseUnit: 'grams' },
  { id: 'demo-inv-09-ice', material: 'Ice', itemCost: 30, qty: 1000, baseUnit: 'grams' },
  { id: 'demo-inv-10-davinci-matcha', material: 'Davinci Matcha', itemCost: 1150, qty: 1000, baseUnit: 'grams' },
  { id: 'demo-inv-11-water', material: 'Water', itemCost: 200, qty: 100000, baseUnit: 'ml' },
  { id: 'demo-inv-12-sagada-medium-roast-beans', material: 'Sagada Medium Roast Beans', itemCost: 1100, qty: 1000, baseUnit: 'grams' },
  { id: 'demo-inv-13-easy-vanilla', material: 'Easy Vanilla', itemCost: 220, qty: 1000, baseUnit: 'grams' },
  { id: 'demo-inv-14-davinci-caramel-sauce', material: 'Davinci Caramel Sauce', itemCost: 980, qty: 2800, baseUnit: 'ml' },
  { id: 'demo-inv-15-davinci-chocolate-sauce', material: 'Davinci Chocolate Sauce', itemCost: 980, qty: 2800, baseUnit: 'ml' },
  { id: 'demo-inv-16-soda', material: 'Soda', itemCost: 45, qty: 1000, baseUnit: 'ml' },
];

const demoSavedProductRows = [
  ['Mango Fruit Soda', 76.71038461538461, 111.69031999999999, 25.774689230769226, 23.08, 30, 1203, 'Risky', ['Low profit margin. Your price may be too low or your costs may be too high.', 'Expected sales may not cover fixed costs.']],
  ['Blueberry Fruit Soda', 76.71038461538461, 112.5494763076923, 26.633845538461543, 23.66, 31, 1164, 'Risky', ['Low profit margin. Your price may be too low or your costs may be too high.', 'Expected sales may not cover fixed costs.']],
  ['Strawberry Fruit Soda', 76.71038461538461, 111.69031999999999, 25.774689230769226, 23.08, 30, 1203, 'Risky', ['Low profit margin. Your price may be too low or your costs may be too high.', 'Expected sales may not cover fixed costs.']],
  ['Chocolate Drinks', 109.51038461538461, 159.44711999999998, 36.79548923076922, 23.08, 30, 843, 'Risky', ['Low profit margin. Your price may be too low or your costs may be too high.']],
  ['Vanilla Latte', 93.72038461538462, 137.5065483076923, 32.53971753846153, 23.66, 31, 953, 'Risky', ['Low profit margin. Your price may be too low or your costs may be too high.']],
  ['Blueberry Matcha', 104.61705128205129, 152.3224266666667, 35.15132923076925, 23.08, 30, 882, 'Risky', ['Low profit margin. Your price may be too low or your costs may be too high.']],
  ['Strawberry Matcha', 104.61705128205129, 152.3224266666667, 35.15132923076925, 23.08, 30, 882, 'Risky', ['Low profit margin. Your price may be too low or your costs may be too high.']],
  ['Matcha Latte', 101.6703846153846, 148.03208, 34.16124923076924, 23.08, 30, 908, 'Risky', ['Low profit margin. Your price may be too low or your costs may be too high.']],
  ['Mango Korean Milk', 86.71038461538461, 126.25032, 29.13468923076924, 23.08, 30, 1065, 'Risky', ['Low profit margin. Your price may be too low or your costs may be too high.', 'Expected sales may not cover fixed costs.']],
  ['Blueberry Korean Milk', 86.71038461538461, 145.67344615384616, 48.557815384615395, 33.33, 50, 639, 'Warning', []],
  ['Strawberry Korean Milk', 86.71038461538461, 146.64460246153845, 49.52897169230769, 33.77, 51, 626, 'Warning', []],
];

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const demoSavedItems = demoSavedProductRows.map(([productName, finalCost, sellingPrice, grossProfit, profitMargin, markup, breakEvenUnits, pricingStatus, redFlags], index) => ({
  id: `demo-prod-${String(index + 1).padStart(2, '0')}-${slug(productName)}`,
  businessId: 'demo-business',
  productName,
  itemType: 'Product',
  category: 'Drinks',
  status: 'Active',
  sellingPrice,
  targetProfitMargin: 50,
  monthlyFixedCosts: 31000,
  expectedMonthlySales: 1040,
  materials: [
    {
      id: `demo-prod-${index + 1}-final-cost`,
      materialId: '',
      name: 'Final cost allocation',
      usedQuantity: 1,
      usedUnit: 'pcs',
      unitCost: finalCost,
      computedCost: finalCost,
    },
  ],
  packagingMaterials: [],
  otherVariableCosts: { packaging: 0, labor: 0, platform: 0, marketing: 0, other: 0 },
  laborConfig: { staffCount: 1, monthlyCost: 15000, workingDays: 26, outputPerDay: 40 },
  overheadConfig: { rent: 20000, utilities: 5000, miscellaneous: 6000 },
  pricingInputs: {
    taxPercentage: 0,
    taxAmount: 0,
    marketingPercentage: 0,
    marketingAmount: 0,
    markupTopup: markup,
    breakEvenSellingPrice: finalCost,
  },
  costPerProduct: finalCost,
  finalCost,
  finalCostInMind: finalCost,
  grossProfit,
  profitMargin,
  markup,
  breakEvenUnits,
  suggestedSellingPrice: sellingPrice,
  pricingStatus,
  redFlags,
  notes: '',
  createdAt: '2026-05-26T00:00:00.000Z',
  updatedAt: '2026-05-26T00:00:00.000Z',
}));

export const blankProduct = {
  productName: '',
  productCategory: 'Drinks',
  sellingPrice: 0,
  targetMargin: 50,
  fixedCosts: 0,
  expectedSales: 0,
  ingredients: [
    { id: crypto.randomUUID(), materialId: '', name: '', usedQuantity: 1, usedUnit: 'pcs' },
  ],
  packaging: [
    { id: crypto.randomUUID(), materialId: '', name: '', usedQuantity: 1, usedUnit: 'pcs' },
  ],
  otherCosts: {
    packaging: 0,
    labor: 0,
    platform: 0,
    marketing: 0,
    other: 0,
  },
  labor: {
    staffCount: 0,
    monthlyCost: 0,
    workingDays: 0,
    outputPerDay: 0,
  },
  overhead: {
    rent: 0,
    utilities: 0,
    miscellaneous: 0,
  },
};

export const demoProduct = {
  ...blankProduct,
  ingredients: [
    { id: crypto.randomUUID(), materialId: '', name: '', usedQuantity: 1, usedUnit: 'pcs' },
  ],
  packaging: [
    { id: crypto.randomUUID(), materialId: '', name: '', usedQuantity: 1, usedUnit: 'pcs' },
  ],
  otherCosts: { ...blankProduct.otherCosts },
  labor: { ...blankProduct.labor },
  overhead: { ...blankProduct.overhead },
};
