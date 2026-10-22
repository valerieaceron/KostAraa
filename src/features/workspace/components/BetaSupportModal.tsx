import {useRef, useState} from 'react';
import {apiJson, isOfflineUser} from '../../costing/utils/api';
import {version} from '../../../../package.json';

const issueTypes = [
  ['not_working', 'Something is not working'],
  ['hard_to_understand', 'Hard to understand'],
  ['display_or_mobile', 'Display or mobile issue'],
  ['wrong_calculation', 'Wrong calculation or result'],
  ['feature_suggestion', 'Feature suggestion'],
  ['other', 'Other'],
];

export default function BetaSupportModal({onClose, businessProfileId, page, businessSection}:any) {
  const [ticket, setTicket] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const path = `/workspace?page=${page}${page === 'account' ? `&section=${businessSection}` : ''}`;
  async function submit(event:any) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const message = String(form.get('message') || '').trim();
    if (message.length < 5 || message.length > 10000) { setError('Describe the issue using 5 to 10,000 characters.'); return; }
    if (isOfflineUser()) { setError('Sign in with an online customer account to send a support ticket.'); return; }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      // Resolve the profile from the server rather than another account's cached data.
      const profile = businessProfileId ? null : await apiJson('/api/business-profile');
      const profileId = businessProfileId || profile?.data?.id || profile?.result?.id;
      if (!profileId) throw new Error('Save your Business Profile before sending a report.');
      const issue = String(form.get('type'));
      const result = await apiJson('/api/beta-support/add', {method:'POST', body:JSON.stringify({
        business_profile_id:profileId, app_version:version, issue_type:issue,
        summary:issueTypes.find(([code]) => code === issue)?.[1], message,
        page_path:path, page_url:new URL(path, window.location.origin).href,
        contact_email:String(form.get('email') || '').trim(), priority:'normal',
        client_context:{feature:page, section:page === 'account' ? businessSection : null, device:/Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop', viewport:{width:window.innerWidth, height:window.innerHeight}},
      })});
      if (!result.result?.id || !result.result?.public_id) throw new Error('The API did not return a ticket reference. Please check with support before resending.');
      setTicket(result.result);
    } catch (err:any) { setError(err.message || 'Unable to send your report.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <div className="beta-support-modal" role="dialog" aria-modal="true" aria-labelledby="beta-support-title">
    <button className="beta-support-scrim" onClick={() => !busy && onClose()} aria-label="Close beta support"/>
    <article>{ticket ? <div className="beta-support-success"><span>✓</span><small>BETA SUPPORT</small><h2 id="beta-support-title">Your report was sent.</h2><p>The Kostaraa team will review support ticket #{ticket.id}.</p><p>Reference: {ticket.public_id}</p><div><button onClick={onClose}>Close</button></div></div> : <>
      <header><div><small>BETA SUPPORT</small><h2 id="beta-support-title">Report an issue</h2><p>Tell us what happened so the Kostaraa team can help.</p></div><button disabled={busy} onClick={onClose} aria-label="Close">×</button></header>
      <form onSubmit={submit}><div className="beta-support-grid"><label>What kind of issue?<select name="type" defaultValue="not_working">{issueTypes.map(([code, title]) => <option value={code} key={code}>{title}</option>)}</select></label><label>Page<input name="page" value={path} readOnly/></label></div>
        <label>What happened?<textarea name="message" required minLength={5} maxLength={10000} rows={5} autoFocus placeholder="Tell us what you clicked, what you expected, and what happened instead."/></label>
        <label>Email for follow-up <small>Optional</small><input name="email" type="email" maxLength={254} placeholder="you@example.com"/></label>
        {error && <p className="simple-note" role="alert">{error}</p>}
        <aside><b>Privacy note</b><span>Do not include passwords, payment information, or other sensitive details.</span></aside>
        <footer><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send support ticket'}</button></footer>
      </form></>}</article>
  </div>;
}
