import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "../components/MarketingHeader";
import { MarketingFooter } from "../components/MarketingFooter";
import "../styles/marketing-page-hero.css";
import "../styles/about.css";

export const metadata = {
  title: "About — Kostaraa",
  description: "Why Kostaraa was built and how it helps small product businesses cost better and price smarter.",
};

export default function About() {
  const [activeAudience, setActiveAudience] = useState(1);

  const audienceCards = [
    {
      image: "/marketing/kostaraa-audience-new-maker.webp",
      alt: "A new product maker preparing her first small batch and reviewing notes",
      label: "New product makers",
    },
    {
      image: "/marketing/kostaraa-audience-small-business-owner.webp",
      alt: "A small business owner reviewing product costs at her workspace",
      label: "Small business owners",
    },
    {
      image: "/marketing/kostaraa-audience-growing-team.webp",
      alt: "Business partners reviewing products and planning their next production run",
      label: "Growing product brands",
    },
  ];

  return <main className="about-page about-refresh marketing-gradient-page">
    <MarketingHeader active="about" overlay/>

    <section className="about-hero marketing-page-hero">
      <div className="about-hero-inner marketing-page-hero-inner">
        <h1>About Us</h1>
      </div>
    </section>

    <section className="about-content">
      <section className="about-audience" aria-labelledby="about-audience-title">
        <div className="about-audience-heading">
          <h2 id="about-audience-title">We help product makers turn costs into confident decisions.</h2>
        </div>
        <div className="about-audience-gallery">
          {audienceCards.map((card, index) => <figure
            aria-pressed={activeAudience === index}
            className={`about-audience-card${activeAudience === index ? " is-active" : ""}`}
            key={card.label}
            onClick={() => setActiveAudience(index)}
            onFocus={() => setActiveAudience(index)}
            onMouseEnter={() => setActiveAudience(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActiveAudience(index);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <img src={card.image} alt={card.alt}/>
            <figcaption><strong>{card.label}</strong></figcaption>
          </figure>)}
        </div>
      </section>

      <section className="about-journey" aria-label="The Kostaraa journey">
        <article className="about-journey-item">
          <div className="about-journey-marker" aria-hidden="true"><span/></div>
          <div className="about-copy">
            <h2>Why we built Kostaraa</h2>
            <p>Kostaraa began with a simple realization: many small business owners build through trial and error, spreadsheets, and pricing decisions that are harder than they should be. For aspiring entrepreneurs and growing product-based MSMEs, the biggest friction point is often pricing clarity.</p>
            <p>Kostaraa is a web-based platform designed to help users understand true product cost, assess pricing health, check profit and margin, include overhead and hidden expenses, and set prices that are sustainable, competitive, and aligned with the value of their products.</p>
          </div>
        </article>

        <article className="about-journey-item">
          <div className="about-journey-marker" aria-hidden="true"><span/></div>
          <div className="about-copy">
            <h2>What we do</h2>
            <p>Kostaraa brings product costing, pricing checks, margin insights, and business simulations into one guided platform. Whether you are testing your first selling price, reviewing supplier changes, or planning for growth, Kostaraa helps turn scattered numbers into clearer decisions.</p>
          </div>
        </article>

        <article className="about-journey-item" id="elvio">
          <div className="about-journey-marker" aria-hidden="true"><span/></div>
          <div className="about-copy">
            <h2>Our journey so far</h2>
            <p>Kostaraa was shaped by its founder’s journey. In 2019, she opened a café in Bulacan that generated nearly <b>₱150,000 in monthly sales</b>—yet despite the strong sales, it produced no real profit and often operated at a loss.</p>
            <p>Years later, while studying Entrepreneurship, she started another business that earned around <b>₱120,000 to ₱150,000 in monthly revenue</b>, with <b>₱20,000 in rent</b> and <b>₱30,000 to ₱50,000 in profit</b>.</p>
            <p>The difference was not simply better sales. It came from a clearer understanding of costs, overhead, pricing, and how customer behavior influences demand and buying decisions.</p>
            <p>That journey inspired Kostaraa: a simple guide for product-based entrepreneurs who are still learning how to understand their businesses.</p>
            <p>Kostaraa is not a financial or accounting tool. It provides practical guidance to help business owners understand their numbers, price with confidence, and make better-informed decisions.</p>
            <p>Kostaraa is a product of <b>Elvio</b>, with a simple goal: to build tools that empower micro and small businesses to make clearer, more confident decisions.</p>
          </div>
        </article>
      </section>
    </section>

    <section className="about-cta">
      <h2>Your product deserves a price that works.</h2>
      <p>Start with your real costs and make every pricing decision with more confidence.</p>
      <a className="button white" href="/signup">Start free <ArrowRight aria-hidden="true"/></a>
    </section>

    <MarketingFooter/>
  </main>;
}
