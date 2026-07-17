const features = [
  ["Complete product costing", "Bring materials, packaging, labor, and operation costs into one understandable total.", "▦"],
  ["Clearer pricing checks", "See how your selling price affects your profit, markup, and margin.", "◇"],
  ["Organized inventory", "Track the materials, purchase costs, and measurement units used by your products.", "▣"],
  ["Practical business insights", "Turn your saved costs and business details into guidance you can act on.", "↗"],
  ["Guided help from Araa", "Ask simple questions about using Kostaraa and get answers based on Beta 0.2.26 features.", "?"],
];

const steps = [
  ["01", "Set up your business", "Tell Kostaraa how your business works."],
  ["02", "Build your product cost", "Add materials, packaging, labor, and operation costs."],
  ["03", "Review your numbers", "See your true cost, suggested price, profit, and margin."],
];

export const metadata = {
  title: "Kostaraa — Cost Better. Price Smarter.",
  description: "Simple product costing and pricing guidance for small businesses.",
};

export default function Home() {
  return <main className="landing-page">
    <header className="nav-wrap">
      <a href="/#top" className="brand" aria-label="Kostaraa home"><img src="/kostaraa-logo.png" alt="Kostaraa"/></a>
      <nav className="desktop-nav" aria-label="Main navigation"><a href="/#how">How it works</a><a href="/blog">Learn</a><a href="/about">About</a><a href="/contact">Contact Us</a></nav>
      <div className="nav-actions"><a className="login" href="/login">Log in</a><a className="button small" href="/signup">Start free</a></div>
      <details className="mobile-menu"><summary aria-label="Open menu">☰</summary><div><a href="/#how">How it works</a><a href="/blog">Learn</a><a href="/about">About</a><a href="/contact">Contact Us</a><a href="/login">Log in</a></div></details>
    </header>

    <section className="hero section" id="top">
      <div className="hero-copy"><h1>Know your True Product Cost. <span>Price with Confidence.</span></h1><p className="lead">Kostaraa brings materials, labor, packaging, overhead, and hidden expenses together—so you can stop guessing and make clearer pricing decisions.</p><div className="cta-row"><a className="button" href="/signup">Start costing for free <b>→</b></a><a className="button ghost" href="#how">See how it works</a></div></div>
      <div className="dashboard-shell" aria-label="Kostaraa workspace preview"><div className="dash-side"><div className="dash-logo">k<span>ostaraa</span></div><b>▥ &nbsp; Dashboard</b><span>◇ &nbsp; Inventory</span><span>▦ &nbsp; Calculator</span><span>▤ &nbsp; Library</span><span>◉ &nbsp; Business Health Simulator</span></div><div className="dash-main"><div className="dash-top"><b>Business Health Snapshot</b><span>Beta 0.2.26</span></div><p>Track saved products, inventory value, and key costing insights.</p><div className="metrics"><div><small>Total products</small><strong>11</strong><em>Saved</em></div><div><small>Inventory value</small><strong>₱8,055</strong><em>Current</em></div><div><small>Average margin</small><strong>25.09%</strong><em>Review</em></div></div><div className="chart-card"><div><b>Cost vs. selling price</b><div className="bars"><i style={{height:"48%"}}/><i style={{height:"72%"}}/><i style={{height:"55%"}}/><i style={{height:"86%"}}/><i style={{height:"64%"}}/></div></div><div className="top-products"><b>Saved products</b><span>Mango Fruit Soda <i>23.08%</i></span><span>Chocolate Drinks <i>23.08%</i></span><span>Vanilla Latte <i>23.66%</i></span></div></div></div></div>
    </section>

    <section className="how section blue-tint" id="how"><div className="section-head"><span className="eyebrow">Simple from day one</span><h2>Three steps to a <span>clearer price</span></h2><p>Bring your business details and product costs together, then let Kostaraa make the numbers easier to understand.</p></div><div className="steps">{steps.map(([number,title,copy])=><article key={number}><div>{number}</div><h3>{title}</h3><p>{copy}</p></article>)}</div><a className="button" href="/signup">Create your free account →</a></section>

    <section className="section" id="features"><div className="section-head"><span className="eyebrow">Built for clearer decisions</span><h2>Tools that do the math. <span>Guidance you can understand.</span></h2><p>From your first material entry to your final pricing check, Kostaraa keeps every step practical and easy to follow.</p></div><div className="feature-grid">{features.map(([title,copy,icon])=><article key={title}><i>{icon}</i><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section className="section plans"><div className="section-head"><span className="eyebrow">Start with confidence</span><h2>Begin with clearer <span>costing decisions.</span></h2><p>Create your account and start building a clearer picture of your product costs.</p></div><div className="cta-row center"><a className="button" href="/signup">Start free →</a></div></section>

    <section className="final-cta"><span className="eyebrow light">Your clearer business starts here</span><h2>Cost Better. Price Smarter.</h2><p>Build a product cost you can understand and a price you can explain.</p><div className="cta-row center"><a className="button white" href="/signup">Create account →</a><a className="button outline-white" href="/login">Log in</a></div></section>

    <footer><div className="footer-top"><div><img src="/kostaraa-logo.png" alt="Kostaraa"/><p>Cost Better. Price Smarter.</p></div><div><b>Explore</b><a href="/#how">How it works</a><a href="/blog">Learn</a></div><div><b>Company</b><a href="/about">About</a><a href="/contact">Contact Us</a></div><div><b>Legal</b><a href="/privacy">Privacy</a><a href="/terms">Terms of Use</a></div></div><div className="footer-bottom"><span>© 2026 Kostaraa. All rights reserved.</span><span>A product of Elvio</span></div></footer>
  </main>;
}
