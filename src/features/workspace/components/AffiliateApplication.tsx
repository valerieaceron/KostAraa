import {ArrowLeft,ArrowUpRight,BadgeDollarSign,ChartNoAxesCombined,Handshake,Link2,Megaphone} from "lucide-react";
import "../styles/affiliate-application.css";

const benefits=[
  {icon:BadgeDollarSign,title:"Earn ₱100 Per Paid Referral",copy:"Get rewarded for every successful paid subscription made through your referral."},
  {icon:ChartNoAxesCombined,title:"Your Own Affiliate Dashboard",copy:"Easily monitor your referrals, successful subscriptions, and earned commissions in one place."},
  {icon:Link2,title:"Personalized Referral Link",copy:"Share your unique referral link with your network and earn when someone subscribes."},
  {icon:Megaphone,title:"Flexible Promotion",copy:"Promote through social media, your community, or your personal network at your own pace."},
  {icon:Handshake,title:"Be Part of a Growing Community",copy:"Support Filipino entrepreneurs in making smarter pricing and business decisions."},
];

export default function AffiliateApplication({onBack}:{onBack:()=>void}){
  return <section className="affiliate-application-page">
    <button className="affiliate-application-back" type="button" onClick={onBack}><ArrowLeft aria-hidden="true"/> Account Settings</button>
    <header className="affiliate-application-hero">
      <h1>Earn With Every Referral.</h1>
      <strong>Turn your network into an earning opportunity while helping small businesses grow.</strong>
      <p>Join our Affiliate Partner Program and help product makers, startups, and small business owners discover a smarter way to manage their product costs, pricing, and profit margins.</p>
      <a href="https://forms.gle/eSyZMWLQL6DboVLMA" target="_blank" rel="noreferrer">Apply Now <ArrowUpRight aria-hidden="true"/></a>
    </header>
    <section className="affiliate-application-benefits" aria-labelledby="affiliate-benefits-title">
      <div className="affiliate-application-section-heading"><h2 id="affiliate-benefits-title">Why Become an Affiliate Partner?</h2></div>
      <div className="affiliate-benefit-grid">{benefits.map(benefit=><article key={benefit.title}><span><benefit.icon aria-hidden="true"/></span><div><h3>{benefit.title}</h3><p>{benefit.copy}</p></div></article>)}</div>
    </section>
    <section className="affiliate-application-cta">
      <div><span>READY TO START EARNING?</span><h2>Join our Affiliate Partner Program today.</h2><p>No complicated process. Just share, refer, and earn.</p></div>
      <a href="https://forms.gle/eSyZMWLQL6DboVLMA" target="_blank" rel="noreferrer">Apply for the program <ArrowUpRight aria-hidden="true"/></a>
    </section>
  </section>;
}
