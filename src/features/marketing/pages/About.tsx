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
  return <main className="about-page about-refresh marketing-gradient-page">
    <MarketingHeader active="about" overlay/>

    <section className="about-hero marketing-page-hero">
      <div className="about-hero-inner marketing-page-hero-inner">
        <h1>About Us</h1>
      </div>
    </section>

    <section className="about-content">
      <article className="about-row about-origin">
        <figure className="about-visual about-origin-visual">
          <img
            src="/marketing/kostaraa-why-we-built-cost-planning.png"
            alt="A product-business owner reviewing receipts, costs, and product packaging at a worktable"
          />
        </figure>
        <div className="about-copy">
          <h2>Why we built Kostaraa</h2>
          <p>Kostaraa began with a simple realization: many small business owners build through trial and error, spreadsheets, and pricing decisions that are harder than they should be. For aspiring entrepreneurs and growing product-based MSMEs, the biggest friction point is often pricing clarity.</p>
          <p>Kostaraa is a web-based platform designed to help users understand true product cost, assess pricing health, check profit and margin, include overhead and hidden expenses, and set prices that are sustainable, competitive, and aligned with the value of their products.</p>
        </div>
      </article>

      <article className="about-row reverse about-product">
        <div className="about-copy">
          <h2>What we do</h2>
          <p>Kostaraa brings product costing, pricing checks, margin insights, and business simulations into one guided platform. Whether you are testing your first selling price, reviewing supplier changes, or planning for growth, Kostaraa helps turn scattered numbers into clearer decisions.</p>
        </div>
        <figure className="about-product-visual">
          <img src="/marketing/kostaraa-what-we-do-lifestyle.png" alt="A small product-business owner reviewing costs while preparing products for sale"/>
        </figure>
      </article>

      <article className="about-story" id="elvio">
        <div className="about-story-visual" aria-hidden="true">
          <img src="/marketing/kostaraa-business-planning-hero.jpg" alt=""/>
          <div className="about-story-mark"><img src="/brand/kostaraa-white-logo.png" alt=""/></div>
        </div>
        <div className="about-copy about-story-copy">
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

    <section className="about-cta">
      <h2>Your product deserves a price that works.</h2>
      <p>Start with your real costs and make every pricing decision with more confidence.</p>
      <a className="button white" href="/signup">Start free <ArrowRight aria-hidden="true"/></a>
    </section>

    <MarketingFooter/>
  </main>;
}
