import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
export default function SalesDialog({title,description,busy,onClose,children,footer}){
 const dialog=useRef(null);const close=useRef(null);
 useEffect(()=>{dialog.current?.showModal();close.current?.focus()},[]);
 return <dialog ref={dialog} className="sales-dialog" aria-labelledby="sales-order-dialog-title" aria-describedby="sales-order-dialog-description" onCancel={event=>{event.preventDefault();if(!busy)onClose()}} onClick={event=>{if(!busy&&event.target===event.currentTarget)onClose()}}>
  <header className="sales-dialog-header"><div><h2 id="sales-order-dialog-title">{title}</h2><p id="sales-order-dialog-description">{description}</p></div><button ref={close} type="button" className="sales-dialog-close" disabled={busy} aria-label="Close dialog" onClick={onClose}><X aria-hidden="true"/></button></header>
  <div className="sales-dialog-body">{children}</div><footer className="sales-dialog-footer">{footer}</footer>
 </dialog>;
}
