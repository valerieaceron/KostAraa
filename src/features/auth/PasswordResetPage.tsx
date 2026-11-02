import { FormEvent, useEffect, useState } from "react";
import { KeyRound, MailCheck } from "lucide-react";
import { authRequest } from "./auth-api";
import "./auth.css";
import "./auth-center.css";
import "./signup-refresh.css";
import "./verify-email-refresh.css";

export default function PasswordResetPage() {
  const resetting = location.pathname.replace(/\/$/, "") === "/reset-password";
  const [token] = useState(() => new URLSearchParams(location.search).get("token") || "");
  useEffect(() => {
    if (resetting && token) history.replaceState(null, "", location.pathname);
  }, [resetting, token]);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const validToken = /^[a-f0-9]{64}$/.test(token);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    if (resetting && password !== String(form.get("confirmPassword") || "")) {
      setError("Your passwords do not match.");
      return;
    }
    if (resetting && new TextEncoder().encode(password).length > 72) {
      setError("Use a password of at most 72 bytes. Some characters use more than one byte.");
      return;
    }
    setBusy(true);
    try {
      const data = await authRequest(resetting ? "reset-password" : "request-reset-password", resetting
        ? {token, password}
        : {email: String(form.get("email") || "").trim().toLowerCase()});
      setMessage(data.message);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete your request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page auth-centered auth-signup-page auth-verify-page">
    <a className="auth-back" href="/">← Back to Kostaraa</a>
    <section className="auth-form-side">
      <div className="auth-card auth-card-signup auth-verify-card">
        <a className="auth-logo" href="/"><img src="/kostaraa-logo.webp" alt="Kostaraa" /></a>
        <span className="auth-verify-icon" aria-hidden="true">{resetting ? <KeyRound /> : <MailCheck />}</span>
        <h1>{done ? resetting ? "Password updated" : "Check your email" : resetting ? "Reset your password" : "Forgot password?"}</h1>
        <p className="auth-verify-message" role="status">{message || (resetting
          ? validToken ? "Choose a new password for your Kostaraa account." : "This reset link is missing or invalid. Request a new password reset email."
          : "Enter the email address linked to your account. We’ll send you a password reset link that expires in 30 minutes.")}</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {!done && (!resetting || validToken) && <form className="auth-verify-form" onSubmit={submit}>
          {resetting ? <>
            <label>New password<div className="password-field">
              <input name="password" required type={show ? "text" : "password"} minLength={8} maxLength={72} autoComplete="new-password" placeholder="8–72 characters" disabled={busy} />
              <button type="button" onClick={() => setShow(value => !value)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
            </div></label>
            <label>Confirm new password<input name="confirmPassword" required type={show ? "text" : "password"} minLength={8} maxLength={72} autoComplete="new-password" placeholder="Re-enter your new password" disabled={busy} /></label>
          </> : <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" disabled={busy} /></label>}
          <button className="button auth-submit auth-verify-primary" disabled={busy}>{busy ? resetting ? "Updating…" : "Sending…" : resetting ? "Update password" : "Send reset link"}</button>
        </form>}
        {((resetting && (!validToken || error)) || (done && !resetting)) && <a className="auth-verify-secondary" href="/forgot-password">Request a new reset link</a>}
        <div><a className="auth-verify-secondary" href="/login">Back to login</a></div>
      </div>
    </section>
  </main>;
}
