import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {currentGuideKey, shouldStartNewUserGuide} from '../../workspace/getting-started';
import {inventoryTourSteps, readInventoryTour, writeInventoryTour} from '../../workspace/inventory-tour';
import '../styles/product-tour.css';

export default function InventoryTour({root, hasMeasurementGuide, canTransferFiles = false, paused = false}) {
  const steps = inventoryTourSteps.filter(step => (hasMeasurementGuide || step.target !== 'measurements') && (canTransferFiles || !['download', 'upload'].includes(step.target)));
  const [key] = useState(() => `${currentGuideKey()}.inventory-tour`);
  const [saved] = useState(() => readInventoryTour(localStorage, key, steps.length));
  const [index, setIndex] = useState(saved.index);
  const [open, setOpen] = useState(() => {
    if (['completed', 'dismissed'].includes(saved.status)) return false;
    if (saved.status === 'active') return true;
    try {
      const signup = JSON.parse(sessionStorage.getItem('kostaraa.signup') || localStorage.getItem('kostaraa.pendingOnboarding') || 'null');
      const user = JSON.parse(sessionStorage.getItem('kostaraa.user') || '{}');
      return shouldStartNewUserGuide(signup, user, {});
    } catch { return false; }
  });
  const [position, setPosition] = useState(null);
  const [blocked, setBlocked] = useState(true);
  const panel = useRef(null);
  const heading = useRef(null);
  const launcher = useRef(null);
  const currentIndex = Math.min(index, steps.length - 1);
  const step = steps[currentIndex];

  useEffect(() => {
    if (open && !blocked && !paused) writeInventoryTour(localStorage, key, index, 'active');
  }, [open, blocked, paused, index, key]);

  useEffect(() => {
    const check = () => setBlocked(Boolean(root.current?.closest('[inert]')));
    check();
    const observer = new window.MutationObserver(check);
    observer.observe(document.body, {subtree:true, attributes:true, attributeFilter:['inert']});
    return () => observer.disconnect();
  }, [root]);

  useLayoutEffect(() => {
    if (!open || blocked || paused) return undefined;
    const target = root.current?.querySelector(`[data-inventory-tour="${step.target}"]`);
    if (!target) return undefined;
    target.classList.add('product-tour-highlight');
    const previousDescription = target.getAttribute('aria-describedby');
    target.setAttribute('aria-describedby', `${previousDescription || ''} inventory-tour-copy`.trim());
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
    writeInventoryTour(localStorage, key, index, status);
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
    <button ref={launcher} className="product-tour-launch" type="button" onClick={() => {setIndex(0);setPosition(null);setOpen(true);}}>Tour Guide</button>
    {open && !blocked && !paused && createPortal(<aside ref={panel} className="product-tour-tooltip" style={position || {visibility:'hidden'}} role="dialog" aria-labelledby="inventory-tour-title" aria-describedby="inventory-tour-copy">
      <button type="button" className="product-tour-close" onClick={() => close()} aria-label="Close inventory tour"><X size={18}/></button>
      <div className="product-tour-body"><span className="product-tour-progress">Step {currentIndex + 1} of {steps.length}</span>
      <h2 id="inventory-tour-title" ref={heading} tabIndex={-1}>{step.title}</h2>
      <p id="inventory-tour-copy">{step.copy}</p>
      <div className="product-tour-actions">
        <button type="button" onClick={() => close()}>Skip tour</button>
        {index > 0 && <button type="button" onClick={() => {setPosition(null);setIndex(currentIndex - 1);}}>Back</button>}
        <button type="button" className="primary" onClick={() => {if (currentIndex === steps.length - 1) close('completed'); else {setPosition(null);setIndex(currentIndex + 1);}}}>{currentIndex === steps.length - 1 ? 'Finish tour' : 'Next'}</button>
      </div></div>
    </aside>, document.body)}
  </>;
}
