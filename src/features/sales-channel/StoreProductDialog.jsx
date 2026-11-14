import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import ProductDisplayFields from './ProductDisplayFields';
import {available} from './inventory-data';

export default function StoreProductDialog({stockReset,modal,products,saving,imageLoading,error,onImageLoading,onChange,onClose,onSave}){
 const [tab,setTab]=useState(modal.type==='add'?'details':'stock');
 const [direction,setDirection]=useState('none');const [quantity,setQuantity]=useState('');
 const dialog=useRef(null);const close=useRef(null);
 const selected=products.find(product=>product.id===modal.id);
 const busy=saving||imageLoading;
 useEffect(()=>{dialog.current?.showModal();close.current?.focus()},[]);
 useEffect(()=>{setDirection('none');setQuantity('')},[stockReset,modal.id]);
 const title=modal.type==='add'?'Add Store Product':'Manage Store Product';
 if(!selected)return null;
 return <dialog ref={dialog} className="sales-dialog" aria-labelledby="sales-dialog-title" aria-describedby="sales-dialog-description" onCancel={event=>{event.preventDefault();if(!busy)onClose()}} onClick={event=>{if(!busy&&event.target===event.currentTarget)onClose()}}>
  <header className="sales-dialog-header"><div><h2 id="sales-dialog-title">{title}</h2><p id="sales-dialog-description">{selected.name}</p></div><button ref={close} className="sales-dialog-close" type="button" disabled={busy} aria-label="Close dialog" onClick={onClose}><X aria-hidden="true"/></button></header>
  <div className="sales-product-tabs" role="tablist" aria-label="Product settings">{[['stock','Stock'],['details','Website details']].map(([value,label])=><button key={value} id={`sales-product-tab-${value}`} role="tab" type="button" aria-selected={tab===value} aria-controls={`sales-product-panel-${value}`} tabIndex={tab===value?0:-1} disabled={busy} onClick={()=>setTab(value)} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'stock':event.key==='End'?'details':value==='stock'?'details':'stock';setTab(next);document.getElementById(`sales-product-tab-${next}`)?.focus()}}}>{label}</button>)}</div>
  <form onInvalidCapture={event=>{const section=event.target.closest('[data-section]');if(section)setTab(section.dataset.section)}} id="sales-product-form" key={`${modal.type}-${selected.id}`} className="sales-dialog-body" onSubmit={onSave}>
   {error&&<p className="sales-dialog-error" role="alert">{error}</p>}
   {modal.type==='add'?<label>Product from KostAraa<select disabled={busy} name="product" value={selected.id} onChange={event=>onChange({...modal,id:event.target.value})}>{products.filter(product=>product.sourceStatus!=='archived').map(product=><option key={product.id} value={product.id}>{product.name}</option>)}</select></label>:<input type="hidden" name="product" value={selected.id}/>}
   <fieldset disabled={saving}>
    <section id="sales-product-panel-stock" role="tabpanel" aria-labelledby="sales-product-tab-stock" data-section="stock" hidden={tab!=='stock'} className="sales-product-panel">
     {selected.hasStoreProduct?<>
      <div className="sales-stock-balance">{[['On hand',selected.onHand],['Reserved',selected.reserved],['Available to sell',available(selected)]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <div className="sales-dialog-grid"><label>Stock adjustment<select name="direction" value={direction} onChange={event=>{setDirection(event.target.value);setQuantity('')}}><option value="none">No stock change</option><option value="add">Add stock</option><option value="remove">Remove stock</option></select></label>
      {direction!=='none'&&<label>Quantity to {direction}<input name="quantity" type="number" min="1" max={direction==='remove'?available(selected):1000000} step="1" value={quantity} onChange={event=>setQuantity(event.target.value)} required/></label>}
      </div>
      {direction!=='none'&&<p className="sales-stock-preview" role="status">After saving: <b>{selected.onHand+(direction==='add'?1:-1)*(Number(quantity)||0)}</b> on hand · <b>{available(selected)+(direction==='add'?1:-1)*(Number(quantity)||0)}</b> available to sell</p>}
     </>:<label>Initial stock quantity<input name="stock" type="number" min="0" max="1000000" step="1" defaultValue={selected.onHand} required/><small>Number of finished units ready for your store.</small></label>}
     <div className="sales-stock-alert"><label>Low-stock alert threshold<input name="lowStock" type="number" min="0" max="1000000" step="1" defaultValue={selected.lowStock} required/><small>Flags low stock at or below this level. This does not change available stock.</small></label></div>
    </section>
    <section id="sales-product-panel-details" role="tabpanel" aria-labelledby="sales-product-tab-details" data-section="details" hidden={tab!=='details'} className="sales-product-panel">
    <div className="sales-dialog-grid"><label>Store SKU<input name="sku" defaultValue={selected.sku} maxLength={100} required/></label><label>Variant<input name="variant" defaultValue={selected.variant} maxLength={180} required/></label></div>
    <ProductDisplayFields product={selected} onLoading={onImageLoading}/>
    <section className="sales-dialog-section"><h3>Price & visibility</h3><div className="sales-dialog-grid">
     <label>Store price (₱)<input readOnly value={selected.price??''} placeholder="Set Target Price in Product Library"/><small>From Product Library Target Price.</small></label>
     <label>Storefront status<select name="status" defaultValue={selected.status}><option>Draft</option><option disabled={selected.price===null}>Active</option><option>Hidden</option><option>Out of Stock</option></select></label>
    </div></section>

    </section>
   </fieldset>
  </form>
  <footer className="sales-dialog-footer"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" form="sales-product-form" className="button primary" disabled={busy||selected.targetPrice===null}>{saving?'Saving…':'Save Changes'}</button></footer>
 </dialog>;
}
