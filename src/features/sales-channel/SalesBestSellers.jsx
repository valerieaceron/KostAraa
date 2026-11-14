import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {RefreshCw,Search,Trophy} from 'lucide-react';
import {Button,Card,Input} from '../costing/components/ui';
import {listBestSellers} from './best-sellers-api';
import {listOrders} from './order-api';
import {customerLeaderboard,leaderboardView} from './best-sellers-data';
import {money} from './inventory-data';
import {StatusBadge} from './Ui';
import './sales-inventory.css';
import './sales-best-sellers.css';
function Pagination({view,onPage}){return <div className="library-pagination mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>Showing {view.start} to {view.end} of {view.filtered.length} items</p>{view.totalPages>1&&<div className="flex items-center gap-2"><Button variant="ghost" className="min-h-9 px-3 py-1.5" disabled={view.safePage===1} onClick={()=>onPage(view.safePage-1)}>Previous</Button><span className="text-xs font-black text-slate-500">Page {view.safePage} of {view.totalPages}</span><Button variant="ghost" className="min-h-9 px-3 py-1.5" disabled={view.safePage===view.totalPages} onClick={()=>onPage(view.safePage+1)}>Next</Button></div>}</div>}
export default function SalesBestSellers(){
 const [products,setProducts]=useState([]);const [customers,setCustomers]=useState([]);const [loading,setLoading]=useState(true);const [productError,setProductError]=useState('');const [customerError,setCustomerError]=useState('');const request=useRef(null);
 const [query,setQuery]=useState('');const [page,setPage]=useState(1);const [customerQuery,setCustomerQuery]=useState('');const [customerType,setCustomerType]=useState('All customers');const [customerPage,setCustomerPage]=useState(1);
 const refresh=useCallback(async()=>{
  request.current?.abort();const controller=new window.AbortController();request.current=controller;setLoading(true);setProductError('');setCustomerError('');
  const [best,orders]=await Promise.allSettled([listBestSellers(controller.signal),listOrders(controller.signal)]);
  if(controller.signal.aborted)return;
  if(best.status==='fulfilled')setProducts(best.value);else setProductError(best.reason.message||'Best sellers could not be loaded.');
  if(orders.status==='fulfilled')setCustomers(customerLeaderboard(orders.value));else setCustomerError(orders.reason.message||'Customer leaderboard could not be loaded.');
  setLoading(false);
 },[]);
 useEffect(()=>{void refresh();const focus=()=>void refresh();window.addEventListener('focus',focus);const timer=window.setInterval(focus,30000);return()=>{request.current?.abort();window.removeEventListener('focus',focus);window.clearInterval(timer)}},[refresh]);
 const productView=useMemo(()=>leaderboardView(products,query,page),[products,query,page]);const customerView=useMemo(()=>leaderboardView(customers.filter(customer=>customerType==='All customers'||customer.type===customerType),customerQuery,customerPage,5),[customers,customerType,customerQuery,customerPage]);
 return <div className="sales-inventory"><div className="product-library-page sales-best-sellers-page space-y-4">
  <div className="library-page-header flex flex-wrap items-start justify-between gap-3"><div><h1 className="library-page-title mt-1 flex items-center gap-2 text-2xl font-black text-navy">Leaderboards</h1></div><div className="library-page-actions flex flex-wrap gap-2"><Button variant="ghost" disabled={loading} onClick={refresh}><RefreshCw className="h-4 w-4"/>{loading?'Refreshing…':'Refresh'}</Button></div></div>
  <div className="sales-leaderboards-grid">
   <Card className="library-list-card overflow-visible p-0 sales-product-leaderboard">
    <header className="sales-leaderboard-heading"><div><h2>Product leaderboard</h2><p>All-time ranking by paid units purchased · Top 50</p></div><Trophy aria-hidden="true"/></header>
    <div className="library-list-toolbar flex flex-col gap-4 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="relative w-full lg:max-w-[340px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input className="library-search-input h-11 py-2 pl-9" aria-label="Search best-selling products" placeholder="Search products..." value={query} onChange={event=>{setQuery(event.target.value);setPage(1)}}/></div></div>
    {productError?<div className="sales-leaderboard-state" role="alert"><p>{productError}</p><Button variant="ghost" disabled={loading} onClick={refresh}>Retry</Button></div>:<>
    <div className="library-list-heading" aria-hidden="true"><span>Rank</span><span>Product</span><span className="library-number-heading">Units</span><span className="library-number-heading">Orders</span><span>Storefront badge</span></div>
    <div className="library-list" aria-busy={loading}>{productView.rows.map(product=><article className="library-item-row" key={product.productId}><span className="library-price-value sales-leaderboard-rank">#{product.rank}</span><div className="library-product-name"><span title={product.name}>{product.name}</span></div><div className="library-price-metrics"><p className="library-price-value" data-label="Units purchased">{product.unitsPurchased.toLocaleString()}</p><p className="library-price-value" data-label="Orders">{product.orderCount.toLocaleString()}</p></div><div className="sales-best-seller-badge">{product.rank<=3?<span className="library-remark"><Trophy aria-hidden="true"/>Best Seller</span>:'—'}</div></article>)}{!productView.rows.length&&<div className="px-6 py-14 text-center"><p className="text-base font-black text-navy">{loading?'Loading best sellers…':products.length?'No matching products.':'Your leaderboard starts with a purchase'}</p>{!loading&&!products.length&&<p className="mt-2 text-sm font-medium text-slate-500">Verified purchases of published products appear here.</p>}</div>}</div>
    <Pagination view={productView} onPage={setPage}/></>}
    <p className="sales-leaderboard-footnote">Paid purchases only. Cancelled, expired, refunded, and returned orders are excluded. The top three receive the existing storefront Best Seller badge.</p>
   </Card>
   <Card className="library-list-card overflow-visible p-0 sales-customer-leaderboard">
    <header className="sales-leaderboard-heading"><div><h2>Customer leaderboard</h2><p>Ranked by paid orders · Matched by email</p></div></header>
    <div className="library-list-toolbar flex flex-col gap-4 border-b border-slate-100 p-4"><label className="library-filter-label grid w-full gap-1.5 text-sm font-bold text-slate-700"><span className="library-filter-caption">Show customers</span><select className="library-filter-select h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-navy outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" aria-label="Filter customer leaderboard" value={customerType} onChange={event=>{setCustomerType(event.target.value);setCustomerPage(1)}}>{['All customers','New','Returning'].map(type=><option key={type} value={type}>{type} ({customers.filter(customer=>type==='All customers'||customer.type===type).length})</option>)}</select></label><div className="relative w-full"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input className="library-search-input h-11 py-2 pl-9" aria-label="Search customers by name or email" placeholder="Search customers..." value={customerQuery} onChange={event=>{setCustomerQuery(event.target.value);setCustomerPage(1)}}/></div></div>
    {customerError?<div className="sales-leaderboard-state" role="alert"><p>{customerError}</p><Button variant="ghost" disabled={loading} onClick={refresh}>Retry</Button></div>:<>
     <ol className="sales-customer-ranking" aria-busy={loading}>{customerView.rows.map(customer=><li key={customer.email}><span className="sales-customer-rank">#{customer.rank}</span><div><div className="sales-customer-name">{customer.name}</div><p className="sales-customer-email" title={customer.email}>{customer.email}</p><StatusBadge>{customer.type}</StatusBadge><dl><div><dt>Paid orders</dt><dd>{customer.orders}</dd></div><div><dt>Order value</dt><dd>{money(customer.total)}</dd></div></dl></div></li>)}</ol>
     {!customerView.rows.length&&<div className="sales-leaderboard-state"><p>{loading?'Loading customers…':customers.length?'No matching customers.':'Customers with paid orders and an email address appear here.'}</p></div>}
     <Pagination view={customerView} onPage={setCustomerPage}/>
    </>}
    <p className="sales-leaderboard-footnote">New: 1 paid order. Returning: 2+ paid orders. Case and surrounding spaces in emails are ignored. Unpaid, cancelled, and returned orders are excluded.</p>
   </Card>
  </div>
 </div></div>;
}
