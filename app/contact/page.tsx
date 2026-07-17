import { ContactForm } from "./ContactForm";
import "./contact.css";

export const metadata={title:"Contact Us — Kostaraa",description:"Contact Kostaraa for product, plan, support, privacy, and partnership questions."};

export default function Contact(){return <main className="contact-page">
  <header className="nav-wrap"><a href="/" className="brand"><img src="/kostaraa-logo.png" alt="Kostaraa"/></a><nav className="desktop-nav"><a href="/#how">How it works</a><a href="/blog">Learn</a><a href="/about">About</a><a className="active" href="/contact">Contact Us</a></nav><div className="nav-actions"><a className="button small" href="/signup">Start free</a></div><details className="mobile-menu"><summary aria-label="Open menu">☰</summary><div><a href="/">Home</a><a href="/blog">Learn</a><a href="/about">About</a><a href="/contact">Contact Us</a></div></details></header>
  <section className="contact-hero"><span className="eyebrow">Contact Kostaraa</span><h1>Let’s find the answer<br/><span>you need.</span></h1><p>Questions about costing, plans, your account, or working with us? Send a message and we’ll point you in the right direction.</p></section>
  <section className="contact-content"><ContactForm/></section>
  <section className="contact-faq"><h2>Need a quicker answer?</h2><p>Ask Araa, our Kostaraa librarian, for common FAQs and general product guidance.</p><button className="button" type="button">Use “Ask Araa” below →</button></section>
  <footer><div className="footer-top"><div><img src="/kostaraa-logo.png" alt="Kostaraa"/><p>Cost Better. Price Smarter.</p></div><div><b>Product</b><a href="/#how">How it works</a></div><div><b>Resources</b><a href="/blog">Blog</a><a href="/contact">Contact Us</a></div><div><b>Company</b><a href="/about">About</a><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Use</a></div></div><div className="footer-bottom"><span>© 2026 Elvio. All rights reserved.</span><span>Kostaraa is a product of Elvio 🇵🇭</span></div></footer>
</main>}
