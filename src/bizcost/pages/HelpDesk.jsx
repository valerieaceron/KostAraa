import { Button, Card, Input, TextArea } from '../components/ui';

const faqs = [
  ['What is profit margin?', 'Profit margin shows what percent of your selling price becomes gross profit after variable costs.'],
  ['What is markup?', 'Markup compares your gross profit against your cost, not your selling price.'],
  ['How do I compute cost per ml or gram?', 'Divide purchase cost by total purchase quantity, then multiply by the quantity used per product.'],
  ['What is break-even point?', 'Break-even point is the number of units you need to sell to cover fixed costs.'],
  ['How do I know if my price is too low?', 'If margin is below 30% or break-even units are unrealistic, your price likely needs adjustment.'],
];

export default function HelpDesk() {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <h1 className="text-2xl font-black text-navy">Book a Consultation</h1>
        <div className="mt-5 space-y-4">
          <Input label="Name" placeholder="Your name" />
          <Input label="Email" type="email" placeholder="you@email.com" />
          <Input label="Business concern" placeholder="Pricing, costing, suppliers..." />
          <Input label="Preferred date" type="date" />
          <TextArea label="Notes" placeholder="Tell us what you want to review." />
          <Button className="w-full">Submit request</Button>
        </div>
      </Card>
      <Card>
        <h2 className="text-2xl font-black text-navy">FAQs</h2>
        <div className="mt-5 divide-y divide-slate-100">
          {faqs.map(([q, a]) => (
            <div key={q} className="py-4">
              <p className="font-bold text-navy">{q}</p>
              <p className="mt-1 text-sm text-slate-600">{a}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
