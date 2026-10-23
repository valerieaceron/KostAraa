import { useState } from "react";
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
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(token ? "To continue, confirm your email address. This activates your Free account and lets you log in to Kostaraa." : params.get("delivery") === "failed" ? "To continue, request a new verification email. We couldn’t deliver the first message." : "To continue, use the verification link we sent to your email. Check your inbox and spam folder. The link expires after 24 hours.");
  async function send(verify: boolean) {
    setBusy(true);
    setError("");
    try {
      const data = await authRequest(verify ? "verify-email" : "resend-verification", verify ? {token} : {email});
      if (verify) {
        location.replace("/login?registered=1");
        return;
      }
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
        <a className="auth-logo" href="/"><img src="/kostaraa-logo.png" alt="Kostaraa" /></a>
        <span className="auth-verify-icon" aria-hidden="true"><MailCheck /></span>
        <h1>Verify your email</h1>
        <p className="auth-verify-message" role="status">{message}</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {token ? <>
            <button className="button auth-submit auth-verify-primary" disabled={busy} onClick={() => send(true)}>{busy ? "Confirming…" : "Confirm email"}</button>
            {error && <a className="auth-verify-secondary" href="/verify-email">Request a new verification link</a>}
          </> : <form className="auth-verify-form" onSubmit={event => {
            event.preventDefault();
            send(false);
          }}>
            <label>Email address<input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
            <button className="button auth-submit auth-verify-primary" disabled={busy}>{busy ? "Sending…" : "Resend email"}</button>
          </form>}
        <a className="auth-verify-secondary" href="/login">Back to login</a>
      </div>
    </section>
  </main>;
}
