import {available} from './inventory-data.js';
export const inventoryFilters=['All active products','Needs attention','Missing information','Archived'];
export const isArchived=product=>product.sourceStatus==='archived';
export const missingInformation=product=>product.price==null||!Number.isFinite(product.price)||!product.sku||!product.hasStoreProduct;
export function matchesInventoryFilter(product,filter){
 if(filter==='Archived')return isArchived(product);
 if(isArchived(product))return false;
 if(filter==='Missing information')return missingInformation(product);
 if(filter==='Needs attention')return missingInformation(product)||product.status==='Unavailable'||product.status==='Out of Stock'||(product.onHand!=null&&available(product)<=product.lowStock)||product.price<product.cost;
 return true;
}
export function inventoryView(products,filter,query,page,pageSize=10){
 const text=query.trim().toLowerCase();
 const filtered=products.filter(product=>matchesInventoryFilter(product,filter)&&`${product.name} ${product.sku} ${product.variant}`.toLowerCase().includes(text));
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));const safePage=Math.min(Math.max(1,page),totalPages);
 return {filtered,totalPages,safePage,rows:filtered.slice((safePage-1)*pageSize,safePage*pageSize),start:filtered.length?(safePage-1)*pageSize+1:0,end:Math.min(safePage*pageSize,filtered.length)};
}
