import {isOfflineUser} from './api';
import { demoBusiness, demoInventory, demoProduct, demoSavedItems } from '../data/demoData';

const keys = {
  business: 'bizcost.business',
  product: 'bizcost.product',
  savedItems: 'bizcost.savedItems',
  inventory: 'bizcost.inventory',
  loggedIn: 'bizcost.loggedIn',
};

export function loadState() {
  const demo = isOfflineUser();
  const emptyBusiness = {...demoBusiness, labor:{staffCount:0, monthlyCost:0, workingDays:0, outputPerDay:0}, overhead:{rent:0, utilities:0, miscellaneous:0}};
  const business = JSON.parse(localStorage.getItem(keys.business) || JSON.stringify(demo ? demoBusiness : emptyBusiness));
  const inventory = normalizeInventory(JSON.parse(localStorage.getItem(keys.inventory) || JSON.stringify(demo ? demoInventory : [])));
  const product = normalizeProduct(JSON.parse(localStorage.getItem(keys.product) || JSON.stringify(demoProduct)));
  const storedItems = localStorage.getItem(keys.savedItems);
  const savedItems = storedItems ? JSON.parse(storedItems) : demo ? demoSavedItems : [];

  if (!storedItems) localStorage.setItem(keys.savedItems, JSON.stringify(savedItems));
  if (!localStorage.getItem(keys.business)) localStorage.setItem(keys.business, JSON.stringify(business));
  if (!localStorage.getItem(keys.product)) localStorage.setItem(keys.product, JSON.stringify(product));
  if (!localStorage.getItem(keys.inventory)) localStorage.setItem(keys.inventory, JSON.stringify(inventory));

  return {
    loggedIn: JSON.parse(localStorage.getItem(keys.loggedIn) || 'false'),
    business,
    product,
    inventory,
    savedItems,
  };
}

function inferBaseUnit(item) {
  const material = String(item.material || item.name || '').toLowerCase();
  if (/milk|water|juice|oil|syrup|sauce|liquid|cream|tea|coffee/.test(material)) return 'ml';
  if (/powder|sugar|flour|wax|salt|butter|cocoa|matcha|beans|grounds|gram|kg/.test(material)) return 'grams';
  if (/cup|straw|lid|label|box|bag|bottle|jar|piece|pcs|container/.test(material)) return 'pcs';
  return '';
}

function normalizeInventory(items) {
  return (items || []).map((item) => ({
    id: item.id || crypto.randomUUID(),
    material: item.material || item.name || '',
    itemCost: Number(item.itemCost) || Number(item.purchaseCost) || 0,
    qty: Number(item.qty) || Number(item.purchaseQuantity) || 1,
    baseUnit: (item.baseUnit || item.unit || inferBaseUnit(item)) === 'grams' ? 'g' : (item.baseUnit || item.unit || inferBaseUnit(item)),
  }));
}

function normalizeProduct(product) {
  if (product.packaging) {
    return {
      ...product,
      ingredients: (product.ingredients || []).map((item) => ({
        ...item,
        materialId: item.materialId || '',
        name: item.name || '',
        usedQuantity: Number(item.usedQuantity) || 0,
        usedUnit: (item.usedUnit || item.unit) === 'grams' ? 'g' : item.usedUnit || item.unit || 'pcs',
      })),
      packaging: (product.packaging || []).map((item) => ({
        ...item,
        materialId: item.materialId || '',
        name: item.name || '',
        usedQuantity: Number(item.usedQuantity) || 0,
        usedUnit: (item.usedUnit || item.unit) === 'grams' ? 'g' : item.usedUnit || item.unit || 'pcs',
      })),
      labor: product.labor || { monthlyCost: Number(product.otherCosts?.labor) || 0, workingDays: 1, outputPerDay: 1 },
      overhead: product.overhead || { rent: Number(product.fixedCosts) || 0, utilities: 0, miscellaneous: 0 },
    };
  }
  const packagingNames = new Set(['cup', 'cups', 'straw', 'straws', 'label', 'labels', 'box', 'boxes', 'bag', 'bags']);
  const ingredients = product.ingredients || [];
  const packaging = ingredients.filter((item) => packagingNames.has(String(item.name || '').trim().toLowerCase()));
  const rawMaterials = ingredients.filter((item) => !packagingNames.has(String(item.name || '').trim().toLowerCase()));
  const flatPackaging = Number(product.otherCosts?.packaging) || 0;
  const packagingRows = flatPackaging
    ? [...packaging, { id: crypto.randomUUID(), name: 'Packaging add-on', purchaseCost: flatPackaging, purchaseQuantity: 1, unit: 'pcs', usedQuantity: 1, usedUnit: 'pcs' }]
    : packaging;

  return {
    ...product,
    ingredients: rawMaterials.length ? rawMaterials : ingredients,
    packaging: packagingRows.length ? packagingRows : [{ id: crypto.randomUUID(), materialId: '', name: '', usedQuantity: 1, usedUnit: 'pcs' }],
    otherCosts: { ...product.otherCosts, packaging: 0 },
    labor: product.labor || { monthlyCost: Number(product.otherCosts?.labor) || 0, workingDays: 1, outputPerDay: 1 },
    overhead: product.overhead || { rent: Number(product.fixedCosts) || 0, utilities: 0, miscellaneous: 0 },
  };
}

export function saveBusiness(business) {
  localStorage.setItem(keys.business, JSON.stringify(business));
}

export function saveProduct(product) {
  localStorage.setItem(keys.product, JSON.stringify(product));
}

export function saveLogin(loggedIn) {
  localStorage.setItem(keys.loggedIn, JSON.stringify(loggedIn));
}

export function saveSavedItems(items) {
  localStorage.setItem(keys.savedItems, JSON.stringify(items));
}

export function saveInventory(items) {
  localStorage.setItem(keys.inventory, JSON.stringify(normalizeInventory(items)));
}
