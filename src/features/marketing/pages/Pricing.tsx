import {useEffect, useState} from "react";
import {MarketingHeader} from "../components/MarketingHeader";
import {MarketingFooter} from "../components/MarketingFooter";
import {ArrowRight, Check} from "lucide-react";
import {apiJson} from "../../costing/utils/api";
import {planBenefits, planPrice, planTerm} from "../../costing/utils/plans";
import "../styles/marketing-page-hero.css";

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
  ["Competitor analysis","1 crawl","5 crawls"],
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

export default function Pricing(){
  const [plans,setPlans]=useState<any[]>([]),[error,setError]=useState(""),[refresh,setRefresh]=useState(0),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;setLoading(true);setError("");apiJson("/api/plans").then(data=>{if(active)setPlans(data.result)}).catch(err=>{if(active)setError(err.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[refresh]);
  const signedIn=Boolean(sessionStorage.getItem("kostaraa.token"));
  return <main className="pricing-page marketing-gradient-page"><MarketingHeader active="pricing" overlay/>
    <section className="pricing-hero marketing-page-hero"><div className="marketing-page-hero-inner"><h1>Start free.<br/><span>Grow when you’re ready.</span></h1><p>Choose the plan with the room your business needs.</p></div></section>
    <section className="pricing-content" id="pricing-plans">
      {loading&&<p role="status">Loading plans…</p>}{error&&<p role="alert">{error} <button onClick={()=>setRefresh(v=>v+1)}>Try again</button></p>}
      {!loading&&!error&&!plans.length&&<p>No plans are available right now.</p>}
      {!loading&&!error&&plans.length>0&&<div className="pricing-cards superhuman-cards">{plans.map(plan=><article key={plan.id}>
        <div className="plan-heading"><small className="plan-tier">{plan.name}</small></div>
        <div className="plan-name"><h2>{plan.name}</h2></div><p className="plan-audience">{plan.description}</p>
        <div className="price-box"><strong>{planPrice(plan)}</strong><small>{Number(plan.price)===0?"No charge · no expiry":`Billed every ${planTerm(plan)}`}</small></div>
        <a className={Number(plan.price)>0?"button":"button ghost"} href={signedIn?`/workspace?page=subscription&plan=${encodeURIComponent(plan.id)}`:Number(plan.price)>0?`/signup?plan=${encodeURIComponent(plan.id)}`:"/signup"}>{Number(plan.price)>0?"Choose plan":"Start free"}<ArrowRight aria-hidden="true"/></a>
        <div className="plan-benefits"><b>Included in your plan</b><ul>{planBenefits(plan).map(benefit=><li key={benefit}><Check aria-hidden="true"/><span>{benefit}</span></li>)}</ul></div>
      </article>)}</div>}
  <div className="comparison-title"><h2>Compare Free and Annual</h2><p>Free stores records on your current device. Annual adds secure online storage, backup, unlimited products, and multi-device access.</p></div>
  <div className="comparison-wrap"><table><thead><tr><th>Features</th><th>Free</th><th>Annual <small>BEST VALUE</small></th></tr></thead><tbody>{rows.map(r=>r.length===1
    ? <tr className="comparison-group" key={r[0]}><th colSpan={3}>{r[0]}</th></tr>
    : <tr key={r[0]}>{r.map((c,i)=><td key={i} className={c==="×"?"no":c==="✓"?"yes":""}>{c}</td>)}</tr>
  )}</tbody></table></div>
    </section><MarketingFooter/></main>;
}
