import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { X, Upload, Clock3 } from "lucide-react";
import { API_BASE_URL } from "../../costing/utils/api";
import {planPrice, planTerm} from "../../costing/utils/plans";
import {affiliateOfferCountdown} from "../../workspace/affiliate-offer";
import { receiptReferenceError, receiptValidationError } from "../lib/payment-receipt";
import "../styles/annual-payment.css";
export function AnnualPaymentModal({
  onClose,
  onPayLater,
  checkoutToken,
  validateReceipt = false,
  testMode = false,
  onSubmitted,
  instructions,
  plan
}: {
  onClose: () => void;
  onPayLater?: () => void;
  checkoutToken?: string;
  validateReceipt?: boolean;
  testMode?: boolean;
  onSubmitted: (result: {acknowledgment_email_sent: boolean}) => void;
  plan: {id: number; name: string; price: number; duration_months: number; currency: string};
  instructions: {
    qr_url: string;
    account_name: string;
  };
}) {
  const skipReceiptValidation = import.meta.env.DEV && testMode;
  const shouldValidateReceipt = validateReceipt && !skipReceiptValidation;
  const qrUrl = instructions.qr_url || "/payments/paymaya-qr.jpeg";
  const dialog = useRef<HTMLDialogElement>(null);
  const [scannedReferences,setScannedReferences]=useState<string[]>([]);
  const [scanState,setScanState]=useState<"idle"|"scanning"|"ready"|"error">("idle");
  const [scanError,setScanError]=useState("");
  const [receipt, setReceipt] = useState<File | null>(null),
    [reference, setReference] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState("");
  const [affiliateCode,setAffiliateCode]=useState("");
  const [affiliateQuote,setAffiliateQuote]=useState<any>(null);
  const [affiliateError,setAffiliateError]=useState("");
  const [affiliateBusy,setAffiliateBusy]=useState(false);
  const [affiliateLocked,setAffiliateLocked]=useState(false);
  const [offerOffset,setOfferOffset]=useState(0);
  const [offerNow,setOfferNow]=useState(Date.now);
  const [offerRetry,setOfferRetry]=useState(0);
  const affiliateAttached=affiliateLocked||Boolean(affiliateQuote);
  const payablePlan={...plan,price:affiliateQuote?.amount ?? plan.price};
  const billAmount=Number(payablePlan.price).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2});
  function notifyAffiliateOffer(){
    if(typeof window!=="undefined")window.dispatchEvent(new window.CustomEvent("kostaraa:affiliate-offer-changed"));
  }
  async function fetchAffiliateQuote(code:string){
    const response=await fetch(`${API_BASE_URL}/api/payments${checkoutToken?"/signup-checkout":""}/affiliate-quote`,{
      method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${checkoutToken||sessionStorage.getItem("kostaraa.token")}`},
      body:JSON.stringify({plan_id:plan.id,affiliate_code:code}),
    });
    const data=await response.json();
    if(!response.ok||data.type!=="success"||typeof data.result?.affiliate_code!=="string"||!Number.isFinite(Number(data.result?.amount)))throw new Error(data.message||"Unable to apply this affiliate code.");
    return data.result;
  }
  function acceptAffiliateQuote(quote:any){
    setAffiliateQuote(quote);setAffiliateCode(quote.affiliate_code);setAffiliateLocked(true);
    const serverTime=Date.parse(quote.server_time);
    setOfferOffset(Number.isFinite(serverTime)?serverTime-Date.now():0);setOfferNow(Date.now());
    notifyAffiliateOffer();
  }
  async function applyAffiliate(){
    if(affiliateAttached)return;
    setAffiliateBusy(true);setAffiliateError("");setError("");
    try{acceptAffiliateQuote(await fetchAffiliateQuote(affiliateCode.trim()));}
    catch(err:any){setAffiliateError(err.message||"Unable to validate this affiliate code. Please try again.");}
    finally{setAffiliateBusy(false);}
  }
  useEffect(()=>{
    let active=true;
    setAffiliateBusy(true);setAffiliateError("");
    (async()=>{
      try{
        const response=await fetch(`${API_BASE_URL}/api/${checkoutToken?"payments/signup-checkout/affiliate-offer":"affiliates/offer"}`,{headers:{Authorization:`Bearer ${checkoutToken||sessionStorage.getItem("kostaraa.token")}`}});
        const data=await response.json();
        if(!response.ok||data.type!=="success")throw new Error(data.message||"Unable to restore your affiliate code. Please retry.");
        if(!active)return;
        if(data.result){
          setAffiliateLocked(true);setAffiliateCode(data.result.affiliate_code);
          if(data.result.submitted)throw new Error("Your payment receipt is awaiting review.");
          const quote=await fetchAffiliateQuote(data.result.affiliate_code);
          if(active)acceptAffiliateQuote(quote);
        }
        if(active)setAffiliateBusy(false);
      }catch(err:any){if(active){setAffiliateError(err.message||"Unable to restore your affiliate code. Please retry.");setAffiliateBusy(false)}}
    })();
    return()=>{active=false};
  },[checkoutToken,plan.id,offerRetry]);
  useEffect(()=>{
    if(!affiliateQuote?.expires_at||affiliateQuote.expired||affiliateQuote.completed)return;
    const tick=()=>{
      const now=Date.now();setOfferNow(now);
      if(affiliateOfferCountdown(affiliateQuote.expires_at,now+offerOffset).expired){
        setAffiliateQuote((current:any)=>current?{...current,expired:true,discount_amount:0,discount_percent:0,amount:current.original_amount}:current);
        notifyAffiliateOffer();
      }
    };
    tick();
    const timer=window.setInterval(tick,1000);
    return()=>window.clearInterval(timer);
  },[affiliateQuote?.expires_at,affiliateQuote?.expired,affiliateQuote?.completed,offerOffset]);
  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    if (!receipt) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(receipt);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receipt]);
  useEffect(() => {
    if (!shouldValidateReceipt || !receipt) return;
    let active = true;
    const controller = new AbortController();
    setScanState("scanning");
    setScannedReferences([]);
    setScanError("");
    const body = new FormData();
    body.append("receipt", receipt);
    fetch(`${API_BASE_URL}/api/payments${checkoutToken ? "/signup-checkout" : ""}/scan-receipt`, {
      method: "POST", headers: {Authorization: `Bearer ${checkoutToken || sessionStorage.getItem("kostaraa.token")}`}, body, signal: controller.signal,
    }).then(async response => {
      const data = await response.json();
      if (!response.ok || data.type !== "success" || !Array.isArray(data.result?.references) || !data.result.references.length) throw new Error(data.message || "We couldn’t read your receipt. Upload a clear screenshot showing the full reference number.");
      if (active) { setScannedReferences(data.result.references); setScanState("ready"); }
    }).catch(err => {
      if (active) { setScanState("error"); setScanError(err.message || "Unable to scan your receipt. Please try again."); }
    });
    return () => { active = false; controller.abort(); };
  }, [receipt, checkoutToken, shouldValidateReceipt]);
  const referenceError = scanState === "ready" && reference.length >= 10 ? receiptReferenceError(scannedReferences, reference) : "";
  const canSubmit = Boolean(receipt && !affiliateBusy && !affiliateError && (!affiliateCode.trim() || affiliateQuote) && (!shouldValidateReceipt || (scanState === "ready" && !receiptReferenceError(scannedReferences, reference))));
  async function submit(event: FormEvent) {
    event.preventDefault();
    const invalid = receiptValidationError(receipt);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (shouldValidateReceipt && scanState !== "ready") { setError(scanError || "Wait for the receipt scan to finish before submitting."); return; }
    const mismatch = shouldValidateReceipt ? receiptReferenceError(scannedReferences, reference) : "";
    if (mismatch) { setError(mismatch); return; }
    if(affiliateBusy||affiliateError||(affiliateCode.trim()&&!affiliateQuote)){setError("Apply your affiliate code or clear it before submitting payment.");return;}
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("receipt", receipt!);
      body.append("reference_number", reference);
      body.append("plan_id", String(plan.id));
      body.append("quoted_amount", String(payablePlan.price));
      if(affiliateQuote)body.append("affiliate_code",affiliateQuote.affiliate_code);
      if (skipReceiptValidation) body.append("receipt_validation_mode", "test");
      const response = await fetch(`${API_BASE_URL}/api/payments${checkoutToken ? "/signup-checkout" : ""}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${checkoutToken || sessionStorage.getItem("kostaraa.token")}`
        },
        body
      });
      const data = await response.json();
      if (!response.ok || data.type !== "success") throw new Error(data.message || "Unable to submit payment.");
      notifyAffiliateOffer();
      onSubmitted(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return <dialog className="annual-payment" ref={dialog} aria-labelledby="annual-payment-title" onCancel={event => {
    if (busy) event.preventDefault();else onClose();
  }}><button className="annual-payment-close" disabled={busy} onClick={onClose} aria-label="Close payment form"><X /></button><header className="annual-payment-header"><h2 id="annual-payment-title">Choose {plan.name}</h2><p>Pay {planPrice(payablePlan)} for {planTerm(plan)}. We manually verify your payment within 12 hours. Your current access continues while you wait.</p></header><div className="annual-payment-steps"><section className="annual-payment-step"><h3>1. Scan and pay with PayMaya</h3><div className={`annual-payment-qr${qrUrl === "/payments/paymaya-qr.jpeg" ? " is-qr-only" : ""}`}><img src={qrUrl} alt="Kostaraa PayMaya payment QR code" /></div><p className="annual-payment-bill">Total bill: <b>PHP {billAmount}</b></p><label className="annual-payment-referral">Affiliate referral code <span>Optional</span><input type="text" maxLength={18} autoComplete="off" spellCheck={false} disabled={busy||affiliateBusy||affiliateAttached} value={affiliateCode} onChange={event=>{setAffiliateCode(event.target.value.toUpperCase().trim());setAffiliateError("");setError("")}} placeholder="Enter an A- affiliate code" aria-invalid={Boolean(affiliateError)}/></label><button className="annual-payment-affiliate-button" type="button" disabled={busy||affiliateBusy||affiliateAttached||!affiliateCode.trim()} onClick={applyAffiliate}>{affiliateBusy?"Checking…":affiliateAttached?"Code attached":"Apply code"}</button>{affiliateError&&<p className="annual-payment-error" role="alert">{affiliateError} <button type="button" disabled={busy||affiliateBusy} onClick={()=>setOfferRetry(value=>value+1)}>Retry</button></p>}<p className="annual-payment-affiliate-help">{affiliateAttached?"This affiliate code is permanently attached to your account.":"The first code you apply will stay attached to your account permanently."}</p>{affiliateQuote&&<p className="annual-payment-affiliate-success" role="status">{affiliateQuote.completed?"Your first-payment affiliate offer has already been used.":affiliateQuote.expired?"Your three-day discount has expired. Your affiliate remains attached; their reward is credited after admin confirmation.":<>{affiliateQuote.discount_percent?`${affiliateQuote.discount_percent}% discount`:"Affiliate discount"} (₱{Number(affiliateQuote.discount_amount).toFixed(2)}) applied. {affiliateQuote.expires_at&&<>Time left: {affiliateOfferCountdown(affiliateQuote.expires_at,offerNow+offerOffset).label.replace(/ \d+m \d+s$/, "")}. </>}</>}</p>}</section><form className="annual-payment-step" onSubmit={submit}><h3>2. Submit your payment</h3>{skipReceiptValidation&&<p className="annual-payment-scan" role="status">Development test mode: receipt scanning is skipped.</p>}<label>PayMaya reference number<input required disabled={busy} aria-invalid={Boolean(referenceError)} inputMode="numeric" pattern="[0-9]{10,32}" minLength={10} maxLength={32} value={reference} onChange={event => {setReference(event.target.value.trim());setError("")}} /></label><label className="annual-payment-file"><Upload /><b>Choose receipt image</b><span>JPG or PNG · up to 5 MB</span><input type="file" disabled={busy} accept="image/png,image/jpeg" onChange={event => {
            setScannedReferences([]);setScanState("idle");setScanError("");
            const file = event.target.files?.[0] || null;
            event.target.value = "";
            const invalid = receiptValidationError(file);
            setError(invalid);
            setReceipt(invalid ? null : file);
          }} /></label>{preview && <div className="annual-payment-receipt"><img src={preview} alt="Your payment receipt" onError={() => {
            setReceipt(null);setScannedReferences([]);setScanState("idle");setScanError("");
            setError("Choose a valid image that can be opened.");
          }} /><small>{receipt?.name}</small></div>}{scanState === "scanning" && <p className="annual-payment-scan" role="status">Scanning your receipt for its reference number…</p>}{scanState === "ready" && !referenceError && <p className="annual-payment-scan" role="status">{reference && canSubmit ? "Reference number matches your receipt." : "Reference number found. Enter the same number shown on your receipt."}</p>}{(scanError || referenceError || error) && <p role="alert" className="annual-payment-error">{scanError || referenceError || error}</p>}<button className="button annual-payment-primary" disabled={busy || !canSubmit}>{busy ? "Submitting…" : "Submit for verification"}</button><p className="annual-payment-small"><Clock3 />Review within 12 hours. Your selected plan starts after confirmation.</p></form></div>{onPayLater && <button className="button ghost" type="button" disabled={busy} onClick={onPayLater}>Pay later — Go to dashboard</button>}</dialog>;
}
