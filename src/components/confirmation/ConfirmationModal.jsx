import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {AlertTriangle, Info, X} from 'lucide-react';
import {settleConfirmation, subscribeConfirmations} from './confirmation';
import './confirmation.css';

export default function ConfirmationModal() {
  const [request, setRequest] = useState(null);
  const dialog = useRef(null);
  useEffect(() => subscribeConfirmations(setRequest), []);
  useLayoutEffect(() => {
    if (!request || !dialog.current) return undefined;
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, [request]);
  if (!request) return null;
  const finish = result => settleConfirmation(request.id, result);
  const Icon = request.danger ? AlertTriangle : Info;
  return createPortal(<dialog ref={dialog} className={`kostaraa-confirmation${request.danger ? ' is-danger' : ''}`} role="alertdialog" aria-labelledby="kostaraa-confirmation-title" aria-describedby="kostaraa-confirmation-message" onCancel={event => {event.preventDefault();finish(false);}}>
    <button type="button" className="kostaraa-confirmation-close" aria-label="Close confirmation" onClick={() => finish(false)}><X size={20} aria-hidden="true"/></button>
    <Icon className="kostaraa-confirmation-icon" size={26} aria-hidden="true"/>
    <h2 id="kostaraa-confirmation-title">{request.title}</h2>
    <p id="kostaraa-confirmation-message">{request.message}</p>
    <div className="kostaraa-confirmation-actions">
      {!request.alert && <button type="button" autoFocus onClick={() => finish(false)}>Cancel</button>}
      <button type="button" className="primary" autoFocus={request.alert} onClick={() => finish(true)}>{request.confirmLabel}</button>
    </div>
  </dialog>, document.body);
}
