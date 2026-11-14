import {useCallback,useEffect,useRef,useState} from "react";
import InventoryPage from "./InventoryPage";
import {mergeStoreProducts} from "./inventory-data";
import StoreProductDialog from "./StoreProductDialog";
import {loadProducts,saveProduct,saveManagedProduct} from "./store-api";
import "./sales-inventory.css";

export default function SalesInventory(){
  const [products,setProducts]=useState([]);
  const [storeAvailable,setStoreAvailable]=useState(false);
  const [storeWarning,setStoreWarning]=useState("");
  const [saving,setSaving]=useState(false);
  const [imageLoading,setImageLoading]=useState(false);
  const [stockReset,setStockReset]=useState(0);
  const savingRef=useRef(false);
  const [modal,setModal]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const modalRef=useRef(null);
  modalRef.current=modal;
  const refresh=useCallback(async()=>{setLoading(true);setError("");try{const result=await loadProducts();setProducts(result.products);setStoreAvailable(result.storeAvailable);setStoreWarning(result.storeWarning)}catch(failure){setStoreAvailable(false);setError(failure.message||"Unable to refresh products. Please try again.")}finally{setLoading(false)}},[]);
  useEffect(()=>{void refresh();const focus=()=>{if(!modalRef.current&&!savingRef.current)void refresh()};window.addEventListener('focus',focus);const timer=window.setInterval(focus,30000);return()=>{window.removeEventListener('focus',focus);window.clearInterval(timer)}},[refresh]);
  async function save(event){
    event.preventDefault();if(savingRef.current||imageLoading||!storeAvailable)return;
    const data=new FormData(event.currentTarget);const product=products.find(item=>item.id===String(data.get("product")));if(!product)return;
    savingRef.current=true;setSaving(true);setError("");
    try{
      const direction=String(data.get('direction')||'none');
      const rows=await saveManagedProduct(product,{sku:String(data.get('sku')).trim(),variant:String(data.get('variant')).trim(),description:String(data.get('description')||'').trim(),category:String(data.get('category')||'Other').trim(),displayImage:String(data.get('displayImage')||''),lowStock:Number(data.get('lowStock')),visibility:({Active:'active',Draft:'draft',Hidden:'hidden','Out of Stock':'out_of_stock'})[String(data.get('status'))],...(!product.hasStoreProduct?{stock:Number(data.get('stock'))}:direction!=='none'?{stockAdjustment:{quantity:Number(data.get('quantity')),direction}}:{})});
      setProducts(current=>mergeStoreProducts(current,rows));setModal(null);setNotice('Saved to your store. Refresh the storefront to see the latest details and stock.');
    }catch(failure){if(failure.stockUnconfirmed){if(failure.savedRows)setProducts(current=>mergeStoreProducts(current,failure.savedRows));setStockReset(value=>value+1)}setError(failure.message||'Unable to save. Please try again.')}finally{savingRef.current=false;setSaving(false)}
  }
  async function hideSelected(selected){
    if(savingRef.current||!storeAvailable)return;
    savingRef.current=true;setSaving(true);setError("");let saved=0;
    try{
      for(const product of selected){
        const rows=await saveProduct(product,{sku:product.sku,variant:product.variant,description:product.description||'',category:product.category,displayImage:product.displayImage||'',lowStock:product.lowStock,visibility:'hidden'});
        setProducts(current=>mergeStoreProducts(current,rows));saved++;
      }
      setNotice(`${saved} listing${saved===1?'':'s'} hidden from your website.`);
    }catch(failure){setError(`${saved} of ${selected.length} listings hidden. ${failure.message||'Please try again.'}`)}finally{savingRef.current=false;setSaving(false)}
  }
  const open=(type,product)=>{setError("");setImageLoading(false);setModal({type,id:product.id})};
  return <div className="sales-inventory">{notice&&<p role="status" className="preview-note">{notice}</p>}
    <InventoryPage storeAvailable={storeAvailable} saving={saving} storeWarning={storeWarning} products={products} loading={loading} error={modal?"":error} onRefresh={refresh} onAddProduct={()=>{const product=products.find(product=>product.sourceStatus!=='archived'&&!product.hasStoreProduct)||products.find(product=>product.sourceStatus!=='archived');if(product)open('add',product)}} onEditDisplay={product=>open('edit',product)}  onHideSelected={hideSelected}/>
    {modal&&<StoreProductDialog stockReset={stockReset} modal={modal} products={products} saving={saving} imageLoading={imageLoading} error={error} onImageLoading={setImageLoading} onChange={setModal} onClose={()=>setModal(null)} onSave={save}/>}
  </div>;
}
