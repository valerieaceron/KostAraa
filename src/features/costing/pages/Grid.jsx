import {useEffect, useMemo, useRef, useState} from 'react';
import {Check, Columns3, Plus, Save, Trash2} from 'lucide-react';
import {formatCurrency, formatNumber} from '../utils/calculations';
import {isBetaUser} from '../utils/beta-access';
import {getSessionUser} from '../utils/api';
import {calculateGridProduct, createGridMaterial, createGridProduct, gridSignature, gridStorageKey, gridUnits, gridValidation, selectGridMaterial} from '../utils/grid-model';
import {DetailModal} from './ProductsServices';
import '../styles/grid.css';

const columns = [
  {key: 'name', label: 'Product name', width: 210, input: true, required: true},
  {key: 'itemType', label: 'Type', width: 120, input: true, optional: true},
  {key: 'category', label: 'Category', width: 140, input: true, optional: true},
  {key: 'material', label: 'Material / packaging', width: 290, input: true, required: true},
  {key: 'quantity', label: 'Qty', width: 88, input: true, required: true},
  {key: 'unit', label: 'Unit', width: 85, input: true},
  {key: 'materialsCost', label: 'Materials', width: 112},
  {key: 'packagingCost', label: 'Packaging', width: 112, optional: true},
  {key: 'labor', label: 'Labor', width: 106},
  {key: 'operation', label: 'Operation cost', width: 125},
  {key: 'platform', label: 'Platform / item', width: 125, input: true, optional: true},
  {key: 'other', label: 'Other cost / item', width: 125, input: true, optional: true},
  {key: 'marketing', label: 'Marketing %', width: 112, input: true},
  {key: 'markup', label: 'Markup %', width: 106, input: true},
  {key: 'taxMode', label: 'Tax type', width: 140, input: true, optional: true},
  {key: 'taxPercentage', label: 'Tax %', width: 85, input: true, optional: true},
  {key: 'targetMargin', label: 'Target margin %', width: 132, input: true, optional: true},
  {key: 'totalCost', label: 'Product cost', width: 125},
  {key: 'suggested', label: 'Suggested price', width: 135},
  {key: 'targetPrice', label: 'Your price', width: 124, input: true},
  {key: 'profit', label: 'Est. profit', width: 115},
  {key: 'margin', label: 'Margin %', width: 103},
  {key: 'breakEven', label: 'Break-even price', width: 138, optional: true},
  {key: 'breakEvenUnits', label: 'Break-even units', width: 138, optional: true},
  {key: 'notes', label: 'Notes', width: 200, input: true, optional: true},
];
const defaultHidden = columns.filter(column => column.optional).map(column => column.key);
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

export default function Grid({betaAccess = false, inventory, business, onSave, onOpenSettings, onViewEdit, onDuplicate, onArchive}) {
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
  const production = (Number(business.labor?.workingDays) || 0) * (Number(business.labor?.outputPerDay) || 0);

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
    setNotice('Pasted into editable cells. Calculated columns stay automatic.');
  };
  const selectedColumn = columns.find(column => column.key === active.column);
  const cellAddress = `${String.fromCharCode(65 + Math.max(0, visibleColumns.findIndex(column => column.key === active.column)))}${active.row + 1}`;
  const hasInput = row => row.name.trim() || row.materials.some(material => material.materialId || material.name.trim());
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
    if (column.input) return <input disabled={disabled} aria-label={label} type={numericFields.includes(column.key) ? 'number' : 'text'} min="0" max={['taxPercentage', 'targetMargin'].includes(column.key) ? '99.99' : undefined} step="any" value={row[column.key]} placeholder={column.key === 'name' ? 'Product name…' : column.key === 'targetPrice' && hasInput(row) ? calculated.pricing.suggestedSellingPrice.toFixed(2) : ''} onChange={event => update(row.id, column.key, event.target.value)} />;
    const moneyValues = {materialsCost: calculated.results.materialCost, packagingCost: calculated.results.packagingCost, labor: calculated.results.costBreakdown.Labor, operation: calculated.results.overheadCost, totalCost: calculated.results.totalVariableCost, suggested: calculated.pricing.suggestedSellingPrice, profit: calculated.profit, breakEven: calculated.pricing.breakEvenSellingPrice};
    if (column.key === 'margin') return output(`${formatNumber(calculated.margin)}%`, row, calculated.profit < 0 ? 'grid-negative' : '');
    if (column.key === 'breakEvenUnits') return output(calculated.breakEvenUnits == null ? '—' : formatNumber(calculated.breakEvenUnits), row);
    return output(formatCurrency(moneyValues[column.key]), row, column.key === 'profit' && calculated.profit < 0 ? 'grid-negative' : '');
  };

  if (!betaAccess && !isBetaUser()) return null;
  return <div className="beta-grid-page grid-workbook">
    <div className="grid-toolbar">
      <button onClick={addProduct}><Plus size={15}/> Add product</button>
      <details className="grid-column-menu"><summary><Columns3 size={15}/> Columns</summary><div>{columns.filter(column => !column.required).map(column => <label key={column.key}><input type="checkbox" checked={!hidden.includes(column.key)} onChange={() => setHidden(current => current.includes(column.key) ? current.filter(key => key !== column.key) : [...current, column.key])}/>{column.label}</label>)}<button onClick={() => setHidden(defaultHidden)}>Reset columns</button></div></details>
      <span className="grid-draft-status">{storageError ? 'Draft could not be saved in this browser' : storageKey ? 'Draft kept in this browser' : 'Draft kept until you leave'}</span>
    </div>
    <div className="grid-formula-bar"><span>{cellAddress}</span><p><strong>{selectedColumn?.label}</strong>{selectedColumn?.input ? ' · Type directly in this cell' : ' · Calculated automatically'}</p></div>
    {!production && <p className="grid-setup-note">Set items produced per month in <button onClick={() => onOpenSettings?.()}>Business Settings</button> to include labor and operation costs.</p>}
    {!inventory.length && <p className="grid-setup-note">Add materials to Inventory first, then choose them in the Material column.</p>}
    <datalist id="grid-inventory-options">{inventory.map(item => <option key={item.id} value={item.material}/>)}</datalist>
    <div className="grid-table-wrap" ref={sheetRef} tabIndex={0} aria-label="Scrollable product costing sheet">
      <table aria-label="Product costing spreadsheet" onKeyDown={keyboard} onPaste={paste} onFocus={event => {const cell = event.target.closest('[data-column]'); if (cell) setActive({row: Number(cell.dataset.row), column: cell.dataset.column});}}>
        <colgroup><col style={{width: 42}}/>{visibleColumns.map(column => <col key={column.key} style={{width: column.width}}/>)}<col style={{width: 158}}/></colgroup>
        <thead><tr className="grid-column-letters"><th>#</th>{visibleColumns.map((column, index) => <th key={column.key} className={`${column.input ? 'grid-editable' : 'grid-calculated'}${column.key === 'name' ? ' grid-product-column' : ''}`}>{String.fromCharCode(65 + index)}{!column.input && <span>ƒ</span>}</th>)}<th/></tr><tr><th aria-label="Row number"/>{visibleColumns.map(column => <th scope="col" key={column.key} className={`${column.input ? 'grid-editable' : 'grid-calculated'}${column.key === 'name' ? ' grid-product-column' : ''}`} title={column.input ? 'Editable cell' : 'Calculated automatically'}>{column.label}</th>)}<th scope="col">Library</th></tr></thead>
        <tbody>{rows.map((row, index) => {
          const calculated = calculations[index];
          const unchanged = row.savedItem && row.savedSignature === gridSignature(row, calculated);
          return <tr key={row.id} className={errors[row.id] ? 'grid-row-invalid' : ''}>
            <th scope="row"><span>{index + 1}</span><button disabled={savingId === row.id} aria-label={`Delete product row ${index + 1}`} onClick={() => removeProduct(row)}><Trash2 size={13}/></button></th>
            {visibleColumns.map(column => <td key={column.key} data-row={index} data-column={column.key} tabIndex={column.input ? undefined : -1} className={`${column.input ? 'grid-editable' : 'grid-calculated'}${column.key === 'name' ? ' grid-product-column' : ''}`}>{renderCell(column, row, index, calculated)}{column.key === 'name' && errors[row.id] && <p className="grid-cell-error" role="alert">{errors[row.id]}</p>}</td>)}
            <td className="grid-row-actions">{unchanged ? <button aria-label={`Overview for ${row.name}`} onClick={() => setPreview(row.savedItem)}><Check size={14}/> Saved · Overview</button> : <><button disabled={Boolean(savingId) || !hasInput(row)} onClick={() => save(row, calculated)} aria-label={`${row.savedItem ? 'Update' : 'Save'} ${row.name || `product ${index + 1}`}`}><Save size={14}/>{savingId === row.id ? 'Saving…' : row.savedItem ? 'Update' : 'Save item'}</button></>}</td>
          </tr>;
        })}</tbody>
      </table>
      <button className="grid-add-row" onClick={addProduct}><Plus size={14}/> Add product row</button>
    </div>
    <div className="grid-sheet-footer"><span>{rows.filter(hasInput).length} products · Amounts per item</span><span>Tab: next cell · Enter: next row · Paste from Excel</span></div>
    <p className="grid-business-note">Labor and operation costs use Business Settings ÷ items produced per month. Your price uses the suggested price until you enter one.</p>
    {notice && <p className="grid-notice" role="status">{notice}{restoreRef.current && <button onClick={() => {const removed = restoreRef.current; setRows(current => {const next = [...current]; next.splice(removed.index, 0, removed.row); return next;});restoreRef.current=null;setNotice('Row restored.');}}>Undo</button>}</p>}
    {preview && <DetailModal item={preview} onClose={() => setPreview(null)} onViewEdit={onViewEdit} onDuplicate={onDuplicate} onArchive={async id => {await onArchive(id);setPreview(null);setRows(current=>current.map(row=>row.savedItem?.id===id?{...row,savedItem:null,savedSignature:null}:row));}}/>}
  </div>;
}
