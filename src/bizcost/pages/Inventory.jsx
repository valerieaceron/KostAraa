import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileUp, PackagePlus, Search, Trash2 } from 'lucide-react';
import { Button, Card, Modal } from '../components/ui';
import { formatCurrency, getInventoryCostUnit, getInventoryUnitCost } from '../utils/calculations';
import { apiJson, getApiItem, isOfflineUser } from '../utils/api';

const baseUnits = ['mg', 'g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz', 'mm', 'cm', 'm', 'inch', 'ft', 'yard', 'pcs', 'dozen', 'pack', 'box'];
const weightUnits = ['mg', 'g', 'kg', 'oz', 'lb'];
const volumeUnits = ['ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz'];
const displayUnit = (unit) => unit === 'l' ? 'L' : unit;

function unitSuffix(unit) {
  return unit === 'grams' ? 'g' : unit || 'unit';
}

function unitCostLabel(item) {
  return `${formatCurrency(getInventoryUnitCost(item))}/${getInventoryCostUnit(item)}`;
}

function inventoryApiPayload(item) {
  return {
    material: item.material,
    itemCost: Number(item.itemCost) || 0,
    qty: Number(item.qty) || 0,
    baseUnit: item.baseUnit || '',
    gramsPerCup: Number(item.gramsPerCup) || 0,
    piecesPerUnit: Number(item.piecesPerUnit) || 0,
    item_type: item.item_type || 'ingredient',
    category: item.category || '',
    sku: item.sku || '',
    description: item.description || '',
    currency_code: item.currency_code || 'PHP',
    quantity_on_hand: Number(item.qty) || 0,
    reorder_level: Number(item.reorder_level) || 0,
    supplier_name: item.supplier_name || '',
    lot_number: item.lot_number || '',
    expiry_date: item.expiry_date || null,
    notes: item.notes || '',
  };
}

function normalizeApiInventoryItem(item) {
  return {
    ...item,
    id: item.id || item.inventory_item_id || crypto.randomUUID(),
    material: item.material || item.material_name || item.name || '',
    itemCost: Number(item.itemCost ?? item.purchase_cost) || 0,
    qty: Number(item.qty ?? item.purchase_quantity ?? item.quantity_on_hand) || 0,
    baseUnit: (item.baseUnit || item.base_unit || item.unit || '') === 'grams' ? 'g' : (item.baseUnit || item.base_unit || item.unit || ''),
    gramsPerCup: Number(item.gramsPerCup ?? item.grams_per_cup) || 0,
    piecesPerUnit: Number(item.piecesPerUnit ?? item.pieces_per_unit) || 0,
  };
}

function extractInventoryItems(data) {
  if (Array.isArray(data)) return data;
  const candidates = [data?.result, data?.data?.result, data?.data?.items, data?.data?.inventory, data?.data?.rows, data?.items, data?.inventory, data?.data];
  return candidates.find(Array.isArray) || [];
}

function InventoryInput({ value, onChange, type = 'number', prefix, ariaLabel }) {
  return (
    <span className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-teal-100">
      {prefix ? <span className="text-sm font-semibold text-slate-500">{prefix}</span> : null}
      <input
        aria-label={ariaLabel}
        className="min-w-0 flex-1 bg-transparent text-sm font-bold text-navy outline-none"
        min="0"
        type={type}
        value={value}
        onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)}
      />
    </span>
  );
}

function InventorySelect({ value, onChange, ariaLabel }) {
  return (
    <select
      aria-label={ariaLabel}
      className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-navy outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-100"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Select unit</option>
      {baseUnits.map((unit) => <option key={unit} value={unit}>{displayUnit(unit)}</option>)}
    </select>
  );
}

function ValidationSlot({ message }) {
  return message ? <p className="mt-1 text-xs font-semibold leading-4 text-red-500">{message}</p> : null;
}

export default function Inventory({ inventory, setInventory }) {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ material: '', itemCost: '', qty: '', baseUnit: '', gramsPerCup: '', piecesPerUnit: '' });
  const [draftErrors, setDraftErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [loadingInventory, setLoadingInventory] = useState(false);
  const updateTimers = useRef({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOfflineUser()) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingInventory(true);
      try {
        const params = new URLSearchParams({ display: '20', page: '1' });
        if (search.trim()) params.set('search', search.trim());
        const data = await apiJson(`/api/inventory/getAll?${params.toString()}`);
        if (!cancelled) {
          setInventory(extractInventoryItems(data).map(normalizeApiInventoryItem));
          setApiError('');
        }
      } catch (error) {
        if (!cancelled) setApiError(error instanceof Error ? error.message : 'Unable to load inventory.');
      } finally {
        if (!cancelled) setLoadingInventory(false);
      }
    }, search.trim() ? 350 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  const updateItem = (id, field, value) => {
    const nextInventory = inventory.map((item) => (item.id === id ? { ...item, [field]: value } : item));
    setInventory(nextInventory);
    if (isOfflineUser()) return;
    window.clearTimeout(updateTimers.current[id]);
    updateTimers.current[id] = window.setTimeout(async () => {
      const item = nextInventory.find((entry) => String(entry.id) === String(id));
      if (!item) return;
      try {
        setApiError('');
        await apiJson(`/api/inventory/update/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(inventoryApiPayload(item)),
        });
      } catch (error) {
        setApiError(error instanceof Error ? error.message : 'Unable to update this material.');
      }
    }, 500);
  };

  const openAddMaterial = () => {
    setDraft({ material: '', itemCost: '', qty: '', baseUnit: '', gramsPerCup: '', piecesPerUnit: '' });
    setDraftErrors({});
    setSaveError('');
    setApiError('');
    setAddOpen(true);
  };

  const addItem = async () => {
    const errors = {
      material: !draft.material.trim() ? 'Material name is required' : '',
      itemCost: Number(draft.itemCost) <= 0 ? 'Purchase amount must be greater than 0' : '',
      qty: Number(draft.qty) <= 0 ? 'Stock qty must be greater than 0' : '',
      baseUnit: !baseUnits.includes(draft.baseUnit) ? 'Choose a valid measurement unit' : '',
    };
    setDraftErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    const localItem = {
      id: crypto.randomUUID(),
      material: draft.material.trim(),
      itemCost: Number(draft.itemCost),
      qty: Number(draft.qty),
      baseUnit: draft.baseUnit,
      gramsPerCup: Number(draft.gramsPerCup) || 0,
      piecesPerUnit: Number(draft.piecesPerUnit) || 0,
    };
    if (isOfflineUser()) {
      setInventory([...inventory, localItem]);
      setAddOpen(false);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const data = await apiJson('/api/inventory/add', {
        method: 'POST',
        body: JSON.stringify(inventoryApiPayload(localItem)),
      });
      const saved = getApiItem(data);
      setInventory([...inventory, {
        ...localItem,
        id: saved?.id || saved?.inventory_item_id || data?.id || localItem.id,
        material: saved?.material || saved?.material_name || localItem.material,
        itemCost: Number(saved?.itemCost ?? saved?.purchase_cost) || localItem.itemCost,
        qty: Number(saved?.qty ?? saved?.purchase_quantity ?? saved?.quantity_on_hand) || localItem.qty,
        baseUnit: saved?.baseUnit || saved?.base_unit || localItem.baseUnit,
        gramsPerCup: Number(saved?.gramsPerCup ?? saved?.grams_per_cup) || localItem.gramsPerCup,
        piecesPerUnit: Number(saved?.piecesPerUnit ?? saved?.pieces_per_unit) || localItem.piecesPerUnit,
      }]);
      setAddOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save this material.');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id) => {
    if (isOfflineUser()) {
      setInventory(inventory.filter((item) => item.id !== id));
      return;
    }
    setDeletingId(id);
    setApiError('');
    try {
      await apiJson(`/api/inventory/delete/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setInventory(inventory.filter((item) => item.id !== id));
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to delete this material.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalInventoryCost = inventory.reduce((sum, item) => sum + (Number(item.itemCost) || 0), 0);
  const highestUnitCostItem = [...inventory].sort((a, b) => getInventoryUnitCost(b) - getInventoryUnitCost(a))[0];
  const filteredInventory = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return inventory;
    return inventory.filter((item) => {
      const haystack = [
        item.material,
        item.baseUnit,
        Number(item.itemCost) || 0,
        getInventoryUnitCost(item),
        unitCostLabel(item),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [inventory, search]);
  const exportInventory = async () => {
    const XLSX = await import('xlsx');
    const exportedAt = new Date();
    const rows = filteredInventory.map((item, index) => ({
      '#': index + 1,
      Material: item.material || '',
      'Purchase Amount': Number(item.itemCost) || 0,
      'Stock Qty': Number(item.qty) || 0,
      'Base Unit': item.baseUnit || '',
      'Grams Per Cup': Number(item.gramsPerCup) || '',
      'Pieces Per Pack': Number(item.piecesPerUnit) || '',
      'Unit Cost': unitCostLabel(item),
      'Total Value': Number(item.itemCost) || 0,
    }));
    const worksheetData = [
      ['BizCost - Raw Materials Inventory'],
      [`Date exported: ${exportedAt.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}`],
      [],
      ['#', 'Material', 'Purchase Amount', 'Stock Qty', 'Base Unit', 'Grams Per Cup', 'Pieces Per Pack', 'Unit Cost', 'Total Value'],
      ...rows.map((row) => [row['#'], row.Material, row['Purchase Amount'], row['Stock Qty'], row['Base Unit'], row['Grams Per Cup'], row['Pieces Per Pack'], row['Unit Cost'], row['Total Value']]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];
    for (let rowIndex = 5; rowIndex < worksheetData.length + 1; rowIndex += 1) {
      const purchaseCell = worksheet[`C${rowIndex}`];
      const totalCell = worksheet[`I${rowIndex}`];
      if (purchaseCell) purchaseCell.z = '"\u20B1"#,##0.00';
      if (totalCell) totalCell.z = '"\u20B1"#,##0.00';
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    XLSX.writeFile(workbook, 'bizcost-inventory.xlsx');
  };
  const importInventory = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportMessage('');
    setImportError('');
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      const requiredHeaders = ['Material', 'Purchase Amount', 'Stock Qty', 'Base Unit'];
      const actualHeaders = rows.length ? Object.keys(rows[0]) : [];
      const missingHeaders = requiredHeaders.filter((header) => !actualHeaders.includes(header));
      if (missingHeaders.length) {
        throw new Error(`Missing required column${missingHeaders.length > 1 ? 's' : ''}: ${missingHeaders.join(', ')}`);
      }
      if (!rows.length) throw new Error('The spreadsheet does not contain any material rows.');

      const importedItems = rows.map((row, index) => {
        const material = String(row.Material || '').trim();
        const itemCost = Number(row['Purchase Amount']);
        const qty = Number(row['Stock Qty']);
        const rawUnit = String(row['Base Unit'] || '').trim().toLowerCase();
        const baseUnit = rawUnit === 'grams' || rawUnit === 'gram' ? 'g' : rawUnit;
        const rowNumber = index + 2;
        if (!material) throw new Error(`Row ${rowNumber}: Material is required.`);
        if (!Number.isFinite(itemCost) || itemCost <= 0) throw new Error(`Row ${rowNumber}: Purchase Amount must be greater than 0.`);
        if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Row ${rowNumber}: Stock Qty must be greater than 0.`);
        if (!baseUnits.includes(baseUnit)) throw new Error(`Row ${rowNumber}: Base Unit is not supported.`);
        return { id: crypto.randomUUID(), material, itemCost, qty, baseUnit, gramsPerCup: Number(row['Grams Per Cup']) || 0, piecesPerUnit: Number(row['Pieces Per Pack']) || 0 };
      });

      setInventory([...inventory, ...importedItems]);
      setImportMessage(`${importedItems.length} material${importedItems.length === 1 ? '' : 's'} imported successfully.`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unable to import this spreadsheet.');
    }
  };
  const getError = (item, field) => {
    if (field === 'material' && !String(item.material || '').trim()) return 'Material name is required';
    if (field === 'itemCost' && (Number(item.itemCost) || 0) <= 0) return 'Purchase amount must be greater than 0';
    if (field === 'qty' && (Number(item.qty) || 0) <= 0) return 'Stock qty must be greater than 0';
    if (field === 'baseUnit' && !item.baseUnit) return 'Base unit is required';
    return '';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">Raw Materials Inventory</p>
          <h1 className="text-3xl font-black text-navy">Inventory <span className="inventory-help" tabIndex={0} aria-label="About automatic unit conversion">?<span>Kostaraa automatically converts compatible units, such as kg to g, L to ml, yards to cm, and dozens to pieces. Ingredients used by cup need their own grams-per-cup rule.</span></span></h1>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">Track ingredients, packaging, and supplies using base units for accurate product costing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={exportInventory}><Download className="h-4 w-4" /> Download Excel</Button>
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()}><FileUp className="h-4 w-4" /> Upload Excel</Button>
          <input ref={fileInputRef} className="hidden" type="file" accept=".xlsx,.xls" onChange={importInventory} />
          <Button onClick={openAddMaterial}><PackagePlus className="h-4 w-4" /> Add material</Button>
        </div>
      </div>

      {importMessage ? <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700">{importMessage}</p> : null}
      {importError ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{importError}</p> : null}
      {apiError ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{apiError}</p> : null}
      {loadingInventory ? <p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">Loading inventory…</p> : null}

      <div className="flex flex-wrap gap-2">
        <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-navy">{inventory.length} Materials</span>
        <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-navy">{formatCurrency(totalInventoryCost)} Stock Value</span>
        <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-navy">Highest Unit Cost: {highestUnitCostItem?.material || 'N/A'} {highestUnitCostItem ? unitCostLabel(highestUnitCostItem) : ''}</span>
      </div>

      <div className="flex justify-end">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            aria-label="Search materials"
            className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-navy outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search materials..."
            value={search}
          />
        </div>
      </div>

      <Card className="overflow-hidden p-3">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-[40px_minmax(190px,1.35fr)_minmax(160px,1fr)_minmax(130px,.8fr)_minmax(120px,.7fr)_minmax(140px,.9fr)_64px] items-center gap-2 border-b border-slate-100 px-3 pb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
              <span>#</span>
              <span>Material</span>
              <span>Purchase Amount</span>
              <span>Stock Qty</span>
              <span>Base Unit</span>
              <span>Unit Cost</span>
              <span className="text-center">Actions</span>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredInventory.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[40px_minmax(190px,1.35fr)_minmax(160px,1fr)_minmax(130px,.8fr)_minmax(120px,.7fr)_minmax(140px,.9fr)_64px] items-start gap-2 px-3 py-2">
                  <div className="flex h-9 items-center px-1 text-sm font-black text-slate-400">{index + 1}</div>
                  <div className="px-1">
                    <InventoryInput ariaLabel="Material" type="text" value={item.material} onChange={(value) => updateItem(item.id, 'material', value)} />
                    <ValidationSlot message={getError(item, 'material')} />
                  </div>
                  <div className="px-1">
                    <InventoryInput ariaLabel="Purchase amount" prefix="PHP" value={item.itemCost} onChange={(value) => updateItem(item.id, 'itemCost', value)} />
                    <ValidationSlot message={getError(item, 'itemCost')} />
                  </div>
                  <div className="px-1">
                    <InventoryInput ariaLabel="Stock qty" value={item.qty} onChange={(value) => updateItem(item.id, 'qty', value)} />
                    <ValidationSlot message={getError(item, 'qty')} />
                  </div>
                  <div className="px-1">
                    <InventorySelect ariaLabel="Base unit" value={item.baseUnit || ''} onChange={(value) => updateItem(item.id, 'baseUnit', value)} />
                    <ValidationSlot message={getError(item, 'baseUnit')} />
                    {(weightUnits.includes(item.baseUnit) || volumeUnits.includes(item.baseUnit)) ? (
                      <div className="mt-2">
                        <InventoryInput ariaLabel={`${item.material} grams per cup`} value={item.gramsPerCup || ''} onChange={(value) => updateItem(item.id, 'gramsPerCup', value)} />
                        <p className="mt-1 text-[11px] font-medium text-slate-500">Grams per cup (optional)</p>
                      </div>
                    ) : null}
                    {['pack', 'box'].includes(item.baseUnit) ? (
                      <div className="mt-2">
                        <InventoryInput ariaLabel={`${item.material} pieces per ${item.baseUnit}`} value={item.piecesPerUnit || ''} onChange={(value) => updateItem(item.id, 'piecesPerUnit', value)} />
                        <p className="mt-1 text-[11px] font-medium text-slate-500">Pieces in one {item.baseUnit}</p>
                      </div>
                    ) : null}
                  </div>
                  <div className="mx-1 flex h-9 items-center justify-between rounded-md border border-teal-100 bg-teal-50 px-3">
                    <span className="text-sm font-black text-accent">{unitCostLabel(item)}</span>
                  </div>
                  <div className="flex h-9 justify-center px-1">
                    <button
                      className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:border-accent"
                      disabled={deletingId === item.id}
                      onClick={() => removeItem(item.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete material</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 px-2 py-2">
              <Button variant="ghost" className="w-full justify-center" onClick={openAddMaterial}>
                <PackagePlus className="h-4 w-4" /> Add material
              </Button>
            </div>
          </div>
        </div>
        {!filteredInventory.length && <p className="py-8 text-center text-sm text-slate-500">No materials match your search.</p>}
      </Card>

      {addOpen ? (
        <Modal title="Add Material" onClose={() => setAddOpen(false)}>
          {saveError ? <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{saveError}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-600 sm:col-span-2">
              Material
              <InventoryInput ariaLabel="New material name" type="text" value={draft.material} onChange={(value) => setDraft({ ...draft, material: value })} />
              <ValidationSlot message={draftErrors.material} />
            </label>
            {(weightUnits.includes(draft.baseUnit) || volumeUnits.includes(draft.baseUnit)) ? (
              <label className="grid gap-1.5 text-sm font-semibold text-slate-600 sm:col-span-2">
                Grams per cup <span className="font-medium text-slate-400">(optional)</span>
                <InventoryInput ariaLabel="New material grams per cup" value={draft.gramsPerCup} onChange={(value) => setDraft({ ...draft, gramsPerCup: value })} />
                <span className="text-xs font-medium leading-5 text-slate-500">Add this only when you buy the material by weight but may use it by cup in a recipe. Example: all-purpose flour is about 120 grams per cup.</span>
              </label>
            ) : null}
            {['pack', 'box'].includes(draft.baseUnit) ? (
              <label className="grid gap-1.5 text-sm font-semibold text-slate-600 sm:col-span-2">
                How many pieces are in one {draft.baseUnit}?
                <InventoryInput ariaLabel="New material pieces per pack" value={draft.piecesPerUnit} onChange={(value) => setDraft({ ...draft, piecesPerUnit: value })} />
              </label>
            ) : null}
            <label className="grid gap-1.5 text-sm font-semibold text-slate-600">
              Purchase Amount
              <InventoryInput ariaLabel="New material purchase amount" prefix="PHP" value={draft.itemCost} onChange={(value) => setDraft({ ...draft, itemCost: value })} />
              <ValidationSlot message={draftErrors.itemCost} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-600">
              Stock Qty
              <InventoryInput ariaLabel="New material stock qty" value={draft.qty} onChange={(value) => setDraft({ ...draft, qty: value })} />
              <ValidationSlot message={draftErrors.qty} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-600 sm:col-span-2">
              Base Unit
              <InventorySelect ariaLabel="New material base unit" value={draft.baseUnit} onChange={(value) => setDraft({ ...draft, baseUnit: value })} />
              <ValidationSlot message={draftErrors.baseUnit} />
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={addItem}><PackagePlus className="h-4 w-4" /> {saving ? 'Saving…' : 'Add Material'}</Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
