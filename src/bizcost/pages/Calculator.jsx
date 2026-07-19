import { useEffect, useState } from 'react';
import { Copy, GripVertical, Info, Package, Pencil, Plus, RotateCcw, Save, Trash2, WalletCards } from 'lucide-react';
import { Badge, Button, Modal, Select } from '../components/ui';
import { formatCurrency, formatNumber } from '../utils/calculations';

const units = ['mg', 'g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz', 'mm', 'cm', 'm', 'inch', 'ft', 'yard', 'pcs', 'dozen', 'pack', 'box'];
const itemTypes = ['Product', 'Service', 'Menu Item', 'Bundle / Package'];
const categories = ['Drinks', 'Food', 'Merch', 'Candles', 'Skincare', 'Service', 'Other'];
const costColumns = [
  { key: 'item', label: 'Item' },
  { key: 'quantity', label: 'Qty' },
  { key: 'unitCost', label: 'Cost/Unit' },
  { key: 'totalCost', label: 'Total' },
];

function Field({ label, value, onChange, type = 'text', prefix, suffix, icon: Icon }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-600">
      <span>{label}</span>
      <span className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-teal-100">
        {Icon ? <Icon className="h-4 w-4 text-slate-400" /> : null}
        {prefix ? <span className="text-sm text-slate-500">{prefix}</span> : null}
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-navy outline-none"
          min="0"
          type={type}
          value={value}
          onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)}
        />
        {suffix ? <span className="text-sm text-slate-500">{suffix}</span> : null}
      </span>
    </label>
  );
}

function QuantityWithUnit({ quantity, unit, onQuantityChange, onUnitChange }) {
  return (
    <span className="flex min-h-9 items-center rounded-md border border-slate-200 bg-white px-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-teal-100">
      <input
        aria-label="Used per product"
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-navy outline-none"
        min="0"
        type="number"
        value={quantity}
        onChange={(event) => onQuantityChange(event.target.value === '' ? '' : event.target.value)}
      />
      <select
        aria-label="Unit of measurement"
        className="w-auto cursor-pointer appearance-none border-0 bg-transparent py-1 pl-2 pr-1 text-xs font-bold text-slate-500 outline-none"
        value={unit}
        onChange={(event) => onUnitChange(event.target.value)}
      >
        {units.map((option) => <option key={option}>{option}</option>)}
      </select>
    </span>
  );
}

function MaterialSelect({ value, currentName, onChange, inventory, label = 'material' }) {
  return (
    <select
      aria-label={label}
      className="min-h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-navy outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-100"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{currentName || `Select ${label}`}</option>
      {inventory.map((item) => <option key={item.id} value={item.id}>{item.material || 'Untitled material'}</option>)}
    </select>
  );
}

function SectionShell({ number, title, helper, action, children }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-sm font-black text-white">{number}</span>
          <div className="min-w-0">
            <h2 className="text-base font-black text-navy">{title}</h2>
            {helper ? <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{helper}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BreakdownPill({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black text-navy">{value}</p>
    </div>
  );
}

function ResultPanelCard({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'border-slate-200 bg-slate-50 text-navy',
    accent: 'border-teal-100 bg-teal-50 text-accent',
    soft: 'border-slate-200 bg-white text-navy',
    strong: 'border-navy bg-navy text-white',
    highlight: 'border-orange-200 bg-orange-50 text-orange-700',
  }[tone];

  return (
    <div className={`rounded-md border px-4 py-3 ${toneClass}`}>
      <p className={`text-xs font-black uppercase ${tone === 'strong' ? 'text-slate-300' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-1 font-black ${tone === 'strong' ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}

export default function Calculator({ product, setProduct, results, inventory = [], business, onSaveItem, onDuplicateCurrent, onReset, editingItem, operationCostsCard = null }) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [meta, setMeta] = useState({ itemType: 'Product', category: product.productCategory || 'Drinks' });
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [taxMode, setTaxMode] = useState('exempt');
  const [marketingPercentage, setMarketingPercentage] = useState(0);
  const [markupTopup, setMarkupTopup] = useState(50);
  const [draggedRow, setDraggedRow] = useState(null);
  const [rowModal, setRowModal] = useState(null);
  const [rowDraft, setRowDraft] = useState({ materialId: '', usedQuantity: '', usedUnit: 'pcs' });
  const [rowError, setRowError] = useState('');

  useEffect(() => {
    if (editingItem) {
      setMeta({ itemType: editingItem.itemType, category: editingItem.category });
      const savedMarkup = Number(editingItem.pricingInputs?.markupTopup);
      const itemMarkup = Number(editingItem.markup);
      setTaxPercentage(Number(editingItem.pricingInputs?.taxPercentage) || 0);
      setTaxMode(editingItem.pricingInputs?.taxMode || (Number(editingItem.pricingInputs?.taxPercentage) === 12 ? 'vat' : Number(editingItem.pricingInputs?.taxPercentage) === 3 ? 'percentage' : 'exempt'));
      setMarketingPercentage(Number(editingItem.pricingInputs?.marketingPercentage) || 0);
      setMarkupTopup(Number.isFinite(savedMarkup) ? savedMarkup : Number.isFinite(itemMarkup) ? itemMarkup : 50);
    }
  }, [editingItem]);

  const update = (field, value) => setProduct({ ...product, [field]: value });
  const businessCapacity = (Number(business?.labor?.workingDays) || 0) * (Number(business?.labor?.outputPerDay) || 0);
  const globalLaborCostPerUnit = businessCapacity ? (Number(business?.labor?.monthlyCost) || 0) / businessCapacity : 0;
  const globalOverheadMonthly = (Number(business?.overhead?.rent) || 0) + (Number(business?.overhead?.utilities) || 0) + (Number(business?.overhead?.miscellaneous) || 0);
  const globalOverheadCostPerUnit = businessCapacity ? globalOverheadMonthly / businessCapacity : 0;
  const operationalOverride = product.operationalOverride || { enabled: false, laborCostPerUnit: globalLaborCostPerUnit, overheadCostPerUnit: globalOverheadCostPerUnit };
  const toggleOperationalOverride = () => setProduct({
    ...product,
    operationalOverride: operationalOverride.enabled
      ? { enabled: false, laborCostPerUnit: 0, overheadCostPerUnit: 0 }
      : { enabled: true, laborCostPerUnit: globalLaborCostPerUnit, overheadCostPerUnit: globalOverheadCostPerUnit },
  });
  const updateOperationalOverride = (field, value) => setProduct({
    ...product,
    operationalOverride: { ...operationalOverride, enabled: true, [field]: Number(value) },
  });
  const updateIngredient = (id, field, value) => {
    setProduct({
      ...product,
      ingredients: product.ingredients.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    });
  };
  const updateIngredientMaterial = (id, materialId) => {
    const material = inventory.find((item) => String(item.id) === String(materialId));
    setProduct({
      ...product,
      ingredients: product.ingredients.map((item) => (item.id === id ? { ...item, materialId, name: material?.material || '', usedUnit: material?.baseUnit || item.usedUnit || 'pcs' } : item)),
    });
  };
  const updatePackaging = (id, field, value) => {
    setProduct({
      ...product,
      packaging: (product.packaging || []).map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    });
  };
  const updatePackagingMaterial = (id, materialId) => {
    const material = inventory.find((item) => String(item.id) === String(materialId));
    setProduct({
      ...product,
      packaging: (product.packaging || []).map((item) => (item.id === id ? { ...item, materialId, name: material?.material || '', usedUnit: material?.baseUnit || item.usedUnit || 'pcs' } : item)),
    });
  };
  const openRowModal = (kind) => {
    setRowModal(kind);
    setRowDraft({ materialId: '', usedQuantity: '', usedUnit: 'pcs' });
    setRowError('');
  };
  const updateRowDraftMaterial = (materialId) => {
    const material = inventory.find((item) => String(item.id) === String(materialId));
    setRowDraft({ ...rowDraft, materialId, usedUnit: material?.baseUnit || 'pcs' });
    setRowError('');
  };
  const saveNewRow = () => {
    const material = inventory.find((item) => String(item.id) === String(rowDraft.materialId));
    if (!material) {
      setRowError('Please choose a material from Inventory.');
      return;
    }
    if (!(Number(rowDraft.usedQuantity) > 0)) {
      setRowError('Enter an amount greater than zero.');
      return;
    }
    const newRow = {
      id: crypto.randomUUID(),
      materialId: material.id,
      name: material.material || '',
      usedQuantity: Number(rowDraft.usedQuantity),
      usedUnit: rowDraft.usedUnit || material.baseUnit || 'pcs',
    };
    const field = rowModal === 'ingredient' ? 'ingredients' : 'packaging';
    setProduct({ ...product, [field]: [...(product[field] || []), newRow] });
    setRowModal(null);
    setRowError('');
  };
  const removeIngredient = (id) => setProduct({ ...product, ingredients: product.ingredients.filter((item) => item.id !== id) });
  const removePackaging = (id) => setProduct({ ...product, packaging: (product.packaging || []).filter((item) => item.id !== id) });
  const totalCostOfGoods = results.totalVariableCost;
  const taxRate = Math.min(99.99, Math.max(0, Number(taxPercentage) || 0)) / 100;
  const marketingAmount = totalCostOfGoods * (marketingPercentage / 100);
  const preTaxBreakEvenPrice = totalCostOfGoods + marketingAmount;
  const preTaxSuggestedPrice = preTaxBreakEvenPrice * (1 + markupTopup / 100);
  const isVat = taxMode === 'vat';
  const breakEvenSellingPrice = isVat ? preTaxBreakEvenPrice * (1 + taxRate) : preTaxBreakEvenPrice / (1 - taxRate);
  const suggestedSellingPrice = isVat ? preTaxSuggestedPrice * (1 + taxRate) : preTaxSuggestedPrice / (1 - taxRate);
  const taxAmount = isVat ? suggestedSellingPrice - (suggestedSellingPrice / (1 + taxRate)) : suggestedSellingPrice * taxRate;
  const profitPerUnit = suggestedSellingPrice - preTaxBreakEvenPrice - taxAmount;
  const grossMargin = suggestedSellingPrice > 0 ? (profitPerUnit / suggestedSellingPrice) * 100 : 0;
  const breakEvenUnits = profitPerUnit > 0 ? Math.ceil(results.overheadMonthly / profitPerUnit) : Infinity;
  const saveWithMeta = (statusOverride) => {
    onSaveItem({
      ...meta,
      status: statusOverride || 'Active',
      pricing: {
        sellingPrice: suggestedSellingPrice,
        costPerProduct: totalCostOfGoods,
        grossProfit: profitPerUnit,
        profitMargin: grossMargin,
        markup: markupTopup,
        breakEvenUnits,
        suggestedSellingPrice,
        breakEvenSellingPrice,
        taxPercentage,
        taxMode,
        taxAmount,
        marketingPercentage,
        marketingAmount,
      },
    }, statusOverride);
    setSaveOpen(false);
  };
  const reorderRows = (kind, sourceId, targetId) => {
    if (!sourceId || sourceId === targetId) return;
    const field = kind === 'ingredient' ? 'ingredients' : 'packaging';
    const rows = [...(product[field] || [])];
    const sourceIndex = rows.findIndex((item) => item.id === sourceId);
    const targetIndex = rows.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = rows.splice(sourceIndex, 1);
    rows.splice(targetIndex, 0, moved);
    setProduct({ ...product, [field]: rows });
  };
  const columnWidths = {
    item: 'minmax(200px,1.35fr)',
    quantity: 'minmax(135px,.8fr)',
    unitCost: 'minmax(110px,.65fr)',
    totalCost: 'minmax(110px,.65fr)',
  };
  const columnOrder = costColumns.map((column) => column.key);
  const columnTemplate = `36px ${columnOrder.map((key) => columnWidths[key]).join(' ')} 44px`;
  const renderCostCell = (row, kind, key, total) => {
    const updateRow = kind === 'ingredient' ? updateIngredient : updatePackaging;
    const updateMaterial = kind === 'ingredient' ? updateIngredientMaterial : updatePackagingMaterial;
    if (key === 'item') {
      return <MaterialSelect inventory={inventory} label={kind === 'ingredient' ? 'material' : 'packaging item'} value={row.materialId || ''} currentName={row.name} onChange={(value) => updateMaterial(row.id, value)} />;
    }
    if (key === 'quantity') {
      return (
        <QuantityWithUnit
          quantity={row.usedQuantity}
          unit={row.usedUnit || 'pcs'}
          onQuantityChange={(value) => updateRow(row.id, 'usedQuantity', value)}
          onUnitChange={(value) => updateRow(row.id, 'usedUnit', value)}
        />
      );
    }
    if (key === 'unitCost') return <div className="flex min-h-9 items-center px-2 text-sm font-medium text-slate-500">{formatCurrency(row.unitCost || 0)}</div>;
    if (key === 'totalCost') return <div className="flex min-h-9 items-center px-2 text-sm font-black text-navy">{formatCurrency(row.computedCost)}</div>;
    return null;
  };
  const renderColumnHeader = (key) => {
    const column = costColumns.find((item) => item.key === key);
    return <span key={key} className="px-2 text-xs font-bold uppercase text-slate-500">{column?.label}</span>;
  };
  const renderDragHandle = (kind, rowId) => (
    <button
      aria-label="Drag row"
      className="grid h-9 w-8 cursor-grab place-items-center rounded-md text-slate-300 transition hover:bg-slate-50 hover:text-slate-500 active:cursor-grabbing"
      draggable
      onDragEnd={() => setDraggedRow(null)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        setDraggedRow({ kind, id: rowId });
      }}
      title="Drag row"
      type="button"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">Cost before you price</p>
          <h1 className="text-3xl font-black text-navy">Costing Calculator</h1>
        </div>
        {editingItem ? <Badge tone="warn">Editing saved item</Badge> : null}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
        <div className="grid gap-4">
          <Field label="Product name" icon={Package} value={product.productName} onChange={(value) => update('productName', value)} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)] xl:items-start">
        <div className="grid gap-5">
          <SectionShell
            number="1"
            title="Raw Materials"
            helper="Select materials from Inventory. Cost used = inventory unit cost x used per product."
            action={<Button variant="ghost" onClick={() => openRowModal('ingredient')}><Plus className="h-4 w-4" /> Add material</Button>}
          >
            <div className="overflow-x-auto">
              <div className="grid min-w-[800px] border-b border-slate-100 px-4 py-2" style={{ gridTemplateColumns: columnTemplate }}>
                <span />
                {columnOrder.map((key) => renderColumnHeader(key))}<span />
              </div>
              {results.ingredientRows.map((row) => (
                <div
                  key={row.id}
                  className={`grid min-w-[800px] gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0 md:items-center ${draggedRow?.kind === 'ingredient' && draggedRow?.id === row.id ? 'bg-teal-50/60' : ''}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedRow?.kind === 'ingredient') reorderRows('ingredient', draggedRow.id, row.id);
                    setDraggedRow(null);
                  }}
                  style={{ gridTemplateColumns: columnTemplate }}
                >
                  {renderDragHandle('ingredient', row.id)}
                  {columnOrder.map((key) => (
                    <div key={key}>
                      <span className="mb-1 block text-xs font-bold text-slate-500 md:hidden">{costColumns.find((item) => item.key === key)?.label}</span>
                      {renderCostCell(row, 'ingredient', key, results.materialCost)}
                    </div>
                  ))}
                  <Button variant="ghost" className="min-h-9 px-2" onClick={() => removeIngredient(row.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <div className="m-3 flex items-center justify-between rounded-md border border-teal-100 bg-teal-50 px-4 py-3">
              <span className="text-sm font-black text-navy">Raw material cost / unit</span>
              <span className="text-xl font-black text-accent">{formatCurrency(results.materialCost)}</span>
            </div>
          </SectionShell>

          <SectionShell
            number="2"
            title="Packaging"
            helper="Select packaging supplies from Inventory. Cost used = inventory unit cost x used per product."
            action={<Button variant="ghost" onClick={() => openRowModal('packaging')}><Plus className="h-4 w-4" /> Add packaging</Button>}
          >
            <div className="overflow-x-auto">
              <div className="grid min-w-[800px] border-b border-slate-100 px-4 py-2" style={{ gridTemplateColumns: columnTemplate }}>
                <span />
                {columnOrder.map((key) => renderColumnHeader(key))}<span />
              </div>
              {results.packagingRows.map((row) => (
                <div
                  key={row.id}
                  className={`grid min-w-[800px] gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0 md:items-center ${draggedRow?.kind === 'packaging' && draggedRow?.id === row.id ? 'bg-teal-50/60' : ''}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedRow?.kind === 'packaging') reorderRows('packaging', draggedRow.id, row.id);
                    setDraggedRow(null);
                  }}
                  style={{ gridTemplateColumns: columnTemplate }}
                >
                  {renderDragHandle('packaging', row.id)}
                  {columnOrder.map((key) => (
                    <div key={key}>
                      <span className="mb-1 block text-xs font-bold text-slate-500 md:hidden">{costColumns.find((item) => item.key === key)?.label}</span>
                      {renderCostCell(row, 'packaging', key, results.packagingCost)}
                    </div>
                  ))}
                  <Button variant="ghost" className="min-h-9 px-2" onClick={() => removePackaging(row.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <div className="m-3 flex items-center justify-between rounded-md border border-teal-100 bg-teal-50 px-4 py-3">
              <span className="text-sm font-black text-navy">Packaging cost / unit</span>
              <span className="text-xl font-black text-accent">{formatCurrency(results.packagingCost)}</span>
            </div>
          </SectionShell>

          {operationCostsCard}

          <SectionShell
            number="3"
            title="Operational Costs"
            helper={operationalOverride.enabled ? 'This product uses custom labor and overhead costs.' : 'Read-only defaults pulled from your Account page.'}
            action={<Button variant="ghost" onClick={toggleOperationalOverride}><Pencil className="h-4 w-4" /> {operationalOverride.enabled ? 'Use Account Defaults' : 'Override for this product'}</Button>}
          >
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <BreakdownPill label="Monthly Capacity" value={`${formatNumber(businessCapacity)} units`} />
              <BreakdownPill label={operationalOverride.enabled ? 'Custom Labor / Unit' : 'Global Labor / Unit'} value={formatCurrency(results.costBreakdown.Labor)} />
              <BreakdownPill label={operationalOverride.enabled ? 'Custom Overhead / Unit' : 'Global Overhead / Unit'} value={formatCurrency(results.overheadCost)} />
            </div>
            {operationalOverride.enabled ? (
              <div className="mx-4 mb-4 grid gap-3 rounded-md border border-orange-200 bg-orange-50 p-4 sm:grid-cols-2">
                <Field label="Custom Labor Cost / Unit" type="number" prefix="PHP" value={operationalOverride.laborCostPerUnit} onChange={(value) => updateOperationalOverride('laborCostPerUnit', value)} />
                <Field label="Custom Overhead Cost / Unit" type="number" prefix="PHP" value={operationalOverride.overheadCostPerUnit} onChange={(value) => updateOperationalOverride('overheadCostPerUnit', value)} />
              </div>
            ) : null}
          </SectionShell>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] xl:sticky xl:top-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-navy text-white"><WalletCards className="h-5 w-5" /></span>
            <div>
              <h2 className="text-xl font-black text-navy">Costing Result</h2>
              <p className="text-xs font-semibold text-slate-500">Drag markup to update price and margin.</p>
            </div>
          </div>

          <ResultPanelCard label="Total Cost of Goods" value={formatCurrency(totalCostOfGoods)} />

          <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <label className="text-sm font-black text-navy" htmlFor="marketingPercentage">Marketing Percentage</label>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Set your marketing allowance as a percentage of COGS.</p>
              </div>
              <span className="shrink-0 rounded-md bg-blue-50 px-3 py-1 text-sm font-black text-blue-600">{formatNumber(marketingPercentage)}%</span>
            </div>
            <input
              id="marketingPercentage"
              aria-label="Marketing Percentage"
              className="kostaraa-range mt-4 h-2 w-full accent-blue-600"
              max="100"
              min="0"
              step="1"
              type="range"
              value={marketingPercentage}
              style={{ background: `linear-gradient(90deg, #1765e8 0%, #1765e8 ${marketingPercentage}%, #dce8f8 ${marketingPercentage}%, #dce8f8 100%)` }}
              onChange={(event) => setMarketingPercentage(Number(event.target.value))}
            />
            <div className="mt-2 flex justify-between text-xs font-bold text-slate-400">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
              <span className="text-xs font-bold text-slate-500">Marketing amount</span>
              <span className="text-base font-black text-navy">{formatCurrency(marketingAmount)}</span>
            </div>
          </div>

          <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-navy">Markup Top up</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Drag to update SRP, profit, and gross margin below.</p>
              </div>
              <span className="shrink-0 rounded-md bg-blue-50 px-3 py-1 text-sm font-black text-blue-600">{formatNumber(markupTopup)}%</span>
            </div>
            <input
              aria-label="Markup Top up"
              className="kostaraa-range mt-4 h-2 w-full accent-blue-600"
              max="300"
              min="0"
              type="range"
              value={markupTopup}
              style={{ background: `linear-gradient(90deg, #1765e8 0%, #1765e8 ${markupTopup / 3}%, #dce8f8 ${markupTopup / 3}%, #dce8f8 100%)` }}
              onChange={(event) => setMarkupTopup(Number(event.target.value))}
            />
            <div className="mt-2 flex justify-between text-xs font-bold text-slate-400">
              <span>0%</span>
              <span>150%</span>
              <span>300%</span>
            </div>
          </div>

          <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="text-sm font-black leading-5 text-navy">Business Tax Percentage <span className="whitespace-nowrap">(VAT / Non-VAT)</span></p>
                <span className="group relative inline-flex shrink-0">
                  <button aria-label="About business tax rates" className="grid h-6 w-6 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-accent" type="button">
                    <Info className="h-4 w-4" />
                  </button>
                  <span className="pointer-events-none absolute right-0 top-8 z-20 hidden w-72 rounded-md border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600 shadow-soft group-hover:block group-focus-within:block">
                    Section 116 generally imposes 3% percentage tax on eligible non-VAT gross sales. The 8% option is an income-tax election for eligible non-VAT individuals and is in lieu of graduated income tax and percentage tax.
                  </span>
                </span>
              </div>
              <span
                id="taxPercentage"
                aria-label="Selected business tax percentage"
                className="flex min-h-10 w-28 items-center justify-end gap-1 rounded-md border border-slate-200 bg-slate-100 px-3"
              >
                <span className="text-sm font-black text-navy">{formatNumber(taxPercentage)}</span>
                <span className="text-sm font-bold text-slate-500">%</span>
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">Choose a tax preset below to update this rate.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { mode: 'vat', rate: 12, label: '12% VAT Registered' },
                { mode: 'percentage', rate: 3, label: '3% Non-VAT / Percentage Tax' },
                { mode: 'exempt', rate: 0, label: '0% BMBE / Exempt' },
                { mode: 'income8', rate: 8, label: '8% Flat Income Tax*' },
              ].map((preset) => (
                <span key={preset.mode} className="group relative inline-flex">
                  <button
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${taxMode === preset.mode ? 'border-accent bg-teal-50 text-accent' : 'border-slate-200 bg-white text-slate-500 hover:border-accent hover:text-accent'}`}
                    onClick={() => {
                      setTaxPercentage(preset.rate);
                      setTaxMode(preset.mode);
                    }}
                    type="button"
                  >
                    {preset.label}
                  </button>
                  {preset.mode === 'exempt' ? (
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-72 -translate-x-1/2 rounded-md border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600 shadow-soft group-hover:block group-focus-within:block">
                      BMBE (Barangay Micro Business Enterprises) must be registered with the DTI and hold a valid Certificate of Authority to claim Income Tax exemption.
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
            {taxMode === 'income8' ? (
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">For eligible non-VAT sole proprietors earning under ₱3M/year. This option replaces percentage tax plus graduated income tax; confirm eligibility with a tax professional.</p>
            ) : null}
            <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
              <span className="text-xs font-bold text-slate-500">{isVat ? 'Output VAT included in SRP' : taxMode === 'income8' ? 'Estimated 8% income tax on revenue' : 'Tax on suggested revenue'}</span>
              <span className="text-base font-black text-navy">{formatCurrency(taxAmount)}</span>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <ResultPanelCard label="Suggested Selling Price" value={formatCurrency(suggestedSellingPrice)} tone="accent" />
            <ResultPanelCard label="Profit Per Unit" value={formatCurrency(profitPerUnit)} tone="soft" />
            <ResultPanelCard label="Gross Margin" value={`${formatNumber(grossMargin)}%`} tone="soft" />
            <ResultPanelCard label="Break-even Selling Price" value={formatCurrency(breakEvenSellingPrice)} tone="highlight" />
          </div>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="mb-3 text-sm font-black text-navy">Cost Breakdown</p>
            <div className="grid grid-cols-2 gap-2">
              <BreakdownPill label="Materials" value={formatCurrency(results.materialCost)} />
              <BreakdownPill label="Packaging" value={formatCurrency(results.packagingCost)} />
              <BreakdownPill label="Labor" value={formatCurrency(results.costBreakdown.Labor)} />
              <BreakdownPill label="Overhead" value={formatCurrency(results.overheadCost)} />
            </div>
          </div>

          <p className="mt-4 flex gap-2 text-sm font-medium text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Pricing flows from COGS → marketing → markup → tax → SRP. VAT is added to the pre-VAT price and extracted from the VAT-inclusive SRP; percentage tax is grossed up from final revenue.</p>

          <div className="mt-4 grid gap-3">
            <Button onClick={() => setSaveOpen(true)}><Save className="h-4 w-4" /> {editingItem ? 'Update Product / Service' : 'Save as Product / Service'}</Button>
            <Button variant="ghost" onClick={onDuplicateCurrent}><Copy className="h-4 w-4" /> Duplicate Product</Button>
            <Button variant="ghost" onClick={onReset}><RotateCcw className="h-4 w-4" /> Reset Calculator</Button>
          </div>
        </aside>
      </div>

      {rowModal && (
        <Modal title={rowModal === 'ingredient' ? 'Add Raw Material' : 'Add Packaging'} onClose={() => setRowModal(null)}>
          <div className="calculator-row-modal grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">
                {rowModal === 'ingredient' ? 'Choose a material' : 'Choose a packaging item'}
              </label>
              <MaterialSelect
                inventory={inventory}
                label={rowModal === 'ingredient' ? 'material' : 'packaging item'}
                value={rowDraft.materialId}
                currentName=""
                onChange={updateRowDraftMaterial}
              />
              <p className="mt-2 text-xs font-medium leading-5 text-slate-500">Items come from your Inventory. Add the item there first if it is not listed.</p>
            </div>
            <div>
              <div className="calculator-amount-fields">
                <label>
                  <span>Amount per Product</span>
                  <input
                    aria-label="Amount per Product"
                    min="0"
                    step="any"
                    type="number"
                    value={rowDraft.usedQuantity}
                    onChange={(event) => setRowDraft({ ...rowDraft, usedQuantity: event.target.value === '' ? '' : event.target.value })}
                    placeholder="Enter amount"
                  />
                </label>
                <label>
                  <span>Unit of Measurement</span>
                  <select
                    aria-label="Unit of Measurement"
                    value={rowDraft.usedUnit}
                    onChange={(event) => setRowDraft({ ...rowDraft, usedUnit: event.target.value })}
                  >
                    {units.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-xs font-medium leading-5 text-slate-500">Example: enter <b>1</b> and choose <b>cup</b>, or enter <b>250</b> and choose <b>ml</b>.</p>
            </div>
            {rowError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{rowError}</p> : null}
          </div>
          <div className="calculator-row-modal-actions mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setRowModal(null)}>Cancel</Button>
            <Button onClick={saveNewRow}><Plus className="h-4 w-4" /> Add to calculation</Button>
          </div>
        </Modal>
      )}

      {saveOpen && (
        <Modal title="Save calculation to Library" onClose={() => setSaveOpen(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Product Name" value={product.productName} onChange={(value) => update('productName', value)} />
            <Select label="Item type" value={meta.itemType} onChange={(e) => setMeta({ ...meta, itemType: e.target.value })}>{itemTypes.map((item) => <option key={item}>{item}</option>)}</Select>
            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-600">
              <span>Category</span>
              <input
                className="min-h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-navy outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-100"
                list="product-category-options"
                value={meta.category}
                onChange={(event) => setMeta({ ...meta, category: event.target.value })}
                placeholder="Select or add category"
              />
              <datalist id="product-category-options">
                {categories.map((category) => <option key={category} value={category} />)}
              </datalist>
            </label>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Material Cost</p><p className="mt-1 font-black text-navy">{formatCurrency(results.materialCost)}</p></div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Final Cost</p><p className="mt-1 font-black text-navy">{formatCurrency(totalCostOfGoods)}</p></div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Selling Price</p><p className="mt-1 font-black text-navy">{formatCurrency(suggestedSellingPrice)}</p></div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Profit / Margin</p><p className="mt-1 font-black text-navy">{formatCurrency(profitPerUnit)} / {formatNumber(grossMargin)}%</p></div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => saveWithMeta()}>{editingItem ? 'Update Library Item' : 'Add to Library'}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
