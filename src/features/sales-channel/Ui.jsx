import {X} from "lucide-react";

export function PageHeader({title,description,actions}){
  return <header className="page-header"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="page-actions">{actions}</div>}</header>;
}

export function StatusBadge({children,tone}){
  const resolved=tone||String(children).toLowerCase().replaceAll(" ","-");
  return <span className={`status status-${resolved}`}>{children}</span>;
}

export function EmptyState({icon:Icon,title,description,action}){
  return <div className="empty-state"><Icon aria-hidden="true"/><h2>{title}</h2>{description&&<p>{description}</p>}{action}</div>;
}

export function Modal({title,description,onClose,children,footer}){
  return <div className="modal-layer" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X/></button><h2 id="modal-title">{title}</h2>{description&&<p className="modal-description">{description}</p>}<div className="modal-content">{children}</div>{footer&&<footer className="modal-footer">{footer}</footer>}</section></div>;
}

export function Toast({message,onClose}){
  return message?<div className="toast" role="status"><span>{message}</span><button onClick={onClose} aria-label="Dismiss"><X/></button></div>:null;
}
