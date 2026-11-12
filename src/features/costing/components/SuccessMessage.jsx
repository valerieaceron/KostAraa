import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {CheckCircle2, X} from 'lucide-react';
import {successMessageEvent} from '../utils/success-message';
import '../styles/success-message.css';

export default function SuccessMessage() {
  const serial = useRef(0);
  const [notice, setNotice] = useState(null);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const show = event => {setClosing(false);setNotice({...event.detail, id:++serial.current});};
    window.addEventListener(successMessageEvent, show);
    return () => window.removeEventListener(successMessageEvent, show);
  }, []);
  useEffect(() => {
    if (!notice) return undefined;
    const timeout = setTimeout(() => setClosing(true), 2000);
    return () => clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    if (!closing) return undefined;
    const timeout = setTimeout(() => setNotice(null), 300);
    return () => clearTimeout(timeout);
  }, [closing, notice]);
  return notice && createPortal(<div key={notice.id} className={`cost-success-message${closing ? ' is-closing' : ''}`}>
    <CheckCircle2 aria-hidden="true"/>
    <div role="status" aria-live="polite" aria-atomic="true">
      <h2>{notice.title}</h2><p>{notice.message}</p>
      {notice.detail && <small>{notice.detail}</small>}
    </div>
    <button type="button" aria-label="Dismiss success message" onClick={() => setClosing(true)}><X size={18} aria-hidden="true"/></button>
  </div>, document.body);
}
