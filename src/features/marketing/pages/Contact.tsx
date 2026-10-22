import { ContactForm } from "../components/ContactForm";
import { MarketingHeader } from "../components/MarketingHeader";
import { MarketingFooter } from "../components/MarketingFooter";
import "../styles/marketing-page-hero.css";
import "../styles/contact.css";

export const metadata={title:"Contact Us — Kostaraa",description:"Contact Kostaraa for product, plan, support, privacy, and partnership questions."};

export default function Contact(){return <main className="contact-page contact-refresh marketing-gradient-page">
  <MarketingHeader active="contact" overlay/>
  <section className="contact-hero marketing-page-hero">
    <div className="contact-hero-inner marketing-page-hero-inner">
      <h1>Contact Us</h1>
    </div>
  </section>
  <section className="contact-content"><ContactForm/></section>
  <MarketingFooter/>
</main>}
