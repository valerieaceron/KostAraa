import {useEffect, useState} from "react";
import {ArrowRight, Check} from "lucide-react";
import {MarketingHeader} from "../components/MarketingHeader";
import {MarketingFooter} from "../components/MarketingFooter";
import {IntroOfferModal} from "../components/IntroOfferModal";
import {apiJson} from "../../costing/utils/api";
import {planBenefits, planPrice, planTerm} from "../../costing/utils/plans";
import "../styles/marketing-page-hero.css";
import "../styles/pricing-sticky.css";

const rows=[
  ["Costing and pricing"],
  ["Product and service costing","✓","✓","✓"],
  ["Materials and packaging costs","✓","✓","✓"],
  ["Labor and operating-cost allocation","✓","✓","✓"],
  ["Marketing, markup and tax calculations","✓","✓","✓"],
  ["Suggested and break-even prices","×","✓","✓"],
  ["Target-price testing","✓","✓","✓"],
  ["Profit and margin insights","✓","✓","✓"],
  ["Planning and insights"],
  ["Cost-distribution insights","✓","✓","✓"],
  ["Monthly sales-goal planning","×","✓","✓"],
  ["Break-even projections","×","✓","✓"],
  ["Competitor analysis","Coming soon","Coming soon","Coming soon"],
  ["Records and access"],
  ["Inventory records","Up to 10","Up to 100","Unlimited"],
  ["Saved products and services","Up to 3","Up to 100","Unlimited"],
  ["Online workspace access","✓","✓","✓"],
  ["Data storage","✓","✓","✓"],
  ["Inventory import and export","×","✓","✓"],
  ["Product Library Excel export","×","✓","✓"],
  ["Cloud backup and recovery","×","✓","✓"],
  ["Multi-device access","✓","✓","✓"],
  ["Workspace experience"],
  ["Guided Getting Started tour","✓","✓","✓"],
  ["Araa workspace assistance","✓","✓","✓"],
  ["In-app issue reporting","✓","✓","✓"],
  ["Enterprise setup and potential integrations"],
  ["Guided setup and product data migration","×","×","Scoped to your needs"],
  ["Online store integration","×","×","Available on consultation"],
  ["Customer and order management","×","×","Available on consultation"],
  ["Product catalog and stock synchronization","×","×","Available on consultation"],
  ["Custom checkout and payment receipt workflows","×","×","Available on consultation"],
  ["Delivery, order tracking and promotions","×","×","Available on consultation"],
  ["Finance and accounting integrations","×","×","Subject to compatibility"],
  ["Custom API integrations","×","×","Subject to compatibility"],
];

const starterBenefits=[
  "10 inventory records",
  "3 saved products and services",
  "Access to profit insights and price comparison",
  "Araa assistance",
];

export default function Pricing(){
  const [plans,setPlans]=useState<any[]>([]);
  const [error,setError]=useState("");
  const [refresh,setRefresh]=useState(0);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let active=true;
    setLoading(true);
    setError("");
    apiJson("/api/plans")
      .then(data=>{if(active)setPlans(data.result)})
      .catch(err=>{if(active)setError(err.message)})
      .finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[refresh]);

  const signedIn=Boolean(sessionStorage.getItem("kostaraa.token"));
  const isPaid=(plan:any)=>Number(plan.price)>0;
  const displayPlanName=(plan:any)=>isPaid(plan)?"Business Plus":"Starter";
  const planHref=(plan:any)=>signedIn
    ? isPaid(plan) ? `/workspace?page=subscription&plan=${encodeURIComponent(plan.id)}` : "/workspace"
    : isPaid(plan)
      ? `/signup?plan=${encodeURIComponent(plan.id)}`
      : "/signup";
  const planCta=(plan:any)=>isPaid(plan)?"Choose Business Plus":"Start Free";

  return <main className="pricing-page marketing-gradient-page"><MarketingHeader active="pricing" overlay/>
    <IntroOfferModal pageKey="pricing" ctaHref="#business-plus-plan" ctaLabel="View Business Plus"/>
    <section className="pricing-hero marketing-page-hero"><div className="marketing-page-hero-inner"><h1>Start free.<br/><span>Grow when you’re ready.</span></h1><p>Both plans give you online access to Kostaraa’s costing and planning tools. Choose Business Plus when you need more records, an ad-free workspace, secure backup, and multi-device access.</p></div></section>
    <section className="pricing-content" id="pricing-plans">
      {loading&&<p role="status">Loading plans…</p>}
      {error&&<p role="alert">{error} <button onClick={()=>setRefresh(value=>value+1)}>Try again</button></p>}
      {!loading&&!error&&!plans.length&&<p>No plans are available right now.</p>}
      {!loading&&!error&&plans.length>0&&<div className="pricing-cards superhuman-cards">{plans.map(plan=>{
        const paid=isPaid(plan);
        const displayName=displayPlanName(plan);
        const benefits=paid
          ? [...planBenefits(plan).filter(benefit=>!benefit.toLowerCase().includes("competitor")).map(benefit=>benefit.toLowerCase().includes("saved products and services")?"100 saved products and services":benefit),"Upload and download files"]
          : starterBenefits;
        return <article className={paid?"recommended":""} id={paid?"business-plus-plan":undefined} key={plan.id}>
          {paid?<div className="plan-heading"><small className="plan-tier">Annual Subscription</small><span className="plan-badge">Best value</span></div>:<div className="plan-heading"><small className="plan-tier">Free</small></div>}
          <div className="plan-name"><h2>{displayName}</h2></div>
          <p className="plan-audience">{plan.description}</p>
          <div className="price-box"><strong>{planPrice(plan)}</strong><small>{paid?`Billed every ${planTerm(plan)}`:"No charge · no expiry"}</small>{paid&&<span className="intro-price-note">Introductory price · First 100 users only</span>}</div>
          <a className={`button${paid?"":" ghost"}`} href={planHref(plan)}>{planCta(plan)}<ArrowRight aria-hidden="true"/></a>
          <div className="plan-benefits"><b>{paid?"Everything in Starter, plus:":"The essentials to get started"}</b><ul>{benefits.map(benefit=><li key={benefit}><Check aria-hidden="true"/><span>{benefit}</span></li>)}</ul></div>
        </article>;
      })}<article className="setup-service">
        <div className="plan-heading"><small className="plan-tier">Enterprise</small><span className="plan-badge">Tailored</span></div>
        <div className="plan-name"><h2>Enterprise Solution</h2></div>
        <p className="plan-audience">A connected workspace, tailored to how your business sells and operates.</p>
        <div className="price-box"><strong>Custom pricing</strong><small>Features and integrations are agreed during consultation.</small></div>
        <a className="button ghost" href="/contact">Contact us<ArrowRight aria-hidden="true"/></a>
        <div className="plan-benefits">
          <b>Tailored Workspace Setup:</b>
          <ul>
            <li><Check aria-hidden="true"/><span>Unlimited inventory and product records</span></li>
            <li><Check aria-hidden="true"/><span>Your online store connected to Kostaraa</span></li>
            <li><Check aria-hidden="true"/><span>Centralized customer and order management</span></li>
            <li><Check aria-hidden="true"/><span>Product catalog and stock synchronization</span></li>
            <li><Check aria-hidden="true"/><span>Custom checkout, delivery, and promotion workflows</span></li>
            <li><Check aria-hidden="true"/><span>Guided setup and product data migration</span></li>
          </ul>
        </div>
      </article></div>}
      <div className="comparison-title"><h2>Compare plans</h2><p>Start with the essentials, grow with Business Plus, or tailor a connected workspace with Enterprise. Enterprise features and integrations are agreed during consultation and depend on your requirements and platform compatibility.</p></div>
      {!loading&&!error&&plans.length>0&&<div className="pricing-tier-sticky" aria-label="Kostaraa plans">
        <div className="pricing-tier-grid">
          <div className="pricing-tier-intro"><b>Compare plans</b><span>See what each tier includes</span></div>
          {plans.map(plan=>{const paid=isPaid(plan);return <div className={`pricing-tier-summary${paid?" recommended":""}`} key={`sticky-${plan.id}`}>
            <div className="pricing-tier-name"><b>{displayPlanName(plan)}</b>{paid&&<span>Best value</span>}</div>
            <div className="pricing-tier-price"><strong>{planPrice(plan)}</strong><small>{paid?`/ ${planTerm(plan)}`:"Free forever"}</small></div>
            <a href={planHref(plan)} className={`button${paid?"":" ghost"}`}>{planCta(plan)}<ArrowRight aria-hidden="true"/></a>
          </div>})}
          <div className="pricing-tier-summary enterprise-tier-summary">
            <div className="pricing-tier-name"><b>Enterprise</b></div>
            <div className="pricing-tier-price"><strong>Custom</strong></div>
            <a href="/contact" className="button ghost">Contact us<ArrowRight aria-hidden="true"/></a>
          </div>
        </div>
      </div>}
      <div className="comparison-wrap"><table><colgroup><col className="comparison-feature-column"/><col className="comparison-plan-column"/><col className="comparison-plan-column"/><col className="comparison-plan-column"/></colgroup><thead className="comparison-table-head"><tr><th scope="col">Features</th><th scope="col">Starter</th><th scope="col">Business Plus</th><th scope="col">Enterprise</th></tr></thead><tbody>{rows.map(row=>row.length===1
        ? <tr className="comparison-group" key={row[0]}><th colSpan={4}>{row[0]}</th></tr>
        : <tr key={row[0]}>{row.map((cell,index)=><td key={index} className={cell==="×"?"no":cell==="✓"?"yes":""}>{cell}</td>)}</tr>
      )}</tbody></table></div>
    </section>
    <section className="pricing-why" aria-labelledby="pricing-why-title">
      <div className="pricing-why-inner">
        <div className="pricing-why-copy"><h2 id="pricing-why-title">Why Kostaraa</h2><p>Many small business owners are left to make pricing decisions through trial and error or scattered spreadsheets. Kostaraa brings costing, pricing checks, margin insights, and business planning into one guided workspace.</p><a href="/about">Learn more about Kostaraa <ArrowRight aria-hidden="true"/></a></div>
        <div className="pricing-why-points">
          <article><Check aria-hidden="true"/><div><h3>Understand your true cost</h3><p>Bring materials, packaging, labor, overhead, and other business expenses into the picture.</p></div></article>
          <article><Check aria-hidden="true"/><div><h3>Price with greater clarity</h3><p>Review profit, margin, and break-even information before committing to a selling price.</p></div></article>
          <article><Check aria-hidden="true"/><div><h3>Plan beyond the first sale</h3><p>Test sales goals and business costs so your pricing can better support the business you are building.</p></div></article>
        </div>
      </div>
    </section>
    <section className="pricing-final-cta" aria-labelledby="pricing-final-title">
      <div className="pricing-final-cta-inner">
        <div><h2 id="pricing-final-title">Ready to price with more confidence?</h2><p>Begin with Starter, or choose Business Plus for more records, an ad-free workspace, secure backup, and multi-device access.</p></div>
        <div className="pricing-final-actions"><a className="button ghost" href="/signup">Start Free<ArrowRight aria-hidden="true"/></a>{plans.find(isPaid)&&<a className="button" href={planHref(plans.find(isPaid))}>Choose Business Plus<ArrowRight aria-hidden="true"/></a>}</div>
      </div>
    </section>
    <MarketingFooter/>
  </main>;
}
