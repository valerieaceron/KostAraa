import {useEffect,useState} from "react";
import {ArrowRight,Copy,RefreshCw,UsersRound,Wallet} from "lucide-react";
import {apiJson} from "../../costing/utils/api";
import "../styles/affiliates.css";

const money=(value:any)=>`₱${Number(value||0).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const date=(value:string)=>new Date(value).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"});

export default function AffiliatesPage({mode,onNavigate,embedded=false}:{mode:"wallet"|"records";onNavigate:(page:string)=>void;embedded?:boolean}){
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState("");
  const [page,setPage]=useState(1);
  const [refresh,setRefresh]=useState(0);
  const [copied,setCopied]=useState(false);
  const wallet=mode==="wallet";
  useEffect(()=>{
    let active=true,requestId=0;
    setData(null);setError("");
    const load=()=>{
      const current=++requestId;
      return apiJson(`/api/affiliates/${wallet?"wallet":"records"}?page=${page}`).then(response=>{
        if(active&&current===requestId){setData(response.result);setError("");}
      }).catch(err=>{
        if(active&&current===requestId){if(err.status===403)setData(null);setError(err.message||"Unable to load your affiliate account.");}
      });
    };
    const refreshVisible=()=>{if(document.visibilityState==="visible")load();};
    load();
    const timer=window.setInterval(refreshVisible,30000);
    window.addEventListener("focus",refreshVisible);
    document.addEventListener("visibilitychange",refreshVisible);
    return()=>{active=false;window.clearInterval(timer);window.removeEventListener("focus",refreshVisible);document.removeEventListener("visibilitychange",refreshVisible);};
  },[wallet,page,refresh]);
  async function copyCode(){
    try{await navigator.clipboard.writeText(data.affiliate_code);setCopied(true)}catch{setError("Select and copy your affiliate code below.")}
  }
  return <section className="af-page">
    <header className="af-heading"><div>{!embedded&&<h1>{wallet?"Wallet":"Affiliate records"}</h1>}<p>{wallet?"Your confirmed affiliate rewards, all in one place.":"Customers who used your affiliate code and completed payment."}</p></div><button type="button" onClick={()=>setRefresh(value=>value+1)}><RefreshCw aria-hidden="true"/>Refresh</button></header>
    {error&&<p className="af-notice" role="alert">{error} <button type="button" onClick={()=>setRefresh(value=>value+1)}>Try again</button></p>}
    {!data&&!error&&<p role="status">Loading your affiliate account…</p>}
    {data&&<>
      <div className="af-overview"><article className="af-balance"><Wallet aria-hidden="true"/><div><span>Wallet balance</span><strong>{money(data.balance)}</strong><p>₱100 is credited for each eligible customer after admin payment confirmation.</p></div></article><article className="af-code"><div><h2>Your affiliate referral code</h2><p>Share your code to give a new customer 40% off their first paid plan.</p></div><div className="af-code-value"><code>{data.affiliate_code||"Not assigned"}</code><button type="button" disabled={!data.affiliate_code} onClick={copyCode}><Copy aria-hidden="true"/>{copied?"Copied":"Copy code"}</button></div><small role="status">{copied?"Your code is copied.":"Discounts and rewards are finalized after payment confirmation."}</small></article></div>
      <section className="af-history"><header><div><h2>{wallet?"Reward history":"Paid referrals"}</h2><p>{data.total} confirmed {Number(data.total)===1?"referral":"referrals"}</p></div><button type="button" onClick={()=>onNavigate(wallet?"affiliate-records":"wallet")}>{wallet?"View affiliate records":"View wallet"}<ArrowRight aria-hidden="true"/></button></header>
        {!data.items.length?<div className="af-empty"><UsersRound aria-hidden="true"/><h3>{wallet?"No rewards yet":"No paid referrals yet"}</h3><p>Share your affiliate code. A reward will appear here once an eligible customer’s payment is confirmed.</p></div>:<div className="af-table"><table><thead><tr><th>Customer</th><th>Payment</th>{!wallet&&<th>Discount</th>}<th>Reward</th><th>Confirmed</th></tr></thead><tbody>{data.items.map((item:any)=><tr key={item.id}><td><strong>{item.customer_name||item.customer_username||"Deleted customer"}</strong>{item.customer_username&&<small>@{item.customer_username}</small>}</td><td>{money(item.payment_amount)}</td>{!wallet&&<td>{money(item.discount_amount)}</td>}<td className="af-credit">+{money(item.reward_amount)}</td><td>{date(item.created_at)}</td></tr>)}</tbody></table></div>}
        {data.total_pages>1&&<nav className="af-pagination" aria-label="Affiliate history pages"><button type="button" disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Previous</button><span>Page {page} of {data.total_pages}</span><button type="button" disabled={page>=data.total_pages} onClick={()=>setPage(value=>value+1)}>Next</button></nav>}
      </section>
    </>}
  </section>;
}
