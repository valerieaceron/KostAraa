import "../styles/marketing-footer.css";

export function MarketingFooter() {
  return <footer className="marketing-footer">
    <div className="footer-top">
      <div className="marketing-footer-brand">
        <a href="/" aria-label="Kostaraa home"><img src="/brand/kostaraa-white-logo.png" alt="Kostaraa"/></a>
        <p>Cost Better. Price Smarter.</p>
      </div>
      <div><b>Product</b><a href="/#how-it-works">How it works</a><a href="/pricing">Pricing</a></div>
      <div><b>Resources</b><a href="/blog">Insights</a><a href="/contact">Contact Us</a></div>
      <div><b>Company</b><a href="/about">About Us</a><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Use</a></div>
    </div>
    <div className="footer-bottom"><span>© 2026 Elvio. All rights reserved.</span><span>Kostaraa is a product of Araa Software Publishing Solutions 🇵🇭</span></div>
  </footer>;
}
