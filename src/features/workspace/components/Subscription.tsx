import {useEffect, useState} from "react";
import {apiJson} from "../../costing/utils/api";
import {planBenefits, planPrice, planTerm} from "../../costing/utils/plans";
import {AnnualPaymentModal} from "../../marketing/components/AnnualPaymentModal";
import "../styles/subscription.css";
export default function Subscription() {
  const [data,setData]=useState<any>(null),[error,setError]=useState(""),[refresh,setRefresh]=useState(0),[selected,setSelected]=useState<any>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const intended=new URLSearchParams(location.search).get("plan");
  useEffect(()=>{let active=true;setError("");apiJson("/api/payments").then(response=>{if(active)setData(response.result)}).catch(err=>{if(active)setError(err.message)});return()=>{active=false}},[refresh]);
  const pending=data?.payments.some((payment:any)=>payment.status==="pending");
  const current=data?.subscription.plan_details;
  const beta=data?.subscription.membership_type==="beta";
  async function emailLink(){setBusy(true);setError("");try{const response=await apiJson("/api/payments/email-link",{method:"POST"});setMessage(response.message)}catch(err:any){setError(err.message)}finally{setBusy(false)}}
  async function chooseFree(){
    if(!window.confirm("Switch to Free now? Your paid access will end. Existing records stay saved, but Free limits apply to new records."))return;
    setBusy(true);setError("");try{await apiJson("/api/plans/select-free",{method:"POST"});setMessage("You are now using the Free plan.");setRefresh(v=>v+1)}catch(err:any){setError(err.message)}finally{setBusy(false)}
  }
  return <section className="subscription-page"><h1>Your plan & payments</h1><p>Choose the plan that fits your business. Paid plans start after receipt verification.</p>
    {error&&<p role="alert">{error} <button onClick={()=>setRefresh(v=>v+1)}>Try again</button></p>}{message&&<p role="status">{message}</p>}{!data&&!error&&<p>Loading your plan…</p>}
    {data&&<><div className="subscription-plans"><article><small>CURRENT PLAN{beta?" · BETA ACCESS":""}</small><h2>{current.name}</h2><p>{planBenefits(current).join(" · ")}</p>{data.subscription.expires_at&&<p>Access until {new Date(data.subscription.expires_at).toLocaleDateString()}</p>}<a href="/workspace">Continue to workspace →</a></article>
      {data.plans.map((plan:any)=>{const isCurrent=plan.id===current.id;return <article key={plan.id} className={String(plan.id)===intended||plan.code===intended?"selected-plan":""}><small>{plan.name}</small><h2>{planPrice(plan)} <small>{Number(plan.price)>0?`/ ${planTerm(plan)}`:""}</small></h2><p>{plan.description}</p><p>{planBenefits(plan).join(" · ")}</p>{Number(plan.price)>0&&<p>Pay manually with PayMaya. Receipt verification takes up to 12 hours.</p>}{Number(current.price)>0&&!isCurrent&&Number(plan.price)>0&&<p>Switching plans starts a new term after confirmation. Remaining time on your current plan does not carry over.</p>}<button className="button" disabled={busy||pending||beta||(isCurrent&&Number(plan.price)===0)} onClick={()=>Number(plan.price)>0?setSelected(plan):chooseFree()}>{beta?(isCurrent?"Included with Beta":"Managed by admin"):pending?"Payment awaiting review":isCurrent?(Number(plan.price)>0?`Renew ${plan.name}`:"Current plan"):`Choose ${plan.name}`}</button></article>})}
    </div><button disabled={busy} onClick={emailLink}>{busy?"Sending…":"Email me the payment form link"}</button>
    {pending&&<p role="status">Your receipt is awaiting review. Your current access continues while we verify payment.</p>}
    <h2>Payment history</h2><button onClick={()=>setRefresh(v=>v+1)}>Refresh status</button>{!data.payments.length?<p>No payments submitted yet.</p>:<div className="subscription-history"><table><thead><tr>{["Plan","Reference","Amount","Status","Submitted","Review note"].map(title=><th key={title}>{title}</th>)}</tr></thead><tbody>{data.payments.map((payment:any)=><tr key={payment.id}><td>{payment.plan_name||payment.plan}</td><td>{payment.reference_number}</td><td>{planPrice({...payment,price:payment.amount})}</td><td>{payment.status}</td><td>{new Date(payment.created_at).toLocaleDateString()}</td><td>{payment.review_note||"—"}</td></tr>)}</tbody></table></div>}
    {selected&&<AnnualPaymentModal plan={selected} instructions={data.instructions} onClose={()=>setSelected(null)} onSubmitted={result=>{setSelected(null);setMessage(result.acknowledgment_email_sent?"Receipt submitted. We’ve emailed your acknowledgment. Our admin team will review it within 12 hours.":"Receipt submitted and saved. Our admin team will review it within 12 hours; the acknowledgment email could not be sent.");setRefresh(v=>v+1)}}/>}</>}
  </section>;
}
export function PlanSidebar({onOpen}:{onOpen:()=>void}){
  const [subscription,setSubscription]=useState<any>(null);
  useEffect(()=>{let active=true;apiJson("/api/payments").then(data=>{if(active)setSubscription(data.result.subscription)}).catch(()=>{});return()=>{active=false}},[]);
  if(!subscription||subscription.membership_type==="beta")return null;
  return <div className="subscription-sidebar"><b>{subscription.plan_details.name} plan</b><small>{planBenefits(subscription.plan_details).slice(0,2).join(" · ")}</small><button onClick={onOpen}>View plans →</button></div>;
}
