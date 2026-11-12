export const inventoryTourSteps = [
  {target:'measurements', title:'Choose units for your supplies', copy:'Choose your business category to see useful measurement units. Use “Show all measurements” if you need another unit. When adding a material, choose the unit that matches what you purchased, such as kg, L, or pcs.'},
  {target:'add', title:'Add your materials and packaging', copy:'Start with a supply you buy, such as flour, wax, cups, or boxes. Click “Add material”, enter its name, and choose Raw Material or Packaging. Enter the full purchase cost and the quantity you received. For example, if 2 kg cost ₱120, enter ₱120 and 2 kg. The tour does not create or save any materials for you.'},
  {target:'list', title:'Understand your unit costs', copy:'Saved supplies appear here with their cost per unit. For example, ₱120 for 2 kg is ₱60 per kg. Click a material’s name to edit it, or use its three-dot menu to edit, duplicate, or delete it. These supplies become available in Add New Product.'},
  {target:'search', title:'Find the supply you need', copy:'Use the category filter to show raw materials or packaging. Type a material name in the search box to narrow the list. Clear the search and choose “All categories” to see everything again.'},
  {target:'selection', title:'Manage several supplies together', copy:'Tick the checkboxes beside materials to select them. “Select all” selects every material matching your current search and category, including other pages. A Delete button appears when you have a selection. Only use it for supplies you want to remove.'},
  {target:'download', title:'Download your inventory', copy:'Use “Download Excel” to export your inventory to a spreadsheet. You can keep it as a copy or use its columns as a starting point when preparing an upload.'},
  {target:'upload', title:'Bring in supplies from Excel', copy:'Use “Upload Excel” to choose an .xlsx or .xls file of materials and packaging. Check your purchase costs, quantities, and units before uploading, then review the import result. You can also keep adding supplies one at a time with “Add material”.'},
];

export function readInventoryTour(storage, key, stepCount = inventoryTourSteps.length) {
  try {
    const saved = JSON.parse(storage.getItem(key) || '{}');
    return {index:Number.isInteger(saved?.index) ? Math.max(0, Math.min(saved.index, stepCount - 1)) : 0, status:['active','completed','dismissed'].includes(saved?.status) ? saved.status : ''};
  } catch { return {index:0, status:''}; }
}

export function writeInventoryTour(storage, key, index, status) {
  try { storage.setItem(key, JSON.stringify({index, status})); } catch { /* Keep the tour usable without storage. */ }
}
