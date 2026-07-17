import { ChevronDown } from 'lucide-react';

export function Card({ children, className = '' }) {
  return <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-soft ${className}`}>{children}</section>;
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = variant === 'ghost'
    ? 'border border-slate-200 bg-white text-slate-700 hover:border-accent'
    : variant === 'secondary'
      ? 'bg-navy text-white hover:bg-slate-800'
      : 'bg-accent text-white hover:bg-teal-600';
  return (
    <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      <input className={`w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-100 ${className}`} {...props} />
    </label>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      <span className="relative block">
        <select className={`w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-100 ${className}`} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
      </span>
    </label>
  );
}

export function TextArea({ label, className = '', ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      <textarea className={`min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-100 ${className}`} {...props} />
    </label>
  );
}

export function ResultCard({ label, value, tone = 'neutral' }) {
  const toneClass = tone === 'good' ? 'border-teal-200 bg-teal-50' : tone === 'warn' ? 'border-orange-200 bg-orange-50' : tone === 'risk' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white';
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-navy">{value}</p>
    </div>
  );
}

export function ChartCard({ title, children }) {
  return (
    <Card className="min-h-80">
      <h3 className="text-base font-bold text-navy">{title}</h3>
      <div className="mt-4 h-64">{children}</div>
    </Card>
  );
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  const tones = {
    good: 'bg-teal-50 text-teal-700 border-teal-200',
    warn: 'bg-orange-50 text-orange-700 border-orange-200',
    risk: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone]} ${className}`}>{children}</span>;
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-navy">{title}</h2>
          <button onClick={onClose} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
