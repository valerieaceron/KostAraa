export const money=value=>value==null?"—":new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:2}).format(value);
export const available=product=>Math.max(0,product.onHand-product.reserved);
function record(input){
  return input?.result?.draft||input?.result?.item||input?.result||input?.data?.draft||input?.data?.item||input?.data||input||{};
}

function initials(name){
  return String(name||"Product").split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase();
}

export function normalizeProduct(input){
  const item=record(input);
  const id=item.product_library_item_id||item.id;
  const name=item.draft_name||item.item_name||item.product_name||item.name||"Untitled product";
  const cost=Number(item.total_cost_of_goods??item.total_cost_per_unit??item.cost_per_product)||0;
  const suggestedPrice=Number(item.suggested_selling_price??item.target_selling_price??item.current_selling_price)||0;
  const targetPrice=(item.target_selling_price==null||item.target_selling_price===""?null:Number(item.target_selling_price));
  const sourceStatus=String(item.status||"active").toLowerCase();
  const itemType=String(item.item_type||"product").toLowerCase();
  return{
    id:String(id||crypto.randomUUID()),
    sourceId:id||null,
    name,
    variant:item.variant_name||item.variant||"Standard",
    sku:item.sku||"",
    cost,
    suggestedPrice,
    targetPrice,
    price:targetPrice,
    onHand:0,
    reserved:0,
    lowStock:5,
    status:"Draft",
    sourceStatus,
    itemType,
    category:item.category||"Other",
    image:initials(name),
    published:false,
    costUpdatedAt:item.updated_at||item.library_updated_at||item.created_at||null,
    targetMargin:Number(item.target_profit_margin??item.gross_margin_percentage)||0,
  };
}


export function mergeStoreProducts(library,store){
 const labels={active:"Active",draft:"Draft",hidden:"Hidden",out_of_stock:"Out of Stock"};
 return library.map(product=>{if(product.sourceStatus==='archived')return {...product,status:"Archived",published:false,hasStoreProduct:false};const row=store.find(item=>String(item.product_library_item_id)===String(product.sourceId));
 if(!row)return {...product,published:false};
 return {...product,storeId:row.public_id,description:row.description||"",category:row.category||"Other",price:product.targetPrice,sku:row.sku||"",variant:row.variant_name||"Standard",published:row.visibility==='active'||row.visibility==='out_of_stock',hasStoreProduct:true,status:labels[row.visibility]||"Draft",visibility:row.visibility,displayImage:row.display_image||"",onHand:Number(row.on_hand),reserved:Number(row.reserved),lowStock:Number(row.low_stock)};
 });
}
