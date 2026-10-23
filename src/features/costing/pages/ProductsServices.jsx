import {pricingHealth,needsPricingAttention} from "../utils/pricing-health";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Archive, CheckCircle2, Copy, Download, Edit3, Eye, MoreHorizontal, Pencil, Plus, Search, Trash2, TriangleAlert } from 'lucide-react';
import { Badge, Button, Card, ChartCard, Input, Modal, ResultCard } from '../components/ui';
import { formatCurrency, formatNumber } from '../utils/calculations';

const pricingStatuses = ['All products', 'Needs attention', 'Missing information', 'Archived'];
const colors = ['#14b8a6', '#f97316', '#64748b', '#0ea5e9', '#a855f7', '#111827'];

function statusTone(status) {
  if (status === 'Plan looks sustainable') return 'good';
  if (status === 'Limited safety margin') return 'warn';
  if (status === 'Target may not cover costs') return 'risk';
  return 'neutral';
}

function readBusinessProfile() {
  try { return JSON.parse(localStorage.getItem('kostaraa.businessProfile') || '{}'); } catch { return {}; }
}

function itemVariableCost(item) {
  const materials = (item.materials || []).reduce((sum, row) => sum + (Number(row.computedCost) || 0), 0);
  const packaging = (item.packagingMaterials || []).reduce((sum, row) => sum + (Number(row.computedCost) || 0), 0) + (Number(item.otherVariableCosts?.packaging) || 0);
  return materials + packaging + (Number(item.otherVariableCosts?.platform) || 0) + (Number(item.otherVariableCosts?.marketing) || 0) + (Number(item.otherVariableCosts?.other) || 0) + (Number(item.pricingInputs?.marketingAmount) || 0) + (Number(item.pricingInputs?.taxAmount) || 0);
}

function planningSignal(item) {
  if (item.status === 'Archived') return { label: 'Archived', tone: 'neutral' };
  const profile = readBusinessProfile();
  const target = Number(profile?.operations?.monthlySalesUnits || profile?.calculatorCosts?.salesTarget) || 0;
  const labor = Number(profile?.calculatorCosts?.totalLaborMonthly) || 0;
  const overhead = Number(profile?.calculatorCosts?.overheadMonthly || profile?.overhead?.monthlyOverheadPool) || 0;
  const price = Number(item.sellingPrice) || 0;
  const contribution = price - itemVariableCost(item);
  if (!target || !price) return { label: 'More information needed', tone: 'neutral' };
  if (contribution <= 0) return { label: 'Target may not cover costs', tone: 'risk' };
  const breakEven = Math.ceil((labor + overhead) / contribution);
  const buffer = (target - breakEven) / target * 100;
  if (target < breakEven) return { label: 'Target may not cover costs', tone: 'risk' };
  if (buffer < 15) return { label: 'Limited safety margin', tone: 'warn' };
  return { label: 'Plan looks sustainable', tone: 'good' };
}

function customerFitSignal(item) {
  const profile = readBusinessProfile();
  const market = profile?.targetMarket || {};
  const price = Number(item.sellingPrice) || 0;
  const spend = Number(market.spendingPerOrder) || 0;
  const willingness = Number(market.willingnessToPay) || 0;
  const groups = market.customerGroups || [];
  const sensitivity = String(market.priceSensitivity || '').toLowerCase();
  if (!price || !groups.length || (!spend && !willingness)) return { label: 'Customer pricing information is incomplete', tone: 'neutral' };
  if (willingness && price > willingness) return { label: 'May be high for their accepted range', tone: 'warn' };
  if (spend && price > spend * 1.2) return { label: 'May be high for their usual spending range', tone: 'warn' };
  if (spend && price <= spend && (sensitivity.includes('careful') || groups.some((group) => String(group).toLowerCase().includes('student')))) return { label: 'Within their usual spending range', tone: 'good' };
  return { label: 'Within the saved customer range', tone: 'good' };
}

function displayProductName(item) {
  const name = String(item?.productName || '').trim();
  return !name || name.toLowerCase() === 'untitled item' ? 'Unnamed Product' : name;
}

function displayStatus(item) {
  if (item.status === 'Archived') return 'Archived';
  const health = pricingHealth(item);
  return health.key === 'healthy' ? 'Plan looks sustainable' : health.key === 'risk' ? 'Target may not cover costs' : health.reason === 'Margin is below the saved target' ? 'Limited safety margin' : 'More information needed';
}

function planningRemark(item) {
  const status = displayStatus(item);
  if (status === 'Plan looks sustainable') return { label: 'Costs likely covered', tone: 'good' };
  if (status === 'Limited safety margin') return { label: 'Low buffer above costs', tone: 'warn' };
  if (status === 'Target may not cover costs') return { label: 'May not cover costs', tone: 'risk' };
  if (status === 'Archived') return { label: 'Archived', tone: 'neutral' };
  return { label: pricingHealth(item).reason, tone: 'neutral' };
}

function customerRemark(item) {
  const signal = customerFitSignal(item);
  if (signal.tone === 'good') return { label: 'Fits saved customer budget', tone: 'good' };
  if (signal.tone === 'warn') return { label: 'May be high for customers', tone: 'warn' };
  return { label: 'Add customer budget details', tone: 'neutral' };
}

function statusHelper(status) {
  if (status === 'Plan looks sustainable') return 'The saved target currently covers recorded costs.';
  if (status === 'Limited safety margin') return 'The plan has little room above break-even.';
  if (status === 'Target may not cover costs') return 'Review the price, costs, or sales target.';
  if (status === 'More information needed') return 'Add a price and Monthly Sales Target.';
  if (status === 'Archived') return 'Archived';
  return 'Planning estimate';
}

function getRecommendedPrice(item) {
  const cost = Number(item.finalCost ?? item.finalCostInMind ?? item.costPerProduct) || 0;
  const targetMargin = Math.min(99.99, Math.max(0, Number(item.targetProfitMargin) || 0)) / 100;
  return targetMargin < 1 ? cost / (1 - targetMargin) : cost;
}

function matchesPricingStatus(item, pricingStatus) {
  if (pricingStatus === 'All products') return item.status !== 'Archived';
  if (pricingStatus === 'Archived') return item.status === 'Archived';
  if (pricingStatus === 'Missing information') return item.status !== 'Archived' && displayStatus(item) === 'More information needed';
  if (pricingStatus === 'Needs attention') return needsPricingAttention(item);
  return item.status !== 'Archived';
}

function filterItems(items, pricingStatus, search) {
  const query = search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesSearch = [displayProductName(item), item.itemType, item.category, item.status, displayStatus(item), customerFitSignal(item).label].join(' ').toLowerCase().includes(query);
    return matchesSearch && matchesPricingStatus(item, pricingStatus);
  });
}

function HelpTip({ children, label = 'More information' }) {
  return (
    <span className="library-help-tip group relative inline-grid h-5 w-5 shrink-0 cursor-help place-items-center rounded-full border border-blue-200 bg-white text-[11px] font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-200" tabIndex={0} aria-label={label}>
      ?
      <span className="library-help-tooltip invisible absolute left-0 top-7 z-40 w-64 translate-y-[-4px] rounded-lg border border-blue-100 bg-white p-3 text-left text-xs font-semibold normal-case leading-relaxed tracking-normal text-slate-600 opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus:visible group-focus:translate-y-0 group-focus:opacity-100">{children}</span>
    </span>
  );
}

function SummaryCard({ label, value, description, tone = 'neutral', icon: Icon }) {
  const toneClass = tone === 'good'
    ? 'border-teal-100 bg-teal-50 text-accent'
    : tone === 'warn'
      ? 'border-orange-100 bg-orange-50 text-orange-700'
      : tone === 'risk'
        ? 'border-rose-100 bg-rose-50 text-rose-700'
        : 'border-slate-200 bg-white text-navy';
  return (
    <div className={`library-summary-card rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="library-summary-label flex items-center gap-2 text-sm font-bold">{label} <HelpTip>{description}</HelpTip></p><p className="library-summary-value mt-2 text-3xl font-black leading-none">{value}</p></div>
        {Icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/80"><Icon className="h-4 w-4" /></span> : null}
      </div>
    </div>
  );
}

export function DetailModal({ item, onClose, onViewEdit, onDuplicate, onArchive }) {
  const packagingMaterials = item.packagingMaterials || [];
  const laborConfig = item.laborConfig || {};
  const output = Number(item.expectedMonthlySales) || (Number(laborConfig.workingDays) || 0) * (Number(laborConfig.outputPerDay) || 0);
  const labor = item.laborCostPerUnit ?? (output ? (Number(laborConfig.monthlyCost) || 0) / output : Number(item.otherVariableCosts?.labor) || 0);
  const overhead = item.operationCostPerUnit ?? (output ? (Number(item.monthlyFixedCosts) || 0) / output : 0);
  const pricing = item.pricingInputs || {};
  const rows = [
    {name:'Materials', value:item.materialCostPerUnit ?? (item.materials || []).reduce((sum,row)=>sum+(Number(row.computedCost)||0),0)},
    {name:'Packaging', value:item.packagingCostPerUnit ?? packagingMaterials.reduce((sum,row)=>sum+(Number(row.computedCost)||0),0)+(Number(item.otherVariableCosts?.packaging)||0)},
    {name:'Labor', value:Number(labor)||0},
    {name:'Operation cost', value:Number(overhead)||0},
    ...[
      {name:'Platform fees', value:Number(item.otherVariableCosts?.platform)||0},
      {name:'Marketing costs', value:Number(item.otherVariableCosts?.marketing)||0},
      {name:'Other costs', value:Number(item.otherVariableCosts?.other)||0},
      {name:'Marketing allowance', value:pricing.marketingAmount ?? (Number(item.costPerProduct)||0)*(Number(pricing.marketingPercentage)||0)/100},
      {name:'Tax at your price', value:Number(pricing.taxAmount)||0},
    ].filter(row=>row.value>0),
  ];
  const costData=rows.filter(row=>row.value>0);
  const price=Number(item.sellingPrice)||0;
  const suggested=Number(item.suggestedSellingPrice)||0;
  const breakEven=pricing.breakEvenSellingPrice;
  const comparison=(value)=>{const difference=Math.round(price*100)-Math.round(value*100);return difference===0?'Your price matches':`Your price is ${formatCurrency(Math.abs(difference)/100)} ${difference>0?'higher':'lower'}`};
  return (
    <Modal className="library-detail-modal calculation-review library-finance-preview" title={displayProductName(item)} onClose={onClose}>
      <p className="review-note">{item.itemType || 'Product'} · {item.category || 'Other'} · Saved calculation</p>
      <dl className="review-metrics">
        <div><dt>Your selling price</dt><dd>{formatCurrency(price)}</dd></div>
        <div><dt>Est. profit / item</dt><dd className={item.grossProfit<0?'review-loss':''}>{formatCurrency(item.grossProfit)}</dd></div>
        <div><dt>Est. margin</dt><dd>{formatNumber(item.profitMargin)}%</dd></div>
      </dl>

      <section className="review-section"><h3>Price comparison</h3><dl className="review-rows review-comparisons">
        <div><dt>Suggested price<small>{comparison(suggested)}</small></dt><dd>{formatCurrency(suggested)}</dd></div>
        <div><dt>Break-even price<small>{breakEven != null ? comparison(breakEven) : 'Recalculate to update this saved item.'}</small></dt><dd>{breakEven != null ? formatCurrency(breakEven) : 'Not saved'}</dd></div>
      </dl>{breakEven != null && <p className="review-verdict">{Math.round(price*100)<Math.round(breakEven*100)?'Your price is below break-even.':Math.round(price*100)===Math.round(breakEven*100)?'Your price covers estimated costs, with no estimated profit.':price<suggested?'Covers estimated costs · Below suggested price':'Covers estimated costs · Meets suggested price'}</p>}</section>
      <div className="library-detail-overview-grid mt-5">
        <ChartCard className="library-cost-card" title="What makes up the product cost">
          <div className="library-cost-chart-layout">
            <div className="library-cost-chart-visual"><ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={costData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={86}>
                  {costData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer></div>
            <div className="library-cost-legend">{costData.map((entry, index) => <div key={entry.name}><span><i style={{ backgroundColor: colors[index % colors.length] }} />{entry.name}</span><b>{formatCurrency(entry.value)}</b></div>)}</div>
          </div>
        </ChartCard>

      </div>
      <details className="preview-breakdown"><summary>Materials breakdown</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Material</th><th className="p-2">Unit cost</th><th className="p-2">Used per product</th><th className="p-2">Cost</th></tr></thead>
            <tbody>
              {(item.materials || []).map((material) => (
                <tr key={material.id || material.name} className="border-t border-slate-100">
                  <td className="p-2 font-semibold text-navy">{material.name}</td>
                  <td className="p-2">{formatCurrency(Number(material.unitCost) || ((Number(material.computedCost) || 0) / (Number(material.usedQuantity) || 1)))}</td>
                  <td className="p-2">{material.usedQuantity} {material.usedUnit || material.unit}</td>
                  <td className="p-2 font-bold">{formatCurrency(material.computedCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details className="preview-breakdown"><summary>Packaging breakdown</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Item</th><th className="p-2">Unit cost</th><th className="p-2">Used</th><th className="p-2">Cost</th></tr></thead>
            <tbody>
              {packagingMaterials.map((material) => (
                <tr key={material.id || material.name} className="border-t border-slate-100">
                  <td className="p-2 font-semibold text-navy">{material.name}</td>
                  <td className="p-2">{formatCurrency(Number(material.unitCost) || ((Number(material.computedCost) || 0) / (Number(material.usedQuantity) || 1)))}</td>
                  <td className="p-2">{material.usedQuantity} {material.usedUnit || material.unit}</td>
                  <td className="p-2 font-bold">{formatCurrency(material.computedCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!packagingMaterials.length && <p className="py-5 text-sm text-slate-500">No packaging rows saved for this item.</p>}
        </div>
      </details>
      <div className="preview-actions mt-5 flex flex-wrap justify-end gap-3">
        <Button onClick={() => onViewEdit(item)}><Edit3 className="h-4 w-4" /> Edit Costing</Button>
        <Button variant="ghost" onClick={() => onDuplicate(item)}><Copy className="h-4 w-4" /> Duplicate</Button>
        <Button variant="ghost" onClick={() => onArchive(item.id)}><Archive className="h-4 w-4" /> Archive</Button>
      </div>
    </Modal>
  );
}

export default function ProductsServices({ items, onViewEdit, onDuplicate, onArchive, onDelete, onDeleteItems, onUpdateItem, setPage, pricingStatus = 'All products', onPricingStatusChange }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const [pageIndex, setPageIndex] = useState(1);
  const selectAllRef = useRef(null);
  const visibleItems = useMemo(() => filterItems(items, pricingStatus, search), [items, pricingStatus, search]);
  const activeItems = items.filter((item) => item.status !== 'Archived');
  const sustainableItems = activeItems.filter((item) => displayStatus(item) === 'Plan looks sustainable');
  const needsReviewItems = activeItems.filter(needsPricingAttention);
  const missingInformationItems = activeItems.filter((item) => displayStatus(item) === 'More information needed');
  const archivedItems = items.filter((item) => item.status === 'Archived');
  const totalPages = Math.max(1, Math.ceil(visibleItems.length / 10));
  const safePage = Math.min(pageIndex, totalPages);
  const pagedItems = visibleItems.slice((safePage - 1) * 10, safePage * 10);
  const startItem = visibleItems.length ? (safePage - 1) * 10 + 1 : 0;
  const endItem = Math.min(safePage * 10, visibleItems.length);
  const allFilteredSelected = visibleItems.length > 0 && visibleItems.every((item) => selectedIds.has(String(item.id)));
  const selectedFilteredCount = visibleItems.reduce((count, item) => count + (selectedIds.has(String(item.id)) ? 1 : 0), 0);
  const someFilteredSelected = selectedFilteredCount > 0 && !allFilteredSelected;
  useEffect(() => {
    const ids = new Set(items.map((item) => String(item.id)));
    setSelectedIds((current) => new Set([...current].filter((id) => ids.has(id))));
  }, [items]);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someFilteredSelected;
  }, [someFilteredSelected]);
  useEffect(() => {
    if (openMenuId === null) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!event.target?.closest?.('.library-row-actions')) setOpenMenuId(null);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpenMenuId(null); };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openMenuId]);
  const runMenuAction = (action) => {
    action();
    setOpenMenuId(null);
  };
  const confirmDelete = (item) => {
    const name = displayProductName(item);
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) onDelete(item.id);
  };
  const toggleFiltered = () => setSelectedIds((current) => {
    const next = new Set(current);
    visibleItems.forEach((item) => allFilteredSelected ? next.delete(String(item.id)) : next.add(String(item.id)));
    return next;
  });
  const deleteSelected = () => {
    const ids = [...selectedIds];
    if (!ids.length || !window.confirm(`Delete ${ids.length} selected product${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    if (onDeleteItems) onDeleteItems(ids);
    else ids.forEach((id) => onDelete(id));
    setSelectedIds(new Set());
  };
  const exportLibrary = async () => {
    const XLSX = await import('xlsx');
    const exportedAt = new Date();
    const rows = items.map((item, index) => ({
      '#': index + 1,
      'Item Name': displayProductName(item),
      Type: item.itemType || '',
      Category: item.category || '',
      'Final Cost': Number(item.finalCost ?? item.finalCostInMind ?? item.costPerProduct) || 0,
      'Current Price': Number(item.sellingPrice) || 0,
      'Recommended Price': getRecommendedPrice(item),
      Profit: Number(item.grossProfit) || 0,
      'Profit Margin': `${formatNumber(item.profitMargin)}%`,
      Markup: `${formatNumber(item.markup)}%`,
      'Break-even Units': Number(item.breakEvenUnits) || 0,
      'Planning Signal': displayStatus(item),
      'Customer Price Fit': customerFitSignal(item).label,
      'Red Flags': (item.redFlags || []).join('; '),
      'Date Saved': item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
      'Last Updated': item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
    }));
    const worksheetData = [
      ['BizCost - Products & Services Library'],
      [`Date exported: ${exportedAt.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}`],
      [],
      ['#', 'Item Name', 'Type', 'Category', 'Final Cost', 'Current Price', 'Recommended Price', 'Profit', 'Profit Margin', 'Markup', 'Break-even Units', 'Planning Signal', 'Customer Price Fit', 'Red Flags', 'Date Saved', 'Last Updated'],
      ...rows.map((row) => [
        row['#'],
        row['Item Name'],
        row.Type,
        row.Category,
        row['Final Cost'],
        row['Current Price'],
        row['Recommended Price'],
        row.Profit,
        row['Profit Margin'],
        row.Markup,
        row['Break-even Units'],
        row['Planning Signal'],
        row['Customer Price Fit'],
        row['Red Flags'],
        row['Date Saved'],
        row['Last Updated'],
      ]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 22 },
      { wch: 45 },
      { wch: 14 },
      { wch: 14 },
    ];
    for (let rowIndex = 5; rowIndex < worksheetData.length + 1; rowIndex += 1) {
      ['E', 'F', 'G', 'H'].forEach((column) => {
        const cell = worksheet[`${column}${rowIndex}`];
        if (cell) cell.z = '"\u20B1"#,##0.00';
      });
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Library');
    XLSX.writeFile(workbook, 'bizcost-library.xlsx');
  };

  return (
    <div className="product-library-page space-y-4">
      <div className="library-page-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="library-page-title mt-1 flex items-center gap-2 text-2xl font-black text-navy">Product Library <HelpTip label="About your Product Library">Compare each product’s cost, selling price, and saved margin. Kostaraa flags plans that may need another look.</HelpTip></h1>
        </div>
        <div className="library-page-actions flex flex-wrap gap-2">
          <Button variant="ghost" onClick={exportLibrary} disabled={!items.length}><Download className="h-4 w-4" /> Download Excel</Button>
          <Button onClick={() => setPage?.('calculator')}><Plus className="h-4 w-4" /> New Costing</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Saved products" value={activeItems.length} description="Active product costings in your Library." icon={Copy} />
        <SummaryCard label="Plans that look sustainable" value={sustainableItems.length} description="Saved targets currently cover recorded costs." tone="good" icon={CheckCircle2} />
        <SummaryCard label="Needs your attention" value={needsReviewItems.length} description="Review missing pricing details or margins below target." tone={needsReviewItems.length ? 'warn' : 'good'} icon={TriangleAlert} />
      </div>

      <Card className="library-list-card overflow-visible p-0">
        <div className="library-list-toolbar flex flex-col gap-4 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="library-filter-label grid w-full gap-1.5 text-sm font-bold text-slate-700 sm:max-w-[300px]">
            <span className="library-filter-caption">Show products</span>
            <select
              aria-label="Filter saved products"
              className="library-filter-select h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-navy outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={pricingStatus}
              onChange={(event) => { onPricingStatusChange?.(event.target.value); setPageIndex(1); }}
            >
              <option value="All products">All active products ({activeItems.length})</option>
              <option value="Needs attention">Needs attention ({needsReviewItems.length})</option>
              <option value="Missing information">Missing information ({missingInformationItems.length})</option>
              <option value="Archived">Archived ({archivedItems.length})</option>
            </select>
          </label>
          <div className="relative w-full lg:max-w-[340px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input aria-label="Search saved products" value={search} onChange={(event) => { setSearch(event.target.value); setPageIndex(1); }} placeholder="Search products..." className="library-search-input h-11 py-2 pl-9" />
          </div>
        </div>

        <div className="library-list-heading" aria-hidden="true"><span /><span>Product Name</span><span>Margin</span><span>Remarks</span><span /></div>
        <div className={`library-selection-bar${selectedIds.size ? ' has-selection' : ''}`}>
          <label className="library-select-all"><input ref={selectAllRef} aria-label={allFilteredSelected ? 'Deselect all filtered products' : 'Select all filtered products'} type="checkbox" checked={allFilteredSelected} onChange={toggleFiltered} /><b>{selectedIds.size ? `${selectedIds.size} selected` : 'Select all'}</b></label>
          <span />
          {selectedIds.size ? <button className="library-delete-selection" type="button" onClick={deleteSelected}><Trash2 aria-hidden="true" /> Delete</button> : null}
        </div>
        <div className={`library-list${selectedIds.size ? ' has-selection' : ''}`}>
          {pagedItems.map((item, index) => {
            const planRemark = planningRemark(item);
            const fitRemark = customerRemark(item);
            return (
              <article key={item.id} className="library-item-row">
                <label className="library-row-selector"><span aria-hidden="true">{(safePage - 1) * 10 + index + 1}</span><input aria-label={`Select ${displayProductName(item)}`} type="checkbox" checked={selectedIds.has(String(item.id))} onChange={() => setSelectedIds((current) => { const next = new Set(current); const id = String(item.id); next.has(id) ? next.delete(id) : next.add(id); return next; })} /></label>
                <button className="library-product-name" type="button" onClick={() => setSelected(item)} title={`View ${displayProductName(item)}`}><span>{displayProductName(item)}</span></button>
                <p className="library-margin-value">{formatNumber(item.profitMargin)}%</p>
                <div className="library-remarks">
                  <span className={`library-remark ${planRemark.tone}`}>{planRemark.label}</span>
                  <span className={`library-remark ${fitRemark.tone}`}>{fitRemark.label}</span>
                </div>
                <div className="library-row-actions">
                  <button className="library-actions-trigger" aria-haspopup="menu" aria-expanded={openMenuId === item.id} aria-label={`More actions for ${displayProductName(item)}`} onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)} title="More actions" type="button"><MoreHorizontal aria-hidden="true" /></button>
                  {openMenuId === item.id && (
                    <div className={`library-actions-menu${index >= pagedItems.length - 2 ? ' open-up' : ''}`} role="menu">
                      <button onClick={() => runMenuAction(() => setSelected(item))} role="menuitem" type="button"><Eye aria-hidden="true" /> Overview</button>
                      <button onClick={() => runMenuAction(() => onViewEdit(item))} role="menuitem" type="button"><Pencil aria-hidden="true" /> Edit</button>
                      <button onClick={() => runMenuAction(() => onDuplicate(item))} role="menuitem" type="button"><Copy aria-hidden="true" /> Duplicate</button>
                      <button className="danger" onClick={() => runMenuAction(() => confirmDelete(item))} role="menuitem" type="button"><Trash2 aria-hidden="true" /> Delete</button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
          {!visibleItems.length && <div className="px-6 py-14 text-center"><p className="text-base font-black text-navy">No products found in this view.</p><p className="mt-2 text-sm font-medium text-slate-500">Try another filter or create a new costing.</p></div>}
        </div>
        <div className="library-pagination mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Showing {startItem} to {endItem} of {visibleItems.length} items</p>
          {visibleItems.length > 10 && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="min-h-9 px-3 py-1.5" disabled={safePage === 1} onClick={() => setPageIndex(Math.max(1, safePage - 1))}>Previous</Button>
              <span className="text-xs font-black text-slate-500">Page {safePage} of {totalPages}</span>
              <Button variant="ghost" className="min-h-9 px-3 py-1.5" disabled={safePage === totalPages} onClick={() => setPageIndex(Math.min(totalPages, safePage + 1))}>Next</Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="library-tip-card border-l-4 border-l-accent">
        <p className="text-sm font-semibold text-slate-600"><span className="font-black text-navy">Tip:</span> Use the planning signal to check cost coverage, then compare the customer-fit badge with actual customer response.</p>
      </Card>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onViewEdit={onViewEdit} onDuplicate={onDuplicate} onArchive={onArchive} />}
    </div>
  );
}
