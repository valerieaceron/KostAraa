import { MarketingHeader } from "../components/MarketingHeader";
import { MarketingFooter } from "../components/MarketingFooter";

const plans=[
  {name:"Freemium",label:"Just Testing",price:"₱0",billing:"Free forever",audience:"For learning Kostaraa and testing your first products.",storage:"Device-only storage",device:"Current device only",cta:"Start Free",href:"/signup",benefits:["Up to 3 product records","Core cost calculator","Pricing health checker","Up to 3 simulations per month"]},
  {name:"One-Time Access",label:"Lifetime Toolkit",price:"₱799",regular:"Regular price ₱999",billing:"One payment",audience:"For occasional users who prefer an offline toolkit with no recurring fee.",storage:"Device-only storage",device:"One device · No cloud backup",cta:"Get Lifetime Toolkit",href:"/signup",recommended:true,benefits:["Everything in Freemium, plus:","Up to 30 product records","Up to 100 inventory records","Email support","No advertisements"]},
  {name:"Semi-Annual",label:"Active Shop",price:"₱1,199",regular:"Regular price ₱1,499",billing:"Every 6 months · about ₱200/month",audience:"For active businesses that need more room, recovery, and access across devices.",storage:"Secure cloud storage",device:"Multi-device access",cta:"Choose Active Shop",href:"/signup",benefits:["Everything in Lifetime Toolkit, plus:","Unlimited products and inventory","Unlimited simulations","Cloud backup and online access","Priority support and Araa"]},
  {name:"Annual",label:"Growing Business",price:"₱1,450",regular:"Regular price ₱1,990",billing:"Per year · about ₱121/month",audience:"For long-term growth with the largest savings and complete online access.",storage:"Secure cloud storage",device:"Multi-device access",cta:"Choose Annual",href:"/signup",benefits:["Everything in Active Shop, plus:","Best effective monthly price","Full-year uninterrupted access","Priority support","Biggest early-user savings"]},
];
const rows=[
  ["Business profiles","1","1","5","5"],
  ["Guided business setup","Basic","Full","Full","Full"],
  ["Business identity and cost settings","Basic","✓","✓","✓"],
  ["Product records","Up to 3","Up to 30","Unlimited","Unlimited"],
  ["Material and ingredient records","Up to 15","Up to 100","Unlimited","Unlimited"],
  ["Product and material inventory","Limited","✓","✓","✓"],
  ["Direct material cost tracking","✓","✓","✓","✓"],
  ["Labor cost input","✓","✓","✓","✓"],
  ["Packaging cost input","✓","✓","✓","✓"],
  ["Overhead and hidden-cost input","Basic","✓","✓","✓"],
  ["True product cost calculator","✓","✓","✓","✓"],
  ["Suggested selling price","✓","✓","✓","✓"],
  ["Markup checker","✓","✓","✓","✓"],
  ["Profit-margin checker","✓","✓","✓","✓"],
  ["Pricing health indicator","✓","✓","✓","✓"],
  ["Risk status: risky to healthy","✓","✓","✓","✓"],
  ["Business health simulations","3 / month","5 / month","Unlimited","Unlimited"],
  ["Test cost and supplier changes","Limited","✓","✓","✓"],
  ["Test price and sales targets","Limited","✓","✓","✓"],
  ["Test rent, staff and operating costs","×","✓","✓","✓"],
  ["Plain-language result summaries","Basic","✓","✓","✓"],
  ["Recommended action steps","Basic","✓","✓","✓"],
  ["Beginner tips and tutorials","✓","✓","✓","✓"],
  ["Data storage","Current device only","Current device only","Secure online access","Secure online access"],
  ["Cloud backup and recovery","×","×","✓","✓"],
  ["Multi-device access","×","×","✓","✓"],
  ["Future online tools and updates","Limited","Limited","✓","✓"],
  ["Advertisements","May include ads","No ads","No ads","No ads"],
  ["Araa FAQ guide","✓","✓","✓","✓"],
  ["Customer support","FAQ","Email support","Priority support","Priority support"],
  ["Optional consultation","Paid separately","Paid separately","Paid separately","Paid separately"],
];
export default function Pricing(){return <main className="pricing-page"><MarketingHeader/>
<section className="pricing-hero"><span className="eyebrow">Simple, transparent pricing</span><h1>Choose the plan for<br/><span>how your business works.</span></h1><p>Start free, stay offline with a one-time toolkit, or move online when your business needs cloud backup and multi-device access.</p></section>
<section className="pricing-content" id="pricing-plans"><div className="pricing-cards superhuman-cards">{plans.map(p=><article className={p.recommended?"recommended":""} key={p.name}>{p.recommended&&<em>BEST VALUE</em>}<div className="plan-name"><div><small>{p.name}</small><h2>{p.label}</h2></div></div><p className="plan-audience">{p.audience}</p><div className="price-box"><strong>{p.price}</strong><small>{p.billing}</small>{p.regular&&<span>{p.regular}</span>}</div><div className={`plan-storage ${p.storage.includes("Device")?"local":"cloud"}`}><b>{p.storage.includes("Device")?"▣":"☁"} {p.storage}</b><span>{p.device}</span></div><a className={`button ${p.recommended?"":"ghost"}`} href={p.href}>{p.cta} →</a><div className="plan-benefits"><b>{p.benefits[0]}</b><ul>{p.benefits.slice(1).map(x=><li key={x}>✓ {x}</li>)}</ul>{p.name==="Freemium"&&<ul>{p.benefits.map(x=><li key={x}>✓ {x}</li>)}</ul>}</div></article>)}</div>
<div className="pricing-guidance"><b>Most preferred access model</b><span><strong>Lifetime Toolkit</strong> is the best value for independent, offline, single-device use with no recurring fee. Choose <strong>Annual</strong> when cloud backup, recovery, and access across devices matter more.</span></div>
<div className="comparison-title"><span className="eyebrow">Full comparison</span><h2>See every plan difference</h2><p>The most important distinction: Freemium and Lifetime Toolkit save data only on the current device. Subscription plans add secure online storage, backup, and multi-device access.</p></div><div className="sticky-plan-scroll"><div className="sticky-plan-bar"><div className="sticky-label">Compare plans</div>{plans.map(p=><div className={p.recommended?"best":""} key={p.name}>{p.recommended&&<em>BEST VALUE</em>}<b>{p.label}</b><strong>{p.price}</strong><small>{p.billing}</small><span className={p.storage.includes("Device")?"local":"cloud"}>{p.storage.includes("Device")?"Device-only":"Cloud access"}</span><a href={p.href}>{p.name==="Freemium"?"Start Free":p.name==="One-Time Access"?"Get Toolkit":p.name==="Semi-Annual"?"Choose Active":"Choose Annual"}</a></div>)}</div></div><div className="comparison-wrap"><table><thead><tr><th>Features</th><th>Freemium</th><th>One-Time <small>BEST VALUE</small></th><th>Semi-Annual</th><th>Annual</th></tr></thead><tbody>{rows.map(r=><tr key={r[0]}>{r.map((c,i)=><td key={i} className={c==="×"?"no":c==="✓"?"yes":""}>{c}</td>)}</tr>)}</tbody></table></div></section>
<MarketingFooter/></main>}
