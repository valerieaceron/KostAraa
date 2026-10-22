import {useEffect,useMemo,useState} from "react";
import BetaSupportModal from "./BetaSupportModal";
import {useUsageAnalytics} from "../useUsageAnalytics";
import BusinessDashboard from "./BusinessDashboard";
import ProductsServices from "../../costing/pages/ProductsServices";
import AdaptiveInventory from "./AdaptiveInventory";
import Calculator from "../../costing/pages/Calculator";
import BusinessProfile from "./BusinessProfile";
import CalculatorProfileCosts from "./CalculatorProfileCosts";
import {withSynchronizedOperationCost} from "../business-profile-costs";
import {blankProduct} from "../../costing/data/demoData";
import {buildSavedItem,calculateProduct,savedItemToProduct,computeInventoryMaterialCost,getInventoryUnitCost,getInventoryCostUnit} from "../../costing/utils/calculations";
import {loadState,saveBusiness,saveInventory,saveProduct,saveSavedItems} from "../../costing/utils/storage";
import {apiJson,getAllApiItems,isOfflineUser,normalizeInventoryItem} from "../../costing/utils/api";
import {normalizeBusinessProfile} from "../../costing/utils/businessProfile";

const defaultLabor={staffCount:0,monthlyCost:0,workingDays:0,outputPerDay:0};
const defaultOverhead={rent:0,utilities:0,miscellaneous:0};
// Keep one canonical information architecture for both desktop and mobile navigation.
const navGroups:Array<{label:string;items:Array<{page:string;label:string;icon:string;section?:string}>}>=[
  {label:"Overview",items:[{page:"dashboard",label:"Dashboard",icon:"▥"}]},
  {label:"Cost Management",items:[{page:"inventory",label:"Inventory",icon:"◇"},{page:"calculator",label:"Calculator",icon:"▦"},{page:"products",label:"Product Library",icon:"▤"}]},
  {label:"Business Settings",items:[{page:"account",section:"identity",label:"Settings",icon:"⚙"}]},
];
const guideSteps=[
  {title:"Business Profile",copy:"Review the details Kostaraa uses for labor, operation-cost, and customer-fit estimates.",page:"account"},
  {title:"Inventory",copy:"Keep track of your raw materials and supplies for accurate product costing.",page:"inventory"},
  {title:"Calculator",copy:"Combine materials, packaging, labor, and operation costs to estimate your product cost.",page:"calculator"},
  {title:"Library",copy:"Keep completed product costings ready for review and editing.",page:"products"},
  {title:"Dashboard",copy:"See which saved products may need your attention next.",page:"dashboard"},
  {title:"Meet Araa",copy:"Ask how to use Kostaraa and review customer-fit guidance from your profile.",page:"araa"},
];

function guideStorageKey(){try{const user=JSON.parse(sessionStorage.getItem("kostaraa.user")||"{}");return `kostaraa.gettingStarted:${user.user_id||user.id||user.username||user.email||"local"}`}catch{return "kostaraa.gettingStarted:local"}}
function workspaceUser(){try{const user=JSON.parse(sessionStorage.getItem("kostaraa.user")||"{}");const fullName=String(user.name||user.fullName||user.username||user.email?.split("@")[0]||"User").trim();return{firstName:fullName.split(/\s+/)[0]||"User"}}catch{return{firstName:"User"}}}
function GettingStartedGuide({onClose,onGo}:{onClose:()=>void;onGo:(page:string)=>void}){
  const key=guideStorageKey();
  const saved=(()=>{try{return JSON.parse(localStorage.getItem(key)||"{}") }catch{return {}}})();
  const[index,setIndex]=useState(saved.finished?0:Math.min(Number(saved.index)||0,guideSteps.length-1));
  const step=guideSteps[index];
  const persist=(nextIndex:number,finished=false)=>localStorage.setItem(key,JSON.stringify({index:nextIndex,completed:finished?guideSteps.length:nextIndex,finished,updatedAt:new Date().toISOString()}));
  const closeAraa=()=>window.dispatchEvent(new CustomEvent("kostaraa:close-araa"));
  const closeGuide=()=>{if(step.page==="araa")closeAraa();onClose()};
  const showStep=(nextIndex:number)=>{const next=guideSteps[nextIndex];if(step.page==="araa"&&next.page!=="araa")closeAraa();setIndex(nextIndex);persist(nextIndex);if(next.page==="araa")window.dispatchEvent(new CustomEvent("kostaraa:open-araa"));else onGo(next.page)};
  useEffect(()=>{if(step.page==="araa")window.dispatchEvent(new CustomEvent("kostaraa:open-araa"));else onGo(step.page)},[]);
  const next=()=>{if(index===guideSteps.length-1){persist(index,true);closeGuide();return}showStep(index+1)};
  const back=()=>{if(index>0)showStep(index-1)};
  return <div className={`getting-started-modal ${step.page==="araa"?"is-araa":""}`} role="dialog" aria-modal="true" aria-labelledby="getting-started-title"><button className="getting-started-scrim" onClick={closeGuide} aria-label="Close guide"/><article><header><strong>Step {index+1} of {guideSteps.length}</strong><button onClick={closeGuide} aria-label="Close">×</button></header><section className="guide-step-card"><h2 id="getting-started-title">{step.title}</h2><p>{step.copy}</p></section><footer><button onClick={back} disabled={index===0}>← Back</button><button className="primary" onClick={next}>{index===guideSteps.length-1?"Finish":"Next →"}</button></footer></article></div>
}

function withBusinessCosts(product:any,business:any){return{...product,labor:{...defaultLabor,...(business.labor||{})},overhead:{...defaultOverhead,...(business.overhead||{})}}}

function apiRecord(data:any){return data?.result?.draft||data?.result?.item||data?.result||data?.data?.draft||data?.data?.item||data?.data||data}
function apiList(data:any){if(Array.isArray(data))return data;return[data?.result,data?.data?.result,data?.data?.items,data?.items,data?.data].find(Array.isArray)||[]}
function calculatorItemType(value:any){const type=String(value||"product").toLowerCase();return type==="service"?"Service":type==="product"?"Product":type.replace(/\b\w/g,(letter:string)=>letter.toUpperCase())}
function calculatorStatus(value:any){return String(value||"").toLowerCase()==="archived"?"Archived":String(value||"").toLowerCase()==="draft"?"Draft":"Active"}
function apiDraftToLibraryItem(input:any){
  const draft=apiRecord(input)||{};
  const components=draft.components||draft.product_library_components||draft.calculator_components||[];
  const materials=components.filter((item:any)=>item.component_type==="material").map((item:any)=>({id:item.id,materialId:item.inventory_item_id||"",name:item.component_name||"",usedQuantity:Number(item.used_quantity)||0,usedUnit:item.used_unit||"pcs",computedCost:Number(item.computed_cost_per_product)||0}));
  const packagingMaterials=components.filter((item:any)=>item.component_type==="packaging").map((item:any)=>({id:item.id,materialId:item.inventory_item_id||"",name:item.component_name||"",usedQuantity:Number(item.used_quantity)||0,usedUnit:item.used_unit||"pcs",computedCost:Number(item.computed_cost_per_product)||0}));
  const cost=Number(draft.total_cost_of_goods??draft.total_cost_per_unit)||0;
  const price=Number(draft.current_selling_price||draft.suggested_selling_price)||0;
  return {id:draft.product_library_item_id||draft.id||crypto.randomUUID(),serverLibraryId:draft.product_library_item_id||draft.id,serverDraftId:draft.calculator_draft_id||draft.draft_id,notes:draft.notes||"",createdAt:draft.created_at,updatedAt:draft.updated_at,productName:draft.draft_name||draft.item_name||"Untitled item",itemType:calculatorItemType(draft.item_type),category:draft.category||"Other",status:calculatorStatus(draft.status),sellingPrice:price,targetProfitMargin:Number(draft.target_profit_margin)||0,monthlyFixedCosts:Number(draft.total_overhead_cost_monthly)||0,expectedMonthlySales:Number(draft.expected_monthly_sales)||0,materials,packagingMaterials,otherVariableCosts:{packaging:Number(draft.packaging_addon_per_unit)||0,platform:Number(draft.platform_cost_per_unit)||0,marketing:Number(draft.marketing_addon_per_unit||draft.marketing_cost_per_unit)||0,other:Number(draft.other_cost_per_unit)||0},laborConfig:{monthlyCost:Number(draft.total_labor_cost_monthly)||0},overheadConfig:{rent:0,utilities:0,miscellaneous:Number(draft.total_overhead_cost_monthly||draft.overhead_cost_per_unit)||0},costPerProduct:cost,finalCost:cost,finalCostInMind:cost,grossProfit:Number(draft.profit_per_unit??draft.gross_profit_per_unit)||0,profitMargin:Number(draft.gross_margin_percentage)||0,markup:Number(draft.markup_percentage)||0,breakEvenUnits:Number(draft.break_even_units)||0,suggestedSellingPrice:Number(draft.suggested_selling_price)||0,pricingStatus:draft.pricing_health||"not_checked",redFlags:Array.isArray(draft.red_flags)?draft.red_flags:[],pricingInputs:{taxPercentage:Number(draft.tax_percentage)||0,taxMode:draft.tax_mode||"exempt",marketingPercentage:Number(draft.marketing_percentage)||0,markupTopup:Number(draft.markup_topup_percentage)||0,targetSellingPrice:Number(draft.target_selling_price)||0}};
}
function calculatorDraftPayload(product:any,results:any,business:any,metadata:any,inventory:any[]=[]){
  const pricing=metadata.pricing||{};
  const component=(item:any,componentType:string,sortOrder:number)=>{
    const material=inventory.find(entry=>String(entry.id)===String(item.materialId));
    const unitCost=material?getInventoryUnitCost(material):0;
    if(!material||!unitCost)throw new Error("Choose a saved Inventory material with a purchase cost before saving.");
    const quantity=computeInventoryMaterialCost(item,inventory)/unitCost;
    if(!quantity)throw new Error(`Check the measurement unit for ${item.name||material.material}.`);
    return {inventory_item_id:material.id,component_type:componentType,component_name:item.name||material.material,used_quantity:quantity,used_unit:getInventoryCostUnit(material),sort_order:sortOrder};
  };
  return {draft_name:product.productName||"Untitled calculation",item_type:String(metadata.itemType||"Product").toLowerCase()==="service"?"service":"product",category:metadata.category||product.productCategory||"Other",current_selling_price:Number(pricing.sellingPrice||product.sellingPrice)||0,expected_monthly_sales:Number(results.monthlyProductionOutput||product.expectedSales)||0,target_selling_price:Number(pricing.targetSellingPrice)||null,target_profit_margin:Number(product.targetMargin)||0,marketing_percentage:Number(pricing.marketingPercentage)||0,markup_topup_percentage:Number(pricing.markup||0),tax_mode:pricing.taxMode||"exempt",tax_percentage:Number(pricing.taxPercentage)||0,packaging_addon_per_unit:Number(product.otherCosts?.packaging)||0,platform_cost_per_unit:Number(product.otherCosts?.platform)||0,marketing_addon_per_unit:Number(product.otherCosts?.marketing)||0,other_cost_per_unit:Number(product.otherCosts?.other)||0,monthly_sales_target:Number(business?.labor?.workingDays&&business?.labor?.outputPerDay?business.labor.workingDays*business.labor.outputPerDay:results.monthlyProductionOutput)||0,total_labor_cost_monthly:Number(business?.labor?.monthlyCost)||0,total_overhead_cost_monthly:Number((business?.overhead?.rent||0)+(business?.overhead?.utilities||0)+(business?.overhead?.miscellaneous||0))||0,use_operation_cost_override:Boolean(product.operationalOverride?.enabled),labor_cost_override_per_unit:Number(product.operationalOverride?.laborCostPerUnit)||0,overhead_cost_override_per_unit:Number(product.operationalOverride?.overheadCostPerUnit)||0,components:[...(product.ingredients||[]).filter((item:any)=>item.materialId||item.name).map((item:any,index:number)=>component(item,"material",index)),...(product.packaging||[]).filter((item:any)=>item.materialId||item.name).map((item:any,index:number)=>component(item,"packaging",index))]};
}


function KostaraaLayout({page,setPage,businessSection,setBusinessSection,onLogout,children,businessProfileId}:{page:string;setPage:(page:string)=>void;businessSection:string;setBusinessSection:(section:string)=>void;onLogout:()=>void;children:any;businessProfileId:any}){
  const[mobileOpen,setMobileOpen]=useState(false);
  const[supportOpen,setSupportOpen]=useState(false);
  const user=workspaceUser();
  const[guideOpen,setGuideOpen]=useState(()=>{const isNewAccountSetup=new URLSearchParams(location.search).get("start")==="product";if(isNewAccountSetup)history.replaceState({},"","/workspace");return isNewAccountSetup});
  const go=(id:string,section?:string)=>{if(id==="account")setBusinessSection(section||"identity");setPage(id);setMobileOpen(false)};
  const openSupport=()=>{window.dispatchEvent(new CustomEvent("kostaraa:feature-opened",{detail:"beta_support"}));setMobileOpen(false);setSupportOpen(true)};
  const Menu=()=> <><button className="kws-brand" onClick={()=>go("dashboard")} aria-label="Go to Dashboard"><img src="/kostaraa-logo.png" alt="Kostaraa"/></button><nav>{navGroups.map(group=><section className="kws-nav-group" key={group.label}><p className="kws-nav-label">{group.label}</p>{group.items.map(item=><button key={`${item.page}-${item.section||"main"}`} className={page===item.page&&(!item.section||businessSection===item.section)?"active":""} onClick={()=>go(item.page,item.section)}><span>{item.label}</span></button>)}</section>)}</nav><div className="kws-bottom-actions"><button className="kws-tour" onClick={()=>{window.dispatchEvent(new CustomEvent("kostaraa:feature-opened",{detail:"getting_started"}));setMobileOpen(false);setGuideOpen(true)}}><i>▶</i><span><b>Getting Started</b><small>Learn or revisit the app guide</small></span></button><button className="kws-support" onClick={openSupport}><i>?</i><span><b>Beta Support</b><small>Report an issue · 0.2.26</small></span></button><button className="kws-logout" onClick={onLogout}>Log out</button></div></>;
  return <div className="kws-shell dotted-canvas"><aside className="kws-sidebar"><Menu/></aside><header className="kws-topbar"><p className="kws-tagline">Cost Better.Price Smarter.</p><div className="kws-welcome"><span>Welcome back,</span><strong>{user.firstName}</strong></div></header><header className="kws-mobile-head"><button onClick={()=>setMobileOpen(true)}>☰</button><button className="kws-mobile-logo" onClick={()=>go("dashboard")} aria-label="Go to Dashboard"><img src="/kostaraa-logo.png" alt="Kostaraa"/></button><button onClick={onLogout}>Log out</button></header>{mobileOpen&&<div className="kws-mobile-menu"><button className="kws-scrim" aria-label="Close menu" onClick={()=>setMobileOpen(false)}/><aside><button className="kws-close" onClick={()=>setMobileOpen(false)}>×</button><Menu/></aside></div>}<main className="kws-content">{children}</main>{guideOpen&&<GettingStartedGuide onClose={()=>setGuideOpen(false)} onGo={go}/>} {supportOpen&&<BetaSupportModal businessProfileId={businessProfileId} page={page} businessSection={businessSection} onClose={()=>setSupportOpen(false)}/>}</div>
}

export function Workspace(){
  const[ready,setReady]=useState(false);
  const initial=useMemo(()=>loadState(),[]);
  const initialBusiness=useMemo(()=>{let profile:any=null;try{profile=JSON.parse(localStorage.getItem("kostaraa.businessProfile")||"null")}catch{}const baseLabor={...defaultLabor,...(initial.business.labor||initial.product.labor||{})};const days=Number(profile?.operations?.operatingDaysPerMonth)||Number(baseLabor.workingDays)||26;const salesTarget=Number(profile?.operations?.monthlySalesUnits||profile?.calculatorCosts?.salesTarget)||0;const manpowerTotal=(profile?.manpower||[]).reduce((sum:number,worker:any)=>sum+(Number(worker.amount)||0)+(Number(worker.benefits)||0)+(Number(worker.contributions)||0),0);const ownerPay=profile?.ownerLabor?.includeOwnTime==="Yes"?(Number(profile.ownerLabor.desiredMonthlyCompensation)||0):0;const laborTotal=Number(profile?.calculatorCosts?.totalLaborMonthly)||(manpowerTotal+ownerPay)||Number(baseLabor.monthlyCost)||0;const overheadTotal=Number(profile?.calculatorCosts?.overheadMonthly||profile?.overhead?.monthlyOverheadPool)||0;return{...initial.business,labor:{...baseLabor,monthlyCost:laborTotal,workingDays:days,outputPerDay:salesTarget?salesTarget/days:baseLabor.outputPerDay},overhead:overheadTotal?{rent:0,utilities:0,miscellaneous:overheadTotal}:{...defaultOverhead,...(initial.business.overhead||initial.product.overhead||{})}}},[initial]);
  const[page,setPage]=useState(new URLSearchParams(location.search).get("page")==="account"?"account":new URLSearchParams(location.search).get("start")==="product"?"calculator":"dashboard");
  const[businessSection,setBusinessSection]=useState("identity");
  const[business,setBusiness]=useState(initialBusiness);
  const[product,setProductState]=useState(withBusinessCosts(initial.product,initialBusiness));
  const[inventory,setInventoryState]=useState(initial.inventory);
  const[savedItems,setSavedItems]=useState(initial.savedItems);
  const[businessProfileId,setBusinessProfileId]=useState<any>(null);
  const[syncError,setSyncError]=useState("");
  const[editingItemId,setEditingItemId]=useState<string|null>(null);
  const[productLibraryFilter,setProductLibraryFilter]=useState("All products");
  const results=useMemo(()=>calculateProduct(product,inventory),[product,inventory]);

  useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem("kostaraa.businessProfile")||"null");if(!stored)return;const synced=withSynchronizedOperationCost(stored);localStorage.setItem("kostaraa.businessProfile",JSON.stringify(synced));const overhead=Number(synced.calculatorCosts?.overheadMonthly)||0;if(overhead){setBusiness((current:any)=>{const next={...current,overhead:{rent:0,utilities:0,miscellaneous:overhead}};localStorage.setItem("bizcost.business",JSON.stringify(next));return next})}}catch{}},[]);
  useEffect(()=>{let cancelled=false;(async()=>{try{const data=await apiJson("/api/business-profile");if(cancelled)return;const profile=withSynchronizedOperationCost(normalizeBusinessProfile(data,{}));setBusinessProfileId(profile.meta?.businessProfileId||null);localStorage.setItem("kostaraa.businessProfile",JSON.stringify(profile));const days=Number(profile.operations?.operatingDaysPerMonth)||26;const salesTarget=Number(profile.operations?.monthlySalesUnits)||0;const manpowerTotal=(profile.manpower||[]).reduce((sum:number,worker:any)=>sum+Number(worker.amount||0)+Number(worker.benefits||0)+Number(worker.contributions||0),0);const ownerPay=profile.ownerLabor?.includeOwnTime==="Yes"?Number(profile.ownerLabor.desiredMonthlyCompensation||0):0;const next={...business,labor:{...defaultLabor,monthlyCost:manpowerTotal+ownerPay,workingDays:days,outputPerDay:salesTarget?salesTarget/days:0},overhead:{rent:0,utilities:0,miscellaneous:Number(profile.overhead?.monthlyOverheadPool)||0}};setBusiness(next);setProductState((current:any)=>withBusinessCosts(current,next))}catch{}})();return()=>{cancelled=true}},[]);
  useEffect(()=>{if(isOfflineUser())return;let cancelled=false;(async()=>{try{const data=await getAllApiItems("/api/inventory/getAll");if(!cancelled)setInventoryState(data.map(normalizeInventoryItem))}catch{if(!cancelled)setSyncError("Unable to load Inventory from the server. Please refresh and try again.")}})();return()=>{cancelled=true}},[]);
  useEffect(()=>{if(isOfflineUser())return;let cancelled=false;(async()=>{try{const data=await getAllApiItems("/api/product-library/items");if(!cancelled){const items=data.map(apiDraftToLibraryItem);setSavedItems(items);saveSavedItems(items)}}catch{if(!cancelled)setSyncError("Unable to load the Product Library from the server. Please refresh and try again.")}})();return()=>{cancelled=true}},[]);

  useEffect(()=>{sessionStorage.getItem("kostaraa.session")==="active"?setReady(true):location.replace("/login")},[]);
  const analytics=useUsageAnalytics(ready,page==="account"?`business_profile.${businessSection}`:page==="products"?"product_library":page);
  const logout=()=>{analytics.end();sessionStorage.removeItem("kostaraa.session");sessionStorage.removeItem("kostaraa.token");sessionStorage.removeItem("kostaraa.user");location.href="/"};
  const setProduct=(next:any)=>{setProductState(next);saveProduct(next)};
  const setInventory=(next:any)=>{setInventoryState(next);if(isOfflineUser())saveInventory(next)};
  const persistItems=(items:any[])=>{setSavedItems(items);saveSavedItems(items)};
  const saveBusinessProfile=(next:any)=>{const synced={...next,labor:{...defaultLabor,...(next.labor||{})},overhead:{...defaultOverhead,...(next.overhead||{})}};const syncedProduct=withBusinessCosts(product,synced);setBusiness(synced);saveBusiness(synced);setProductState(syncedProduct);saveProduct(syncedProduct)};
  const blankCalculation=(source:any=product)=>({...blankProduct,ingredients:blankProduct.ingredients.map((item:any)=>({...item,id:crypto.randomUUID()})),packaging:blankProduct.packaging.map((item:any)=>({...item,id:crypto.randomUUID()})),otherCosts:{...blankProduct.otherCosts},labor:{...defaultLabor,...(business.labor||source.labor||blankProduct.labor)},overhead:{...defaultOverhead,...(business.overhead||source.overhead||blankProduct.overhead)}});
  const saveLibraryItem=async(metadata:any,statusOverride?:string)=>{
    const existing=savedItems.find((item:any)=>item.id===editingItemId);
    let payload=buildSavedItem(product,results,business,{...metadata,status:statusOverride||metadata.status},existing);
    if(!isOfflineUser()){
      const draftPayload=calculatorDraftPayload(product,results,business,metadata,inventory);
      if(existing?.serverLibraryId)draftPayload.product_library_item_id=existing.serverLibraryId;
      const draftResponse=existing?.serverDraftId?await apiJson(`/api/calculator/drafts/${encodeURIComponent(existing.serverDraftId)}`,{method:"PATCH",body:JSON.stringify(draftPayload)}):await apiJson("/api/calculator/drafts",{method:"POST",body:JSON.stringify(draftPayload)});
      const draft=apiRecord(draftResponse);
      const draftId=draft.id||existing?.serverDraftId;
      if(!draftId)throw new Error("The calculator API did not return a draft id.");
      await apiJson(`/api/calculator/drafts/${encodeURIComponent(draftId)}/calculate`,{method:"POST"});
      const response=await apiJson(`/api/calculator/drafts/${encodeURIComponent(draftId)}/save-to-library`,{method:"POST"});
      const record=apiRecord(response);
      const saved=apiDraftToLibraryItem(record.item||record);
      payload={...saved,serverDraftId:draftId,serverLibraryId:record.library_item_id||saved.serverLibraryId};
    }
    setSavedItems((current:any[])=>{const next=existing?current.map(item=>item.id===existing.id?payload:item):[payload,...current];saveSavedItems(next);return next});
    setProduct(blankCalculation());setEditingItemId(null);return payload;
  };
  const editItem=(item:any)=>{setProduct(withBusinessCosts(savedItemToProduct(item,inventory),business));setEditingItemId(item.id);setPage("calculator")};
  const duplicateItem=async(item:any)=>{
    setSyncError("");
    try{
      let copy;
      if(!isOfflineUser()){
        if(!item.serverLibraryId)throw new Error("Save this calculation to the Library before duplicating it.");
        copy=apiDraftToLibraryItem(await apiJson(`/api/product-library/items/${encodeURIComponent(item.serverLibraryId)}/duplicate`,{method:"POST"}));
      }else{
        const source=savedItemToProduct(item,inventory);
        copy=buildSavedItem({...source,productName:`${item.productName} Copy`},calculateProduct(source,inventory),business,{itemType:item.itemType,category:item.category,status:"Draft",notes:item.notes});
      }
      setSavedItems((current:any[])=>{const next=[copy,...current];saveSavedItems(next);return next});return copy;
    }catch(error:any){setSyncError(error.message||"Unable to duplicate the library item.")}
  };
  const archiveItem=async(id:string)=>{
    setSyncError("");const item=savedItems.find((entry:any)=>entry.id===id);
    try{
      if(!isOfflineUser()){
        if(!item?.serverLibraryId)throw new Error("This item has not been saved to the server.");
        await apiJson(`/api/product-library/items/${encodeURIComponent(item.serverLibraryId)}/status`,{method:"PATCH",body:JSON.stringify({status:"archived"})});
      }
      setSavedItems((current:any[])=>{const next=current.map(entry=>entry.id===id?{...entry,status:"Archived",updatedAt:new Date().toISOString()}:entry);saveSavedItems(next);return next});
    }catch(error:any){setSyncError(error.message||"Unable to archive the library item.")}
  };
  const deleteItems=async(ids:string[])=>{
    setSyncError("");const idSet=new Set(ids.map(String));
    const targets=savedItems.filter((entry:any)=>idSet.has(String(entry.id)));
    for(const item of targets){
      try{
        if(!isOfflineUser()){
          if(!item.serverLibraryId)throw new Error("This item has not been saved to the server.");
          await apiJson(`/api/product-library/items/${encodeURIComponent(item.serverLibraryId)}`,{method:"DELETE"});
        }
        setSavedItems((current:any[])=>{const next=current.filter(entry=>entry.id!==item.id);saveSavedItems(next);return next});
        if(editingItemId===item.id)setEditingItemId(null);
      }catch(error:any){setSyncError(error.message||"Unable to delete the library item.");break}
    }
  };
  const deleteItem=(id:string)=>deleteItems([id]);
  const updateItem=(id:string,updates:any)=>persistItems(savedItems.map((item:any)=>item.id===id?{...item,...updates,updatedAt:new Date().toISOString()}:item));
  const resetCalculator=()=>{setProduct(blankCalculation());setEditingItemId(null)};
  const openNeedsAttention=()=>{setProductLibraryFilter("Needs attention");setPage("products")};
  if(!ready)return <div className="ws-loading">Opening Kostaraa…</div>;
  const pages:any={
    dashboard:<BusinessDashboard business={business} savedItems={savedItems} onReviewAttention={openNeedsAttention} setPage={setPage}/>,
    products:<ProductsServices items={savedItems} onViewEdit={editItem} onDuplicate={duplicateItem} onArchive={archiveItem} onDelete={deleteItem} onDeleteItems={deleteItems} onUpdateItem={updateItem} setPage={setPage} pricingStatus={productLibraryFilter} onPricingStatusChange={setProductLibraryFilter}/>,
    inventory:<AdaptiveInventory inventory={inventory} setInventory={setInventory}/>,
    calculator:<CalculatorProfileCosts business={business} onSaveBusiness={saveBusinessProfile}><Calculator product={product} setProduct={setProduct} results={results} inventory={inventory} business={business} onSaveItem={saveLibraryItem} onDuplicateCurrent={()=>duplicateItem(buildSavedItem(product,results,business,{itemType:"Product",category:"Other",status:"Draft"}))} onReset={resetCalculator} editingItem={savedItems.find((item:any)=>item.id===editingItemId)}/></CalculatorProfileCosts>,
    account:<BusinessProfile focusSection={businessSection}/>,
  };
  return <KostaraaLayout page={page} setPage={setPage} businessSection={businessSection} setBusinessSection={setBusinessSection} onLogout={logout} businessProfileId={businessProfileId}>{syncError&&<p className="simple-note" role="alert">{syncError}</p>}{pages[page]}</KostaraaLayout>
}
