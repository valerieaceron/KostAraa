import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {apiJson, getApiItem, getCreatedInventoryItem, isOfflineUser} from '../utils/api';
import {businessProfilePayload, loadBusinessProfile, normalizeBusinessProfile} from '../utils/businessProfile';
import {withSynchronizedOperationCost} from '../../workspace/business-profile-costs';
import {MaterialDialog, inventoryApiPayload, normalizeApiInventoryItem, validateDraft} from './Inventory';

export function GridValidationGuide({target, address, label, issue, onClose, onNext, onSetup}) {
  const ref = useRef(null);
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    const element = target();
    if (!element) return undefined;
    element.scrollIntoView({block: 'nearest', inline: 'center'});
    const place = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 24);
      const height = ref.current?.offsetHeight || 240;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const above = rect.bottom + height + 20 > window.innerHeight && rect.top > height + 20;
      const top = Math.max(12, Math.min(above ? rect.top - height - 12 : rect.bottom + 12, window.innerHeight - height - 12));
      setPosition({left, top, width, '--guide-arrow': `${Math.max(18, Math.min(rect.left + rect.width / 2 - left, width - 24))}px`, '--guide-arrow-top': above ? 'calc(100% - 6px)' : '-7px', '--guide-arrow-rotation': above ? '225deg' : '45deg'});
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [target, issue, address]);
  useEffect(() => {
    const close = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  return createPortal(<aside ref={ref} className={`grid-validation-tooltip${issue.type === 'info' ? ' grid-info-tooltip' : ''}`} style={position || {visibility: 'hidden'}} role="dialog" aria-label={`${issue.type === 'info' ? 'Check' : 'Fix'} ${label}`} aria-describedby="grid-validation-message">
    <button className="grid-guide-close" type="button" aria-label="Dismiss field guide" onClick={onClose}><X size={16}/></button>
    <h2>{label} · {address}</h2>
    <p id="grid-validation-message" role="status">{issue.hint || issue.message}</p>
    {issue.options && <><ul>{issue.options.map(option => <li key={option}>{option}</li>)}</ul><p>If you change it, save the product again.</p></>}
    <div className="grid-guide-actions">
      {issue.action && <button type="button" onClick={onSetup}>{issue.action === 'production' ? 'Set production' : issue.inventoryId ? 'Edit material' : 'Add material'}</button>}
      <button type="button" className="primary" onClick={onNext}>{issue.type === 'info' ? 'Got it' : 'Next'}</button>
    </div>
  </aside>, document.body);
}

export function GridInventoryDialog({material, item, inventory, onSave, onClose}) {
  const [draft, setDraft] = useState(() => ({...(item || {}), material: item?.material || material?.name || '', category: item?.category === 'Packaging' || item?.item_type === 'packaging' || material?.kind === 'packaging' ? 'Packaging' : 'Raw Material', itemCost: item?.itemCost ?? '', qty: item?.qty ?? '', baseUnit: item?.baseUnit || '', gramsPerCup: item?.gramsPerCup || '', piecesPerUnit: item?.piecesPerUnit || ''}));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = () => { if (!busy) onClose(); };
  async function save() {
    if (busy) return;
    const invalid = validateDraft(draft);
    setErrors(invalid);
    if (Object.values(invalid).some(Boolean)) return;
    setBusy(true); setError('');
    try {
      const value = {...draft, id: item?.id || crypto.randomUUID(), material: draft.material.trim(), item_type: draft.category === 'Packaging' ? 'packaging' : 'ingredient', itemCost: Number(draft.itemCost), qty: Number(draft.qty)};
      let saved = value;
      if (!isOfflineUser()) {
        const response = await apiJson(item ? `/api/inventory/update/${encodeURIComponent(item.id)}` : '/api/inventory/add', {method: item ? 'PATCH' : 'POST', body: JSON.stringify(inventoryApiPayload(value))});
        saved = normalizeApiInventoryItem(item ? {...value, ...getApiItem(response)} : getCreatedInventoryItem(response, value));
      }
      onSave(saved, item ? inventory.map(entry => String(entry.id) === String(item.id) ? saved : entry) : [saved, ...inventory]);
    } catch (err) { setError(err.message || 'Unable to save this material.'); }
    finally { setBusy(false); }
  }
  return createPortal(<MaterialDialog draft={draft} errors={errors} mode={item ? 'edit' : 'add'} saving={busy} saveError={error} allowedUnits={['mg', 'g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz', 'mm', 'cm', 'm', 'inch', 'ft', 'yard', 'pcs', 'dozen', 'pack', 'box']} onChange={(field, value) => setDraft(current => ({...current, [field]: value}))} onClose={close} onSave={save}/>, document.body);
}

export function GridProductionDialog({onClose, onSave}) {
  const dialog = useRef(null);
  const [profile, setProfile] = useState(null);
  const [days, setDays] = useState('26');
  const [businessName, setBusinessName] = useState('');
  const [daily, setDaily] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const close = () => { if (!busy) onClose(); };
  useEffect(() => {
    dialog.current.showModal();
    let cancelled = false;
    (async () => {
      try {
        let cached = {};
        try { cached = JSON.parse(localStorage.getItem('kostaraa.businessProfile') || '{}') || {}; } catch { /* Load the saved profile below. */ }
        const next = await loadBusinessProfile(cached);
        if (!cancelled) {
          setProfile(next);
          setBusinessName(next.identity?.businessName || '');
          const operatingDays = Number(next.operations?.operatingDaysPerMonth) || 26;
          setDays(String(operatingDays));
          setDaily(String(next.operations?.dailyProductionUnits || Number(next.operations?.monthlyProductionUnits) / operatingDays || ''));
        }
      } catch (err) { if (!cancelled) setError(err.message || 'Unable to load Business Settings. Close and try again.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy || !profile) return;
    if (!profile.meta?.businessProfileId && !businessName.trim()) { setError('Business name is required.'); return; }
    const monthly = Math.round(Number(days) * Number(daily));
    if (!Number.isFinite(Number(days)) || Number(days) < 1 || Number(days) > 31 || !Number.isInteger(Number(days))) { setError('Operating days must be a whole number between 1 and 31.'); return; }
    if (!Number.isFinite(Number(daily)) || Number(daily) <= 0 || !Number.isFinite(monthly) || monthly < 1) { setError('Enter daily production that gives at least 1 item per month.'); return; }
    setBusy(true); setError('');
    try {
      const next = withSynchronizedOperationCost({...profile, identity: {...profile.identity, businessName: businessName.trim()}, operations: {...profile.operations, operatingDaysPerMonth: Number(days), dailyProductionUnits: Number(daily), monthlyProductionUnits: monthly, dailyOperationsVersion: 1}});
      let saved = next;
      if (!isOfflineUser()) {
        const response = await apiJson('/api/business-profile', {method: next.meta?.businessProfileId ? 'PATCH' : 'POST', body: JSON.stringify(businessProfilePayload(next, next.meta?.status || 'complete', next.meta?.onboardingStep || 8))});
        saved = withSynchronizedOperationCost(normalizeBusinessProfile(response, next));
      }
      localStorage.setItem('kostaraa.businessProfile', JSON.stringify(saved));
      window.dispatchEvent(new window.CustomEvent('kostaraa:business-settings-changed', {detail: saved}));
      onSave();
    } catch (err) { setError(err.message || 'Unable to save production settings.'); }
    finally { setBusy(false); }
  }
  return createPortal(<dialog ref={dialog} className="grid-production-dialog" aria-labelledby="grid-production-title" onCancel={event => {event.preventDefault();close();}}>
    <form onSubmit={submit}>
      <header><h2 id="grid-production-title">Set production for Grid</h2><button type="button" aria-label="Close production settings" disabled={busy} onClick={close}><X size={20}/></button></header>
      <p>Save these values to Business Settings without leaving your worksheet. Other business details are preserved.</p>
      {loading && <p role="status">Loading Business Settings…</p>}
      {error && <p className="inventory-alert error" role="alert">{error}</p>}
      {profile && !profile.meta?.businessProfileId && <label className="inventory-field">Business name<input type="text" required disabled={busy || loading} value={businessName} onChange={event => setBusinessName(event.target.value)}/></label>}
      <label className="inventory-field">Operating days per month<input autoFocus type="number" min="1" max="31" step="1" required disabled={busy || loading} value={days} onChange={event => setDays(event.target.value)}/></label>
      <label className="inventory-field">Items produced per day<input type="number" min="0.0001" step="any" required disabled={busy || loading} value={daily} onChange={event => setDaily(event.target.value)}/></label>
      <p>Items produced per month: <strong>{Math.round((Number(days) || 0) * (Number(daily) || 0))}</strong></p>
      <div className="grid-production-actions"><button type="button" disabled={busy} onClick={close}>Cancel</button><button type="submit" className="primary" disabled={busy || loading || !profile}>{busy ? 'Saving…' : 'Save production'}</button></div>
    </form>
  </dialog>, document.body);
}
