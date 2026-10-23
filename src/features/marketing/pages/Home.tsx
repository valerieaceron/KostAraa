import {
  ArrowRight,
  BarChart3,
  Calculator,
  Target,
} from "lucide-react";
import { useEffect } from "react";
import { MarketingHeader } from "../components/MarketingHeader";
import { MarketingFooter } from "../components/MarketingFooter";

const focusAreas = [
  [Calculator, "Cost Planning"],
  [BarChart3, "Profitability"],
  [Target, "Market Pricing"],
];

const outcomes = [
  ["01", "Cost clarity", "Bring materials, packaging, labor, operating expenses, marketing, and taxes into one clearer product plan."],
  ["02", "Financial feasibility", "Understand break-even requirements and test whether a realistic sales target can support the wider business."],
  ["03", "Pricing confidence", "Balance sustainable margins with customer expectations and market pricing before making the next commitment."],
];

const workflowSteps = [
  ["01", "Add your product costs", "Enter the materials, packaging, labor, and other costs needed to make and sell your product.", "Kostaraa add-material workflow", "/marketing/kostaraa-add-material.mp4"],
  ["02", "Calculate your true product cost", "See your total product cost, including direct costs and recurring business expenses, before setting a price.", "Kostaraa product-cost computation workflow", "/marketing/kostaraa-compute.mp4"],
  ["03", "Check your price and profit", "Review your profit, margin, break-even point, and sales target to see if your plan can support your business.", "Kostaraa pricing analysis workflow", "/marketing/kostaraa-analyze.mp4"],
];

const faqs = [
  ["Is Kostaraa an accounting system?", "No. Kostaraa is a pre-decision planning tool that helps product-based businesses understand costs, pricing, and financial feasibility before committing money."],
  ["What costs can I include?", "You can plan with materials, packaging, labor, business expenses, marketing, and taxes so your price is based on a more complete picture."],
  ["Can Kostaraa tell me whether my business will succeed?", "Kostaraa provides planning estimates based on the information you enter. It helps you spot gaps and ask better questions, but it does not guarantee business outcomes."],
  ["Is competitor analysis available?", "Competitor analysis is being developed and is not yet included as a current Kostaraa capability."],
];

function HoverPreview({ src, label }: { src: string; label: string }) {
  const play = (video: HTMLVideoElement) => {
    void video.play();
  };
  const reset = (video: HTMLVideoElement) => {
    video.pause();
    video.currentTime = 0;
  };

  return <video
    src={src}
    aria-label={`${label}. Hover or focus to play.`}
    loop
    muted
    playsInline
    preload="auto"
    tabIndex={0}
    onMouseEnter={event => play(event.currentTarget)}
    onMouseLeave={event => reset(event.currentTarget)}
    onFocus={event => play(event.currentTarget)}
    onBlur={event => reset(event.currentTarget)}
  />;
}

export const metadata = {
  title: "Kostaraa — Costing and Pricing Planner",
  description: "Costing, pricing, and business planning tools for product-based entrepreneurs.",
};

export default function Home() {
  useEffect(() => {
    if (window.location.hash !== "#how-it-works") return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById("how-it-works")?.scrollIntoView({ block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <main className="landing-page home-refresh">
    <MarketingHeader overlay/>

    <section className="home-hero" id="top">
      <div className="home-hero-frame">
        <img className="home-hero-photo" src="/marketing/kostaraa-business-planning-hero.jpg" alt="Two entrepreneurs reviewing product costs and planning their business"/>
        <div className="home-hero-shade" aria-hidden="true"/>
        <div className="home-hero-copy">
          <h1>Plan with clarity.<br/><span>Price with confidence.</span></h1>
          <p className="home-hero-problem">Know what each product truly costs—and whether your sales plan can support the business behind it.</p>
          <div className="home-hero-actions"><a className="button" href="/signup">Start planning free <ArrowRight aria-hidden="true"/></a></div>
        </div>
      </div>
    </section>

    <section className="home-next" id="why" aria-labelledby="why-title">
      <div className="home-connected-panel glass-panel">
        <div className="home-who-list" aria-label="Kostaraa planning focus areas">{focusAreas.map(([Icon,title])=><div key={String(title)}><Icon aria-hidden="true"/><span>{String(title)}</span></div>)}</div>
        <div className="home-focus-carousel" aria-label="Kostaraa planning focus areas">
          <div className="home-focus-track">
            {focusAreas.map(([Icon,title])=><div key={`focus-${String(title)}`}><Icon aria-hidden="true"/><span>{String(title)}</span></div>)}
            {focusAreas.map(([Icon,title])=><div key={`focus-copy-${String(title)}`} aria-hidden="true"><Icon aria-hidden="true"/><span>{String(title)}</span></div>)}
          </div>
        </div>
        <div className="home-how-layout">
          <div className="home-how-copy"><h2 id="why-title">Plan your next product with clarity and confidence.</h2><p>Turn scattered costs and assumptions into a plan you can review before committing more time, money, or inventory.</p><a href="/signup">Start your product plan <ArrowRight aria-hidden="true"/></a></div>
          <div className="home-outcome-stair" aria-label="Planning outcomes">{outcomes.map(([number,title,copy])=><article key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
        </div>
      </div>
    </section>

    <section className="home-decisions" id="how-it-works" aria-labelledby="decisions-title">
      <div className="home-section-intro"><h2 id="decisions-title">How it works.</h2><p>Getting started is simple: add your costs, let Kostaraa calculate your true product cost, then see whether your price can support the business you’re building.</p></div>
      <div className="home-product-flow">{workflowSteps.map(([number,title,copy,alt,video])=><article key={number}>
        <div className="home-product-step"><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></div>
        <figure className="home-workflow-preview">{video
          ? <HoverPreview src={video} label={alt}/>
          : <img src="/marketing/kostaraa-dashboard-preview.webp" alt={alt}/>
        }</figure>
      </article>)}</div>
    </section>

    <section className="home-faq" aria-labelledby="faq-title">
      <div className="home-section-intro"><h2 id="faq-title">Frequently asked questions.</h2></div>
      <div className="home-faq-list">{faqs.map(([question,answer],index)=><details key={question} open={index===0}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
    </section>

    <section className="home-final" aria-labelledby="home-final-title">
      <div className="home-final-inner">
        <div className="home-final-copy">
          <h2 id="home-final-title">Ready to price with confidence?</h2>
          <p>See your costs, test your price, and plan what comes next.</p>
          <div className="home-final-actions"><a className="button" href="/signup">Start planning free <ArrowRight aria-hidden="true"/></a><a href="/blog">Explore guides <ArrowRight aria-hidden="true"/></a></div>
        </div>
        <div className="home-final-product" aria-label="Kostaraa costing and pricing workspace preview">
          <div className="home-final-laptop">
            <div className="home-final-screen">
              <div className="home-final-browser"><i/><i/><i/><span>Kostaraa workspace</span></div>
              <img src="/marketing/kostaraa-dashboard-preview.webp" alt="Kostaraa dashboard with product costing and pricing insights"/>
            </div>
            <div className="home-final-laptop-base" aria-hidden="true"/>
          </div>
          <div className="home-final-stat home-final-stat-cost" aria-hidden="true"><Calculator/><span>True cost</span><strong>₱80.70</strong></div>
          <div className="home-final-stat home-final-stat-margin" aria-hidden="true"><BarChart3/><span>Margin</span><strong>37.5%</strong></div>
          <div className="home-final-stat home-final-stat-markup" aria-hidden="true"><Target/><span>Markup</span><strong>60%</strong></div>
        </div>
      </div>
    </section>

    <MarketingFooter/>
  </main>;
}
