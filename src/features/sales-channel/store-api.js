import {apiJson,getAllApiItems,API_BASE_URL,isOfflineUser} from "../costing/utils/api";
import {normalizeProduct,mergeStoreProducts} from "./inventory-data";
const path="/api/sales-channel/products";
async function request(suffix="",options={}){
  if(isOfflineUser())throw new Error("Sign in with an online Kostaraa account to manage your live store.");
  const response=await apiJson(path+suffix,{cache:"no-store",...options});
  if(response.type!=="success"||!Array.isArray(response.data))throw new Error("The store API returned an unexpected response. Refresh and try again.");
  return response.data;
}
export async function loadProducts(){
  if(isOfflineUser())throw new Error("Sign in with an online Kostaraa account to synchronize your store.");
  const [library,store]=await Promise.allSettled([getAllApiItems('/api/product-library/items'),request()]);
  if(library.status==='rejected')throw library.reason;
  const products=library.value.map(normalizeProduct).filter(item=>item.itemType==='product');
  if(store.status==='rejected')return {products:products.map(item=>({...item,onHand:null,reserved:null,status:'Unavailable'})),storeAvailable:false,storeWarning:store.reason.status===409?'Activate an online sales channel for this account before managing store products.':store.reason.status===401?'Your session expired. Please log in again.':store.reason.status===404?'The store-product API is not available on this server yet.':'Store details and stock could not be loaded. '+store.reason.message};
  return {products:mergeStoreProducts(products,store.value),storeAvailable:true,storeWarning:''};
}
export function saveProduct(product,details){
  let displayImage=details.displayImage||'';
  if(displayImage.startsWith(API_BASE_URL+'/storage/'))displayImage=displayImage.slice(API_BASE_URL.length);
  return request('/'+encodeURIComponent(product.sourceId),{method:'PUT',body:JSON.stringify({...details,displayImage,name:product.name,price:product.targetPrice})});
}
export function adjustStock(product,details){return request('/'+encodeURIComponent(product.sourceId)+'/stock',{method:'POST',body:JSON.stringify(details)})}

// Keep the unified popup compatible with deployed APIs that expose stock as a
// separate operation. Never send a field an older details endpoint can ignore.
export async function saveManagedProduct(product,details){
  const {stockAdjustment,...websiteDetails}=details;
  const rows=await saveProduct(product,websiteDetails);
  if(!stockAdjustment)return rows;
  try{
    const adjusted=await adjustStock(product,stockAdjustment);
    const before=rows.find(row=>String(row.product_library_item_id)===String(product.sourceId));
    const after=adjusted.find(row=>String(row.product_library_item_id)===String(product.sourceId));
    if(!after||!Number.isFinite(Number(after.on_hand))||(before&&Number(after.on_hand)===Number(before.on_hand)))throw new Error('The server did not return an updated stock quantity.');
    return adjusted;
  }catch(failure){
    const error=new Error('Website details were saved, but the stock update could not be confirmed. Review the current stock before trying the adjustment again. '+failure.message);
    error.stockUnconfirmed=true;
    try{error.savedRows=await request()}catch{error.savedRows=rows}
    throw error;
  }
}
