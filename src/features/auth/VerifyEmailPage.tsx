import { useEffect, useRef, useState } from "react";
import { MailCheck } from "lucide-react";
import { authRequest } from "./auth-api";
import "./auth.css";
import "./auth-center.css";
import "./signup-refresh.css";
import "./verify-email-refresh.css";
export default function VerifyEmailPage() {
  const params = new URLSearchParams(location.search);
  const [token] = useState(params.get("token") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const verification = useRef<ReturnType<typeof authRequest> | null>(null);
  const [busy, setBusy] = useState(Boolean(token)),
    [error, setError] = useState(""),
    [message, setMessage] = useState(token ? "Confirming your email address. You’ll be redirected to login when it’s verified." : params.get("delivery") === "failed" ? "To continue, request a new verification email. We couldn’t deliver the first message." : "To continue, use the verification link we sent to your email. Check your inbox and spam folder. The link expires after 24 hours.");
  useEffect(() => {
    if (!token) return;
    let active = true;
    // Reuse the request when StrictMode replays effects; tokens are single-use.
    verification.current ??= authRequest("verify-email", {token});
    verification.current.then(() => {
      if (active) location.replace("/login?registered=1");
    }).catch((err: Error) => {
      if (!active) return;
      setMessage("We couldn’t confirm your email. Request a new verification link to continue.");
      setError(err.message);
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [token]);
  async function send() {
    setBusy(true);
    setError("");
    try {
      const data = await authRequest("resend-verification", {email});
      setMessage(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return <main className="auth-page auth-centered auth-signup-page auth-verify-page">
    <a className="auth-back" href="/">← Back to Kostaraa</a>
    <section className="auth-form-side">
      <div className="auth-card auth-card-signup auth-verify-card">
        <a className="auth-logo" href="/"><img src="/kostaraa-logo.webp" alt="Kostaraa" /></a>
        <span className="auth-verify-icon" aria-hidden="true"><MailCheck /></span>
        <h1>{token && busy ? "Confirming your email" : "Verify your email"}</h1>
        <p className="auth-verify-message" role="status">{message}</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {token ? <>
            {error && <a className="auth-verify-secondary" href="/verify-email">Request a new verification link</a>}
          </> : <form className="auth-verify-form" onSubmit={event => {
            event.preventDefault();
            send();
          }}>
            <label>Email address<input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
            <button className="button auth-submit auth-verify-primary" disabled={busy}>{busy ? "Sending…" : "Resend email"}</button>
          </form>}
        <a className="auth-verify-secondary" href="/login">Back to login</a>
      </div>
    </section>
  </main>;
}
