import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {currentGuideKey, readGuideProgress} from '../../workspace/getting-started';
import {isNewProductTourUser, productTourSteps, readProductTour} from '../../workspace/product-tour';
import {createProductTourSync} from '../../workspace/product-tour-sync';
import {apiJson, isOfflineUser} from '../utils/api';
import '../styles/product-tour.css';

export default function ProductTour({root, editingItem, savedProductCount = 0, paused = false}) {
  const [key] = useState(() => `${currentGuideKey()}.product-tour`);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sync] = useState(() => {
    const token = sessionStorage.getItem('kostaraa.token');
    return createProductTourSync({storage:localStorage, key, offline:isOfflineUser(), request:(path, options = {}) => apiJson(path, {...options, headers:{Authorization:`Bearer ${token}`}})});
  });
  const initial = useRef({editingItem, savedProductCount});
  const pending = useRef(null);
  const loadRequest = useRef(null);

  function persist(value) {
    pending.current = value;
    return sync.save(value).then(() => {
      if (pending.current === value) {pending.current = null;setSyncError('');}
    }).catch(() => {
      if (pending.current === value) setSyncError('Tour progress hasn’t synced yet. Retry to save it across devices.');
    });
  }
  useEffect(() => {
    let active = true;
    loadRequest.current ??= sync.load();
    loadRequest.current.then(({progress, eligible}) => {
      if (!active) return;
      const local = readProductTour(localStorage, key);
      const saved = progress || local;
      setIndex(saved.index || 0);
      let newUser = eligible;
      try {
        newUser ||= isNewProductTourUser(JSON.parse(sessionStorage.getItem('kostaraa.signup') || localStorage.getItem('kostaraa.pendingOnboarding') || 'null'), JSON.parse(sessionStorage.getItem('kostaraa.user') || '{}'), readGuideProgress(localStorage, currentGuideKey()), initial.current.savedProductCount);
      } catch { /* Server eligibility is sufficient on a fresh browser. */ }
      setOpen(!initial.current.editingItem && !['completed','dismissed'].includes(saved.status) && (saved.status === 'active' || newUser));
      setLoaded(true);
    }).catch(() => {
      if (!active) return;
      setSyncError('We couldn’t load your saved tour progress. Retry to check it across devices.');
      setLoaded(true);
    });
    return () => {active = false;};
  }, [sync, key, loadAttempt]);

  const [position, setPosition] = useState(null);
  const [blocked, setBlocked] = useState(true);
  const panel = useRef(null);
  const heading = useRef(null);
  const launcher = useRef(null);
  const step = productTourSteps[index];

  useEffect(() => {
    if (open && loaded && !blocked && !paused) persist({index, status:'active'});
  }, [open, loaded, blocked, paused, index]);

  useEffect(() => {
    const check = () => setBlocked(Boolean(root.current?.closest('[inert]')));
    check();
    const observer = new window.MutationObserver(check);
    observer.observe(document.body, {subtree:true, attributes:true, attributeFilter:['inert']});
    return () => observer.disconnect();
  }, [root]);

  useLayoutEffect(() => {
    if (!open || blocked || paused) return undefined;
    const target = root.current?.querySelector(`[data-product-tour="${step.target}"]`);
    if (!target) return undefined;
    target.classList.add('product-tour-highlight');
    const previousDescription = target.getAttribute('aria-describedby');
    target.setAttribute('aria-describedby', `${previousDescription || ''} product-tour-copy`.trim());
    target.scrollIntoView({block:'center', inline:'nearest', behavior:'instant'});
    const place = () => {
      const rect = target.getBoundingClientRect();
      const width = Math.min(360, window.innerWidth - 24);
      const height = panel.current?.offsetHeight || 280;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const above = rect.bottom + height + 20 > window.innerHeight && rect.top > height + 20;
      const top = Math.max(12, Math.min(above ? rect.top - height - 12 : rect.bottom + 12, window.innerHeight - height - 12));
      const attached = above ? top + height <= rect.top : top >= rect.bottom;
      setPosition({left, top, width, '--tour-arrow-left':`${Math.max(20, Math.min(rect.left + rect.width / 2 - left, width - 28))}px`, '--tour-arrow-top':above ? 'calc(100% - 6px)' : '-7px', '--tour-arrow-rotation':above ? '225deg' : '45deg', '--tour-arrow-display':attached ? 'block' : 'none'});
    };
    place();
    heading.current?.focus({preventScroll:true});
    const observer = new window.ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    observer.observe(target);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      target.classList.remove('product-tour-highlight');
      if (previousDescription === null) target.removeAttribute('aria-describedby');
      else target.setAttribute('aria-describedby', previousDescription);
      observer.disconnect();
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, blocked, paused, index, key, root, step]);

  function close(status = 'dismissed') {
    persist({index, status});
    setOpen(false);
    launcher.current?.focus({preventScroll:true});
  }
  useEffect(() => {
    if (!open || blocked || paused) return undefined;
    const escape = event => {if (event.key === 'Escape') close();};
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open, blocked, paused, index, key]);

  return <>
    <button ref={launcher} className="product-tour-launch" type="button" disabled={!loaded} onClick={() => {setIndex(0);setPosition(null);setOpen(true);}}>Tour Guide</button>
    {syncError && <span className="product-tour-sync-error" role="status">{syncError} <button type="button" onClick={() => {
      if (pending.current) persist(pending.current);
      else {loadRequest.current = null;setLoaded(false);setSyncError('');setLoadAttempt(value => value + 1);}
    }}>Retry</button></span>}
    {open && !blocked && !paused && createPortal(<aside ref={panel} className="product-tour-tooltip" style={position || {visibility:'hidden'}} role="dialog" aria-labelledby="product-tour-title" aria-describedby="product-tour-copy">
      <button type="button" className="product-tour-close" onClick={() => close()} aria-label="Close product tour"><X size={18}/></button>
      <div className="product-tour-body"><span className="product-tour-progress">Step {index + 1} of {productTourSteps.length}</span>
      <h2 id="product-tour-title" ref={heading} tabIndex={-1}>{step.title}</h2>
      <p id="product-tour-copy">{step.copy}</p>
      <div className="product-tour-actions">
        <button type="button" onClick={() => close()}>Skip tour</button>
        {index > 0 && <button type="button" onClick={() => {setPosition(null);setIndex(index - 1);}}>Back</button>}
        <button type="button" className="primary" onClick={() => {if (index === productTourSteps.length - 1) close('completed'); else {setPosition(null);setIndex(index + 1);}}}>{index === productTourSteps.length - 1 ? 'Finish tour' : 'Next'}</button>
      </div></div>
    </aside>, document.body)}
  </>;
}
