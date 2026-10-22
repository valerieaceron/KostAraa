import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";

export function LegalLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="legal-page">
    <MarketingHeader/>
    <section className="legal-hero"><span className="eyebrow">Kostaraa legal</span><h1>{title}</h1><p>{subtitle}</p><small>Effective date: July 11, 2026</small></section>
    <article className="legal-content">{children}</article>
    <MarketingFooter/>
  </main>;
}
