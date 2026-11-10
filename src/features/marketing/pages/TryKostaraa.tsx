import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  ClipboardList,
  Grid3X3,
  PackageOpen,
  ReceiptText,
  Scale,
  Sparkles,
  Target,
} from "lucide-react";
import { MarketingHeader } from "../components/MarketingHeader";
import { MarketingFooter } from "../components/MarketingFooter";
import "../styles/marketing-page-hero.css";
import "../styles/try-kostaraa.css";
import "../styles/try-kostaraa-refinements.css";

const features = [
  [BriefcaseBusiness, "Business Setup", "Record your operations, expenses, manpower, production capacity, and target customers."],
  [PackageOpen, "Inventory Costing", "Add materials and packaging, then see the cost of every purchased unit."],
  [ReceiptText, "Product Costing", "Bring ingredients, labor, operating expenses, fees, and marketing into one complete costing."],
  [Target, "Suggested Selling Price", "Get a sustainable price recommendation based on your costs and desired margin."],
  [Scale, "Price Comparison", "Compare your planned price with the suggested price and customer spending capacity."],
  [BarChart3, "Profit Insights", "Review estimated profit per item, margin, and break-even requirements."],
  [Grid3X3, "Costing Grid", "Create, update, copy, sort, and manage several product costings in one spreadsheet-style view."],
  [BookOpen, "Product Library", "Save and organize products with clear, consistent costing and pricing summaries."],
  [ClipboardList, "Business Dashboard", "Understand product performance, costs, capacity, and pricing opportunities at a glance."],
  [Bot, "Araa Assistance", "Receive simple, contextual guidance while setting up and using your workspace."],
] as const;

const workflowSteps = [
  ["01", "Add your product costs", "Enter the materials, packaging, labor, and other costs needed to make and sell your product.", "Kostaraa add-material workflow", "/marketing/kostaraa-add-material.mp4"],
  ["02", "Calculate your true product cost", "See your total product cost, including direct costs and recurring business expenses, before setting a price.", "Kostaraa product-cost computation workflow", "/marketing/kostaraa-compute.mp4"],
  ["03", "Check your price and profit", "Review your profit, margin, break-even point, and sales target to see if your plan can support your business.", "Kostaraa pricing analysis workflow", "/marketing/kostaraa-analyze.mp4"],
] as const;

const starter = ["10 inventory records", "3 saved products and services", "Profit insights and price comparison", "Araa assistance"];
const businessPlus = ["100 inventory records", "100 saved products and services", "Deeper pricing and break-even planning", "Ad-free workspace and cloud backup"];

function HoverPreview({ src, label }: { src: string; label: string }) {
  const play = (video: HTMLVideoElement) => { void video.play(); };
  const reset = (video: HTMLVideoElement) => { video.pause(); video.currentTime = 0; };

  return <video src={src} aria-label={`${label}. Hover or focus to play.`} loop muted playsInline preload="auto" tabIndex={0}
    onMouseEnter={event => play(event.currentTarget)} onMouseLeave={event => reset(event.currentTarget)}
    onFocus={event => play(event.currentTarget)} onBlur={event => reset(event.currentTarget)}/>;
}

export default function TryKostaraa() {
  return <main className="product-landing marketing-gradient-page">
    <MarketingHeader overlay/>

    <section className="product-hero" aria-labelledby="product-hero-title">
      <div className="product-hero-visual" aria-label="Kostaraa business dashboard preview">
        <h1 className="product-visual-title" id="product-hero-title">Know your true cost.<br/><em>Price with confidence.</em></h1>
        <div className="product-preview-frame">
          <div className="product-preview-bar"><i/><i/><i/><span>Kostaraa workspace</span></div>
          <img src="/marketing/kostaraa-dashboard-showcase.png" alt="Kostaraa dashboard showing quick actions, cost insights, and the business summary"/>
          <div className="product-preview-note product-preview-cost"><ReceiptText aria-hidden="true"/><span>Total product cost</span><strong>Clear and complete</strong></div>
          <div className="product-preview-note product-preview-price"><Sparkles aria-hidden="true"/><span>Suggested price</span><strong>Ready to review</strong></div>
        </div>
      </div>
    </section>

    <section className="product-features" aria-labelledby="product-features-title">
      <div className="product-section-heading"><h2 id="product-features-title">Core Features</h2><p>Move from scattered costs and assumptions to one clearer view of what it takes to produce, price, and sustain each product.</p></div>
      <div className="product-feature-grid">{features.map(([Icon,title,copy],index)=><article key={title} className={index < 2 ? "featured" : ""}><div><Icon aria-hidden="true"/></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>

    <section className="product-how home-decisions" id="how-it-works" aria-labelledby="product-how-title">
      <div className="home-section-intro"><h2 id="product-how-title">How it works.</h2><p>Getting started is simple: add your costs, let Kostaraa calculate your true product cost, then see whether your price can support the business you’re building.</p></div>
      <div className="home-product-flow">{workflowSteps.map(([number,title,copy,alt,video])=><article key={number}>
        <div className="home-product-step"><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></div>
        <figure className="home-workflow-preview">{video
          ? <HoverPreview src={video} label={alt}/>
          : <img src="/marketing/kostaraa-dashboard-preview.webp" alt={alt}/>
        }</figure>
      </article>)}</div>
    </section>

    <section className="product-pricing" aria-labelledby="product-pricing-title">
      <div className="product-section-heading"><h2 id="product-pricing-title">Start free. Upgrade when your business needs more.</h2><p>Explore the core workflow with Starter, then move to Business Plus for higher limits and deeper planning.</p></div>
      <div className="product-plan-grid">
        <article><span>Starter</span><h3>Free</h3><p>The essentials for building your first costings.</p><ul>{starter.map(item=><li key={item}>{item}</li>)}</ul><a href="/signup">Start free <ArrowRight aria-hidden="true"/></a></article>
        <article className="recommended"><div className="product-plan-badge">Best for active businesses</div><span>Business Plus</span><h3>₱899 <small>/ year</small></h3><p>More room to plan, compare, and grow your product catalog.</p><ul>{businessPlus.map(item=><li key={item}>{item}</li>)}</ul><a href="/pricing">Explore Business Plus <ArrowRight aria-hidden="true"/></a></article>
      </div>
      <a className="product-compare-link" href="/pricing">Compare all plan features <ArrowRight aria-hidden="true"/></a>
    </section>

    <section className="product-final-cta" aria-labelledby="product-final-title"><div><h2 id="product-final-title">Make your pricing decision with clearer numbers.</h2><p>Add your costs, review the recommendation, and understand what your price means for the business behind it.</p><a href="/signup">Try Kostaraa for Free <ArrowRight aria-hidden="true"/></a><small>No credit card required.</small></div></section>

    <MarketingFooter/>
  </main>;
}
