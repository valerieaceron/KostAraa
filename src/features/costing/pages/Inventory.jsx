import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, FileUp, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { formatCurrency, getInventoryCostUnit, getInventoryUnitCost } from '../utils/calculations';
import { apiJson, getAllApiItems, getApiItem, getCreatedInventoryItem, isOfflineUser } from '../utils/api';
import '../styles/inventory.css';

const ALL_UNITS = ['mg', 'g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz', 'mm', 'cm', 'm', 'inch', 'ft', 'yard', 'pcs', 'dozen', 'pack', 'box'];
const WEIGHT_UNITS = ['mg', 'g', 'kg', 'oz', 'lb'];
const VOLUME_UNITS = ['ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz'];
const ITEM_CATEGORIES = ['Raw Material', 'Packaging'];
const PAGE_SIZE = 10;

const emptyDraft = () => ({ material: '', category: 'Raw Material', itemCost: '', qty: '', baseUnit: '', gramsPerCup: '', piecesPerUnit: '' });
const displayUnit = (unit) => unit === 'l' ? 'L' : unit;
const categoryToType = (category) => category === 'Packaging' ? 'packaging' : 'ingredient';
const itemCategory = (item) => item.category === 'Packaging' || item.item_type === 'packaging' ? 'Packaging' : 'Raw Material';

function unitCostLabel(item) {
  return `${formatCurrency(getInventoryUnitCost(item))} per ${getInventoryCostUnit(item)}`;
}

function inventoryApiPayload(item) {
  return {
    material: item.material,
    itemCost: Number(item.itemCost) || 0,
    qty: Number(item.qty) || 0,
    baseUnit: item.baseUnit || '',
    gramsPerCup: Number(item.gramsPerCup) || 0,
    piecesPerUnit: Number(item.piecesPerUnit) || 0,
    item_type: item.item_type || categoryToType(item.category),
    category: item.category || 'Raw Material',
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
  const type = item.item_type || 'ingredient';
  return {
    ...item,
    id: item.id || item.inventory_item_id || crypto.randomUUID(),
    material: item.material || item.material_name || item.name || '',
    itemCost: Number(item.itemCost ?? item.purchase_cost) || 0,
    qty: Number(item.qty ?? item.purchase_quantity ?? item.quantity_on_hand) || 0,
    baseUnit: (item.baseUnit || item.base_unit || item.unit || '') === 'grams' ? 'g' : (item.baseUnit || item.base_unit || item.unit || ''),
    gramsPerCup: Number(item.gramsPerCup ?? item.grams_per_cup) || 0,
    piecesPerUnit: Number(item.piecesPerUnit ?? item.pieces_per_unit) || 0,
    item_type: type,
    category: item.category === 'Packaging' || type === 'packaging' ? 'Packaging' : 'Raw Material',
  };
}

function extractInventoryItems(data) {
  if (Array.isArray(data)) return data;
  const candidates = [data?.result, data?.data?.result, data?.data?.items, data?.data?.inventory, data?.data?.rows, data?.items, data?.inventory, data?.data];
  return candidates.find(Array.isArray) || [];
}

function validateDraft(draft) {
  return {
    material: !String(draft.material).trim() ? 'Material name is required.' : '',
    itemCost: Number(draft.itemCost) <= 0 ? 'Purchase amount must be greater than 0.' : '',
    qty: Number(draft.qty) <= 0 ? 'Purchase quantity must be greater than 0.' : '',
    baseUnit: !ALL_UNITS.includes(draft.baseUnit) ? 'Choose a valid measurement unit.' : '',
  };
}

function InventoryField({ label, error, hint, optional, children, className = '' }) {
  return <label className={`inventory-field ${className}`}><span>{label}</span>{optional ? <small>Optional</small> : null}{children}{hint ? <em>{hint}</em> : null}{error ? <strong>{error}</strong> : null}</label>;
}

function InventoryActions({ item, openUp, onEdit, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => { if (!menuRef.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const run = (action) => { setOpen(false); action(); };

  return <div className="inventory-actions" ref={menuRef}>
    <button className="inventory-actions-trigger" type="button" aria-haspopup="menu" aria-expanded={open} aria-label={`More actions for ${item.material || 'material'}`} title="More actions" onClick={() => setOpen((value) => !value)}><MoreHorizontal aria-hidden="true" /></button>
    {open ? <div className={`inventory-actions-menu${openUp ? ' open-up' : ''}`} role="menu">
      <button type="button" role="menuitem" onClick={() => run(onEdit)}><Pencil aria-hidden="true" />Edit</button>
      <button type="button" role="menuitem" onClick={() => run(onDuplicate)}><Copy aria-hidden="true" />Duplicate</button>
      <button className="danger" type="button" role="menuitem" onClick={() => run(onDelete)}><Trash2 aria-hidden="true" />Delete</button>
    </div> : null}
  </div>;
}

function MaterialDialog({ draft, errors, mode, saving, saveError, allowedUnits, onChange, onClose, onDelete, onSave }) {
  const showsCupRule = WEIGHT_UNITS.includes(draft.baseUnit) || VOLUME_UNITS.includes(draft.baseUnit);
  const showsPieceRule = ['pack', 'box'].includes(draft.baseUnit);
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="inventory-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-dialog-title">
    <button className="inventory-dialog-scrim" type="button" onClick={onClose} aria-label="Close material dialog" />
    <article>
      <header><div><h2 id="inventory-dialog-title">{mode === 'edit' ? 'Edit material details' : 'Add material details'}</h2></div><button type="button" onClick={onClose} aria-label="Close"><X /></button></header>
      {saveError ? <p className="inventory-alert error">{saveError}</p> : null}
      <div className="inventory-dialog-grid">
        <InventoryField label="Material name" error={errors.material} className="wide"><input autoFocus value={draft.material} onChange={(event) => onChange('material', event.target.value)} /></InventoryField>
        <InventoryField label="Category"><select value={draft.category} onChange={(event) => onChange('category', event.target.value)}>{ITEM_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></InventoryField>
        <InventoryField label="Base unit" error={errors.baseUnit}><select aria-label="Base unit" value={draft.baseUnit} onChange={(event) => onChange('baseUnit', event.target.value)}><option value="">Select measurement</option>{allowedUnits.map((unit) => <option key={unit} value={unit}>{displayUnit(unit)}</option>)}</select></InventoryField>
        <InventoryField label="Purchase amount" error={errors.itemCost}><span className="inventory-money-input"><b>PHP</b><input min="0" step="0.01" type="number" value={draft.itemCost} onChange={(event) => onChange('itemCost', event.target.value)} /></span></InventoryField>
        <InventoryField label="Purchase quantity" error={errors.qty} hint="How many base units were included in the purchase."><input min="0" step="0.01" type="number" value={draft.qty} onChange={(event) => onChange('qty', event.target.value)} /></InventoryField>
        {showsCupRule ? <InventoryField label="Grams per cup" optional hint="Use only when recipes measure this item by cup." className="wide"><input min="0" step="0.01" type="number" value={draft.gramsPerCup} onChange={(event) => onChange('gramsPerCup', event.target.value)} /></InventoryField> : null}
        {showsPieceRule ? <InventoryField label={`Pieces per ${draft.baseUnit}`} optional hint={`Enter how many individual pieces are inside one ${draft.baseUnit}.`} className="wide"><input min="0" step="1" type="number" value={draft.piecesPerUnit} onChange={(event) => onChange('piecesPerUnit', event.target.value)} /></InventoryField> : null}
      </div>
      <div className="inventory-dialog-actions">{mode === 'edit' ? <button className="danger" type="button" onClick={onDelete}>Delete material</button> : null}<span/><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="button" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add material'}</button></div>
    </article>
  </div>;
}

export default function Inventory({ inventory, setInventory, unitOptions = ALL_UNITS, measurementGuide = null }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [dialog, setDialog] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [draftErrors, setDraftErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [apiError, setApiError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [loadingInventory, setLoadingInventory] = useState(false);
  const fileInputRef = useRef(null);
  const selectAllRef = useRef(null);
  const allowedUnits = useMemo(() => [...new Set([...unitOptions, ...(draft.baseUnit ? [draft.baseUnit] : [])])], [unitOptions, draft.baseUnit]);

  useEffect(() => {
    if (isOfflineUser()) return undefined;
    let cancelled = false;
    setLoadingInventory(true);
    getAllApiItems('/api/inventory/getAll').then((data) => {
      if (!cancelled) { setInventory(data.map(normalizeApiInventoryItem)); setApiError(''); }
    }).catch((error) => { if (!cancelled) setApiError(error instanceof Error ? error.message : 'Unable to load inventory.'); }).finally(() => { if (!cancelled) setLoadingInventory(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const openFromDashboard = () => {
      setDialog({ mode: 'add' });
      setDraft(emptyDraft());
      setDraftErrors({});
      setSaveError('');
    };
    window.addEventListener('kostaraa:inventory-add', openFromDashboard);
    return () => window.removeEventListener('kostaraa:inventory-add', openFromDashboard);
  }, []);

  const filteredInventory = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inventory.filter((item) => {
      const matchesCategory = categoryFilter === 'all' || itemCategory(item) === categoryFilter;
      const matchesSearch = !query || [item.material, item.baseUnit, itemCategory(item), unitCostLabel(item)].join(' ').toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, inventory, search]);
  const pageCount = Math.max(1, Math.ceil(filteredInventory.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filteredInventory.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const first = filteredInventory.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(safePage * PAGE_SIZE, filteredInventory.length);
  const allFilteredSelected = filteredInventory.length > 0 && filteredInventory.every((item) => selected.has(String(item.id)));
  const selectedFilteredCount = filteredInventory.reduce((count, item) => count + (selected.has(String(item.id)) ? 1 : 0), 0);
  const someFilteredSelected = selectedFilteredCount > 0 && !allFilteredSelected;
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);
  useEffect(() => { const ids = new Set(inventory.map((item) => String(item.id))); setSelected((current) => new Set([...current].filter((id) => ids.has(id)))); }, [inventory]);
  useEffect(() => { if (selectAllRef.current) selectAllRef.current.indeterminate = someFilteredSelected; }, [someFilteredSelected]);

  const openAdd = () => { setDialog({ mode: 'add' }); setDraft(emptyDraft()); setDraftErrors({}); setSaveError(''); };
  const openEdit = (item) => {
    setDialog({ mode: 'edit', id: item.id });
    setDraft({ material: item.material || '', category: itemCategory(item), itemCost: item.itemCost ?? '', qty: item.qty ?? '', baseUnit: item.baseUnit || '', gramsPerCup: item.gramsPerCup || '', piecesPerUnit: item.piecesPerUnit || '' });
    setDraftErrors({}); setSaveError('');
  };
  const openDuplicate = (item) => {
    setDialog({ mode: 'add' });
    setDraft({ material: `${item.material || 'Unnamed material'} copy`, category: itemCategory(item), itemCost: item.itemCost ?? '', qty: item.qty ?? '', baseUnit: item.baseUnit || '', gramsPerCup: item.gramsPerCup || '', piecesPerUnit: item.piecesPerUnit || '' });
    setDraftErrors({}); setSaveError('');
  };
  const closeDialog = () => { if (!saving) setDialog(null); };

  const saveMaterial = async () => {
    const errors = validateDraft(draft); setDraftErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    const existing = dialog?.mode === 'edit' ? inventory.find((item) => String(item.id) === String(dialog.id)) : null;
    const material = { ...(existing || {}), id: existing?.id || crypto.randomUUID(), material: draft.material.trim(), category: draft.category, item_type: categoryToType(draft.category), itemCost: Number(draft.itemCost), qty: Number(draft.qty), baseUnit: draft.baseUnit, gramsPerCup: Number(draft.gramsPerCup) || 0, piecesPerUnit: Number(draft.piecesPerUnit) || 0 };
    if (isOfflineUser()) { setInventory(existing ? inventory.map((item) => item.id === existing.id ? material : item) : [material, ...inventory]); setDialog(null); return; }
    setSaving(true); setSaveError('');
    try {
      const data = await apiJson(existing ? `/api/inventory/update/${encodeURIComponent(existing.id)}` : '/api/inventory/add', { method: existing ? 'PATCH' : 'POST', body: JSON.stringify(inventoryApiPayload(material)) });
      const saved = normalizeApiInventoryItem(existing ? { ...material, ...(getApiItem(data) || {}) } : getCreatedInventoryItem(data, material));
      setInventory(existing ? inventory.map((item) => item.id === existing.id ? saved : item) : [saved, ...inventory]); setDialog(null);
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Unable to save this material.'); } finally { setSaving(false); }
  };

  const deleteIds = async (ids) => {
    const values = [...ids]; if (!values.length) return;
    if (!window.confirm(values.length === 1 ? 'Delete this material? This cannot be undone.' : `Delete ${values.length} materials? This cannot be undone.`)) return;
    setApiError('');
    try {
      if (!isOfflineUser()) await Promise.all(values.map((id) => apiJson(`/api/inventory/delete/${encodeURIComponent(id)}`, { method: 'DELETE' })));
      const idSet = new Set(values.map(String)); setInventory(inventory.filter((item) => !idSet.has(String(item.id)))); setSelected(new Set()); setDialog(null);
    } catch (error) { setApiError(error instanceof Error ? error.message : 'Unable to delete the selected material.'); }
  };

  const toggleFiltered = () => setSelected((current) => { const next = new Set(current); filteredInventory.forEach((item) => allFilteredSelected ? next.delete(String(item.id)) : next.add(String(item.id))); return next; });

  const exportInventory = async () => {
    const XLSX = await import('xlsx');
    const rows = filteredInventory.map((item) => ({ Material: item.material || '', Category: itemCategory(item), 'Purchase Amount': Number(item.itemCost) || 0, 'Purchase Quantity': Number(item.qty) || 0, 'Base Unit': item.baseUnit || '', 'Grams Per Cup': Number(item.gramsPerCup) || '', 'Pieces Per Pack': Number(item.piecesPerUnit) || '', 'Unit Cost': unitCostLabel(item) }));
    const worksheet = XLSX.utils.json_to_sheet(rows); worksheet['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory'); XLSX.writeFile(workbook, 'kostaraa-inventory.xlsx');
  };

  const importInventory = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setImportMessage(''); setImportError('');
    try {
      const XLSX = await import('xlsx'); const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' }); const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
      if (!rows.length) throw new Error('The spreadsheet does not contain any material rows.');
      const importedItems = rows.map((row, index) => {
        const material = String(row.Material || '').trim(); const itemCost = Number(row['Purchase Amount']); const qty = Number(row['Purchase Quantity'] ?? row['Stock Qty']); const rawUnit = String(row['Base Unit'] || '').trim().toLowerCase(); const baseUnit = ['grams', 'gram'].includes(rawUnit) ? 'g' : rawUnit;
        if (!material) throw new Error(`Row ${index + 2}: Material is required.`); if (!(itemCost > 0)) throw new Error(`Row ${index + 2}: Purchase Amount must be greater than 0.`); if (!(qty > 0)) throw new Error(`Row ${index + 2}: Purchase Quantity must be greater than 0.`); if (!ALL_UNITS.includes(baseUnit)) throw new Error(`Row ${index + 2}: Base Unit is not supported.`);
        const category = ITEM_CATEGORIES.includes(row.Category) ? row.Category : 'Raw Material'; return { id: crypto.randomUUID(), material, category, item_type: categoryToType(category), itemCost, qty, baseUnit, gramsPerCup: Number(row['Grams Per Cup']) || 0, piecesPerUnit: Number(row['Pieces Per Pack']) || 0 };
      });
      setInventory([...importedItems, ...inventory]); setImportMessage(`${importedItems.length} material${importedItems.length === 1 ? '' : 's'} imported successfully.`);
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Unable to import this spreadsheet.'); }
  };

  return <section className="inventory-page">
    <header className="inventory-page-header">
      <div>
        <h1>Inventory</h1>
      </div>
      <div className="inventory-page-actions">
        <button type="button" onClick={exportInventory}>
          <Download /> Download Excel
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          <FileUp /> Upload Excel
        </button>
        <input ref={fileInputRef} hidden type="file" accept=".xlsx,.xls" onChange={importInventory} />
        <button className="primary" type="button" onClick={openAdd}><Plus /> Add material</button>
      </div>
    </header>
    {importMessage ? <p className="inventory-alert success">{importMessage}</p> : null}{importError ? <p className="inventory-alert error">{importError}</p> : null}{apiError ? <p className="inventory-alert error">{apiError}</p> : null}{loadingInventory ? <p className="inventory-alert info">Loading inventory…</p> : null}
    {measurementGuide}
    <section className="inventory-list-card">
      <header className="inventory-list-toolbar"><label className="inventory-category-filter"><select aria-label="Filter inventory by category" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}><option value="all">All categories</option>{ITEM_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label className="inventory-search"><Search /><input aria-label="Search materials or packaging" placeholder="Search inventory…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label></header>
      <div className="inventory-list-heading"><span aria-hidden="true" /><span>Material</span><span>Unit Cost</span><span aria-hidden="true" /></div>
      <div className={`inventory-selection-bar${selected.size ? ' has-selection' : ''}`}><label className="inventory-select-all"><input ref={selectAllRef} aria-label={allFilteredSelected ? 'Deselect all filtered items' : 'Select all filtered items'} type="checkbox" checked={allFilteredSelected} onChange={toggleFiltered} /><b>{selected.size ? `${selected.size} selected` : 'Select all'}</b></label><span className="inventory-selection-spacer" />{selected.size ? <button className="inventory-delete-selection" type="button" onClick={() => deleteIds(selected)}><Trash2 aria-hidden="true" /> Delete</button> : null}</div>
      <div className={`inventory-list${selected.size ? ' has-selection' : ''}`}>{pageItems.map((item, index) => <article key={item.id}><label className="inventory-row-selector"><span aria-hidden="true">{(safePage - 1) * PAGE_SIZE + index + 1}</span><input aria-label={`Select ${item.material}`} type="checkbox" checked={selected.has(String(item.id))} onChange={() => setSelected((current) => { const next = new Set(current); const id = String(item.id); next.has(id) ? next.delete(id) : next.add(id); return next; })} /></label><button className="inventory-material" type="button" onClick={() => openEdit(item)}><span><b>{item.material || 'Unnamed material'}</b></span></button><p><b>{formatCurrency(getInventoryUnitCost(item))}</b><span>per {getInventoryCostUnit(item)}</span></p><InventoryActions item={item} openUp={index >= pageItems.length - 2} onEdit={() => openEdit(item)} onDuplicate={() => openDuplicate(item)} onDelete={() => deleteIds(new Set([String(item.id)]))} /></article>)}{!pageItems.length ? <div className="inventory-empty"><b>No materials found</b><span>{search || categoryFilter !== 'all' ? 'Try a different search or category.' : 'Add your first material or packaging item.'}</span><button type="button" onClick={openAdd}>+ Add material</button></div> : null}</div>
      <footer className="inventory-pagination"><span>Showing <b>{first}–{last}</b> of <b>{filteredInventory.length}</b></span><div><button type="button" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>← Previous</button><small>Page {safePage} of {pageCount}</small><button type="button" disabled={safePage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next →</button></div></footer>
    </section>
    {dialog ? <MaterialDialog draft={draft} errors={draftErrors} mode={dialog.mode} saving={saving} saveError={saveError} allowedUnits={allowedUnits} onChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))} onClose={closeDialog} onDelete={() => deleteIds(new Set([String(dialog.id)]))} onSave={saveMaterial} /> : null}
  </section>;
}
