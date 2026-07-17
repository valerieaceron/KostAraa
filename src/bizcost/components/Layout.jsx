import { useState } from 'react';
import { BarChart3, Calculator, CreditCard, Library, Lightbulb, LogOut, Menu, PackageSearch, Sparkles, X } from 'lucide-react';
import { Button } from './ui';

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'products', label: 'Library', icon: Library },
  { id: 'inventory', label: 'Inventory', icon: PackageSearch },
  { id: 'calculator', label: 'Calculator', icon: Calculator },
  { id: 'recommendations', label: 'Business Health Simulator', icon: Lightbulb },
  { id: 'account', label: 'Business Profile', icon: CreditCard },
];

export default function Layout({ page, setPage, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const goToPage = (id) => {
    setPage(id);
    setMobileOpen(false);
  };
  const NavContent = () => (
    <>
      <div className="hidden items-center gap-3 md:flex">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy text-white"><Sparkles className="h-5 w-5" /></span>
        <div>
          <p className="text-lg font-black text-navy">BizCost</p>
          <p className="text-xs text-slate-500">Startup costing guide</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 md:mt-8">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => goToPage(item.id)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition ${active ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              title={item.label}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <Button variant="ghost" className="mt-6 w-full justify-start" onClick={onLogout}><LogOut className="h-4 w-4" /> Logout</Button>
    </>
  );

  return (
    <div className="min-h-screen dotted-canvas">
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-72 border-r border-slate-200 bg-white/95 p-5 backdrop-blur md:block">
        <NavContent />
      </aside>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <button className="flex items-center gap-2 font-black text-navy" onClick={() => setMobileOpen(true)} type="button"><Menu className="h-5 w-5" /> BizCost</button>
        <Button variant="ghost" className="min-h-9 px-3 py-1.5" onClick={onLogout}>Logout</Button>
      </header>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-slate-950/40" aria-label="Close menu" onClick={() => setMobileOpen(false)} type="button" />
          <aside className="relative h-full w-80 max-w-[86vw] bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-white"><Sparkles className="h-5 w-5" /></span>
                <div>
                  <p className="font-black text-navy">BizCost</p>
                  <p className="text-xs text-slate-500">Startup costing guide</p>
                </div>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600" onClick={() => setMobileOpen(false)} type="button"><X className="h-4 w-4" /></button>
            </div>
            <NavContent />
          </aside>
        </div>
      ) : null}
      <main className="px-4 pb-10 pt-5 md:ml-72 md:px-8 md:pt-8">{children}</main>
    </div>
  );
}
