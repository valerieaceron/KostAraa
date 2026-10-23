import { useEffect, useState } from "react";
import { apiJson } from "../../costing/utils/api";
import { AnnualPaymentModal } from "../../marketing/components/AnnualPaymentModal";
import "../styles/subscription.css";
export default function Subscription() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [open, setOpen] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setError("");
    apiJson("/api/payments").then(response => {
      if (active) setData(response.result);
    }).catch(err => {
      if (active) setError(err.message);
    });
    return () => {
      active = false;
    };
  }, [refresh]);
  const pending = data?.payments.some((payment: any) => payment.status === "pending");
  const paid = ["paid", "beta"].includes(data?.subscription.plan);
  async function emailLink() {
    setBusy(true);
    setError("");
    try {
      const response = await apiJson("/api/payments/email-link", {
        method: "POST"
      });
      setMessage(response.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return <section className="subscription-page"><h1>Your plan & payments</h1><p>Start with Free. Upgrade when you need more room for your business.</p>{error && <p role="alert">{error} <button onClick={() => setRefresh(v => v + 1)}>Try again</button></p>}{message && <p role="status">{message}</p>}{!data && !error && <p>Loading your plan…</p>}{data && <><div className="subscription-plans"><article><small>CURRENT PLAN</small><h2>{data.subscription.plan === "beta" ? "Beta" : paid ? "Annual" : "Free"}</h2><p>{paid ? "100 inventory records · Unlimited products · 5 competitor crawls" : "5 inventory records · 3 products · 1 competitor crawl"}</p>{data.subscription.expires_at && paid && <p>Annual access until {new Date(data.subscription.expires_at).toLocaleDateString()}</p>}<a href="/workspace">Continue to workspace →</a></article><article><small>ANNUAL</small><h2>₱899 <small>/ year</small></h2><p>100 inventory records, unlimited products, and 5 competitor crawls. Paid and Beta accounts have the same limits.</p><p>Pay manually with PayMaya. Receipt verification takes up to 12 hours.</p><button className="button" disabled={pending || data.subscription.plan === "beta"} onClick={() => setOpen(true)}>{data.subscription.plan === "beta" ? "Included with Beta" : pending ? "Payment awaiting review" : paid ? "Renew Annual" : "Upgrade to Annual"}</button><button disabled={busy} onClick={emailLink}>{busy ? "Sending…" : "Email me the payment form link"}</button></article></div>{pending && <p role="status">Your receipt is awaiting review. Your current access continues while we verify payment.</p>}<h2>Payment history</h2><button onClick={() => setRefresh(v => v + 1)}>Refresh status</button>{!data.payments.length ? <p>No payments submitted yet.</p> : <div className="subscription-history"><table><thead><tr><th>Reference</th><th>Amount</th><th>Status</th><th>Submitted</th><th>Review note</th></tr></thead><tbody>{data.payments.map((payment: any) => <tr key={payment.id}><td>{payment.reference_number}</td><td>₱{Number(payment.amount).toFixed(2)}</td><td>{payment.status}</td><td>{new Date(payment.created_at).toLocaleDateString()}</td><td>{payment.review_note || "—"}</td></tr>)}</tbody></table></div>}{open && <AnnualPaymentModal instructions={data.instructions} onClose={() => setOpen(false)} onSubmitted={result => {
        setOpen(false);
        setMessage(result.acknowledgment_email_sent ? "Receipt submitted. We’ve emailed you an acknowledgment. Our admin team will verify your payment within 12 hours, and we’ll email you again once payment is received and confirmed." : "Receipt submitted. We couldn’t send the acknowledgment email, but your receipt is saved and awaiting admin review within 12 hours. We’ll email you once payment is received and confirmed.");
        setRefresh(v => v + 1);
      }} />}</>}</section>;
}
export function PlanSidebar({
  onOpen
}: {
  onOpen: () => void;
}) {
  const [plan, setPlan] = useState("");
  useEffect(() => {
    let active = true;
    apiJson("/api/payments").then(data => {
      if (active) setPlan(data.result.subscription.plan);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (plan !== "free") return null;
  return <div className="subscription-sidebar"><b>Free plan</b><small>5 inventory records · 3 products</small><button onClick={onOpen}>Upgrade to Annual →</button></div>;
}
