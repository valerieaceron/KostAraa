import {useEffect,useState} from "react";
import {ArrowRight,Clock3,CreditCard} from "lucide-react";
import {apiJson} from "../../costing/utils/api";
import {clearPlanIntent,paymentJourneyState,readPlanIntent} from "../plan-intent";

export default function PaymentReminder(){
  const [plan,setPlan]=useState("");
  const [status,setStatus]=useState("unpaid");
  useEffect(()=>{
    const user=JSON.parse(sessionStorage.getItem("kostaraa.user")||"{}");
    const intent=readPlanIntent(localStorage,user);
    setPlan(intent);
    let active=true;
    const refresh=()=>apiJson("/api/payments").then(response=>{
      if(!active)return;
      const next=paymentJourneyState(response.result);
      setStatus(next);
      setPlan(String(response.result.selected_plan_id||readPlanIntent(localStorage,user)||""));
      if(next==="active"){clearPlanIntent(localStorage,user);setPlan("")}
    }).catch(()=>{/* Keep the payment reminder available if status cannot be loaded. */});
    refresh();
    window.addEventListener("focus",refresh);
    return()=>{active=false;window.removeEventListener("focus",refresh)};
  },[]);
  if(!plan)return null;
  const pending=status==="pending";
  return <section className={`bd-card bd-payment-reminder${pending?" is-pending":""}`} role="status" aria-label="Business Plus payment">
    <span className="bd-notice-icon" aria-hidden="true">{pending?<Clock3/>:<CreditCard/>}</span>
    <div className="bd-notice-copy"><h2>{pending?"Your payment is awaiting review":"Complete your Business Plus payment"}</h2><p>{pending?"Your receipt is submitted. We’ll verify your payment within 12 hours. Your current access continues while you wait.":"You’re one step away from Business Plus. Complete payment to activate your plan, or keep using Starter and pay when you’re ready."}</p></div>
    <a className="button" href={`/workspace?page=subscription&plan=${encodeURIComponent(plan)}`}>{pending?"View payment status":"Proceed to payment"}<ArrowRight aria-hidden="true"/></a>
  </section>;
}
