import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Download,Eye,RefreshCw,Search} from 'lucide-react';
import {Button,Card,Input} from '../costing/components/ui';
import LibraryRowActions from '../costing/components/LibraryRowActions';
import {requestFileTransferUpgrade} from '../costing/utils/file-transfer-access';
import {StatusBadge} from './Ui';
import {money} from './inventory-data';
import {listOrders,updateOrderStatus,confirmOrderDelivery} from './order-api';
import OrderStatusSelect from './OrderStatusSelect';
import {confirmAction} from '../../components/confirmation/confirmation';
import {orderFilters,ordersView} from './order-view';
import OrderDetailDialog from './OrderDetailDialog';
import './sales-inventory.css';
import './sales-orders.css';

export default function SalesOrders({canTransferFiles=false}){
 const [orders,setOrders]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [selectedId,setSelectedId]=useState(null);const selectedIdRef=useRef(null);selectedIdRef.current=selectedId;
 const [statusBusy,setStatusBusy]=useState(false);const statusBusyRef=useRef(false);
 const [query,setQuery]=useState('');const [filter,setFilter]=useState('All orders');const [page,setPage]=useState(1);const [selected,setSelected]=useState(new Set());const selectAll=useRef(null);const request=useRef(null);const [exporting,setExporting]=useState(false);
 const refresh=useCallback(async()=>{
  request.current?.abort();const controller=new window.AbortController();request.current=controller;setLoading(true);setError('');
  try{const rows=await listOrders(controller.signal);if(!controller.signal.aborted)setOrders(rows)}catch(failure){if(!controller.signal.aborted)setError(failure.message||'Unable to load orders. Please try again.')}finally{if(!controller.signal.aborted)setLoading(false)}
 },[]);
 useEffect(()=>{void refresh();const focus=()=>{if(selectedIdRef.current===null&&!statusBusyRef.current)void refresh()};window.addEventListener('focus',focus);const timer=window.setInterval(focus,30000);return()=>{request.current?.abort();window.removeEventListener('focus',focus);window.clearInterval(timer)}},[refresh]);
 const view=useMemo(()=>ordersView(orders,filter,query,page),[orders,filter,query,page]);
 const selectedOrders=view.filtered.filter(order=>selected.has(String(order.serverId)));const allSelected=view.filtered.length>0&&selectedOrders.length===view.filtered.length;
 useEffect(()=>{if(selectAll.current)selectAll.current.indeterminate=selectedOrders.length>0&&!allSelected},[selectedOrders.length,allSelected]);
 function changeView(change){change();setPage(1);setSelected(new Set())}
 function toggle(id){setSelected(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})}
 async function download(){
  if(!canTransferFiles){requestFileTransferUpgrade();return}if(exporting||!selectedOrders.length)return;
  setExporting(true);setError('');try{const XLSX=await import('xlsx');const rows=selectedOrders.map(order=>({Order:order.id,Customer:order.customer,Date:order.date,Total:order.total,'Order status':order.orderStatus,Payment:order.paymentStatus,Fulfillment:order.fulfillmentStatus,'Delivery method':order.delivery,'Tracking number':order.trackingNumber||''}));const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(rows),'Orders');XLSX.writeFile(workbook,'kostaraa-orders.xlsx');setNotice('Selected orders downloaded.')}catch(failure){setError(failure.message||'Unable to download selected orders.')}finally{setExporting(false)}
 }
 async function changeStatus(order,choice){
  if(statusBusyRef.current)return;
  if(choice.review){setSelectedId(String(order.serverId));return}
  statusBusyRef.current=true;setStatusBusy(true);request.current?.abort();setLoading(false);
  try{
   const confirmed=await confirmAction(`Change ${order.id} from ${order.orderStatus} to ${choice.label}?`,{title:'Change order status?',confirmLabel:'Apply Change'});
   if(!confirmed)return;
   setError('');setNotice('');
   const patch=choice.value==='confirm-delivery'?await confirmOrderDelivery(order.serverId,true):await updateOrderStatus(order.serverId,choice.value);
   updateOrder(order.serverId,patch);
  }catch(failure){setError(failure.message||'Unable to update order status.')}finally{statusBusyRef.current=false;setStatusBusy(false)}
 }
 function updateOrder(id,patch){setOrders(current=>current.map(order=>String(order.serverId)===String(id)?{...order,...patch}:order));setNotice('Order updated successfully.')}
 const selectedOrder=orders.find(order=>String(order.serverId)===selectedId);
 return <div className="sales-inventory"><div className="product-library-page sales-orders-list space-y-4">
  <div className="library-page-header flex flex-wrap items-start justify-between gap-3"><div><h1 className="library-page-title mt-1 flex items-center gap-2 text-2xl font-black text-navy">Orders</h1></div><div className="library-page-actions flex flex-wrap gap-2"><Button variant="ghost" onClick={refresh} disabled={loading||statusBusy}><RefreshCw className="h-4 w-4"/>{loading?'Refreshing…':'Refresh Orders'}</Button></div></div>
  {notice&&<p className="preview-note" role="status">{notice}</p>}{error&&<div className="sync-error" role="alert">{error}<Button variant="ghost" disabled={loading||statusBusy} onClick={refresh}>Try Again</Button></div>}
  <section className="inventory-summary" aria-label="Order summary">{[['For payment verification',orders.filter(order=>order.paymentStatus==='Pending Verification').length],['Orders received',orders.filter(order=>order.orderStatus==='Order Received').length],['Open orders',orders.filter(order=>!['Completed','Cancelled','Payment Rejected'].includes(order.orderStatus)).length],['Completed',orders.filter(order=>order.orderStatus==='Completed').length]].map(([name,value])=><article key={name}><span>{name}</span><strong>{loading&&!orders.length?'—':value}</strong></article>)}</section>
  <Card className="library-list-card overflow-visible p-0">
   <div className="library-list-toolbar flex flex-col gap-4 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between"><label className="library-filter-label grid w-full gap-1.5 text-sm font-bold text-slate-700 sm:max-w-[300px]"><span className="library-filter-caption">Show orders</span><select aria-label="Filter orders" className="library-filter-select h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-navy outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={filter} onChange={event=>changeView(()=>setFilter(event.target.value))}>{orderFilters.map(value=><option key={value} value={value}>{value} ({orders.filter(order=>value==='All orders'||order.orderStatus===value).length})</option>)}</select></label><div className="relative w-full lg:max-w-[340px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input className="library-search-input h-11 py-2 pl-9" aria-label="Search order, customer, or tracking number" placeholder="Search orders..." value={query} onChange={event=>changeView(()=>setQuery(event.target.value))}/></div></div>
   <div className="library-list-heading" aria-hidden="true"><span/><span>Order</span><span>Customer</span><span className="library-number-heading">Total</span><span>Order status</span><span>Payment</span><span>Fulfillment</span><span/></div>
   <div className={`library-selection-bar${selectedOrders.length?' has-selection':''}`}><label className="library-select-all"><input ref={selectAll} type="checkbox" checked={allSelected} disabled={!view.filtered.length||loading} aria-label={allSelected?'Deselect all filtered orders':'Select all filtered orders'} onChange={()=>setSelected(allSelected?new Set():new Set(view.filtered.map(order=>String(order.serverId))))}/><b>{selectedOrders.length?`${selectedOrders.length} selected`:'Select all'}</b></label><span/>{selectedOrders.length>0&&<button type="button" className="library-delete-selection" disabled={exporting} onClick={download}><Download/>{exporting?'Downloading…':'Download selected'}</button>}</div>
   <div className={`library-list${selectedOrders.length?' has-selection':''}`} aria-busy={loading}>{view.rows.map((order,index)=>{const id=String(order.serverId);return <article className="library-item-row" key={id}>
    <label className="library-row-selector"><span>{view.start+index}</span><input type="checkbox" checked={selected.has(id)} aria-label={`Select ${order.id}`} onChange={()=>toggle(id)}/></label>
    <button type="button" className="library-product-name sales-order-name" disabled={loading||statusBusy||Boolean(error)} onClick={()=>setSelectedId(id)}><span>{order.id}</span><small className="sales-order-meta">{order.date} · {order.items} items</small></button>
    <div className="library-product-name sales-order-customer"><span>{order.customer}</span><small className="sales-order-meta">{order.channel||order.delivery}</small></div>
    <div className="library-price-metrics"><p className="library-price-value" data-label="Total">{money(order.total)}</p></div>
    <div className="sales-order-status"><OrderStatusSelect order={order} disabled={loading||statusBusy||Boolean(error)} onChange={choice=>changeStatus(order,choice)}/></div><div className="sales-order-payment"><StatusBadge>{order.paymentStatus}</StatusBadge></div><div className="sales-order-fulfillment"><StatusBadge>{order.fulfillmentStatus}</StatusBadge><small className="sales-order-meta">{order.delivery}</small></div>
    <LibraryRowActions label={order.id} disabled={loading||statusBusy||Boolean(error)} openUp={index>=view.rows.length-2} actions={[{label:'View order',icon:Eye,onClick:()=>setSelectedId(id)}]}/>
   </article>})}{!view.rows.length&&<div className="px-6 py-14 text-center"><p className="text-base font-black text-navy">{loading?'Loading orders…':error?'Orders unavailable':orders.length?'No orders found in this view.':'No orders have been submitted yet.'}</p>{!loading&&orders.length>0&&<p className="mt-2 text-sm font-medium text-slate-500">Try another filter or search.</p>}</div>}</div>
   <div className="library-pagination mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>Showing {view.start} to {view.end} of {view.filtered.length} items</p>{view.filtered.length>10&&<div className="flex items-center gap-2"><Button variant="ghost" className="min-h-9 px-3 py-1.5" disabled={view.safePage===1} onClick={()=>setPage(view.safePage-1)}>Previous</Button><span className="text-xs font-black text-slate-500">Page {view.safePage} of {view.totalPages}</span><Button variant="ghost" className="min-h-9 px-3 py-1.5" disabled={view.safePage===view.totalPages} onClick={()=>setPage(view.safePage+1)}>Next</Button></div>}</div>
  </Card>
 </div>{selectedOrder&&<OrderDetailDialog key={selectedId} order={selectedOrder} onClose={()=>{setSelectedId(null);void refresh()}} onUpdate={updateOrder}/>}</div>;
}
