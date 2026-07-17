import { useState } from 'react';
import { Building2, CalendarCheck, CheckCircle2, Headphones, Save } from 'lucide-react';
import { Button, Card, Input, Modal, Select, TextArea } from '../components/ui';
import { formatCurrency, formatNumber } from '../utils/calculations';

const businessTypes = ['Cafe', 'Food', 'Merchandise', 'Service', 'Retail', 'Online Store', 'Beauty / Skincare', 'Candle / Wellness', 'Other'];
const businessStages = ['Idea Stage', 'Pre-launch', 'Operating', 'Scaling'];
const salesChannelOptions = ['Physical Store', 'TikTok Shop', 'Shopee', 'Lazada', 'Instagram', 'Facebook', 'Website', 'Pop-up Booth', 'Delivery Apps', 'Other'];
const concernOptions = ['Product Costing Review', 'Pricing Review', 'Overhead Cost Review', 'Manpower / Capacity Review', 'Foot Traffic and Rent Check', 'Business Setup Guidance', 'Other'];
const consultationKey = 'bizcost.consultationRequests';

function normalizeBusiness(business = {}) {
  const employees = Number(business.employees) || 0;
  const savedLabor = business.labor || {};
  const salaryPerEmployee = Number(savedLabor.salaryPerEmployee) || (employees > 0 ? (Number(savedLabor.monthlyCost) || 0) / employees : Number(savedLabor.monthlyCost) || 0);
  return {
    ...business,
    name: business.name || '',
    address: business.address || business.location || '',
    type: business.type || '',
    stage: business.stage || '',
    years: Number(business.years) || 0,
    employees,
    offerings: business.offerings || '',
    channels: Array.isArray(business.channels) ? business.channels : [],
    labor: { workingDays: 0, outputPerDay: 0, ...savedLabor, staffCount: employees, salaryPerEmployee, monthlyCost: salaryPerEmployee * employees },
    overhead: { rent: 0, utilities: 0, miscellaneous: 0, ...(business.overhead || {}) },
  };
}

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function getConsultationRequests() {
  return JSON.parse(localStorage.getItem(consultationKey) || '[]');
}

function saveConsultationRequest(request) {
  const current = JSON.parse(localStorage.getItem(consultationKey) || '[]');
  const payload = {
    ...request,
    id: crypto.randomUUID(),
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(consultationKey, JSON.stringify([payload, ...current]));
  return payload;
}

function ConsultationModal({ business, onClose, onSubmitRequest }) {
  const [request, setRequest] = useState({
    fullName: '',
    emailAddress: '',
    businessName: business.name || '',
    businessConcern: 'Product Costing Review',
    preferredDate: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) => setRequest((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    const requiredMissing = !request.fullName.trim() || !request.emailAddress.trim() || !request.businessConcern || !request.preferredDate;
    if (requiredMissing) {
      setError('Please complete Full Name, Email Address, Business Concern, and Preferred Consultation Date.');
      return;
    }
    const savedRequest = saveConsultationRequest(request);
    onSubmitRequest?.(savedRequest);
    setSubmitted(true);
  };

  return (
    <Modal title="Book a Consultation" onClose={onClose}>
      {submitted ? (
        <div className="rounded-md border border-teal-100 bg-teal-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <p className="font-black text-navy">Consultation request submitted successfully.</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">Your request was saved with Pending status.</p>
            </div>
          </div>
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Full Name" value={request.fullName} onChange={(event) => update('fullName', event.target.value)} required />
            <Input label="Email Address" type="email" value={request.emailAddress} onChange={(event) => update('emailAddress', event.target.value)} required />
          </div>
          <Input label="Business Name" value={request.businessName} onChange={(event) => update('businessName', event.target.value)} />
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Business Concern" value={request.businessConcern} onChange={(event) => update('businessConcern', event.target.value)} required>
              {concernOptions.map((concern) => <option key={concern}>{concern}</option>)}
            </Select>
            <Input label="Preferred Consultation Date" type="date" value={request.preferredDate} onChange={(event) => update('preferredDate', event.target.value)} required />
          </div>
          <TextArea label="Notes" value={request.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Tell us what you need help with." />
          {error ? <p className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function Account({ business, onSave }) {
  const [form, setForm] = useState(() => normalizeBusiness(business));
  const [saved, setSaved] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [consultationRequests, setConsultationRequests] = useState(() => getConsultationRequests());

  const update = (field, value) => {
    setSaved(false);
    setForm((current) => {
      if (field !== 'employees') return { ...current, [field]: value };
      const employees = Number(value) || 0;
      const salaryPerEmployee = Number(current.labor.salaryPerEmployee) || 0;
      return {
        ...current,
        employees,
        labor: { ...current.labor, staffCount: employees, monthlyCost: salaryPerEmployee * employees },
      };
    });
  };

  const saveChanges = () => {
    const nextBusiness = {
      ...business,
      ...form,
      location: form.address,
      years: Number(form.years) || 0,
      employees: Number(form.employees) || 0,
      channels: form.channels,
      labor: { ...form.labor, staffCount: Number(form.employees) || 0, monthlyCost: (Number(form.labor.salaryPerEmployee) || 0) * (Number(form.employees) || 0) },
      overhead: { ...form.overhead },
    };
    onSave?.(nextBusiness);
    setSaved(true);
  };
  const updateOperational = (group, field, value) => {
    setSaved(false);
    setForm((current) => {
      const nextGroup = { ...current[group], [field]: Number(value) };
      if (group === 'labor' && field === 'salaryPerEmployee') nextGroup.monthlyCost = Number(value) * (Number(current.employees) || 0);
      return { ...current, [group]: nextGroup };
    });
  };
  const monthlyCapacity = (Number(form.labor.workingDays) || 0) * (Number(form.labor.outputPerDay) || 0);
  const totalOverhead = (Number(form.overhead.rent) || 0) + (Number(form.overhead.utilities) || 0) + (Number(form.overhead.miscellaneous) || 0);
  const laborCostPerUnit = monthlyCapacity ? (Number(form.labor.monthlyCost) || 0) / monthlyCapacity : 0;
  const overheadCostPerUnit = monthlyCapacity ? totalOverhead / monthlyCapacity : 0;
  const totalMonthlyPayroll = (Number(form.labor.salaryPerEmployee) || 0) * (Number(form.employees) || 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">Account</p>
          <h1 className="text-3xl font-black text-navy">Business Profile</h1>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Manage your business information used for costing, recommendations, and reports.
          </p>
        </div>
      </div>

      {saved ? (
        <div className="rounded-md border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-black text-accent">
          Business profile updated successfully.
        </div>
      ) : null}

      <Card className="p-2">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { step: 1, title: 'Core Identity', description: 'Business details and sales channels' },
            { step: 2, title: 'Operational Defaults', description: 'Labor, output, and overhead costs' },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => setActiveStep(item.step)}
              className={`flex items-center gap-3 rounded-md border p-3 text-left transition ${
                activeStep === item.step
                  ? 'border-teal-200 bg-teal-50'
                  : 'border-transparent bg-white hover:border-slate-200'
              }`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${
                activeStep === item.step ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500'
              }`}>{item.step}</span>
              <span>
                <span className="block font-black text-navy">{item.title}</span>
                <span className="block text-xs font-semibold text-slate-500">{item.description}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      {activeStep === 1 ? (
        <Card className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-teal-50 text-accent">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-navy">Editable Business Information</h2>
              <p className="text-sm font-semibold text-slate-500">Keep this updated so your costing context stays accurate.</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Business Name" value={form.name} onChange={(event) => update('name', event.target.value)} />
              <Select label="Business Type" value={form.type} onChange={(event) => update('type', event.target.value)}>
                <option value="">Select business type</option>
                {businessTypes.map((type) => <option key={type}>{type}</option>)}
              </Select>
            </div>

            <TextArea label="Business Address" value={form.address} onChange={(event) => update('address', event.target.value)} className="min-h-20" />

            <div className="grid gap-4 md:grid-cols-3">
              <Select label="Business Stage" value={form.stage} onChange={(event) => update('stage', event.target.value)}>
                <option value="">Select business stage</option>
                {businessStages.map((stage) => <option key={stage}>{stage}</option>)}
              </Select>
              <Input label="Years in Business" type="number" min="0" value={form.years} onChange={(event) => update('years', event.target.value)} />
              <Input label="Number of Employees" type="number" min="0" value={form.employees} onChange={(event) => update('employees', event.target.value)} />
            </div>

            <TextArea label="Products and Services Offered" value={form.offerings} onChange={(event) => update('offerings', event.target.value)} />

            <div>
              <p className="mb-2 text-sm font-medium text-slate-600">Sales Channels</p>
              <div className="flex flex-wrap gap-2">
                {salesChannelOptions.map((channel) => {
                  const selected = form.channels.includes(channel);
                  return (
                    <button
                      key={channel}
                      className={`rounded-md border px-3 py-2 text-sm font-bold transition ${selected ? 'border-teal-200 bg-teal-50 text-accent' : 'border-slate-200 bg-white text-slate-600 hover:border-accent'}`}
                      onClick={() => update('channels', toggleValue(form.channels, channel))}
                      type="button"
                    >
                      {channel}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </Card>
      ) : (
        <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-navy">Operational Cost Defaults</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">These baseline values are used by every product unless a product has a local override.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-black text-navy">Labor Defaults</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <Input label="Monthly Salary per Employee" type="number" min="0" value={form.labor.salaryPerEmployee} onChange={(event) => updateOperational('labor', 'salaryPerEmployee', event.target.value)} />
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  {formatCurrency(Number(form.labor.salaryPerEmployee) || 0)} × {Number(form.employees) || 0} {Number(form.employees) === 1 ? 'employee' : 'employees'} = <span className="font-black text-navy">{formatCurrency(totalMonthlyPayroll)} total monthly payroll</span>
                </p>
              </div>
              <Input label="Working Days" type="number" min="0" value={form.labor.workingDays} onChange={(event) => updateOperational('labor', 'workingDays', event.target.value)} />
              <div>
                <Input label="Output / Day" type="number" min="0" value={form.labor.outputPerDay} onChange={(event) => updateOperational('labor', 'outputPerDay', event.target.value)} />
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">What is the maximum number of average units or servings your team can realistically produce or fulfill in a single day?</p>
              </div>
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-black text-navy">Overhead Defaults</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Input label="Rent" type="number" min="0" value={form.overhead.rent} onChange={(event) => updateOperational('overhead', 'rent', event.target.value)} />
              <Input label="Utilities" type="number" min="0" value={form.overhead.utilities} onChange={(event) => updateOperational('overhead', 'utilities', event.target.value)} />
              <Input label="Miscellaneous" type="number" min="0" value={form.overhead.miscellaneous} onChange={(event) => updateOperational('overhead', 'miscellaneous', event.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Monthly Capacity</p><p className="mt-1 text-2xl font-black text-navy">{monthlyCapacity > 0 ? `${formatNumber(monthlyCapacity)} units` : '--'}</p>{monthlyCapacity <= 0 ? <p className="mt-1 text-xs font-semibold text-slate-500">Fill out your defaults to calculate.</p> : null}</div>
          <div className="rounded-md border border-teal-100 bg-teal-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Global Labor / Unit</p><p className="mt-1 text-2xl font-black text-accent">{monthlyCapacity > 0 ? formatCurrency(laborCostPerUnit) : '--'}</p>{monthlyCapacity <= 0 ? <p className="mt-1 text-xs font-semibold text-slate-500">Fill out your defaults to calculate.</p> : null}</div>
          <div className="rounded-md border border-teal-100 bg-teal-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Global Overhead / Unit</p><p className="mt-1 text-2xl font-black text-accent">{monthlyCapacity > 0 ? formatCurrency(overheadCostPerUnit) : '--'}</p>{monthlyCapacity <= 0 ? <p className="mt-1 text-xs font-semibold text-slate-500">Fill out your defaults to calculate.</p> : null}</div>
        </div>
      </Card>
      )}

      <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <p className="hidden text-sm font-semibold text-slate-500 sm:block">Save your identity and operational defaults together.</p>
        <Button onClick={saveChanges}><Save className="h-4 w-4" /> Save Changes</Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-teal-50 text-accent">
              <Headphones className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-navy">Customer Service</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                Need more help? Book a consultation for costing, pricing, or business setup support.
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Book a consultation if you need help reviewing your product costing, pricing strategy, overhead costs, manpower, or business setup.
              </p>
            </div>
          </div>
          <Button onClick={() => setConsultationOpen(true)}><CalendarCheck className="h-4 w-4" /> Book a Consultation</Button>
        </div>
        {consultationRequests.length ? (
          <div className="mt-4 overflow-x-auto rounded-md border border-slate-100">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date Submitted</th>
                  <th className="px-3 py-2">Business Concern</th>
                  <th className="px-3 py-2">Preferred Date</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consultationRequests.slice(0, 5).map((request) => (
                  <tr key={request.id || request.createdAt}>
                    <td className="px-3 py-2 font-semibold text-slate-600">{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-3 py-2 font-black text-navy">{request.businessConcern || request.concern || 'Other'}</td>
                    <td className="px-3 py-2 font-semibold text-slate-600">{request.preferredDate || 'N/A'}</td>
                    <td className="px-3 py-2"><span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">{request.status || 'Pending'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      {consultationOpen ? (
        <ConsultationModal
          business={form}
          onClose={() => setConsultationOpen(false)}
          onSubmitRequest={(request) => setConsultationRequests((current) => [request, ...current])}
        />
      ) : null}
    </div>
  );
}
