import {useEffect, useMemo, useRef, useState} from 'react';
import {Check, Columns3, Download, Plus, Save, Trash2} from 'lucide-react';
import {formatCurrency, formatNumber} from '../utils/calculations';
import {isBetaUser} from '../utils/beta-access';
import {getSessionUser} from '../utils/api';
import {titleCaseName} from '../utils/display-text';
import {calculateGridProduct, createGridMaterial, createGridProduct, gridSignature, gridStorageKey, gridUnits, gridValidation, libraryItemToGridProduct, selectGridMaterial} from '../utils/grid-model';
import {DetailModal} from './ProductsServices';
import '../styles/grid.css';

const columns = [
  {key: 'name', label: 'Product name', group: 'Product', width: 210, input: true, required: true},
  {key: 'itemType', label: 'Type', group: 'Product', width: 120, input: true, optional: true},
  {key: 'category', label: 'Category', group: 'Product', width: 140, input: true, optional: true},
  {key: 'material', label: 'Materials & packaging', group: 'Cost inputs', width: 290, input: true, required: true},
  {key: 'quantity', label: 'Quantity', group: 'Cost inputs', width: 92, input: true, required: true},
  {key: 'unit', label: 'Unit', group: 'Cost inputs', width: 85, input: true},
  {key: 'materialsCost', label: 'Material cost', group: 'Cost inputs', width: 118},
  {key: 'packagingCost', label: 'Packaging cost', group: 'Cost inputs', width: 124, optional: true},
  {key: 'labor', label: 'Labor cost/item', group: 'Cost inputs', width: 122},
  {key: 'operation', label: 'Operating cost/item', group: 'Cost inputs', width: 138},
  {key: 'platform', label: 'Platform fee/item', group: 'Pricing inputs', width: 132, input: true, optional: true},
  {key: 'other', label: 'Other cost/item', group: 'Pricing inputs', width: 125, input: true, optional: true},
  {key: 'marketing', label: 'Marketing %', group: 'Pricing inputs', width: 112, input: true},
  {key: 'markup', label: 'Markup %', group: 'Pricing inputs', width: 106, input: true},
  {key: 'taxMode', label: 'Tax type', group: 'Pricing inputs', width: 140, input: true, optional: true},
  {key: 'taxPercentage', label: 'Tax %', group: 'Pricing inputs', width: 85, input: true, optional: true},
  {key: 'targetMargin', label: 'Target margin %', group: 'Pricing inputs', width: 132, input: true, optional: true},
  {key: 'targetPrice', label: 'Target price', group: 'Pricing inputs', width: 124, input: true},
  {key: 'totalCost', label: 'Total cost/item', group: 'Results', width: 125, result: true},
  {key: 'suggested', label: 'Suggested price', group: 'Results', width: 135, result: true},
  {key: 'profit', label: 'Estimated profit/item', group: 'Results', width: 145, result: true},
  {key: 'margin', label: 'Profit margin', group: 'Results', width: 112, result: true},
  {key: 'breakEven', label: 'Break-even price', group: 'Results', width: 138, optional: true, result: true},
  {key: 'breakEvenUnits', label: 'Break-even units', group: 'Results', width: 138, optional: true, result: true},
  {key: 'notes', label: 'Notes', group: 'Product', width: 200, input: true, optional: true},
];
const viewColumns = {
  essentials: ['name', 'totalCost', 'suggested', 'targetPrice', 'profit', 'margin'],
  pricing: ['name', 'materialsCost', 'packagingCost', 'labor', 'operation', 'marketing', 'markup', 'taxMode', 'taxPercentage', 'targetMargin', 'totalCost', 'suggested', 'targetPrice', 'profit', 'margin', 'breakEven', 'breakEvenUnits'],
  full: columns.map(column => column.key),
};
const hiddenForView = view => columns.filter(column => !viewColumns[view].includes(column.key)).map(column => column.key);
const defaultHidden = hiddenForView('essentials');
const numericFields = ['marketing', 'markup', 'targetPrice', 'platform', 'other', 'taxPercentage', 'targetMargin'];
const taxRates = {exempt: 0, vat: 12, percentage: 3, income8: 8};

function readSheet(key) {
  try {
    const stored = key && JSON.parse(localStorage.getItem(key) || 'null');
    if (stored?.rows?.length && stored.rows.every(row => typeof row.name === 'string' && Array.isArray(row.materials) && row.materials.length)) {
      return {rows: stored.rows, hidden: Array.isArray(stored.hidden) ? stored.hidden : defaultHidden};
    }
  } catch { /* An unavailable draft must not prevent opening the sheet. */ }
  return {rows: [createGridProduct(), createGridProduct(), createGridProduct()], hidden: defaultHidden};
}

export default function Grid({betaAccess = false, inventory, business, libraryItems = [], onSave, onOpenSettings, onViewEdit, onDuplicate, onArchive}) {
  const [storageKey] = useState(() => gridStorageKey(getSessionUser()));
  const [initial] = useState(() => readSheet(storageKey));
  const [rows, setRows] = useState(initial.rows);
  const [hidden, setHidden] = useState(initial.hidden);
  const [savingId, setSavingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [storageError, setStorageError] = useState(false);
  const [preview, setPreview] = useState(null);
  const [active, setActive] = useState({row: 0, column: 'name', component: 0});
  const [notice, setNotice] = useState('');
  const saveLock = useRef(false);
  const sheetRef = useRef(null);
  const restoreRef = useRef(null);
  const calculations = useMemo(() => rows.map(row => calculateGridProduct(row, inventory, business)), [rows, inventory, business]);
  const visibleColumns = columns.filter(column => !hidden.includes(column.key));
  const keysForView = view => columns.filter(column => viewColumns[view].includes(column.key)).map(column => column.key);
  const visibleKey = visibleColumns.map(column => column.key).join(',');
  const currentView = Object.keys(viewColumns).find(view => keysForView(view).join(',') === visibleKey) || 'custom';
  const columnGroups = visibleColumns.reduce((groups, column) => {
    const previous = groups.at(-1);
    if (previous?.name === column.group) previous.span += 1;
    else groups.push({name: column.group, span: 1});
    return groups;
  }, []);
  const production = (Number(business.labor?.workingDays) || 0) * (Number(business.labor?.outputPerDay) || 0);
  const hasInput = row => row.name.trim() || row.materials.some(material => material.materialId || material.name.trim());

  useEffect(() => {
    setRows(current => {
      const existingByLibraryId = new Map(current.filter(row => row.savedItem?.id != null).map(row => [String(row.savedItem.id), row]));
      const drafts = current.filter(row => !row.savedItem && hasInput(row));
      const libraryRows = libraryItems.map(item => {
        const existing = existingByLibraryId.get(String(item.id));
        if (existing) {
          const currentSignature = gridSignature(existing, calculateGridProduct(existing, inventory, business));
          if (existing.savedSignature && existing.savedSignature !== currentSignature) return {...existing, savedItem: item};
        }
        const row = libraryItemToGridProduct(item, inventory);
        return {...row, savedSignature: gridSignature(row, calculateGridProduct(row, inventory, business))};
      });
      const next = [...libraryRows, ...drafts];
      return next.length ? next : [createGridProduct(), createGridProduct(), createGridProduct()];
    });
  }, [libraryItems, inventory]);

  const applyView = view => {
    setHidden(hiddenForView(view));
    setActive(current => viewColumns[view].includes(current.column) ? current : {...current, column: keysForView(view)[0]});
  };

  useEffect(() => { if(sheetRef.current)sheetRef.current.scrollLeft=0; }, []);

  useEffect(() => {
    if (!storageKey) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify({rows, hidden})); setStorageError(false); }
      catch { setStorageError(true); }
    }, 300);
    return () => clearTimeout(timer);
  }, [rows, hidden, storageKey]);
  // Save immediately on navigation too, before the autosave timer has fired.
  useEffect(() => {
    const snapshot = () => { try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify({rows, hidden})); } catch { /* Reported by the autosave status. */ } };
    window.addEventListener('pagehide', snapshot);
    return () => { snapshot(); window.removeEventListener('pagehide', snapshot); };
  }, [rows, hidden, storageKey]);

  const update = (id, field, value) => {
    setRows(current => current.map(row => row.id === id ? {...row, [field]: value} : row));
    setErrors(current => ({...current, [id]: ''}));
  };
  const updateMaterial = (id, materialId, field, value) => {
    setRows(current => current.map(row => row.id !== id ? row : {...row, materials: row.materials.map(material => material.id !== materialId ? material
      : field === 'name' ? selectGridMaterial(material, value, inventory) : {...material, [field]: value})}));
    setErrors(current => ({...current, [id]: ''}));
  };
  const focusCell = (rowIndex, key, component = 0) => {
    window.requestAnimationFrame(() => {
      const cell = sheetRef.current?.querySelector(`[data-row="${rowIndex}"][data-column="${key}"]`);
      const inputs = cell?.querySelectorAll('input, select');
      (inputs?.[Math.min(component, inputs.length - 1)] || cell)?.focus();
    });
  };
  const addProduct = () => {
    const index = rows.length;
    setRows(current => [...current, createGridProduct()]);
    focusCell(index, 'name');
  };
  const addMaterial = (row, kind) => {
    update(row.id, 'materials', [...row.materials, createGridMaterial(kind)]);
    focusCell(rows.findIndex(entry => entry.id === row.id), 'material', row.materials.length * 2 + 1);
  };
  const removeProduct = row => {
    const index = rows.findIndex(entry => entry.id === row.id);
    restoreRef.current = {row, index};
    setRows(current => current.length === 1 ? [createGridProduct()] : current.filter(entry => entry.id !== row.id));
    setNotice('Row removed from this sheet. Saved Library items are kept.');
  };
  const exportGrid = async () => {
    const XLSX = await import('xlsx');
    const worksheetRows = rows.flatMap((row, rowIndex) => {
      if (!hasInput(row)) return [];
      const calculated = calculations[rowIndex];
      return row.materials.map((material, materialIndex) => ({
        'Product Row': rowIndex + 1,
        'Product Name': titleCaseName(row.name),
        Type: row.itemType,
        Category: row.category,
        'Material Type': material.kind === 'packaging' ? 'Packaging' : 'Raw material',
        Material: material.name,
        Quantity: Number(material.usedQuantity) || 0,
        Unit: material.usedUnit,
        'Marketing %': Number(row.marketing) || 0,
        'Markup %': Number(row.markup) || 0,
        'Tax Type': row.taxMode,
        'Tax %': Number(row.taxPercentage) || 0,
        'Target Margin %': Number(row.targetMargin) || 0,
        'Target Price': Number(row.targetPrice) || '',
        'Platform Fee/Item': Number(row.platform) || 0,
        'Other Cost/Item': Number(row.other) || 0,
        Notes: row.notes,
        'Total Cost/Item': materialIndex ? '' : calculated.results.totalVariableCost,
        'Suggested Price': materialIndex ? '' : calculated.pricing.suggestedSellingPrice,
        'Estimated Profit/Item': materialIndex ? '' : calculated.profit,
        'Profit Margin %': materialIndex ? '' : calculated.margin,
        'Break-even Price': materialIndex ? '' : calculated.pricing.breakEvenSellingPrice,
        'Break-even Units': materialIndex ? '' : calculated.breakEvenUnits ?? '',
      }));
    });
    const worksheet = XLSX.utils.json_to_sheet(worksheetRows, {header: ['Product Row', 'Product Name', 'Type', 'Category', 'Material Type', 'Material', 'Quantity', 'Unit', 'Marketing %', 'Markup %', 'Tax Type', 'Tax %', 'Target Margin %', 'Target Price', 'Platform Fee/Item', 'Other Cost/Item', 'Notes', 'Total Cost/Item', 'Suggested Price', 'Estimated Profit/Item', 'Profit Margin %', 'Break-even Price', 'Break-even Units']});
    worksheet['!cols'] = [{wch: 12}, {wch: 28}, {wch: 13}, {wch: 18}, {wch: 16}, {wch: 28}, {wch: 11}, {wch: 10}, ...Array(8).fill({wch: 16}), {wch: 32}, ...Array(6).fill({wch: 18})];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Costing Grid');
    XLSX.writeFile(workbook, 'kostaraa-costing-grid.xlsx');
    setNotice('Downloaded the current worksheet as an Excel file.');
  };
  const save = async (row, calculated) => {
    if (saveLock.current) return;
    const validation = gridValidation(row, inventory, business);
    if (validation) { setErrors(current => ({...current, [row.id]: validation})); return; }
    saveLock.current = true; setSavingId(row.id); setErrors(current => ({...current, [row.id]: ''}));
    try {
      const item = await onSave(calculated.draft, calculated.metadata);
      const signature = gridSignature(row, calculated);
      setRows(current => current.map(entry => entry.id === row.id ? {...entry, savedItem: item, savedSignature: signature} : entry));
      setPreview(item);
    } catch (error) { setErrors(current => ({...current, [row.id]: error.message || 'Unable to save. Your inputs are kept.'})); }
    finally { saveLock.current = false; setSavingId(null); }
  };

  const keyboard = event => {
    const cell = event.target.closest('[data-column]');
    if (!cell || event.target.tagName === 'BUTTON') return;
    const rowIndex = Number(cell.dataset.row);
    const key = cell.dataset.column;
    const inputs = [...cell.querySelectorAll('input,select')];
    const component = Math.max(0, inputs.indexOf(event.target));
    // Native select arrows and input text arrows retain their usual behavior.
    if (event.key === 'Enter' && event.target.tagName !== 'SELECT') {
      event.preventDefault();
      if (component < inputs.length - 1 && !event.shiftKey) { inputs[component + 1].focus(); return; }
      const next = rowIndex + (event.shiftKey ? -1 : 1);
      if (next >= rows.length) setRows(current => [...current, createGridProduct()]);
      if (next >= 0) focusCell(next, key, 0);
    } else if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault(); focusCell(Math.max(0, Math.min(rows.length - 1, rowIndex + (event.key === 'ArrowDown' ? 1 : -1))), key, component);
    }
  };
  const paste = event => {
    const text = event.clipboardData.getData('text/plain');
    if (!/[\t\n]/.test(text)) return;
    const cell = event.target.closest('[data-column]');
    if (!cell || !columns.find(column => column.key === cell.dataset.column)?.input || savingId) return;
    const matrix = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(line => line.split('\t'));
    if (matrix.length > 200) { event.preventDefault(); setNotice('Paste up to 200 product rows at a time.'); return; }
    const startRow = Number(cell.dataset.row);
    const startColumn = visibleColumns.findIndex(column => column.key === cell.dataset.column);
    event.preventDefault();
    setRows(current => {
      const next = current.map(row => ({...row, materials: row.materials.map(material => ({...material}))}));
      matrix.forEach((values, offset) => {
        const index = startRow + offset;
        if (!next[index]) next[index] = createGridProduct();
        values.forEach((value, columnOffset) => {
          const field = visibleColumns[startColumn + columnOffset]?.key;
          const row = next[index];
          if (field === 'material') row.materials[0] = selectGridMaterial(row.materials[0], value, inventory);
          else if (field === 'quantity' && Number(value) >= 0) row.materials[0].usedQuantity = value;
          else if (field === 'unit' && gridUnits.includes(value.trim())) row.materials[0].usedUnit = value.trim();
          else if (numericFields.includes(field) && value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0) row[field] = value;
          else if (['name', 'category', 'notes'].includes(field)) row[field] = value;
          else if (field === 'itemType' && ['Product', 'Service'].includes(value.trim())) row.itemType = value.trim();
          else if (field === 'taxMode' && Object.hasOwn(taxRates, value.trim())) { row.taxMode = value.trim(); row.taxPercentage = taxRates[value.trim()]; }
        });
      });
      return next;
    });
    setNotice('Pasted into editable cells. Kostaraa recalculated the results.');
  };
  const selectedColumn = columns.find(column => column.key === active.column);
  const cellAddress = `${String.fromCharCode(65 + Math.max(0, visibleColumns.findIndex(column => column.key === active.column)))}${active.row + 1}`;
  const output = (value, row, className = '') => <output className={className}>{hasInput(row) ? value : '—'}</output>;
  const renderCell = (column, row, index, calculated) => {
    const disabled = savingId === row.id;
    const label = `${column.label}, product ${index + 1}`;
    if (['material', 'quantity', 'unit'].includes(column.key)) return <div className="grid-material-stack">
      {row.materials.map((material, component) => <div className="grid-material-line" key={material.id}>
        {column.key === 'material' ? <>
          <select disabled={disabled} aria-label={`Material type, product ${index + 1}, material ${component + 1}`} value={material.kind} onChange={event => updateMaterial(row.id, material.id, 'kind', event.target.value)}><option value="material">Raw</option><option value="packaging">Pack</option></select>
          <input disabled={disabled} aria-label={`Material, product ${index + 1}, material ${component + 1}`} list="grid-inventory-options" value={material.name} placeholder="Type a material…" onChange={event => updateMaterial(row.id, material.id, 'name', event.target.value)} />
          {row.materials.length > 1 && <button disabled={disabled} aria-label={`Remove material ${component + 1} from product ${index + 1}`} onClick={() => update(row.id, 'materials', row.materials.filter(entry => entry.id !== material.id))}>×</button>}
        </> : column.key === 'quantity' ? <input disabled={disabled} type="number" min="0" step="any" aria-label={`Quantity, product ${index + 1}, material ${component + 1}`} value={material.usedQuantity} onChange={event => updateMaterial(row.id, material.id, 'usedQuantity', event.target.value)} />
          : <select disabled={disabled} aria-label={`Unit, product ${index + 1}, material ${component + 1}`} value={material.usedUnit} onChange={event => updateMaterial(row.id, material.id, 'usedUnit', event.target.value)}>{gridUnits.map(unit => <option key={unit}>{unit}</option>)}</select>}
      </div>)}
      {column.key === 'material' ? <div className="grid-add-material"><button disabled={disabled} onClick={() => addMaterial(row, 'material')}>+ Material</button><button disabled={disabled} onClick={() => addMaterial(row, 'packaging')}>+ Packaging</button></div> : <div className="grid-material-spacer"/>}
    </div>;
    if (column.key === 'itemType') return <select disabled={disabled} aria-label={label} value={row.itemType} onChange={event => update(row.id, 'itemType', event.target.value)}><option>Product</option><option>Service</option></select>;
    if (column.key === 'taxMode') return <select disabled={disabled} aria-label={label} value={row.taxMode} onChange={event => {update(row.id, 'taxMode', event.target.value); update(row.id, 'taxPercentage', taxRates[event.target.value]);}}><option value="exempt">Tax exempt</option><option value="vat">VAT</option><option value="percentage">Percentage tax</option><option value="income8">Income tax 8%</option></select>;
    if (column.input) return <input disabled={disabled} aria-label={label} type={numericFields.includes(column.key) ? 'number' : 'text'} min="0" max={['taxPercentage', 'targetMargin'].includes(column.key) ? '99.99' : undefined} step="any" value={column.key === 'name' ? titleCaseName(row[column.key]) : row[column.key]} placeholder={column.key === 'name' ? 'Product name…' : column.key === 'targetPrice' && hasInput(row) ? 'Add target price' : ''} onChange={event => update(row.id, column.key, event.target.value)} />;
    const moneyValues = {materialsCost: calculated.results.materialCost, packagingCost: calculated.results.packagingCost, labor: calculated.results.costBreakdown.Labor, operation: calculated.results.overheadCost, totalCost: calculated.results.totalVariableCost, suggested: calculated.pricing.suggestedSellingPrice, profit: calculated.profit, breakEven: calculated.pricing.breakEvenSellingPrice};
    if (column.key === 'margin') return output(`${formatNumber(calculated.margin)}%`, row, calculated.profit < 0 ? 'grid-negative' : '');
    if (column.key === 'breakEvenUnits') return output(calculated.breakEvenUnits == null ? '—' : formatNumber(calculated.breakEvenUnits), row);
    return output(formatCurrency(moneyValues[column.key]), row, column.key === 'profit' && calculated.profit < 0 ? 'grid-negative' : '');
  };

  if (!betaAccess && !isBetaUser()) return null;
  return <div className="beta-grid-page grid-workbook">
    <header className="grid-page-header">
      <div><h1>Product Library Grid</h1><p>View and update your Product Library in one worksheet.</p></div>
      <div className="grid-header-meta">
        <span className="grid-beta-label">Beta workspace</span>
        <div className="grid-legend" aria-label="Cell guide"><span><i className="editable"/>Editable</span><span><i className="calculated"/>Calculated</span></div>
      </div>
    </header>
    <div className="grid-toolbar">
      <button onClick={addProduct}><Plus size={15}/> Add product</button>
      <button className="grid-secondary-action" onClick={exportGrid}><Download size={15}/> Download Excel</button>
      <details className="grid-column-menu"><summary><Columns3 size={15}/> Customize</summary><div>{columns.filter(column => column.key !== 'name').map(column => <label key={column.key}><input type="checkbox" checked={!hidden.includes(column.key)} onChange={() => setHidden(current => current.includes(column.key) ? current.filter(key => key !== column.key) : [...current, column.key])}/>{column.label}</label>)}<button onClick={() => applyView('essentials')}>Use Essentials view</button></div></details>
      {storageError && <span className="grid-draft-status">Couldn’t save this worksheet on this device</span>}
    </div>
    <div className="grid-formula-bar">
      <div className="grid-cell-context"><span>{cellAddress}</span><p><strong>{selectedColumn?.label}</strong>{selectedColumn?.input ? ' · Edit this value' : ' · Calculated by Kostaraa'}</p></div>
      <div className="grid-view-control">
        <span>Show columns</span>
        <div className="grid-view-switcher" role="group" aria-label="Choose worksheet columns">{[['essentials', 'Essentials'], ['pricing', 'Price testing'], ['full', 'Detailed costing']].map(([view, label]) => <button key={view} className={currentView === view ? 'active' : ''} aria-pressed={currentView === view} onClick={() => applyView(view)}>{label}</button>)}</div>
      </div>
    </div>
    {!production && <p className="grid-setup-note">Set items produced per month in <button onClick={() => onOpenSettings?.()}>Business Settings</button> to include labor and operating costs.</p>}
    {!inventory.length && <p className="grid-setup-note">Add materials to Inventory first, then choose them in the Material column.</p>}
    <datalist id="grid-inventory-options">{inventory.map(item => <option key={item.id} value={item.material}/>)}</datalist>
    <div className="grid-table-wrap" ref={sheetRef} tabIndex={0} aria-label="Scrollable product costing sheet">
      <table aria-label="Product costing spreadsheet" onKeyDown={keyboard} onPaste={paste} onFocus={event => {const cell = event.target.closest('[data-column]'); if (cell) setActive({row: Number(cell.dataset.row), column: cell.dataset.column});}}>
        <colgroup><col style={{width: 42}}/>{visibleColumns.map(column => <col key={column.key} style={{width: column.width}}/>)}<col style={{width: 158}}/></colgroup>
        <thead><tr className="grid-column-letters"><th>#</th>{visibleColumns.map((column, index) => <th key={column.key} className={`${column.input ? 'grid-editable' : 'grid-calculated'}${column.result ? ' grid-result' : ''}${column.key === 'name' ? ' grid-product-column' : ''}`}>{String.fromCharCode(65 + index)}{!column.input && <span>ƒ</span>}</th>)}<th/></tr><tr className="grid-column-groups"><th aria-hidden="true"/>{columnGroups.map((group, index) => <th key={`${group.name}-${index}`} colSpan={group.span}>{group.name}</th>)}<th>Status</th></tr><tr className="grid-column-labels"><th aria-label="Row number"/>{visibleColumns.map(column => <th scope="col" key={column.key} className={`${column.input ? 'grid-editable' : 'grid-calculated'}${column.result ? ' grid-result' : ''}${column.key === 'name' ? ' grid-product-column' : ''}`} title={column.input ? 'Editable cell' : 'Calculated automatically'}>{column.label}</th>)}<th scope="col">Status</th></tr></thead>
        <tbody>{rows.map((row, index) => {
          const calculated = calculations[index];
          const unchanged = row.savedItem && row.savedSignature === gridSignature(row, calculated);
          return <tr key={row.id} className={errors[row.id] ? 'grid-row-invalid' : ''}>
            <th scope="row"><span>{index + 1}</span>{!row.savedItem && <button disabled={savingId === row.id} aria-label={`Delete draft row ${index + 1}`} onClick={() => removeProduct(row)}><Trash2 size={13}/></button>}</th>
            {visibleColumns.map(column => <td key={column.key} data-row={index} data-column={column.key} tabIndex={column.input ? undefined : -1} className={`${column.input ? 'grid-editable' : 'grid-calculated'}${column.result ? ' grid-result' : ''}${column.key === 'name' ? ' grid-product-column' : ''}`}>{renderCell(column, row, index, calculated)}{column.key === 'name' && errors[row.id] && <p className="grid-cell-error" role="alert">{errors[row.id]}</p>}</td>)}
            <td className="grid-row-actions">{unchanged ? <button aria-label={`Overview for ${row.name}`} onClick={() => setPreview(row.savedItem)}><Check size={14}/> {row.savedItem?.status || 'Saved'} · Overview</button> : <><button disabled={Boolean(savingId) || !hasInput(row)} onClick={() => save(row, calculated)} aria-label={`${row.savedItem ? 'Update' : 'Save'} ${row.name || `product ${index + 1}`}`}><Save size={14}/>{savingId === row.id ? 'Saving…' : row.savedItem ? 'Update Library' : 'Save to Library'}</button></>}</td>
          </tr>;
        })}</tbody>
      </table>
      <button className="grid-add-row" onClick={addProduct}><Plus size={14}/> Add product row</button>
    </div>
    <div className="grid-sheet-footer"><span>{libraryItems.length} Library items · {rows.filter(row => !row.savedItem && hasInput(row)).length} unsaved drafts · Currency values shown per item</span><span>Tab: next cell · Enter: next row · Paste from Excel</span></div>
    {notice && <p className="grid-notice" role="status">{notice}{restoreRef.current && <button onClick={() => {const removed = restoreRef.current; setRows(current => {const next = [...current]; next.splice(removed.index, 0, removed.row); return next;});restoreRef.current=null;setNotice('Row restored.');}}>Undo</button>}</p>}
    {preview && <DetailModal item={preview} onClose={() => setPreview(null)} onViewEdit={onViewEdit} onDuplicate={onDuplicate} onArchive={async id => {await onArchive(id);setPreview(null);setRows(current=>current.map(row=>row.savedItem?.id===id?{...row,savedItem:null,savedSignature:null}:row));}}/>}
  </div>;
}
