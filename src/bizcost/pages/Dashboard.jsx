import { useState } from 'react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ClipboardList } from 'lucide-react';
import { Badge, Button, Card } from '../components/ui';
import { formatCurrency, formatNumber } from '../utils/calculations';

const pricingFilters = ['All', 'Risky Products', 'Warning', 'Healthy'];

function statusTone(status) {
  if (status === 'Healthy') return 'good';
  if (status === 'Risky') return 'risk';
  if (status === 'Warning' || status === 'Needs Review') return 'warn';
  return 'neutral';
}

function cleanName(item) {
  const name = item?.productName?.trim();
  return !name || name === 'Untitled item' ? 'Unnamed Product' : name;
}

function displayStatus(item) {
  if (item?.status === 'Archived') return 'Archived';
  if (item?.status === 'Needs Review') return 'Needs Review';
  return item?.pricingStatus || 'Needs Review';
}

function StatChip({ label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-slate-200 bg-white text-navy',
    good: 'border-teal-100 bg-teal-50 text-accent',
    warn: 'border-orange-100 bg-orange-50 text-orange-700',
    risk: 'border-rose-100 bg-rose-50 text-rose-700',
  };

  return (
    <span className={`rounded-md border px-3 py-2 text-sm font-black ${tones[tone]}`}>
      {label ? <span className="text-slate-500">{label} </span> : null}
      {value}
    </span>
  );
}

export default function Dashboard({ savedItems, inventory = [], setPage }) {
  const [pricingFilter, setPricingFilter] = useState('All');
  const activeItems = savedItems.filter((item) => item.status !== 'Archived');
  const totalInventoryCost = inventory.reduce((sum, item) => sum + (Number(item.itemCost) || 0), 0);
  const reviewItems = activeItems.filter((item) => ['Warning', 'Risky', 'Needs Review'].includes(displayStatus(item)));
  const averageMargin = activeItems.length ? activeItems.reduce((sum, item) => sum + (Number(item.profitMargin) || 0), 0) / activeItems.length : 0;
  const filteredItems = activeItems.filter((item) => {
    const status = displayStatus(item);
    if (pricingFilter === 'All') return true;
    if (pricingFilter === 'Risky Products') return status === 'Risky';
    return status === pricingFilter;
  });
  const chartRows = filteredItems.slice(0, 5).map((item) => ({
    name: cleanName(item),
    sellingPrice: Number(item.sellingPrice) || 0,
    finalCost: Number(item.finalCost ?? item.finalCostInMind ?? item.costPerProduct) || 0,
    margin: Number(item.profitMargin) || 0,
    status: displayStatus(item),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">Business Health Snapshot</p>
          <h1 className="text-3xl font-black text-navy">Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Track your saved products, pricing health, inventory value, and key costing insights.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatChip value={`${activeItems.length} Total Products`} />
        <StatChip value={`${formatCurrency(totalInventoryCost)} Inventory Value`} />
        <StatChip value={`${reviewItems.length} Needs Review`} tone={reviewItems.length ? 'warn' : 'good'} />
        <StatChip label="Avg Margin" value={`${formatNumber(averageMargin)}%`} tone={averageMargin >= 30 ? 'good' : activeItems.length ? 'warn' : 'neutral'} />
      </div>

      <Card className="overflow-hidden p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div>
            <h2 className="text-lg font-black text-navy">Pricing Overview</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Selling price vs final cost across saved products.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600">
              <span className="text-xs uppercase text-slate-400">Filter</span>
              <select
                className="bg-transparent text-sm font-bold text-navy outline-none"
                value={pricingFilter}
                onChange={(event) => setPricingFilter(event.target.value)}
              >
                {pricingFilters.map((filter) => <option key={filter}>{filter}</option>)}
              </select>
            </label>
            <Button variant="ghost" className="min-h-9 px-3 py-1.5" onClick={() => setPage?.('products')}>
              <ClipboardList className="h-4 w-4" /> View Library
            </Button>
          </div>
        </div>
        {chartRows.length ? (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} margin={{ top: 12, right: 12, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `PHP ${formatNumber(value)}`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="sellingPrice" name="Selling Price" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="finalCost" name="Final Cost" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {chartRows.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-navy">{item.name}</p>
                    <p className="text-xs font-semibold text-slate-500">Margin {formatNumber(item.margin)}%</p>
                  </div>
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="rounded-md bg-slate-50 px-3 py-10 text-center text-sm font-semibold text-slate-500">
            Add product data first to view pricing overview.
          </p>
        )}
      </Card>
    </div>
  );
}
