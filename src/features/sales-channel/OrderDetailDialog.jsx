import {useEffect,useRef,useState} from 'react';
import {Button} from '../costing/components/ui';
import {money} from './inventory-data';
import SalesDialog from './SalesDialog';
import OrderStatusSelect from './OrderStatusSelect';
import {confirmAction} from '../../components/confirmation/confirmation';
import {StatusBadge} from './Ui';
import {confirmOrderDelivery,fetchReceipt,markOrderInTransit,orderDetails,saveOrderTracking,updateOrderStatus,verifyPayment} from './order-api';
import {canVerifyReceipts,manilaToday,orderActions} from './order-view';

export default function OrderDetailDialog({order,onClose,onUpdate}){
 const [detail,setDetail]=useState(null);const [images,setImages]=useState({});const [loading,setLoading]=useState(true);const [loadError,setLoadError]=useState('');const [error,setError]=useState('');const [retry,setRetry]=useState(0);const [busy,setBusy]=useState(false);const busyRef=useRef(false);
 const [tracking,setTracking]=useState(order.trackingNumber||'');const [estimate,setEstimate]=useState(order.estimatedDeliveryDate||'');const [showReceipts,setShowReceipts]=useState(true);
 useEffect(()=>{
  const controller=new window.AbortController();const urls=[];setLoading(true);setLoadError('');setDetail(null);setImages({});
  async function load(){try{
   const result=await orderDetails(order.serverId,controller.signal);if(controller.signal.aborted)return;setDetail(result);
   await Promise.all(result.receipts.map(async receipt=>{if(!receipt.id)return;try{
    const blob=await fetchReceipt(receipt.id,controller.signal);if(controller.signal.aborted)return;
    if(!blob.type.startsWith('image/')||!blob.size)throw new Error('Receipt image unavailable.');
    const url=URL.createObjectURL(blob);urls.push(url);setImages(current=>({...current,[receipt.id]:url}));
   }catch{if(!controller.signal.aborted)setImages(current=>({...current,[receipt.id]:null}))}}));
  }catch(failure){if(!controller.signal.aborted)setLoadError(failure.message)}finally{if(!controller.signal.aborted)setLoading(false)}}
  void load();return()=>{controller.abort();urls.forEach(url=>URL.revokeObjectURL(url))};
 },[order.serverId,retry]);
 const actions=orderActions(order);const canVerify=canVerifyReceipts(order,detail,images,loading);
 const missingReceipts=!loading&&detail?.receipts.some(receipt=>!receipt.id||!images[receipt.id]);
 const totalsMatch=detail?.receipts.length>0&&detail.receipts.reduce((sum,receipt)=>sum+Math.round(receipt.amount*100),0)===Math.round(order.total*100);
 async function act(operation,targetLabel){if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');try{const confirmed=await confirmAction(targetLabel?`Change ${order.id} from ${order.orderStatus} to ${targetLabel}?`:`Apply this update to ${order.id}?`,{title:targetLabel?'Change order status?':'Update order?',confirmLabel:'Apply Change'});if(!confirmed)return;const patch=await operation();onUpdate(order.serverId,patch);setRetry(value=>value+1)}catch(failure){setError(failure.message||'Unable to update this order. Please try again.')}finally{busyRef.current=false;setBusy(false)}}
 async function changeStatus(choice){
  if(choice.review){
   const target=choice.value==='review-payment'?'sales-order-payment-review':choice.value==='add-tracking'?'sales-order-tracking':'sales-order-estimate';
   document.getElementById(target)?.scrollIntoView({behavior:'smooth',block:'center'});
   document.getElementById(target)?.focus();
   return;
  }
  await act(()=>choice.value==='confirm-delivery'?confirmOrderDelivery(order.serverId,true):updateOrderStatus(order.serverId,choice.value),choice.label);
 }
 const address=detail?.address;
 return <SalesDialog title={order.id} description={[order.customer,order.date,order.channel].filter(Boolean).join(' · ')} busy={busy} onClose={onClose} footer={<><Button variant="ghost" disabled={busy} onClick={onClose}>Close</Button>{actions.verify&&<Button disabled={busy||!canVerify||Boolean(loadError)} onClick={()=>{if(canVerify)void act(()=>verifyPayment(order.serverId),'Order Received')}}>{busy?'Saving…':'Verify Payment'}</Button>}</>}>
  <div className="sales-order-overview"><div><span>Order total</span><strong>{money(order.total)}</strong></div><div><span>Order status</span><OrderStatusSelect order={order} disabled={busy||loading||Boolean(loadError)} onChange={changeStatus}/></div><div><span>Payment</span><StatusBadge>{order.paymentStatus}</StatusBadge></div></div>
  {error&&<p className="sales-dialog-error" role="alert">{error}</p>}
  {loadError&&<div className="sales-dialog-error" role="alert">{loadError} <Button variant="ghost" disabled={busy||loading} onClick={()=>setRetry(value=>value+1)}>Reload Details</Button></div>}
  {loading&&<p role="status">Loading order details and receipts…</p>}
  <section className="sales-dialog-section"><h3>Customer & fulfillment</h3><dl className="sales-order-facts"><div><dt>Customer</dt><dd>{order.customer}</dd></div><div><dt>Email</dt><dd>{order.email||'—'}</dd></div><div><dt>Method</dt><dd>{order.delivery}</dd></div><div><dt>Fulfillment status</dt><dd>{order.fulfillmentStatus||'—'}</dd></div></dl>{detail&&order.delivery!=='Pickup'&&<p className="sales-order-note">{address?[address.address_line_1,address.address_line_2,address.city_municipality,address.province,address.postal_code].filter(Boolean).join(', ')||'Delivery address unavailable':'Delivery address unavailable'}</p>}

  </section>
  {order.delivery!=='Pickup'&&<section className="sales-dialog-section"><h3>J&amp;T delivery</h3>
   {order.trackingNumber&&<dl className="sales-order-facts"><div><dt>Tracking number</dt><dd>{order.trackingNumber}</dd></div><div><dt>Courier</dt><dd>{order.carrierName||'J&T Express'}</dd></div>{order.estimatedDeliveryDate&&<div><dt>Estimated delivery</dt><dd>{order.estimatedDeliveryDate}</dd></div>}</dl>}
   {actions.tracking&&<form className="sales-order-action-form" onSubmit={event=>{event.preventDefault();void act(()=>saveOrderTracking(order.serverId,tracking.trim().toUpperCase()),'Waiting for Courier')}}><label>J&amp;T tracking number<input id="sales-order-tracking" value={tracking} onChange={event=>setTracking(event.target.value.toUpperCase())} pattern="[A-Z0-9\-]{6,40}" minLength={6} maxLength={40} required disabled={busy||loading}/></label><Button disabled={busy||loading||Boolean(loadError)||!/^[A-Z0-9-]{6,40}$/.test(tracking.trim())}>Save Tracking</Button></form>}
   {actions.transit&&<form className="sales-order-action-form" onSubmit={event=>{event.preventDefault();void act(()=>markOrderInTransit(order.serverId,estimate),'In Transit')}}><label>Estimated delivery date<input id="sales-order-estimate" type="date" value={estimate} min={manilaToday()} onChange={event=>setEstimate(event.target.value)} required disabled={busy||loading}/></label><Button disabled={busy||loading||Boolean(loadError)||!estimate}>Set In Transit</Button></form>}
   {actions.confirmation&&<div><p className="sales-order-note">{order.confirmationStatus==='not_received'?'Customer reported that the parcel has not arrived.':`Has the customer received this order?${order.autoCompleteAt?' Automatic completion is scheduled for '+new Date(order.autoCompleteAt).toLocaleString('en-PH',{timeZone:'Asia/Manila'})+'.':''}`}</p><div className="flex flex-wrap gap-2"><Button disabled={busy||loading||Boolean(loadError)} onClick={()=>void act(()=>confirmOrderDelivery(order.serverId,true),'Completed')}>Yes, Mark Completed</Button><Button variant="ghost" disabled={busy||loading||Boolean(loadError)||order.confirmationStatus==='not_received'} onClick={()=>void act(()=>confirmOrderDelivery(order.serverId,false))}>Not Yet Received</Button></div></div>}
   {!order.trackingNumber&&!actions.tracking&&<p className="sales-order-note">{order.paymentStatus!=='Paid'?'Verify payment before adding delivery tracking.':'No tracking number recorded.'}</p>}
  </section>}
  {detail&&<section className="sales-dialog-section"><h3>Order breakdown</h3><ul className="sales-order-lines">{detail.items.map(item=><li key={item.id}><div><span>{item.name}</span>{item.variant&&<small>{item.variant}</small>}<small>{Number(item.quantity)} × {money(Number(item.unit_price))}</small></div><span>{money(Number(item.line_total))}</span></li>)}</ul>{!detail.items.length&&<p className="sales-order-note">No line items were recorded.</p>}<dl className="sales-order-totals">{[['Subtotal',detail.order.subtotal_amount],['Delivery fee',detail.order.delivery_amount],...(Number(detail.order.discount_amount)>0?[['Discount',-Number(detail.order.discount_amount)]]:[]),...(Number(detail.order.fee_amount)>0?[['Other fees',detail.order.fee_amount]]:[]),['Order total',order.total],...(Number(detail.order.refund_amount)>0?[['Refunded',detail.order.refund_amount]]:[])].map(([name,value])=><div key={name}><dt>{name}</dt><dd>{money(Number(value)||0)}</dd></div>)}</dl></section>}
  <section id="sales-order-payment-review" tabIndex={-1} className="sales-dialog-section"><h3>Payment submission</h3>{order.payment?<dl className="sales-order-facts"><div><dt>Amount submitted</dt><dd>{money(order.payment.amount)}</dd></div><div><dt>Transaction references</dt><dd>{order.payment.reference||'—'}</dd></div><div><dt>Submitted</dt><dd>{order.payment.submitted||'—'}</dd></div></dl>:<p className="sales-order-note">No payment submission is available.</p>}
   {detail?.receipts.length>0&&<><Button variant="ghost" disabled={busy} aria-expanded={showReceipts} aria-controls="sales-order-receipts" onClick={()=>setShowReceipts(value=>!value)}>{showReceipts?'Hide Receipts':'Show Receipts'}</Button><div id="sales-order-receipts" hidden={!showReceipts}>{detail.receipts.map((receipt,index)=><figure className="sales-order-receipt" key={receipt.payment_id}><figcaption>Receipt {index+1} · {money(receipt.amount)} · {receipt.reference||'No reference'}</figcaption>{images[receipt.id]?<a href={images[receipt.id]} target="_blank" rel="noopener noreferrer"><img src={images[receipt.id]} alt={`Payment receipt ${receipt.reference||index+1}`} onError={()=>setImages(current=>({...current,[receipt.id]:null}))}/>View full receipt ↗</a>:<p className="sales-order-note">{loading?'Loading receipt…':'Receipt image unavailable.'}</p>}</figure>)}</div></>}
   {!loading&&detail&&!detail.receipts.length&&<p className="sales-order-note">No uploaded receipts were found.</p>}
   {missingReceipts&&<><p className="sales-dialog-error" role="alert">A receipt image is unavailable. Reload it before verifying payment.</p><Button variant="ghost" disabled={busy} onClick={()=>setRetry(value=>value+1)}>Reload Receipts</Button></>}
   {!loading&&detail?.receipts.length>0&&!totalsMatch&&<p className="sales-dialog-error" role="alert">The submitted payments do not match the order total.</p>}
  </section>
 </SalesDialog>;
}
