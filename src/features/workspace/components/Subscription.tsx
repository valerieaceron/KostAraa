import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, CreditCard, KeyRound, Pencil, RefreshCw, Send, UserRound, UsersRound, Wallet, X } from "lucide-react";
import { apiJson } from "../../costing/utils/api";
import { planBenefits, planPrice, planTerm } from "../../costing/utils/plans";
import { authRequest } from "../../auth/auth-api";
import { publishSession } from "../../auth/session-sharing";
import { AnnualPaymentModal } from "../../marketing/components/AnnualPaymentModal";
import {clearPlanIntent,paymentJourneyState,readPlanIntent,savePlanIntent} from "../plan-intent";
import AffiliatesPage from "./AffiliatesPage";
import AffiliateApplication from "./AffiliateApplication";
import "../styles/subscription.css";

function currentUser() {
  try { return JSON.parse(sessionStorage.getItem("kostaraa.user") || "{}"); }
  catch { return {}; }
}

function formatDate(value?: string) {
  if (!value) return "No renewal date";
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export default function Subscription({onNavigate}:{onNavigate:(page:string)=>void}) {
  const modalContent = useRef<HTMLElement>(null);
  const [affiliateStatus,setAffiliateStatus]=useState<any>(null);
  const [affiliateError,setAffiliateError]=useState("");
  const initialUser = currentUser();
  const [requestedPlan] = useState(new URLSearchParams(location.search).get("plan") || "");
  const [checkoutHandled, setCheckoutHandled] = useState(false);
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [open, setOpen] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [username, setUsername] = useState(String(initialUser.username || "")),
    [profileMessage, setProfileMessage] = useState(""),
    [resetBusy, setResetBusy] = useState(false),
    [resetMessage, setResetMessage] = useState(""),
    [panel, setPanel] = useState<"account" | "password" | "billing" | "affiliate-wallet" | "affiliate-record" | "affiliate-application" | null>(requestedPlan || (new URLSearchParams(location.search).get("page") === "subscription" && new URLSearchParams(location.search).get("section") !== "affiliates") ? "billing" : null);
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
  useEffect(()=>{
    let active=true;
    const load=()=>apiJson("/api/affiliates/application").then(response=>{if(active){setAffiliateStatus(response.result);setAffiliateError("");if(response.result?.status!=="approved")setPanel(current=>current==="affiliate-wallet"||current==="affiliate-record"?null:current)}}).catch(err=>{if(active){setAffiliateStatus(null);setAffiliateError(err.message);setPanel(current=>current==="affiliate-wallet"||current==="affiliate-record"?null:current)}});
    load();window.addEventListener("focus",load);
    return()=>{active=false;window.removeEventListener("focus",load)};
  },[refresh]);
  const approvedAffiliate=affiliateStatus?.status==="approved";
  const pending = data?.payments.some((payment: any) => payment.status === "pending");
  const currentPlan = data?.subscription?.plan_details;
  const beta = data?.subscription?.membership_type === "beta" || data?.subscription?.plan === "beta";
  const paid = beta || Number(currentPlan?.price) > 0 || data?.subscription?.plan === "paid";
  const planName = beta ? "Beta" : currentPlan?.name || (paid ? "Annual" : "Free");
  const selectedPlan = requestedPlan || String(data?.selected_plan_id || readPlanIntent(localStorage, initialUser));
  const annualPlan = data?.plans?.find((plan: any) => Number(plan.price) > 0 && (!selectedPlan || selectedPlan === "annual" || String(plan.id) === selectedPlan));
  useEffect(() => {
    if (!data) return;
    const state = paymentJourneyState(data);
    if (state === "active") clearPlanIntent(localStorage, currentUser());
    if (!requestedPlan || checkoutHandled) return;
    setCheckoutHandled(true);
    if (!annualPlan) { setError("Your selected plan is no longer available. Please choose Business Plus again from Pricing."); return; }
    if (state !== "active") savePlanIntent(localStorage, currentUser(), annualPlan.id);
    if (state === "unpaid") setOpen(true);
  }, [data, annualPlan, requestedPlan, checkoutHandled]);
  const email = String(initialUser.email || "");
  function saveUsername(event: FormEvent) {
    event.preventDefault();
    const next = username.trim();
    if (next.length < 3) { setProfileMessage("Username must contain at least 3 characters."); return; }
    const user = { ...currentUser(), username: next };
    sessionStorage.setItem("kostaraa.user", JSON.stringify(user));
    publishSession();
    setUsername(next);
    setProfileMessage("Username updated for this signed-in workspace.");
  }
  async function requestPasswordReset() {
    if (!email) { setResetMessage("No email address is connected to this account."); return; }
    setResetBusy(true); setResetMessage("");
    try {
      const response = await authRequest("reset-request", { email });
      setResetMessage(response.message || `Password instructions were sent to ${email}.`);
    } catch (err: any) {
      setResetMessage(err.message || "Unable to send password instructions right now.");
    } finally { setResetBusy(false); }
  }
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
  const rows = [
    { key: "account" as const, title: "Account", icon: UserRound, action: "Edit" },
    { key: "password" as const, title: "Privacy & Security", icon: KeyRound, action: "Edit" },
    { key: "billing" as const, title: "Billing & Payment", icon: CreditCard, action: "Manage" },
    { key: "affiliate-wallet" as const, title: "Wallet", icon: Wallet, action: "View" },
    { key: "affiliate-record" as const, title: "Affiliate Referrals", icon: UsersRound, action: "View" },
    { key: "affiliate-application" as const, title: "Apply for Affiliate Application", icon: Send, action: "View" },
  ].filter(row=>row.key==="affiliate-application"?!approvedAffiliate:approvedAffiliate||!(row.key==="affiliate-wallet"||row.key==="affiliate-record"));
  const affiliatePanels={
    "affiliate-wallet":"View your confirmed rewards, wallet balance, and referral code.",
    "affiliate-record":"Review customers referred through your affiliate code.",
    "affiliate-application":"Learn about the partner program and submit an application.",
  } as const;
  const affiliatePanel=panel&&panel in affiliatePanels?affiliatePanels[panel as keyof typeof affiliatePanels]:null;
  const openAffiliatePage=(page:string)=>{
    if(page==="wallet")setPanel("affiliate-wallet");
    else if(page==="affiliate-records")setPanel("affiliate-record");
    else onNavigate(page);
  };
  useEffect(()=>{
    if(!panel?.startsWith("affiliate-"))return;
    const previousFocus=document.activeElement as HTMLElement|null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    modalContent.current?.querySelector<HTMLButtonElement>(".account-modal-close")?.focus();
    const handleKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();setPanel(null);}
      if(event.key!=="Tab")return;
      const controls=Array.from(modalContent.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')||[]).filter(element=>element.getClientRects().length);
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    document.addEventListener("keydown",handleKey);
    return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener("keydown",handleKey);if(previousFocus?.isConnected)previousFocus.focus();};
  },[panel]);
  return <section className="subscription-page account-settings-page">
    <header className="account-settings-heading"><h1>Account Settings</h1></header>
    {selectedPlan && paymentJourneyState(data) === "unpaid" && <p className="account-notice">You can complete your Business Plus payment now or return when you’re ready. <a href="/workspace">Pay later — Go to dashboard</a></p>}
    <div className="account-settings-list" role="list">{rows.map(row => <section key={row.key} role="listitem"><button type="button" className="account-settings-list-copy" onClick={() => setPanel(row.key)}><span><row.icon aria-hidden="true"/></span><div><h2>{row.title}</h2></div></button><button type="button" onClick={() => setPanel(row.key)}>{row.key.startsWith("affiliate-")?<ArrowRight aria-hidden="true"/>:<Pencil aria-hidden="true"/>} {row.action}</button></section>)}</div>
    {affiliateError&&<p className="account-notice error" role="alert">{affiliateError} <button onClick={()=>setRefresh(value=>value+1)}>Try again</button></p>}
    {affiliateStatus&&<p className="account-notice" role="status">{affiliateStatus.status==="approved"?"You’re an approved affiliate. Your Wallet and Affiliate Referrals are available below.":affiliateStatus.status==="pending"?"Your affiliate application is under review. We’ll email you with the decision.":`Your affiliate application was declined. ${affiliateStatus.review_note} You can update your details and apply again.`}</p>}
    {error && <p className="account-notice error" role="alert">{error} <button onClick={() => setRefresh(v => v + 1)}>Try again</button></p>}{message && <p className="account-notice" role="status">{message}</p>}
    {panel && <div className={`account-settings-modal${(panel === "billing" || affiliatePanel) ? " is-wide" : ""}${panel === "account" ? " is-account" : ""}${affiliatePanel ? " is-affiliate" : ""}`} role="dialog" aria-modal="true" aria-labelledby="account-panel-title"><button className="account-settings-scrim" type="button" onClick={() => setPanel(null)} aria-label="Close settings" tabIndex={-1}/><article ref={modalContent}><header><div><h2 id="account-panel-title">{rows.find(row => row.key === panel)?.title}</h2><p>{panel === "account" ? "Update your profile and review account access." : panel === "password" ? "Change your password through a secure email link." : affiliatePanel||"Manage your plan and payment history."}</p></div><button className="account-modal-close" type="button" onClick={() => setPanel(null)} aria-label="Close"><X aria-hidden="true"/></button></header><div key={panel} className="account-modal-body">
      {panel === "account" && <form className="account-modal-form" onSubmit={saveUsername}><section className="account-overview" aria-label="Account status"><div><small>ACCESS</small><b><i aria-hidden="true"/> Active</b></div><div><small>EMAIL</small><b><BadgeCheck aria-hidden="true"/> Verified</b></div><div><small>PLAN</small><b>{data ? planName : "Loading…"}</b></div></section><label><span>Username</span><input value={username} minLength={3} maxLength={64} pattern="[a-zA-Z0-9_.-]+" autoComplete="username" onChange={event => { setUsername(event.target.value); setProfileMessage(""); }}/><small>Use 3–64 letters, numbers, periods, underscores, or hyphens.</small></label><label><span>Email address</span><input value={email || "Not available"} disabled/><small>Your verified email cannot be changed here.</small></label>{profileMessage && <p className="account-inline-message" role="status">{profileMessage}</p>}<footer><button type="button" onClick={() => setPanel(null)}>Cancel</button><button className="primary" type="submit">Save changes</button></footer></form>}
      {panel === "password" && <div className="account-security-copy"><div className="account-modal-icon"><KeyRound aria-hidden="true"/></div><p>Password instructions will be sent to <b>{email || "your account email"}</b>.</p><button className="primary" type="button" disabled={resetBusy || !email} onClick={requestPasswordReset}>{resetBusy ? "Sending…" : "Send password reset link"}</button>{resetMessage && <p className="account-inline-message" role="status">{resetMessage}</p>}</div>}
      {approvedAffiliate && (panel === "affiliate-wallet" || panel === "affiliate-record") && <AffiliatesPage key={panel} embedded mode={panel === "affiliate-wallet" ? "wallet" : "records"} onNavigate={openAffiliatePage}/>}
      {panel === "affiliate-application" && <AffiliateApplication embedded onBack={()=>setPanel(null)}/>}

      {panel === "billing" && data && <><div className="account-billing-toolbar"><button className="refresh" onClick={() => setRefresh(v => v + 1)}><RefreshCw aria-hidden="true"/> Refresh status</button></div><div className="account-plan-grid"><article className="current"><small>CURRENT PLAN</small><h3>{planName}</h3><p>{currentPlan ? planBenefits(currentPlan).slice(0, 2).join(" · ") : paid ? "100 inventory records · Unlimited products" : "5 inventory records · 3 products"}</p>{paid && <p className="plan-date">Access until {formatDate(data.subscription.expires_at)}</p>}</article>{annualPlan && <article><small>{annualPlan.name.toUpperCase()}</small><h3>{planPrice(annualPlan)} <span>/ {planTerm(annualPlan)}</span></h3><p>{annualPlan.description}</p><div className="account-plan-actions"><button className="primary" disabled={pending || beta} onClick={() => setOpen(true)}>{beta ? "Included with Beta" : pending ? "Payment awaiting review" : paid ? `Renew ${annualPlan.name}` : `Upgrade to ${annualPlan.name}`}</button><button className="secondary" disabled={busy} onClick={emailLink}>{busy ? "Sending…" : "Email payment link"}</button></div></article>}</div><section className="account-payment-history"><header><div><h3>Payment history</h3><p>Your submitted payments and review status.</p></div></header>{!data.payments.length ? <div className="account-empty-state"><CreditCard aria-hidden="true"/><b>No payments yet</b><p>Your payment activity will appear here.</p></div> : <div className="subscription-history"><table><thead><tr><th>Reference</th><th>Amount</th><th>Status</th><th>Submitted</th><th>Review note</th></tr></thead><tbody>{data.payments.map((payment: any) => <tr key={payment.id}><td>{payment.reference_number}</td><td>₱{Number(payment.amount).toFixed(2)}</td><td><span className={`payment-status ${payment.status}`}>{payment.status}</span></td><td>{formatDate(payment.created_at)}</td><td>{payment.review_note || "—"}</td></tr>)}</tbody></table></div>}</section></>}
    </div></article></div>}
    {data && annualPlan && open && <AnnualPaymentModal onPayLater={() => { location.href = "/workspace"; }} plan={annualPlan} instructions={data.instructions} onClose={() => setOpen(false)} onSubmitted={result => {
        setOpen(false);
        setMessage(result.acknowledgment_email_sent ? "Receipt submitted. We’ve emailed you an acknowledgment. Our admin team will verify your payment within 12 hours, and we’ll email you again once payment is received and confirmed." : "Receipt submitted. We couldn’t send the acknowledgment email, but your receipt is saved and awaiting admin review within 12 hours. We’ll email you once payment is received and confirmed.");
        setRefresh(v => v + 1);
      }} />}
  </section>;
}
