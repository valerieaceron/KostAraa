import {useRef,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {Button} from '../costing/components/ui';
import SalesDialog from './SalesDialog';
import {generatePromoCode,manilaDate,promoTypes,validatePromotion} from './promotions-data';
export default function CreatePromotionDialog({promotions,onClose,onSave}){
 const [code,setCode]=useState(()=>generatePromoCode(promotions));const [type,setType]=useState('delivery');const [discount,setDiscount]=useState('10');const [start,setStart]=useState(manilaDate);const [end,setEnd]=useState('');const [error,setError]=useState('');const [saving,setSaving]=useState(false);const busy=useRef(false);
 async function submit(event){
  event.preventDefault();if(busy.current)return;
  const promotion={name:String(new FormData(event.currentTarget).get('name')||'').trim(),code,type,startsOn:start,endsOn:end,...(type==='percentage'?{discountPercent:Number(discount)}:{})};
  const message=validatePromotion(promotion,promotions);if(message){setError(message);return}
  busy.current=true;setSaving(true);setError('');try{await onSave(promotion)}catch(failure){setError(failure.message||'Could not save this promotion.')}finally{busy.current=false;setSaving(false)}
 }
 return <SalesDialog title="Create Promotion" description="Set the offer, code, and validity dates." busy={saving} onClose={onClose} footer={<><Button variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" form="sales-create-promotion" disabled={saving}>{saving?'Saving…':'Save Promotion'}</Button></>}>
  <form id="sales-create-promotion" onSubmit={submit}><fieldset disabled={saving}>
   <div className="sales-dialog-grid"><label className="sales-field-wide">Promotion name<input name="name" maxLength={80} placeholder="e.g. Weekend free delivery" required/></label><label className="sales-field-wide">Promotion code<div className="sales-promo-code-field"><input value={code} readOnly aria-label="Auto-generated promotion code"/><Button variant="ghost" type="button" onClick={()=>{try{setCode(generatePromoCode([...promotions,{code}]));setError('')}catch(failure){setError(failure.message)}}}><RefreshCw className="h-4 w-4"/>Generate</Button></div></label>
    <label>Promotion type<select value={type} onChange={event=>setType(event.target.value)}>{Object.entries(promoTypes).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    {type==='percentage'&&<label>Discount (%)<input type="number" min="0.01" max="100" step="0.01" value={discount} onChange={event=>setDiscount(event.target.value)} required/></label>}
    <label>Start date<input type="date" value={start} onChange={event=>setStart(event.target.value)} required/></label><label>End date<input type="date" value={end} min={start} onChange={event=>setEnd(event.target.value)} required/></label>
   </div>
   <p className="sales-promo-note">{type==='percentage'?'Discount applies to the product subtotal. Delivery is separate. One promotion per order.':type==='pickup'?'For pickup orders. No delivery fee applies.':'Waives the delivery fee for delivery orders.'}</p><p className="sales-promo-note">Dates are inclusive and use Philippine time.</p>{error&&<p className="sales-dialog-error" role="alert">{error}</p>}
  </fieldset></form>
 </SalesDialog>;
}
