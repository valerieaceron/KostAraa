import { useState } from "react";
import { authRequest } from "./auth-api";
import "./auth.css";
import "./auth-center.css";
export default function VerifyEmailPage() {
  const params = new URLSearchParams(location.search);
  const [token, setToken] = useState(params.get("token") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(token ? "Confirm your email address to activate your Free account and log in to Kostaraa." : params.get("delivery") === "failed" ? "Your account was saved, but the email could not be delivered. Please request a new verification email." : "Check your inbox and spam folder. Verify your email before logging in. Links expire after 24 hours."),
    [verified, setVerified] = useState(false);
  async function send(verify: boolean) {
    setBusy(true);
    setError("");
    try {
      const data = await authRequest(verify ? "verify-email" : "resend-verification", verify ? {token} : {email});
      setMessage(data.message);
      if (verify) {
        setVerified(true);
        setToken("");
        history.replaceState(null, "", "/verify-email");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return <main className="auth-page auth-centered">
    <section className="auth-form-side">
      <div className="auth-card">
        <a className="auth-logo" href="/"><img src="/kostaraa-logo.png" alt="Kostaraa" /></a>
        <h1>{verified ? "Email verified" : "Verify your email"}</h1>
        <p role="status">{message}</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {verified ? <a className="button" href="/login?registered=1">Log in to Kostaraa</a> : <>
          {token ? <>
            <button className="button auth-submit" disabled={busy} onClick={() => send(true)}>{busy ? "Verifying…" : "Verify and activate account"}</button>
            {error && <p><a href="/verify-email">Request a new verification link</a></p>}
          </> : <form onSubmit={event => {
            event.preventDefault();
            send(false);
          }}>
            <label>Email address<input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
            <button className="button auth-submit" disabled={busy}>{busy ? "Please wait…" : "Resend verification email"}</button>
          </form>}
          <p><a href="/login">Back to login</a></p>
        </>}
      </div>
    </section>
  </main>;
}
