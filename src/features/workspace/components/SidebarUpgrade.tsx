import {useEffect,useState} from "react";
import {ArrowUpRight} from "lucide-react";
import {apiJson} from "../../costing/utils/api";
import {paymentJourneyState} from "../plan-intent";
import "../styles/sidebar-upgrade.css";

export default function SidebarUpgrade(){
  const[status,setStatus]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;
    const refresh=()=>apiJson("/api/payments").then(response=>{
      if(active)setStatus(paymentJourneyState(response.result));
    }).catch(()=>{/* Wait for confirmed plan data before showing an upgrade. */});
    refresh();
    window.addEventListener("focus",refresh);
    return()=>{active=false;window.removeEventListener("focus",refresh)};
  },[]);
  if(!status||status==="active")return null;
  const pending=status==="pending";
  return <section className="kws-sidebar-upgrade" aria-label="Upgrade account">
    {pending&&<strong>Payment awaiting review</strong>}
    <p>{pending?"Check your Business Plus payment status.":"On the free plan? Get more room for your products with Business Plus."}</p>
    <a href="/workspace?page=subscription&plan=annual">{pending?"View payment status":"Upgrade account"}<ArrowUpRight size={13} aria-hidden="true"/></a>
  </section>;
}
