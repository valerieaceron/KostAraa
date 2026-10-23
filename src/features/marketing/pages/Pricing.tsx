import { MarketingHeader } from "../components/MarketingHeader";
import { MarketingFooter } from "../components/MarketingFooter";
import { ArrowRight, Check } from "lucide-react";
import "../styles/marketing-page-hero.css";
import { useState } from "react";
import { AnnualPaymentModal } from "../components/AnnualPaymentModal";

const plans=[
  {name:"Free",label:"Explore Kostaraa",price:"₱0",billing:"Free forever",audience:"Learn the essentials, cost your first products, and see how Kostaraa fits your business.",cta:"Start Free",href:"/signup",benefits:["Up to 5 inventory records","Up to 3 registered products","1 competitor analysis per month"]},
  {name:"Annual",label:"Grow with confidence",price:"₱899",billing:"About ₱75/month · billed annually",audience:"For growing businesses that need unlimited products, secure backup, and access across devices.",cta:"Choose Annual",href:"/signup",recommended:true,benefits:["Everything in Free, plus:","Up to 100 inventory records","Unlimited product registration","5 competitor crawls"]},
];
const rows=[
  ["Getting started"],
  ["Business profiles","1","5"],
  ["Guided business setup","Basic","Full"],
  ["Business identity and cost settings","Basic","✓"],
  ["Product records","Up to 3","Unlimited"],
  ["Material and ingredient records","Up to 5","Up to 100"],
  ["Product and material inventory","Up to 5 inventory records","Up to 100 inventory records"],
  ["Costing and pricing"],
  ["Direct material cost tracking","✓","✓"],
  ["Labor cost input","✓","✓"],
  ["Packaging cost input","✓","✓"],
  ["Overhead and hidden-cost input","Basic","✓"],
  ["True product cost calculator","✓","✓"],
  ["Suggested selling price","✓","✓"],
  ["Markup checker","✓","✓"],
  ["Profit-margin checker","✓","✓"],
  ["Pricing health indicator","✓","✓"],
  ["Risk status: risky to healthy","✓","✓"],
  ["Planning and simulations"],
  ["Competitor analysis","1 / month","5 crawls"],
  ["Business health simulations","3 / month","Unlimited"],
  ["Test cost and supplier changes","Limited","✓"],
  ["Test price and sales targets","Limited","✓"],
  ["Test rent, staff and operating costs","×","✓"],
  ["Plain-language result summaries","Basic","✓"],
  ["Recommended action steps","Basic","✓"],
  ["Beginner tips and tutorials","✓","✓"],
  ["Storage and access"],
  ["Data storage","Current device only","Secure online access"],
  ["Cloud backup and recovery","×","✓"],
  ["Multi-device access","×","✓"],
  ["Future online tools and updates","Limited","✓"],
  ["Support"],
  ["Advertisements","May include ads","No ads"],
  ["Araa FAQ guide","✓","✓"],
  ["Customer support","FAQ","Priority support"],
  ["Optional consultation","Paid separately","Paid separately"],
];
export default function Pricing(){const[paymentOpen,setPaymentOpen]=useState(false);return <main className="pricing-page marketing-gradient-page"><MarketingHeader active="pricing" overlay/>
<section className="pricing-hero marketing-page-hero"><div className="marketing-page-hero-inner"><h1>Start free.<br/><span>Grow when you’re ready.</span></h1><p>Explore Kostaraa at no cost, then choose Annual when your business needs unlimited products, cloud backup, and multi-device access.</p></div></section>
<section className="pricing-content" id="pricing-plans">
  <div className="pricing-cards superhuman-cards">{plans.map(p=><article className={p.recommended?"recommended":""} key={p.name}>
    <div className="plan-heading"><small className="plan-tier">{p.name}</small>{p.recommended&&<span className="plan-badge">Best value</span>}</div>
    <div className="plan-name"><h2>{p.label}</h2></div>
    <p className="plan-audience">{p.audience}</p>
    <div className="price-box"><strong>{p.price}</strong>{p.billing&&<small>{p.billing}</small>}</div>
    {p.recommended
      ? <button className="button" type="button" onClick={()=>setPaymentOpen(true)} aria-haspopup="dialog">{p.cta}<ArrowRight aria-hidden="true"/></button>
      : <a className="button ghost" href={p.href}>{p.cta}<ArrowRight aria-hidden="true"/></a>}
    <div className="plan-benefits"><b>{p.recommended?p.benefits[0]:"The essentials to get started"}</b>
      <ul>{(p.recommended?p.benefits.slice(1):p.benefits).map(x=><li key={x}><Check aria-hidden="true"/><span>{x}</span></li>)}</ul>
    </div>
  </article>)}</div>
  <div className="comparison-title"><h2>Compare Free and Annual</h2><p>Free stores records on your current device. Annual adds secure online storage, backup, unlimited products, and multi-device access.</p></div>
  <div className="comparison-wrap"><table><thead><tr><th>Features</th><th>Free</th><th>Annual <small>BEST VALUE</small></th></tr></thead><tbody>{rows.map(r=>r.length===1
    ? <tr className="comparison-group" key={r[0]}><th colSpan={3}>{r[0]}</th></tr>
    : <tr key={r[0]}>{r.map((c,i)=><td key={i} className={c==="×"?"no":c==="✓"?"yes":""}>{c}</td>)}</tr>
  )}</tbody></table></div>
</section>
<MarketingFooter/>{paymentOpen&&<AnnualPaymentModal onClose={()=>setPaymentOpen(false)}/>}</main>}
