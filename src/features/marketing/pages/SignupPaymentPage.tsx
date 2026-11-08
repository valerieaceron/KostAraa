import {useEffect,useState} from "react";
import {apiJson} from "../../costing/utils/api";
import {AnnualPaymentModal} from "../components/AnnualPaymentModal";
import {planPrice,planTerm} from "../../costing/utils/plans";
import "../../auth/auth.css";
import "../../auth/auth-center.css";
import "../../auth/signup-refresh.css";

export default function SignupPaymentPage(){
  const testMode=import.meta.env.DEV&&new URLSearchParams(location.search).get("mode")==="test";
  const [checkout]=useState(()=>{
    try{return JSON.parse(sessionStorage.getItem("kostaraa.signupCheckout")||"{}")}catch{return {}}
  });
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState("");
  const [refresh,setRefresh]=useState(0);
  const [open,setOpen]=useState(true);
  const [submitted,setSubmitted]=useState(false);
  const [message,setMessage]=useState("");
  const next=`/verify-email${checkout.email?`?email=${encodeURIComponent(checkout.email)}${checkout.deliveryFailed?"&delivery=failed":""}`:""}`;
  useEffect(()=>{
    if(!checkout.token)return;
    let active=true;
    setError("");
    apiJson("/api/payments/signup-checkout",{headers:{Authorization:`Bearer ${checkout.token}`}})
      .then(response=>{if(active)setData(response.result)})
      .catch(err=>{if(active)setError(err.message)});
    return()=>{active=false};
  },[checkout.token,refresh]);
  function continueToAccount(){
    sessionStorage.removeItem("kostaraa.signupCheckout");
    location.href=next;
  }
  const completed=submitted||data?.pending||data?.included;
  const paymentModal=data&&!completed&&open?<AnnualPaymentModal validateReceipt testMode={testMode} plan={data.plan} instructions={data.instructions} checkoutToken={checkout.token} onClose={continueToAccount} onPayLater={continueToAccount} onSubmitted={result=>{
      setSubmitted(true);setOpen(false);
      setMessage(result.acknowledgment_email_sent?"Receipt submitted. We’ve emailed you an acknowledgment. Payment review takes up to 12 hours. You can now verify your email and log in.":"Receipt submitted and awaiting review within 12 hours. We couldn’t send the acknowledgment email. You can now verify your email and log in.");
    }}/>:null;
  if(checkout.token&&!error&&!completed&&open)return <main className="auth-page auth-centered auth-signup-page">{data?paymentModal:<p role="status">Loading payment instructions…</p>}</main>;
  return <main className="auth-page auth-centered auth-signup-page"><section className="auth-form-side"><div className="auth-card auth-card-signup">
    <a className="auth-logo" href="/"><img src="/kostaraa-logo.webp" alt="Kostaraa"/></a>
    <h1>Business Plus payment</h1>
    <p>Your account has been created. You can complete payment before logging in, or pay later.</p>
    {!checkout.token&&<p role="alert">Your checkout session is unavailable. Verify your email and log in to complete payment from your dashboard.</p>}
    {error&&<p className="auth-error" role="alert">{error} <button type="button" onClick={()=>setRefresh(value=>value+1)}>Try again</button></p>}
    {data&&!completed&&<><p>Business Plus: <b>{planPrice(data.plan)}</b> for {planTerm(data.plan)}.</p><button className="button auth-submit" type="button" onClick={()=>setOpen(true)}>Continue to payment</button></>}
    {completed&&<p role="status">{data?.included?"Business Plus is already included with your account. No payment is needed.":message||"Your payment receipt is awaiting review. We’ll verify it within 12 hours."}</p>}
    <button className="button ghost" type="button" onClick={continueToAccount}>{completed?"Continue to email verification":"Pay later — Continue to email verification"}</button>
    <p>Verify your email before logging in. If you pay later, your dashboard will remind you to complete payment.</p>

  </div></section></main>;
}
