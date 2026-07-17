import { useState } from 'react';
import { Button, Card, Input, Select, TextArea } from '../components/ui';
import { formatCurrency, formatNumber } from '../utils/calculations';

const businessTypes = ['Café', 'Food', 'Merchandise', 'Candle', 'Skincare', 'Service', 'Online Store', 'Other'];
const stages = ['Idea Stage', 'Pre-launch', 'Operating', 'Scaling'];
const structures = ['Sole Proprietor', 'Partnership', 'Corporation', 'Not yet registered'];
const channels = ['Physical Store', 'TikTok Shop', 'Shopee', 'Lazada', 'Instagram', 'Website', 'Pop-up Booth', 'Other'];

export default function Portfolio({ business, onSave }) {
  const [form, setForm] = useState({
    ...business,
    channels: business.channels || [],
    labor: { staffCount: business.employees || 1, monthlyCost: 0, workingDays: 0, outputPerDay: 0, ...(business.labor || {}) },
    overhead: { rent: 0, utilities: 0, miscellaneous: 0, ...(business.overhead || {}) },
  });
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const updateLabor = (field, value) => setForm((prev) => ({ ...prev, labor: { ...(prev.labor || {}), [field]: Number(value) } }));
  const updateOverhead = (field, value) => setForm((prev) => ({ ...prev, overhead: { ...(prev.overhead || {}), [field]: Number(value) } }));
  const toggleChannel = (channel) => {
    const currentChannels = form.channels || [];
    const next = currentChannels.includes(channel) ? currentChannels.filter((item) => item !== channel) : [...currentChannels, channel];
    update('channels', next);
  };
  const monthlyOutput = (Number(form.labor?.workingDays) || 0) * (Number(form.labor?.outputPerDay) || 0);
  const laborCostPerUnit = monthlyOutput > 0 ? (Number(form.labor?.monthlyCost) || 0) / monthlyOutput : 0;
  const totalOverhead = (Number(form.overhead?.rent) || 0) + (Number(form.overhead?.utilities) || 0) + (Number(form.overhead?.miscellaneous) || 0);
  const overheadCostPerUnit = monthlyOutput > 0 ? totalOverhead / monthlyOutput : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <Card>
        <h1 className="text-2xl font-black text-navy">Business Portfolio</h1>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input label="Business name" value={form.name} onChange={(e) => update('name', e.target.value)} />
          <Select label="Business type" value={form.type} onChange={(e) => update('type', e.target.value)}>{businessTypes.map((item) => <option key={item}>{item}</option>)}</Select>
          <Select label="Business stage" value={form.stage} onChange={(e) => update('stage', e.target.value)}>{stages.map((item) => <option key={item}>{item}</option>)}</Select>
          <Select label="Business structure" value={form.structure} onChange={(e) => update('structure', e.target.value)}>{structures.map((item) => <option key={item}>{item}</option>)}</Select>
          <Input label="Location" value={form.location} onChange={(e) => update('location', e.target.value)} />
          <Input label="Years in business" type="number" value={form.years} onChange={(e) => update('years', Number(e.target.value))} />
          <Input label="Number of employees" type="number" value={form.employees} onChange={(e) => update('employees', Number(e.target.value))} />
          <TextArea label="Products or services offered" value={form.offerings} onChange={(e) => update('offerings', e.target.value)} className="md:col-span-2" />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-600">Sales channels</p>
          <div className="flex flex-wrap gap-2">
            {channels.map((channel) => (
              <button key={channel} type="button" onClick={() => toggleChannel(channel)} className={`rounded-md border px-3 py-2 text-sm font-semibold ${(form.channels || []).includes(channel) ? 'border-accent bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                {channel}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-navy">Fixed Labor Setup</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">These labor values automatically appear in the Calculator and Costing Simulator.</p>
            </div>
            <div className="rounded-md border border-teal-100 bg-teal-50 px-3 py-2 text-right">
              <p className="text-xs font-black uppercase text-slate-500">Labor / Unit</p>
              <p className="text-lg font-black text-accent">{formatCurrency(laborCostPerUnit)}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="Staff count" type="number" value={form.labor?.staffCount || 1} onChange={(e) => updateLabor('staffCount', e.target.value)} />
            <Input label="Monthly labor cost or salary" type="number" value={form.labor?.monthlyCost || 0} onChange={(e) => updateLabor('monthlyCost', e.target.value)} />
            <Input label="Working days per month" type="number" value={form.labor?.workingDays || 0} onChange={(e) => updateLabor('workingDays', e.target.value)} />
            <Input label="Production output per day" type="number" value={form.labor?.outputPerDay || 0} onChange={(e) => updateLabor('outputPerDay', e.target.value)} />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-navy">Fixed Overhead Setup</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Rent, utilities, and miscellaneous costs stay linked across business costing tools.</p>
            </div>
            <div className="rounded-md border border-teal-100 bg-teal-50 px-3 py-2 text-right">
              <p className="text-xs font-black uppercase text-slate-500">Overhead / Unit</p>
              <p className="text-lg font-black text-accent">{formatCurrency(overheadCostPerUnit)}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Input label="Rent" type="number" value={form.overhead?.rent || 0} onChange={(e) => updateOverhead('rent', e.target.value)} />
            <Input label="Utilities" type="number" value={form.overhead?.utilities || 0} onChange={(e) => updateOverhead('utilities', e.target.value)} />
            <Input label="Miscellaneous" type="number" value={form.overhead?.miscellaneous || 0} onChange={(e) => updateOverhead('miscellaneous', e.target.value)} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-black uppercase text-slate-500">Monthly production output</p>
              <p className="text-lg font-black text-navy">{formatNumber(monthlyOutput)} units</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-black uppercase text-slate-500">Total monthly overhead</p>
              <p className="text-lg font-black text-navy">{formatCurrency(totalOverhead)}</p>
            </div>
          </div>
        </div>
        <Button className="mt-6" onClick={() => onSave(form)}>Save business profile</Button>
      </Card>
      <Card>
        <p className="text-sm font-semibold text-accent">Saved business</p>
        <h2 className="mt-2 text-2xl font-black text-navy">{business.name}</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p><strong>Type:</strong> {business.type}</p>
          <p><strong>Stage:</strong> {business.stage}</p>
          <p><strong>Structure:</strong> {business.structure}</p>
          <p><strong>Location:</strong> {business.location}</p>
          <p><strong>Team:</strong> {business.employees} employees</p>
          <p><strong>Channels:</strong> {(business.channels || []).join(', ')}</p>
          <p><strong>Offerings:</strong> {business.offerings}</p>
          <p><strong>Labor:</strong> {formatCurrency(business.labor?.monthlyCost || 0)} / month across {business.labor?.staffCount || business.employees || 1} staff</p>
          <p><strong>Overhead:</strong> {formatCurrency((Number(business.overhead?.rent) || 0) + (Number(business.overhead?.utilities) || 0) + (Number(business.overhead?.miscellaneous) || 0))} / month</p>
        </div>
      </Card>
    </div>
  );
}
