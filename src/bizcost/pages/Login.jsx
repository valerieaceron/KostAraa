import { Sparkles } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';

export default function Login({ onLogin }) {
  return (
    <main className="flex min-h-screen items-center justify-center dotted-canvas p-4">
      <Card className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-white"><Sparkles className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-black text-navy">BizCost</h1>
            <p className="text-sm text-slate-500">Know your costs before you launch.</p>
          </div>
        </div>
        <div className="space-y-4">
          <Input label="Email" type="email" placeholder="owner@business.com" />
          <Input label="Password" type="password" placeholder="••••••••" />
          <Button className="w-full" onClick={onLogin}>Login</Button>
          <Button variant="ghost" className="w-full" onClick={onLogin}>Try Demo</Button>
        </div>
      </Card>
    </main>
  );
}
