export function LegalLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="legal-page">
    <header className="nav-wrap"><a href="/" className="brand"><img src="/kostaraa-logo.png" alt="Kostaraa"/></a><nav className="desktop-nav"><a href="/#how">How it works</a><a href="/blog">Learn</a><a href="/about">About</a><a href="/contact">Contact Us</a></nav><div className="nav-actions"><a className="button small" href="/">Back to home</a></div></header>
    <section className="legal-hero"><span className="eyebrow">Kostaraa legal</span><h1>{title}</h1><p>{subtitle}</p><small>Effective date: July 11, 2026</small></section>
    <article className="legal-content">{children}</article>
    <footer><div className="footer-top"><div><img src="/kostaraa-logo.png" alt="Kostaraa"/><p>Cost Better. Price Smarter.</p></div><div><b>Product</b><a href="/#how">How it works</a></div><div><b>Legal</b><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Use</a></div><div><b>Company</b><a href="/about">About Kostaraa</a><a href="/contact">Contact Us</a></div></div><div className="footer-bottom"><span>© 2026 Elvio. All rights reserved.</span><span>Kostaraa is a product of Elvio.</span></div></footer>
  </main>;
}
