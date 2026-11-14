import {useEffect,useId,useRef,useState} from 'react';
import {MoreHorizontal} from 'lucide-react';

export default function LibraryRowActions({label,disabled=false,openUp=false,actions}){
 const [open,setOpen]=useState(false);const container=useRef(null);const trigger=useRef(null);const id=useId();
 useEffect(()=>{
  if(!open)return;
  const outside=event=>{if(!container.current?.contains(event.target))setOpen(false)};
  const escape=event=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus()}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
 },[open]);
 return <div className="library-row-actions" ref={container}><button type="button" className="library-actions-trigger" ref={trigger} aria-label={`More actions for ${label}`} aria-expanded={open&&!disabled} aria-controls={open&&!disabled?id:undefined} disabled={disabled} onClick={()=>setOpen(value=>!value)}><MoreHorizontal aria-hidden="true"/></button>{open&&!disabled&&<div id={id} className={`library-actions-menu${openUp?' open-up':''}`}>{actions.map(({label:actionLabel,icon:Icon,disabled:actionDisabled,onClick})=><button type="button" key={actionLabel} disabled={actionDisabled} onClick={()=>{setOpen(false);onClick()}}>{Icon&&<Icon aria-hidden="true"/>}{actionLabel}</button>)}</div>}</div>;
}
