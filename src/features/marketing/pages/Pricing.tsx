import { MarketingHeader } from "../components/MarketingHeader";
import { MarketingFooter } from "../components/MarketingFooter";

const plans=[
  {name:"Free",label:"Explore Kostaraa",price:"₱0",billing:"Free forever",audience:"Learn the essentials, cost your first products, and see how Kostaraa fits your business.",storage:"Device-only storage",device:"Current device only",cta:"Start Free",href:"/signup",benefits:["Up to 3 product records","Core cost calculator","Pricing health checker","Up to 3 simulations per month"]},
  {name:"Annual",label:"Grow with confidence",price:"₱1,450",regular:"Regular price ₱1,990",billing:"Per year · about ₱121/month",audience:"For growing businesses that need unlimited records, secure backup, and access across devices.",storage:"Secure cloud storage",device:"Multi-device access",cta:"Choose Annual",href:"/signup",recommended:true,benefits:["Everything in Free, plus:","Unlimited products and inventory","Unlimited simulations","Cloud backup and online access","Priority support and Araa"]},
];
const rows=[
  ["Getting started"],
  ["Business profiles","1","5"],
  ["Guided business setup","Basic","Full"],
  ["Business identity and cost settings","Basic","✓"],
  ["Product records","Up to 3","Unlimited"],
  ["Material and ingredient records","Up to 15","Unlimited"],
  ["Product and material inventory","Limited","✓"],
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
export default function Pricing(){return <main className="pricing-page"><MarketingHeader active="pricing"/>
<section className="pricing-hero"><h1>Start free.<br/><span>Grow when you’re ready.</span></h1><p>Explore Kostaraa at no cost, then choose Annual when your business needs unlimited records, cloud backup, and multi-device access.</p></section>
<section className="pricing-content" id="pricing-plans">
  <div className="pricing-cards superhuman-cards">{plans.map(p=><article className={p.recommended?"recommended":""} key={p.name}>
    {p.recommended&&<em>BEST VALUE</em>}
    <div className="plan-name"><div><small>{p.name}</small><h2>{p.label}</h2></div></div>
    <p className="plan-audience">{p.audience}</p>
    <div className="price-box"><strong>{p.price}</strong><small>{p.billing}</small>{p.regular&&<span>{p.regular}</span>}</div>
    <div className={`plan-storage ${p.storage.includes("Device")?"local":"cloud"}`}><b>{p.storage.includes("Device")?"▣":"☁"} {p.storage}</b><span>{p.device}</span></div>
    <a className={`button ${p.recommended?"":"ghost"}`} href={p.href}>{p.cta} →</a>
    <div className="plan-benefits">{p.name==="Free"
      ? <ul>{p.benefits.map(x=><li key={x}>✓ {x}</li>)}</ul>
      : <><b>{p.benefits[0]}</b><ul>{p.benefits.slice(1).map(x=><li key={x}>✓ {x}</li>)}</ul></>
    }</div>
  </article>)}</div>
  <div className="comparison-title"><h2>Compare Free and Annual</h2><p>Free stores records on your current device. Annual adds secure online storage, backup, unlimited records, and multi-device access.</p></div>
  <div className="comparison-wrap"><table><thead><tr><th>Features</th><th>Free</th><th>Annual <small>BEST VALUE</small></th></tr></thead><tbody>{rows.map(r=>r.length===1
    ? <tr className="comparison-group" key={r[0]}><th colSpan={3}>{r[0]}</th></tr>
    : <tr key={r[0]}>{r.map((c,i)=><td key={i} className={c==="×"?"no":c==="✓"?"yes":""}>{c}</td>)}</tr>
  )}</tbody></table></div>
</section>
<MarketingFooter/></main>}
