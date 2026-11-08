import { useEffect, useRef, useState, type FormEvent } from "react";
import { X, Upload, Clock3 } from "lucide-react";
import { API_BASE_URL } from "../../costing/utils/api";
import {planPrice, planTerm} from "../../costing/utils/plans";
import { receiptValidationError } from "../lib/payment-receipt";
import "../styles/annual-payment.css";
export function AnnualPaymentModal({
  onClose,
  onPayLater,
  checkoutToken,
  onSubmitted,
  instructions,
  plan
}: {
  onClose: () => void;
  onPayLater?: () => void;
  checkoutToken?: string;
  onSubmitted: (result: {acknowledgment_email_sent: boolean}) => void;
  plan: {id: number; name: string; price: number; duration_months: number; currency: string};
  instructions: {
    qr_url: string;
    account_name: string;
  };
}) {
  const qrUrl = instructions.qr_url || "/payments/paymaya-qr.jpeg";
  const billAmount = Number(plan.price).toLocaleString("en-PH", {maximumFractionDigits: 2});
  const dialog = useRef<HTMLDialogElement>(null);
  const [receipt, setReceipt] = useState<File | null>(null),
    [reference, setReference] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState("");
  useEffect(() => {
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
  async function submit(event: FormEvent) {
    event.preventDefault();
    const invalid = receiptValidationError(receipt);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("receipt", receipt!);
      body.append("reference_number", reference);
      body.append("plan_id", String(plan.id));
      body.append("quoted_amount", String(plan.price));
      const response = await fetch(`${API_BASE_URL}/api/payments${checkoutToken ? "/signup-checkout" : ""}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${checkoutToken || sessionStorage.getItem("kostaraa.token")}`
        },
        body
      });
      const data = await response.json();
      if (!response.ok || data.type !== "success") throw new Error(data.message || "Unable to submit payment.");
      onSubmitted(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return <dialog className="annual-payment" ref={dialog} aria-labelledby="annual-payment-title" onCancel={event => {
    if (busy) event.preventDefault();else onClose();
  }}><button className="annual-payment-close" disabled={busy} onClick={onClose} aria-label="Close payment form"><X /></button><header className="annual-payment-header"><h2 id="annual-payment-title">Choose {plan.name}</h2><p>Pay {planPrice(plan)} for {planTerm(plan)}. We manually verify your payment within 12 hours. Your current access continues while you wait.</p></header><div className="annual-payment-steps"><section className="annual-payment-step"><h3>1. Scan and pay with PayMaya</h3><div className={`annual-payment-qr${qrUrl === "/payments/paymaya-qr.jpeg" ? " is-qr-only" : ""}`}><img src={qrUrl} alt="Kostaraa PayMaya payment QR code" /></div><p className="annual-payment-bill">Total bill: <b>PHP {billAmount}</b></p><label className="annual-payment-referral">Referral code <span>Optional</span><input type="text" disabled placeholder="Discount codes coming soon" aria-label="Referral code discounts coming soon" /></label></section><form className="annual-payment-step" onSubmit={submit}><h3>2. Submit your payment</h3><label>PayMaya reference number<input required inputMode="numeric" pattern="[0-9]{10,32}" minLength={10} maxLength={32} value={reference} onChange={event => setReference(event.target.value.trim())} /></label><label className="annual-payment-file"><Upload /><b>Choose receipt image</b><span>JPG or PNG · up to 5 MB</span><input type="file" accept="image/png,image/jpeg" onChange={event => {
            const file = event.target.files?.[0] || null;
            const invalid = receiptValidationError(file);
            setError(invalid);
            setReceipt(invalid ? null : file);
          }} /></label>{preview && <div className="annual-payment-receipt"><img src={preview} alt="Your payment receipt" onError={() => {
            setReceipt(null);
            setError("Choose a valid image that can be opened.");
          }} /><small>{receipt?.name}</small></div>}{error && <p role="alert" className="annual-payment-error">{error}</p>}<button className="button annual-payment-primary" disabled={busy || !receipt}>{busy ? "Submitting…" : "Submit for verification"}</button><p className="annual-payment-small"><Clock3 />Review within 12 hours. Your selected plan starts after confirmation.</p></form></div>{onPayLater && <button className="button ghost" type="button" disabled={busy} onClick={onPayLater}>Pay later — Go to dashboard</button>}</dialog>;
}
