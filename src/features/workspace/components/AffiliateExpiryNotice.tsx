import {useEffect,useState} from "react";
import {Clock3} from "lucide-react";
import {apiJson} from "../../costing/utils/api";
import {affiliateOfferCountdown} from "../affiliate-offer";
import "../styles/affiliate-expiry.css";

export default function AffiliateExpiryNotice(){
  const [offer,setOffer]=useState<any>(null);
  const [now,setNow]=useState(Date.now);
  const [offset,setOffset]=useState(0);
  useEffect(()=>{
    let active=true;
    const refresh=()=>apiJson("/api/affiliates/offer").then(response=>{
      if(!active)return;
      const saved=response.result;
      setOffer(saved);
      const serverTime=Date.parse(saved?.server_time);
      setOffset(Number.isFinite(serverTime)?serverTime-Date.now():0);
      setNow(Date.now());
    }).catch(()=>{/* Keep the last known countdown available while offline. */});
    refresh();
    const tick=window.setInterval(()=>setNow(Date.now()),1000);
    window.addEventListener("focus",refresh);
    window.addEventListener("kostaraa:affiliate-offer-changed",refresh);
    return()=>{active=false;window.clearInterval(tick);window.removeEventListener("focus",refresh);window.removeEventListener("kostaraa:affiliate-offer-changed",refresh)};
  },[]);
  if(!offer||offer.completed||offer.submitted)return null;
  const countdown=affiliateOfferCountdown(offer.expires_at,now+offset);
  const expired=offer.expired||countdown.expired;
  return <a className={`af-expiry-note${expired?" is-expired":""}`} href={`/workspace?page=subscription&plan=${encodeURIComponent(offer.plan_id)}`} title={expired?"Affiliate discount expired. Your referrer stays attached.":`40% affiliate discount expires in ${countdown.label}`}>
    <Clock3 aria-hidden="true"/>
    <span className="af-expiry-copy">{expired?<><b>Affiliate discount expired</b><small>Your affiliate stays attached. You can still pay at the regular price.</small></>:<><strong role="timer" aria-live="off">{countdown.label}</strong><b>Your 40% discount expires in</b></>}<span className="af-expiry-action">{expired?"View payment options →":"Complete payment →"}</span></span>
  </a>;
}
