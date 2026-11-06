import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ArrowUpDown, Check, ChevronDown, ChevronUp, Columns3, Download, Filter, Plus, Redo2, Search, Save, Trash2, Undo2, X} from 'lucide-react';
import {formatCurrency, formatNumber, getInventoryCostUnit} from '../utils/calculations';
import {getSessionUser} from '../utils/api';
import {titleCaseName} from '../utils/display-text';
import {calculateGridProduct, createGridMaterial, createGridProduct, gridSignature, gridStorageKey, gridUnits, gridValidation, gridValidationIssue, libraryItemSignature, libraryItemToGridProduct, selectGridMaterial} from '../utils/grid-model';
import {DetailModal} from './ProductsServices';
import '../styles/grid.css';
import {featureVisitCount} from '../utils/feature-usage';
import {GridValidationGuide, GridInventoryDialog, GridProductionDialog} from './GridValidationGuide';

const columns = [
  {key: 'name', label: 'Product name', group: 'Product', width: 210, input: true, required: true},
  {key: 'itemType', label: 'Type', group: 'Product', width: 120, input: true, optional: true},
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
  {key: 'taxPercentage', label: 'Tax %', group: 'Pricing inputs', width: 85, optional: true},
  {key: 'targetMargin', label: 'Target margin %', group: 'Pricing inputs', width: 132, input: true, optional: true},
  {key: 'targetPrice', label: 'Target price', group: 'Pricing inputs', width: 124, input: true, required: true},
  {key: 'totalCost', label: 'Total cost/item', group: 'Results', width: 125, result: true},
  {key: 'suggested', label: 'Suggested price', group: 'Results', width: 135, result: true},
  {key: 'profit', label: 'Estimated profit/item', group: 'Results', width: 145, result: true},
  {key: 'margin', label: 'Profit margin', group: 'Results', width: 112, result: true},
  {key: 'breakEven', label: 'Break-even price', group: 'Results', width: 138, optional: true, result: true},
  {key: 'breakEvenUnits', label: 'Break-even units', group: 'Results', width: 138, optional: true, result: true},
  {key: 'notes', label: 'Notes', group: 'Product', width: 200, input: true, optional: true},
];
const viewColumns = {
  pricing: ['name', 'materialsCost', 'packagingCost', 'labor', 'operation', 'marketing', 'markup', 'taxMode', 'taxPercentage', 'targetMargin', 'totalCost', 'suggested', 'targetPrice', 'profit', 'margin', 'breakEven', 'breakEvenUnits'],
  full: columns.map(column => column.key),
};
const hiddenForView = view => columns.filter(column => !viewColumns[view].includes(column.key)).map(column => column.key);
const legacyEssentials = ['name', 'totalCost', 'suggested', 'targetPrice', 'profit', 'margin'];
const defaultHidden = hiddenForView('pricing');
const numericFields = ['marketing', 'markup', 'targetPrice', 'platform', 'other', 'targetMargin'];
const taxRates = {exempt: 0, vat: 12, percentage: 3, income8: 8};

function readSheet(key) {
  let hidden = defaultHidden;
  let columnWidths = {};
  try {
    const stored = key && JSON.parse(localStorage.getItem(key) || 'null');
    if (Array.isArray(stored?.hidden)) hidden = stored.hidden;
    const storedVisible = columns.filter(column => !hidden.includes(column.key)).map(column => column.key);
    if (storedVisible.join(',') === legacyEssentials.join(',')) hidden = defaultHidden;
    if (stored?.columnWidths && typeof stored.columnWidths === 'object') columnWidths = stored.columnWidths;
  } catch { /* An unavailable draft must not prevent opening the sheet. */ }
  // Product Library is the source of truth. Unsaved rows live only for the
  // current Grid session so old browser drafts cannot inflate the item count.
  return {rows: [createGridProduct(), createGridProduct(), createGridProduct()], hidden, columnWidths};
}

export default function Grid({inventory, business, libraryItems = [], onSave, onDeleteItems, onInventoryChange, onViewEdit, onDuplicate, onArchive}) {
  const [storageKey] = useState(() => gridStorageKey(getSessionUser()));
  const [initial] = useState(() => readSheet(storageKey));
  const [rows, setRows] = useState(initial.rows);
  const [hidden, setHidden] = useState(initial.hidden);
  const [columnWidths, setColumnWidths] = useState(initial.columnWidths);
  const [rowHeights, setRowHeights] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [guide, setGuide] = useState(null);
  const [setup, setSetup] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const [preview, setPreview] = useState(null);
  const [active, setActive] = useState({row: 0, column: 'name', component: 0});
  const [editingCell, setEditingCell] = useState(null);
  const [columnSelection, setColumnSelection] = useState(null);
  const [copiedCell, setCopiedCell] = useState(null);
  const [notice, setNotice] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [fillRange, setFillRange] = useState(null);
  const [expandedMaterialRows, setExpandedMaterialRows] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [rowFilter, setRowFilter] = useState('all');
  const [sortRule, setSortRule] = useState('original');
  const [saveGuideActive, setSaveGuideActive] = useState(false);
  const saveLock = useRef(false);
  const sheetRef = useRef(null);
  const selectAllRef = useRef(null);
  const rowsRef = useRef(rows);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const historyGroup = useRef({key: '', at: 0});
  const [, setHistoryVersion] = useState(0);
  rowsRef.current = rows;
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
  const displayedRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const entries = rows.map((row, index) => ({row, index, calculated: calculations[index]})).filter(({row, calculated}) => {
      if (query) {
        const searchable = [row.name,row.itemType,row.notes,row.targetPrice,...row.materials.flatMap(material=>[material.name,material.kind,material.usedQuantity,material.usedUnit]),calculated.results.totalVariableCost,calculated.pricing.suggestedSellingPrice,calculated.profit,calculated.margin].join(' ').toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      if (rowFilter === 'saved' && !row.savedItem) return false;
      if (rowFilter === 'unsaved' && (row.savedItem || !hasInput(row))) return false;
      if (rowFilter === 'changed' && (!row.savedItem || row.savedSignature === gridSignature(row, calculated))) return false;
      if (rowFilter === 'attention' && (!hasInput(row) || !gridValidation(row, inventory, business))) return false;
      if (rowFilter === 'product' && row.itemType !== 'Product') return false;
      if (rowFilter === 'service' && row.itemType !== 'Service') return false;
      return true;
    });
    const [field,direction] = sortRule.split('-');
    if (field === 'original') return entries;
    const value = entry => field === 'name' ? entry.row.name.toLowerCase() : field === 'target' ? Number(entry.row.targetPrice)||0 : field === 'cost' ? entry.calculated.results.totalVariableCost : field === 'suggested' ? entry.calculated.pricing.suggestedSellingPrice : field === 'margin' ? entry.calculated.margin : 0;
    return entries.map((entry,position)=>({...entry,position})).sort((left,right)=>{
      const a=value(left),b=value(right);
      const result=typeof a==='string'?a.localeCompare(b):a-b;
      return (direction==='desc'?-result:result)||(left.position-right.position);
    });
  }, [business, calculations, inventory, rowFilter, rows, searchQuery, sortRule]);
  const selectableRows = displayedRows.map(entry=>entry.row).filter(hasInput);
  const allSelected = Boolean(selectableRows.length) && selectableRows.every(row => selectedIds.has(row.id));
  const selectedRows = displayedRows.map(entry=>entry.row).filter(row => selectedIds.has(row.id));
  const dataViewActive = Boolean(searchQuery || rowFilter !== 'all' || sortRule !== 'original');
  const unsavedProductCount = useMemo(() => rows.reduce((count,row,index) => count + (hasInput(row) && (!row.savedItem || row.savedSignature !== gridSignature(row,calculations[index])) ? 1 : 0), 0), [calculations, rows]);
  const cloneRows = value => value.map(row => ({...row, materials: row.materials.map(material => ({...material}))}));
  const refreshHistory = () => setHistoryVersion(version => version + 1);
  const clearHistory = () => {
    undoStack.current = [];
    redoStack.current = [];
    historyGroup.current = {key: '', at: 0};
    setCopiedCell(null);
    refreshHistory();
  };
  const changeRows = (updater, groupKey = '') => {
    const current = rowsRef.current;
    const next = typeof updater === 'function' ? updater(current) : updater;
    if (next === current) return;
    const now = Date.now();
    const sameGroup = groupKey && historyGroup.current.key === groupKey && now - historyGroup.current.at < 800;
    if (!sameGroup) {
      undoStack.current.push(cloneRows(current));
      if (undoStack.current.length > 50) undoStack.current.shift();
    }
    redoStack.current = [];
    historyGroup.current = {key: groupKey, at: now};
    rowsRef.current = next;
    setRows(next);
    setCopiedCell(null);
    refreshHistory();
  };
  const undoGrid = () => {
    if (savingId || !undoStack.current.length) return;
    const previous = undoStack.current.pop();
    redoStack.current.push(cloneRows(rowsRef.current));
    rowsRef.current = previous;
    setRows(previous);
    historyGroup.current = {key: '', at: 0};
    setEditingCell(null);
    setErrors({});
    setNotice('Undid the last Grid change.');
    refreshHistory();
  };
  const redoGrid = () => {
    if (savingId || !redoStack.current.length) return;
    const next = redoStack.current.pop();
    undoStack.current.push(cloneRows(rowsRef.current));
    rowsRef.current = next;
    setRows(next);
    historyGroup.current = {key: '', at: 0};
    setEditingCell(null);
    setErrors({});
    setNotice('Redid the last Grid change.');
    refreshHistory();
  };
  const historyKeyboard = event => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && event.shiftKey) { event.preventDefault(); event.stopPropagation(); redoGrid(); }
    else if (key === 'z') { event.preventDefault(); event.stopPropagation(); undoGrid(); }
    else if (key === 'y') { event.preventDefault(); event.stopPropagation(); redoGrid(); }
  };

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedIds.size > 0 && !allSelected;
  }, [allSelected, selectedIds]);

  useEffect(() => {
    setSelectedIds(current => {
      const available = new Set(rows.map(row => row.id));
      const next = new Set([...current].filter(id => available.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [rows]);

  useEffect(() => { setSelectedIds(new Set()); }, [rowFilter, searchQuery, sortRule]);

  useEffect(() => {
    if (!storageKey) return;
    const key = `${storageKey}.araa-unsaved-guide`;
    if (!unsavedProductCount) {
      try { sessionStorage.removeItem(key); } catch { /* A later change can still trigger during this visit. */ }
      return;
    }
    try { if (sessionStorage.getItem(key) === '1') return; } catch { /* Continue with an in-memory notification. */ }
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem(key, '1'); } catch { /* Notification remains available for this visit. */ }
      window.dispatchEvent(new CustomEvent('kostaraa:araa-guide', {detail: {type: 'unsaved-grid', count: unsavedProductCount}}));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [storageKey, unsavedProductCount]);

  useEffect(() => {
    let timer;
    const highlightSave = () => {
      setSearchQuery('');
      setRowFilter('all');
      setSortRule('original');
      setSaveGuideActive(true);
      setNotice('Araa highlighted the row buttons that save or update products in your Product Library.');
      window.requestAnimationFrame(() => {
        const button = document.querySelector('.grid-save-product-action:not(:disabled)');
        button?.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
        button?.focus({preventScroll:true});
      });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setSaveGuideActive(false), 8000);
    };
    window.addEventListener('kostaraa:grid-highlight-save', highlightSave);
    return () => {window.removeEventListener('kostaraa:grid-highlight-save', highlightSave);window.clearTimeout(timer)};
  }, []);

  useEffect(() => {
    clearHistory();
    setRows(current => {
      const existingByLibraryId = new Map(current.filter(row => row.savedItem?.id != null).map(row => [String(row.savedItem.id), row]));
      const drafts = current.filter(row => !row.savedItem && hasInput(row));
      const libraryRows = libraryItems.map(item => {
        const existing = existingByLibraryId.get(String(item.id));
        const sourceSignature = libraryItemSignature(item);
        if (existing?.librarySignature === sourceSignature) return {...existing, savedItem: item};
        const row = libraryItemToGridProduct(item, inventory);
        return {...row, savedSignature: gridSignature(row, calculateGridProduct(row, inventory, business))};
      });
      const next = [...libraryRows, ...drafts];
      return next.length ? next : [createGridProduct(), createGridProduct(), createGridProduct()];
    });
  }, [libraryItems, inventory]);

  const applyView = view => {
    setColumnSelection(null);
    setHidden(hiddenForView(view));
    setActive(current => viewColumns[view].includes(current.column) ? current : {...current, column: keysForView(view)[0]});
  };

  useEffect(() => { if(sheetRef.current)sheetRef.current.scrollLeft=0; }, []);

  useEffect(() => {
    if (!storageKey) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify({hidden,columnWidths})); setStorageError(false); }
      catch { setStorageError(true); }
    }, 300);
    return () => clearTimeout(timer);
  }, [columnWidths, hidden, storageKey]);
  // Save the worksheet view immediately on navigation too.
  useEffect(() => {
    const snapshot = () => { try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify({hidden,columnWidths})); } catch { /* Reported by the autosave status. */ } };
    window.addEventListener('pagehide', snapshot);
    return () => { snapshot(); window.removeEventListener('pagehide', snapshot); };
  }, [columnWidths, hidden, storageKey]);

  const columnWidth = key => columnWidths[key] || columns.find(column => column.key === key)?.width || 120;
  const columnMinimum = key => key === 'material' ? 180 : key === 'name' ? 150 : 72;
  const setColumnWidth = (key, width) => setColumnWidths(current => ({...current, [key]: Math.max(columnMinimum(key), Math.min(480, Math.round(width)))}));
  const resizeColumnBy = (key, delta) => setColumnWidth(key, columnWidth(key) + delta);
  const beginColumnResize = (event, key) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = columnWidth(key);
    const move = pointerEvent => setColumnWidth(key, startWidth + pointerEvent.clientX - startX);
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      setNotice(`Resized ${columns.find(column => column.key === key)?.label || 'column'}.`);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  };
  const beginRowResize = (event, row) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const startHeight = event.currentTarget.closest('tr')?.getBoundingClientRect().height || 64;
    const move = pointerEvent => setRowHeights(current => ({...current, [row.id]: Math.max(44, Math.min(400, Math.round(startHeight + pointerEvent.clientY - startY)))}));
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      setNotice(`Resized product row ${rowsRef.current.findIndex(entry => entry.id === row.id) + 1}.`);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  };
  const resetColumnWidth = key => setColumnWidths(current => {const next={...current};delete next[key];return next});
  const resetSizes = () => {setColumnWidths({});setRowHeights({});setNotice('Reset Grid column widths and row heights.')};

  const update = (id, field, value) => {
    changeRows(current => current.map(row => row.id === id ? {...row, [field]: value} : row), `cell:${id}:${field}`);
    setErrors(current => ({...current, [id]: ''}));
  };
  const beginFill = (event, sourceIndex, field) => {
    if (event.button !== 0 || savingId || selectedIds.size || !numericFields.includes(field)) return;
    event.preventDefault();
    event.stopPropagation();
    const sourceValue = rows[sourceIndex]?.[field];
    let targetIndex = sourceIndex;
    const track = pointerEvent => {
      const cell = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)?.closest(`[data-column="${field}"]`);
      const nextIndex = Number(cell?.dataset.row);
      if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= rows.length) return;
      targetIndex = nextIndex;
      setFillRange({source: sourceIndex, target: nextIndex, column: field});
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', track);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
    };
    const cancel = () => { cleanup(); setFillRange(null); };
    const finish = pointerEvent => {
      track(pointerEvent);
      cleanup();
      if (targetIndex !== sourceIndex) {
        const sourcePosition = displayedRows.findIndex(entry => entry.index === sourceIndex);
        const targetPosition = displayedRows.findIndex(entry => entry.index === targetIndex);
        const start = Math.min(sourcePosition, targetPosition);
        const end = Math.max(sourcePosition, targetPosition);
        const affectedIndexes = new Set(displayedRows.slice(start, end + 1).map(entry => entry.index));
        const affectedIds = rows.filter((_,index)=>affectedIndexes.has(index)).map(row => row.id);
        changeRows(current => current.map((row, index) => affectedIndexes.has(index) ? {...row, [field]: sourceValue} : row));
        setErrors(current => affectedIds.reduce((next, id) => ({...next, [id]: ''}), current));
        const label = columns.find(column => column.key === field)?.label || 'value';
        setNotice(`Copied ${label.toLowerCase()} to ${end - start} additional product row${end - start === 1 ? '' : 's'}.`);
      }
      setFillRange(null);
    };
    setFillRange({source: sourceIndex, target: sourceIndex, column: field});
    window.addEventListener('pointermove', track);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
  };
  const updateMaterial = (id, materialId, field, value) => {
    changeRows(current => current.map(row => row.id !== id ? row : {...row, materials: row.materials.map(material => material.id !== materialId ? material
      : field === 'name' ? selectGridMaterial(material, value, inventory) : {...material, [field]: value})}), `material:${id}:${materialId}:${field}`);
    setErrors(current => ({...current, [id]: ''}));
  };
  const focusCell = (rowIndex, key, component = 0, selectNumber = true) => {
    setColumnSelection(null);
    setActive({row: rowIndex, column: key, component});
    setEditingCell({row: rowIndex, column: key});
    setCopiedCell(null);
    window.requestAnimationFrame(() => {
      const cell = sheetRef.current?.querySelector(`[data-row="${rowIndex}"][data-column="${key}"]`);
      const inputs = cell?.querySelectorAll('input, select');
      const control = inputs?.[Math.min(component, inputs.length - 1)] || cell;
      control?.focus();
      if (selectNumber && control instanceof HTMLInputElement && control.type === 'number') control.select();
    });
  };
  const guideTarget = useCallback(() => guide && sheetRef.current?.querySelector(`[data-row="${guide.rowIndex}"][data-column="${guide.issue.column}"]`), [guide]);
  const showIssue = (row, issue) => {
    const rowIndex = rows.findIndex(entry => entry.id === row.id);
    setSearchQuery(''); setRowFilter('all'); setSelectedIds(new Set());
    setHidden(current => current.filter(key => key !== issue.column));
    setExpandedMaterialRows(current => new Set(current).add(row.id));
    setGuide({rowId: row.id, rowIndex, issue});
    setErrors(current => ({...current, [row.id]: issue.message}));
  };
  useEffect(() => {
    if (!guide || setup) return;
    const component = guide.issue.materialIndex || 0;
    focusCell(guide.rowIndex, guide.issue.column, guide.issue.column === 'material' ? component * 2 + 1 : component);
  }, [guide, setup]);
  const checkNextIssue = () => {
    const row = rows.find(entry => entry.id === guide.rowId);
    if (!row) { setGuide(null); return; }
    if (guide.issue.type === 'info') {
      setGuide(null);
      setNotice('If you changed Tax type, click Update Library to save the change.');
      return;
    }
    const issue = gridValidationIssue(row, inventory, business);
    if (issue) showIssue(row, issue);
    else {
      setErrors(current => ({...current, [row.id]: ''}));
      setGuide(null);
      setNotice(`${row.name} is ready. Click Save to Library to save this product.`);
    }
  };
  const addProduct = () => {
    const index = rows.length;
    setSearchQuery('');
    setRowFilter('all');
    setSortRule('original');
    changeRows(current => [...current, createGridProduct()]);
    focusCell(index, 'name');
  };
  const addMaterial = (row, kind) => {
    setExpandedMaterialRows(current => new Set(current).add(row.id));
    update(row.id, 'materials', [...row.materials, createGridMaterial(kind)]);
    focusCell(rows.findIndex(entry => entry.id === row.id), 'material', row.materials.length * 2 + 1);
  };
  const toggleMaterials = row => {
    setExpandedMaterialRows(current => {
      const next = new Set(current);
      next.has(row.id) ? next.delete(row.id) : next.add(row.id);
      return next;
    });
    setEditingCell(null);
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
  const save = async (row, calculated, showPreview = true) => {
    if (saveLock.current) return false;
    const issue = gridValidationIssue(row, inventory, business);
    if (issue) { showIssue(row, issue); return false; }
    setGuide(null);
    saveLock.current = true; setSavingId(row.id); setErrors(current => ({...current, [row.id]: ''}));
    try {
      const item = await onSave(calculated.draft, calculated.metadata);
      const signature = gridSignature(row, calculated);
      setRows(current => current
        .filter(entry => entry.id === row.id || String(entry.savedItem?.id) !== String(item.id))
        .map(entry => entry.id === row.id ? {...entry, savedItem: item, savedSignature: signature, librarySignature: libraryItemSignature(item)} : entry));
      clearHistory();
      if (showPreview && featureVisitCount('grid') <= 3) {
        setSearchQuery(''); setRowFilter('all'); setSelectedIds(new Set());
        setHidden(current => current.filter(key => key !== 'taxMode'));
        setGuide({rowId: row.id, rowIndex: rows.findIndex(entry => entry.id === row.id), issue: {
          type: 'info', column: 'taxMode', message: 'Your product is saved. Please check your tax type.',
          options: ['Tax exempt: no tax applies.', 'VAT: your business is VAT-registered.', 'Percentage tax: your business uses percentage tax.', 'Income tax 8%: your business uses the 8% option.'],
        }});
      } else if (showPreview) setPreview(item);
      return true;
    } catch (error) { setErrors(current => ({...current, [row.id]: error.message || 'Unable to save. Your inputs are kept.'})); return false; }
    finally { saveLock.current = false; setSavingId(null); }
  };

  const toggleRow = id => setSelectedIds(current => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(selectableRows.map(row => row.id)));
  const handleSelectionRow = (event, row) => {
    if (event.target.closest('.grid-row-resizer')) return;
    if (!selectedIds.size || !hasInput(row)) return;
    event.preventDefault();
    event.stopPropagation();
    toggleRow(row.id);
  };
  const bulkSave = async () => {
    const targets = selectedRows.filter(row => {
      const index = rows.findIndex(entry => entry.id === row.id);
      if (index < 0 || !hasInput(row)) return false;
      return !row.savedItem || row.savedSignature !== gridSignature(row, calculations[index]);
    });
    if (!targets.length) { setNotice('Selected products are already synced with the Library.'); return; }
    if (!window.confirm(`Save ${targets.length} selected product${targets.length === 1 ? '' : 's'} to the Product Library?`)) return;
    let saved = 0;
    for (const row of targets) {
      const index = rows.findIndex(entry => entry.id === row.id);
      if (index >= 0) {
        if (await save(row, calculations[index], false)) saved += 1;
        else break;
      }
    }
    setSelectedIds(new Set());
    setNotice(`${saved} of ${targets.length} selected product${targets.length === 1 ? '' : 's'} saved to the Library.`);
  };
  const bulkDelete = async () => {
    if (!selectedRows.length) return;
    const saved = selectedRows.filter(row => row.savedItem?.id != null);
    const drafts = selectedRows.filter(row => !row.savedItem);
    const detail = [saved.length ? `${saved.length} saved Library product${saved.length === 1 ? '' : 's'}` : '', drafts.length ? `${drafts.length} unsaved draft${drafts.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ');
    const warning = saved.length ? ' Saved products will be permanently removed from the Product Library.' : '';
    if (!window.confirm(`Delete ${detail}?${warning}`)) return;
    if (saved.length) await onDeleteItems?.(saved.map(row => String(row.savedItem.id)));
    const selected = new Set(selectedRows.map(row => row.id));
    const removeSelected = current => {
      const next = current.filter(row => !selected.has(row.id));
      return next.length ? next : [createGridProduct(), createGridProduct(), createGridProduct()];
    };
    if (saved.length) { setRows(removeSelected); clearHistory(); }
    else changeRows(removeSelected);
    setSelectedIds(new Set());
    setNotice(`${selectedRows.length} selected row${selectedRows.length === 1 ? '' : 's'} deleted.`);
  };

  const clearCell = (rowIndex, key) => {
    const column = columns.find(entry => entry.key === key);
    const row = rowsRef.current[rowIndex];
    if (!row || !column?.input) {
      setNotice('Calculated cells cannot be cleared.');
      return;
    }
    if (['itemType', 'taxMode', 'unit'].includes(key)) {
      setNotice('This field needs a selected option. Double-click the cell to change it.');
      return;
    }
    changeRows(current => current.map((entry, index) => {
      if (index !== rowIndex) return entry;
      if (key === 'material') {
        const materials = entry.materials.map((material, materialIndex) => materialIndex ? material : selectGridMaterial(material, '', inventory));
        return {...entry, materials};
      }
      if (key === 'quantity') {
        const materials = entry.materials.map((material, materialIndex) => materialIndex ? material : {...material, usedQuantity: ''});
        return {...entry, materials};
      }
      return {...entry, [key]: ''};
    }));
    setErrors(current => ({...current, [row.id]: ''}));
    setNotice(`Cleared ${column.label.toLowerCase()}. Press Ctrl/Cmd+Z to undo.`);
  };

  const keyboard = event => {
    const cell = event.target.closest('[data-column]');
    if (!cell || event.target.tagName === 'BUTTON') return;
    const rowIndex = Number(cell.dataset.row);
    const key = cell.dataset.column;
    const inputs = [...cell.querySelectorAll('input,select')];
    const component = Math.max(0, inputs.indexOf(event.target));
    const isEditing = editingCell?.row === rowIndex && editingCell?.column === key;
    const quickNumber = key === 'quantity' || numericFields.includes(key);
    if (!isEditing && quickNumber && !event.metaKey && !event.ctrlKey && !event.altKey && /^[0-9.]$/.test(event.key)) {
      event.preventDefault();
      const value = event.key === '.' ? '0.' : event.key;
      const row = rowsRef.current[rowIndex];
      if (!row) return;
      if (key === 'quantity') {
        changeRows(current => current.map((entry, index) => index !== rowIndex ? entry : {...entry, materials: entry.materials.map((material, materialIndex) => materialIndex ? material : {...material, usedQuantity: value})}), `material:${row.id}:${row.materials[0]?.id}:usedQuantity`);
      } else {
        changeRows(current => current.map((entry, index) => index === rowIndex ? {...entry, [key]: value} : entry), `cell:${row.id}:${key}`);
      }
      setErrors(current => ({...current, [row.id]: ''}));
      focusCell(rowIndex, key, 0, false);
      return;
    }
    if (['Delete', 'Backspace'].includes(event.key) && !isEditing) {
      event.preventDefault();
      clearCell(rowIndex, key);
      return;
    }
    if (event.key === 'Escape' && (isEditing || copiedCell)) {
      event.preventDefault();
      setEditingCell(null);
      setCopiedCell(null);
      window.requestAnimationFrame(() => cell.focus());
      return;
    }
    if (event.key === 'Enter' && !isEditing && columns.find(column => column.key === key)?.input) {
      event.preventDefault();
      focusCell(rowIndex, key, component);
      return;
    }
    // Native select arrows and input text arrows retain their usual behavior.
    if (event.key === 'Enter' && event.target.tagName !== 'SELECT') {
      event.preventDefault();
      if (component < inputs.length - 1 && !event.shiftKey) { inputs[component + 1].focus(); return; }
      const position = displayedRows.findIndex(entry => entry.index === rowIndex);
      const nextEntry = displayedRows[position + (event.shiftKey ? -1 : 1)];
      if (nextEntry) focusCell(nextEntry.index, key, 0);
      else if (!event.shiftKey && !dataViewActive) {const next=rows.length;changeRows(current => [...current, createGridProduct()]);focusCell(next,key,0)}
    } else if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault(); focusCell(Math.max(0, Math.min(rows.length - 1, rowIndex + (event.key === 'ArrowDown' ? 1 : -1))), key, component);
    }
  };
  const clipboardValue = (rowIndex, key) => {
    const row = rows[rowIndex];
    const calculated = calculations[rowIndex];
    if (!row || !calculated) return '';
    if (key === 'material') return row.materials[0]?.name || '';
    if (key === 'quantity') return row.materials[0]?.usedQuantity ?? '';
    if (key === 'unit') return row.materials[0]?.usedUnit || '';
    if (columns.find(column => column.key === key)?.input) return row[key] ?? '';
    const calculatedValues = {
      materialsCost: calculated.results.materialCost,
      packagingCost: calculated.results.packagingCost,
      labor: calculated.results.costBreakdown.Labor,
      operation: calculated.results.overheadCost,
      totalCost: calculated.results.totalVariableCost,
      suggested: calculated.pricing.suggestedSellingPrice,
      profit: calculated.profit,
      margin: calculated.margin,
      breakEven: calculated.pricing.breakEvenSellingPrice,
      breakEvenUnits: calculated.breakEvenUnits ?? '',
    };
    return calculatedValues[key] ?? '';
  };
  const copy = event => {
    if (event.target instanceof HTMLInputElement && event.target.selectionStart !== event.target.selectionEnd) return;
    const cell = event.target.closest?.('[data-column]') || sheetRef.current?.querySelector(`[data-row="${active.row}"][data-column="${active.column}"]`);
    if (!cell) return;
    const value = String(clipboardValue(Number(cell.dataset.row), cell.dataset.column));
    event.preventDefault();
    event.clipboardData.setData('text/plain', value);
    setCopiedCell({row: Number(cell.dataset.row), column: cell.dataset.column});
    setNotice(`Copied ${columns.find(column => column.key === cell.dataset.column)?.label || 'cell'} value.`);
  };
  const paste = event => {
    const text = event.clipboardData.getData('text/plain');
    const cell = event.target.closest?.('[data-column]') || sheetRef.current?.querySelector(`[data-row="${active.row}"][data-column="${active.column}"]`);
    if (!cell || savingId) return;
    if (!columns.find(column => column.key === cell.dataset.column)?.input) {
      event.preventDefault();
      setNotice('Calculated cells cannot be changed. Select an editable cell before pasting.');
      return;
    }
    const matrix = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(line => line.split('\t'));
    if (matrix.length > 200) { event.preventDefault(); setNotice('Paste up to 200 product rows at a time.'); return; }
    const startRow = Number(cell.dataset.row);
    const startColumn = visibleColumns.findIndex(column => column.key === cell.dataset.column);
    event.preventDefault();
    changeRows(current => {
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
  const selectCell = (event, rowIndex, key, editable) => {
    setColumnSelection(null);
    if (event.target.closest('button')) return;
    const isEditing = editingCell?.row === rowIndex && editingCell?.column === key;
    if (isEditing && event.target.closest('input,select')) return;
    event.preventDefault();
    setActive({row: rowIndex, column: key, component: 0});
    setEditingCell(null);
    event.currentTarget.focus();
    if (!editable) setNotice(key === 'taxPercentage' ? 'Select Tax type to change Tax %.' : 'This value is calculated by Kostaraa. Press Ctrl/Cmd+C to copy it.');
  };
  const editCell = (rowIndex, key, editable) => {
    if (!editable || savingId) return;
    focusCell(rowIndex, key, 0);
  };
  const selectedColumn = columns.find(column => column.key === active.column);
  const cellAddress = `${String.fromCharCode(65 + Math.max(0, visibleColumns.findIndex(column => column.key === active.column)))}${active.row + 1}`;
  const output = (value, row, className = '') => <output className={className}>{hasInput(row) ? value : '—'}</output>;
  const renderCell = (column, row, index, calculated) => {
    const disabled = savingId === row.id;
    const cellEditing = editingCell?.row === index && editingCell?.column === column.key;
    const inputTabIndex = cellEditing ? 0 : -1;
    const label = `${column.label}, product ${index + 1}`;
    if (['material', 'quantity', 'unit'].includes(column.key)) {
      const expanded = expandedMaterialRows.has(row.id);
      const hiddenCount = expanded ? 0 : Math.max(0, row.materials.length - 1);
      const visibleMaterials = expanded ? row.materials : row.materials.slice(0, 1);
      return <div className="grid-material-stack">
      {visibleMaterials.map((material, component) => <div className="grid-material-line" key={material.id}>
        {column.key === 'material' ? <>
          <select tabIndex={inputTabIndex} disabled={disabled} aria-label={`Material type, product ${index + 1}, material ${component + 1}`} value={material.kind} onChange={event => updateMaterial(row.id, material.id, 'kind', event.target.value)}><option value="material">Raw</option><option value="packaging">Pack</option></select>
          <input tabIndex={inputTabIndex} disabled={disabled} aria-label={`Material, product ${index + 1}, material ${component + 1}`} list="grid-inventory-options" value={material.name} placeholder="Type a material…" onChange={event => updateMaterial(row.id, material.id, 'name', event.target.value)} />
          {row.materials.length > 1 && <button disabled={disabled} aria-label={`Remove material ${component + 1} from product ${index + 1}`} onClick={() => update(row.id, 'materials', row.materials.filter(entry => entry.id !== material.id))}>×</button>}
        </> : column.key === 'quantity' ? <input tabIndex={inputTabIndex} disabled={disabled} type="number" min="0" step="any" aria-label={`Quantity, product ${index + 1}, material ${component + 1}`} value={material.usedQuantity} onChange={event => updateMaterial(row.id, material.id, 'usedQuantity', event.target.value)} />
          : <select tabIndex={inputTabIndex} disabled={disabled} aria-label={`Unit, product ${index + 1}, material ${component + 1}`} value={material.usedUnit} onChange={event => updateMaterial(row.id, material.id, 'usedUnit', event.target.value)}>{gridUnits.map(unit => <option key={unit}>{unit}</option>)}</select>}
      </div>)}
      {column.key === 'material' ? <div className="grid-add-material">{hiddenCount ? <button className="grid-material-toggle" type="button" onClick={() => toggleMaterials(row)}><ChevronDown aria-hidden="true"/> Show {hiddenCount} more</button> : <><button disabled={disabled} onClick={() => addMaterial(row, 'material')}>+ Material</button><button disabled={disabled} onClick={() => addMaterial(row, 'packaging')}>+ Packaging</button>{row.materials.length>1&&<button className="grid-material-toggle collapse" type="button" onClick={() => toggleMaterials(row)}><ChevronUp aria-hidden="true"/> Collapse</button>}</>}</div> : <div className={`grid-material-spacer${hiddenCount?' has-more':''}`}>{hiddenCount?`+${hiddenCount} more`:''}</div>}
    </div>;
    }
    if (column.key === 'taxPercentage') return <output title="Select Tax type to change this value">{formatNumber(row.taxPercentage)}%</output>;
    if (column.key === 'itemType') return <select tabIndex={inputTabIndex} disabled={disabled} aria-label={label} value={row.itemType} onChange={event => update(row.id, 'itemType', event.target.value)}><option>Product</option><option>Service</option></select>;
    if (column.key === 'taxMode') return <select className="grid-tax-select" tabIndex={inputTabIndex} disabled={disabled} aria-label={label} value={row.taxMode} onMouseDown={event => {event.stopPropagation();if(!cellEditing){setActive({row:index,column:'taxMode',component:0});setEditingCell({row:index,column:'taxMode'});setCopiedCell(null);}}} onChange={event => {update(row.id, 'taxMode', event.target.value); update(row.id, 'taxPercentage', taxRates[event.target.value]);}}><option value="exempt">Tax exempt</option><option value="vat">VAT</option><option value="percentage">Percentage tax</option><option value="income8">Income tax 8%</option></select>;
    if (['marketing', 'markup'].includes(column.key)) return <div className="grid-percentage-input">
      <input tabIndex={inputTabIndex} disabled={disabled} aria-label={label} type="number" min="0" step="any" value={row[column.key]} onChange={event => update(row.id, column.key, event.target.value)} />
      {String(row[column.key] ?? '').trim() && <span aria-hidden="true">%</span>}
    </div>;
    if (column.input) return <input tabIndex={inputTabIndex} disabled={disabled} aria-label={label} type={numericFields.includes(column.key) ? 'number' : 'text'} min="0" max={['taxPercentage', 'targetMargin'].includes(column.key) ? '99.99' : undefined} step="any" value={column.key === 'name' ? titleCaseName(row[column.key]) : row[column.key]} placeholder={column.key === 'name' ? 'Product name…' : column.key === 'targetPrice' && hasInput(row) ? 'Add target price' : ''} onChange={event => update(row.id, column.key, event.target.value)} />;
    const moneyValues = {materialsCost: calculated.results.materialCost, packagingCost: calculated.results.packagingCost, labor: calculated.results.costBreakdown.Labor, operation: calculated.results.overheadCost, totalCost: calculated.results.totalVariableCost, suggested: calculated.pricing.suggestedSellingPrice, profit: calculated.profit, breakEven: calculated.pricing.breakEvenSellingPrice};
    if (column.key === 'margin') return output(`${formatNumber(calculated.margin)}%`, row, calculated.profit < 0 ? 'grid-negative' : '');
    if (column.key === 'breakEvenUnits') return output(calculated.breakEvenUnits == null ? '—' : formatNumber(calculated.breakEvenUnits), row);
    return output(formatCurrency(moneyValues[column.key]), row, column.key === 'profit' && calculated.profit < 0 ? 'grid-negative' : '');
  };

  return <div className={`beta-grid-page grid-workbook${saveGuideActive?' grid-save-guide-active':''}`} onKeyDownCapture={historyKeyboard}>
    <header className="grid-page-header">
      <div><h1>Product Library Grid</h1><p>View and update your Product Library in one worksheet.</p></div>
      <div className="grid-header-meta">
        <span className="grid-beta-label">Beta workspace</span>
        <div className="grid-legend" aria-label="Cell guide"><span><i className="editable"/>Editable</span><span><i className="calculated"/>Calculated</span></div>
      </div>
    </header>
    <div className="grid-toolbar">
      <button onClick={addProduct}><Plus size={15}/> Add product</button>
      <div className="grid-history-actions" role="group" aria-label="Grid edit history">
        <button type="button" onClick={undoGrid} disabled={Boolean(savingId) || !undoStack.current.length} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo last Grid change"><Undo2 size={15}/><span>Undo</span></button>
        <button type="button" onClick={redoGrid} disabled={Boolean(savingId) || !redoStack.current.length} title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)" aria-label="Redo last Grid change"><Redo2 size={15}/><span>Redo</span></button>
      </div>
      <button className="grid-secondary-action" onClick={exportGrid}><Download size={15}/> Download Excel</button>
      <details className="grid-column-menu"><summary><Columns3 size={15}/> Customize</summary><div>{columns.filter(column => column.key !== 'name').map(column => <label key={column.key}><input type="checkbox" checked={!hidden.includes(column.key)} onChange={() => setHidden(current => current.includes(column.key) ? current.filter(key => key !== column.key) : [...current, column.key])}/>{column.label}</label>)}<footer><button onClick={() => applyView('pricing')}>Use Price testing view</button><button onClick={resetSizes}>Reset row and column sizes</button></footer></div></details>
      {selectedIds.size ? <div className="grid-bulk-actions" role="group" aria-label="Actions for selected products"><span>{selectedIds.size} selected</span><button type="button" disabled={Boolean(savingId)} onClick={bulkSave}><Save size={14}/> Save selected</button><button className="danger" type="button" disabled={Boolean(savingId)} onClick={bulkDelete}><Trash2 size={14}/> Delete selected</button></div> : null}
      {storageError && <span className="grid-draft-status">Couldn’t save this worksheet on this device</span>}
    </div>
    <div className="grid-data-tools" aria-label="Search, filter, and sort Grid rows">
      <label className="grid-search"><Search aria-hidden="true"/><input type="search" value={searchQuery} onChange={event=>setSearchQuery(event.target.value)} placeholder="Search products or materials…" aria-label="Search Grid"/>{searchQuery&&<button type="button" onClick={()=>setSearchQuery('')} aria-label="Clear search"><X aria-hidden="true"/></button>}</label>
      <label className="grid-data-select"><Filter aria-hidden="true"/><span>Filter</span><select value={rowFilter} onChange={event=>setRowFilter(event.target.value)} aria-label="Filter Grid rows"><option value="all">All rows</option><option value="saved">Saved products</option><option value="unsaved">Unsaved drafts</option><option value="changed">Changed products</option><option value="attention">Needs attention</option><option value="product">Products only</option><option value="service">Services only</option></select></label>
      <label className="grid-data-select"><ArrowUpDown aria-hidden="true"/><span>Sort</span><select value={sortRule} onChange={event=>setSortRule(event.target.value)} aria-label="Sort Grid rows"><option value="original">Original order</option><option value="name-asc">Product name A–Z</option><option value="name-desc">Product name Z–A</option><option value="target-asc">Target price: low to high</option><option value="target-desc">Target price: high to low</option><option value="cost-asc">Total cost: low to high</option><option value="cost-desc">Total cost: high to low</option><option value="suggested-asc">Suggested price: low to high</option><option value="suggested-desc">Suggested price: high to low</option><option value="margin-asc">Profit margin: low to high</option><option value="margin-desc">Profit margin: high to low</option></select></label>
      <span className="grid-result-count">{displayedRows.length} of {rows.length} rows</span>
      {dataViewActive&&<button className="grid-clear-data-view" type="button" onClick={()=>{setSearchQuery('');setRowFilter('all');setSortRule('original')}}><X aria-hidden="true"/> Clear</button>}
    </div>
    <div className="grid-formula-bar">
      <div className="grid-cell-context"><span>{cellAddress}</span><p><strong>{selectedColumn?.label}</strong>{selectedColumn?.key === 'taxPercentage' ? ' · Select Tax type to change this value' : selectedColumn?.input ? numericFields.includes(selectedColumn.key)||selectedColumn.key==='quantity' ? ' · Type to replace · Delete to clear' : ' · Double-click or press Enter to edit' : ' · Calculated by Kostaraa · Copy available'}</p></div>
      <div className="grid-view-control">
        <span>Show columns</span>
        <div className="grid-view-switcher" role="group" aria-label="Choose worksheet columns">{[['full', 'Detailed costing'], ['pricing', 'Price testing']].map(([view, label]) => <button key={view} className={currentView === view ? 'active' : ''} aria-pressed={currentView === view} onClick={() => applyView(view)}>{label}</button>)}</div>
      </div>
    </div>
    {!production && <p className="grid-setup-note">Set items produced per month in <button onClick={() => setSetup({type: 'production'})}>Business Settings</button> to include labor and operating costs.</p>}
    {!inventory.length && <p className="grid-setup-note">Add materials to Inventory first, then choose them in the Material column.</p>}
    <datalist id="grid-inventory-options">{inventory.map(item => <option key={item.id} value={item.material}/>)}</datalist>
    <div className="grid-table-wrap" ref={sheetRef} tabIndex={0} aria-label="Scrollable product costing sheet">
      <table aria-label="Product costing spreadsheet" onKeyDown={keyboard} onCopy={copy} onPaste={paste} onFocus={event => {const cell = event.target.closest('[data-column]'); if (cell) {setColumnSelection(null);setActive({row: Number(cell.dataset.row), column: cell.dataset.column});}}}>
        <colgroup><col style={{width: 42}}/>{visibleColumns.map(column => <col key={column.key} style={{width: columnWidth(column.key)}}/>)}<col style={{width: 158}}/></colgroup>
        <thead><tr className="grid-column-letters"><th>#</th>{visibleColumns.map((column, index) => <th key={column.key} className={`${column.input ? 'grid-editable' : 'grid-calculated'}${column.result ? ' grid-result' : ''}${column.key === 'name' ? ' grid-product-column' : ''}${columnSelection === column.key ? ' grid-column-selected' : ''}`}><button className="grid-column-selector" type="button" aria-label={`Select column ${String.fromCharCode(65 + index)}: ${column.label}`} aria-pressed={columnSelection === column.key} onClick={()=>{setColumnSelection(column.key);setEditingCell(null);setCopiedCell(null);setSelectedIds(new Set());setActive(current=>({...current,column:column.key}));}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setColumnSelection(null)}}}>{String.fromCharCode(65 + index)}{!column.input && <span>ƒ</span>}</button><button className="grid-column-resizer" type="button" role="separator" aria-orientation="vertical" aria-label={`Resize ${column.label} column`} title={`Drag to resize ${column.label}. Double-click to reset.`} onPointerDown={event=>beginColumnResize(event,column.key)} onDoubleClick={()=>resetColumnWidth(column.key)} onKeyDown={event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();resizeColumnBy(column.key,event.key==='ArrowRight'?10:-10)}}}/></th>)}<th/></tr><tr className="grid-column-groups"><th aria-hidden="true"/>{columnGroups.map((group, index) => <th key={`${group.name}-${index}`} colSpan={group.span}>{group.name}</th>)}<th>Status</th></tr><tr className="grid-column-labels"><th><input ref={selectAllRef} className="grid-select-checkbox" type="checkbox" aria-label={allSelected?'Deselect all products':'Select all products'} checked={allSelected} disabled={!selectableRows.length} onChange={toggleAll}/></th>{visibleColumns.map(column => <th scope="col" key={column.key} className={`${column.input ? 'grid-editable' : 'grid-calculated'}${column.result ? ' grid-result' : ''}${column.key === 'name' ? ' grid-product-column' : ''}${columnSelection === column.key ? ' grid-column-selected' : ''}`} title={column.input ? 'Editable cell' : 'Calculated automatically'}>{column.label}</th>)}<th scope="col">Status</th></tr></thead>
        <tbody>{displayedRows.map(({row,index,calculated}) => {
          const unchanged = row.savedItem && row.savedSignature === gridSignature(row, calculated);
          return <tr key={row.id} style={rowHeights[row.id]?{height:rowHeights[row.id]}:undefined} aria-selected={selectedIds.has(row.id)} className={`${errors[row.id] ? 'grid-row-invalid' : ''}${selectedIds.has(row.id) ? ' grid-row-selected' : ''}${selectedIds.size && hasInput(row) ? ' grid-selection-mode' : ''}`} onClickCapture={event => handleSelectionRow(event,row)}>
            <th scope="row"><span>{index + 1}</span><button className="grid-row-resizer" type="button" role="separator" aria-orientation="horizontal" aria-label={`Resize product row ${index + 1}`} title="Drag to resize row. Double-click to reset." onPointerDown={event=>beginRowResize(event,row)} onDoubleClick={()=>setRowHeights(current=>{const next={...current};delete next[row.id];return next})}/></th>
            {visibleColumns.map(column => {
              const fillCapable = numericFields.includes(column.key);
              const fillSourcePosition = fillRange ? displayedRows.findIndex(entry=>entry.index===fillRange.source) : -1;
              const fillTargetPosition = fillRange ? displayedRows.findIndex(entry=>entry.index===fillRange.target) : -1;
              const currentPosition = displayedRows.findIndex(entry=>entry.index===index);
              const fillStart = Math.min(fillSourcePosition, fillTargetPosition);
              const fillEnd = Math.max(fillSourcePosition, fillTargetPosition);
              const inFillRange = fillRange?.column === column.key && currentPosition >= fillStart && currentPosition <= fillEnd;
              const showFillHandle = !columnSelection && fillCapable && active.row === index && active.column === column.key && !selectedIds.size && !savingId;
              const cellActive = !columnSelection && active.row === index && active.column === column.key;
              const cellEditing = editingCell?.row === index && editingCell?.column === column.key;
              const cellCopied = copiedCell?.row === index && copiedCell?.column === column.key;
              return <td key={column.key} data-row={index} data-column={column.key} tabIndex={cellActive ? 0 : -1} aria-invalid={guide?.issue.type !== 'info' && guide?.rowId === row.id && guide.issue.column === column.key || undefined} aria-describedby={guide?.rowId === row.id && guide.issue.column === column.key && !setup ? 'grid-validation-message' : undefined} onMouseDown={event=>selectCell(event,index,column.key,column.input)} onDoubleClick={event=>{if(!event.target.closest('button'))editCell(index,column.key,column.input)}} className={`${column.input ? 'grid-editable' : 'grid-calculated'}${column.result ? ' grid-result' : ''}${column.key === 'name' ? ' grid-product-column' : ''}${columnSelection === column.key ? ' grid-column-selected' : ''}${fillCapable ? ' grid-fill-capable' : ''}${inFillRange ? ' grid-fill-range' : ''}${cellActive ? ' grid-cell-active' : ''}${cellEditing ? ' grid-cell-editing' : ''}${cellCopied ? ' grid-cell-copied' : ''}${guide?.rowId === row.id && guide.issue.column === column.key ? guide.issue.type === 'info' ? ' grid-cell-info' : ' grid-cell-needs-fix' : ''}`}>{renderCell(column, row, index, calculated)}{showFillHandle&&<button className="grid-fill-handle" type="button" title={`Drag to copy ${column.label.toLowerCase()}`} aria-label={`Drag to copy ${column.label.toLowerCase()} to other product rows`} onPointerDown={event=>beginFill(event,index,column.key)}/>}</td>;
            })}
            <td className="grid-row-actions">{errors[row.id] && <p className="grid-cell-error" role="alert">{errors[row.id]}</p>}{unchanged ? <button aria-label={`Overview for ${row.name}`} onClick={() => setPreview(row.savedItem)}><Check size={14}/> {row.savedItem?.status || 'Saved'} · Overview</button> : <><button className="grid-save-product-action" disabled={Boolean(savingId) || !hasInput(row)} onClick={() => save(row, calculated)} aria-label={`${row.savedItem ? 'Update' : 'Save'} ${row.name || `product ${index + 1}`}`}><Save size={14}/>{savingId === row.id ? 'Saving…' : row.savedItem ? 'Update Library' : 'Save to Library'}</button></>}</td>
          </tr>;
        })}{!displayedRows.length&&<tr className="grid-no-results"><td colSpan={visibleColumns.length+2}><Search aria-hidden="true"/><strong>No matching rows</strong><span>Try another search or clear the current filter.</span><button type="button" onClick={()=>{setSearchQuery('');setRowFilter('all');setSortRule('original')}}>Clear search and filters</button></td></tr>}</tbody>
      </table>
      <button className="grid-add-row" onClick={addProduct}><Plus size={14}/> Add product row</button>
    </div>
    <div className="grid-sheet-footer"><span>{libraryItems.length} Library items · {rows.filter(row => !row.savedItem && hasInput(row)).length} unsaved drafts · Drag header and row edges to resize</span><span>Numbers: select then type to replace · Delete: clear · Enter: edit · Ctrl/Cmd+C and Ctrl/Cmd+V: copy and paste</span></div>
    {notice && <p className="grid-notice" role="status">{notice}</p>}
    {guide && !setup && rows.some(row => row.id === guide.rowId) && <GridValidationGuide target={guideTarget} address={`${String.fromCharCode(65 + visibleColumns.findIndex(column => column.key === guide.issue.column))}${guide.rowIndex + 1}`} label={columns.find(column => column.key === guide.issue.column)?.label || 'Field'} issue={guide.issue} onClose={() => setGuide(null)} onNext={checkNextIssue} onSetup={() => setSetup({type: guide.issue.action, rowId: guide.rowId, materialIndex: guide.issue.materialIndex || 0, inventoryId: guide.issue.inventoryId})}/>}
    {setup?.type === 'inventory' && <GridInventoryDialog material={rows.find(row => row.id === setup.rowId)?.materials[setup.materialIndex]} item={inventory.find(item => String(item.id) === String(setup.inventoryId))} inventory={inventory} onClose={() => setSetup(null)} onSave={(saved, nextInventory) => {
      onInventoryChange(nextInventory);
      changeRows(current => current.map(row => row.id !== setup.rowId ? row : {...row, materials: row.materials.map((material, index) => index !== setup.materialIndex ? material : {...material, materialId: saved.id, name: saved.material, usedUnit: getInventoryCostUnit(saved), kind: saved.item_type === 'packaging' ? 'packaging' : 'material'})}));
      setErrors(current => ({...current, [setup.rowId]: ''}));
      setSetup(null);
      setNotice('Inventory saved and selected in your product. Check the next field to continue.');
    }}/>}
    {setup?.type === 'production' && <GridProductionDialog onClose={() => setSetup(null)} onSave={() => {setSetup(null);setNotice('Production saved. Grid costs have been recalculated. Check the next field to continue.');}}/>}
    {preview && <DetailModal item={preview} onClose={() => setPreview(null)} onViewEdit={onViewEdit} onDuplicate={onDuplicate} onArchive={async id => {await onArchive(id);setPreview(null);setRows(current=>current.map(row=>row.savedItem?.id===id?{...row,savedItem:null,savedSignature:null}:row));clearHistory();}}/>}
  </div>;
}
