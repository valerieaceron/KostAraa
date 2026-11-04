import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";

export function LegalLayout({ title, subtitle, children, variant="default" }: { title: string; subtitle: string; children: React.ReactNode; variant?: "default"|"document" }) {
  return <main className={`legal-page${variant==="document"?" legal-page-document":""}`}>
    <MarketingHeader/>
    <section className="legal-hero">{variant!=="document"&&<span className="eyebrow">Kostaraa legal</span>}<h1>{title}</h1><p>{subtitle}</p><small>Effective date: July 11, 2026</small></section>
    <article className="legal-content">{children}</article>
    <MarketingFooter/>
  </main>;
}
