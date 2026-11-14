import useSalesChannelAccess,{isSalesChannelPage} from "../../sales-channel/useSalesChannelAccess";
import {useFileTransferAccess} from "../../costing/utils/useFileTransferAccess";
import FileTransferUpgrade from "../../costing/components/FileTransferUpgrade";
import SuccessMessage from "../../costing/components/SuccessMessage";
import {notifySuccess} from "../../costing/utils/success-message";
import {lazy,Suspense,useEffect,useMemo,useState} from "react";
import {Trophy,MessageSquare,Ticket,ClipboardList,ChevronDown,Store,Boxes,LayoutDashboard,Table2,Package,Calculator as CalculatorIcon,LibraryBig,LogOut,PanelLeftClose,PanelLeftOpen,Building2,UserRound,type LucideIcon} from "lucide-react";
import BetaSupportModal from "./BetaSupportModal";
import SidebarUpgrade from "./SidebarUpgrade";
import AffiliateExpiryNotice from "./AffiliateExpiryNotice";
import {clearSharedSession} from "../../auth/session-sharing";
import {AccountMenu} from "./AccountMenu";
import {AraaChat} from "../../../components/araa-chat/AraaChat";
import {useUsageAnalytics} from "../useUsageAnalytics";
import CalculatorProfileCosts from "./CalculatorProfileCosts";
import {businessSettingsCosts,withSynchronizedOperationCost} from "../business-profile-costs";
import {blankProduct} from "../../costing/data/demoData";
import {buildSavedItem,calculateProduct,savedItemToProduct,computeInventoryMaterialCost,getInventoryUnitCost,getInventoryCostUnit} from "../../costing/utils/calculations";
import {loadState,saveBusiness,saveInventory,saveProduct,saveSavedItems} from "../../costing/utils/storage";
import {apiJson,getAllApiItems,isOfflineUser,normalizeInventoryItem} from "../../costing/utils/api";
import {loadBusinessProfile} from "../../costing/utils/businessProfile";
import {GettingStartedGuide,ProfileSetupPrompt} from "./GettingStartedGuide";
import {currentGuideKey,guideEntry,readGuideProgress,writeGuideProgress} from "../getting-started";

import {businessSetupSteps,businessSetupKey,readBusinessSetup,profileBusinessSetup,syncBusinessSetupProfile} from "../business-setup";

const SalesBestSellers = lazy(() => import("../../sales-channel/SalesBestSellers"));
const SalesReviews = lazy(() => import("../../sales-channel/SalesReviews"));
const SalesPromotions = lazy(() => import("../../sales-channel/SalesPromotions"));
const SalesOrders = lazy(() => import("../../sales-channel/SalesOrders"));
const SalesInventory = lazy(() => import("../../sales-channel/SalesInventory"));
const Grid = lazy(() => import("../../costing/pages/Grid"));
const Subscription = lazy(() => import("./Subscription"));
const AffiliatesPage = lazy(() => import("./AffiliatesPage"));
const AffiliateApplication = lazy(() => import("./AffiliateApplication"));
const BusinessDashboard = lazy(() => import("./BusinessDashboard"));
const ProductsServices = lazy(() => import("../../costing/pages/ProductsServices"));
const AdaptiveInventory = lazy(() => import("./AdaptiveInventory"));
const Calculator = lazy(() => import("../../costing/pages/Calculator"));
const BusinessProfile = lazy(() => import("./BusinessProfile"));

const defaultLabor={staffCount:0,monthlyCost:0,workingDays:0,outputPerDay:0};
const defaultOverhead={rent:0,utilities:0,miscellaneous:0};
// Keep one canonical information architecture for both desktop and mobile navigation.
const navGroups:Array<{label:string;items:Array<{page:string;label:string;icon:LucideIcon;section?:string}>}>=[
  {label:"Overview",items:[{page:"dashboard",label:"Dashboard",icon:LayoutDashboard}]},
  {label:"Cost Management",items:[{page:"inventory",label:"Inventory",icon:Package},{page:"calculator",label:"Add New Product",icon:CalculatorIcon},{page:"products",label:"Product Library",icon:LibraryBig},{page:"grid",label:"Grid",icon:Table2}]},
  {label:"Sales Channel",items:[{page:"sales-inventory",label:"Products & Inventory",icon:Boxes},{page:"sales-orders",label:"Orders",icon:ClipboardList},{page:"sales-promotions",label:"Promotions",icon:Ticket},{page:"sales-reviews",label:"Product Reviews",icon:MessageSquare},{page:"sales-best-sellers",label:"Leaderboards",icon:Trophy}]},
  {label:"Settings",items:[{page:"account",section:"identity",label:"Business",icon:Building2},{page:"subscription",label:"Account",icon:UserRound}]},
];
function workspaceUser(){try{const user=JSON.parse(sessionStorage.getItem("kostaraa.user")||"{}");const fullName=String(user.name||user.fullName||user.username||user.email?.split("@")[0]||"User").trim();return{firstName:String(user.firstName||"").trim()||fullName.split(/\s+/)[0]||"User"}}catch{return{firstName:"User"}}}
function withBusinessCosts(product:any,business:any){return{...product,operationalOverride:{enabled:false,laborCostPerUnit:0,overheadCostPerUnit:0},labor:{...defaultLabor,...(business.labor||{})},overhead:{...defaultOverhead,...(business.overhead||{})}}}

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
  return {materialCostPerUnit:Number(draft.material_cost_per_unit)||0,packagingCostPerUnit:Number(draft.packaging_cost_per_unit)||0,laborCostPerUnit:Number(draft.labor_cost_per_unit)||0,operationCostPerUnit:Number(draft.operation_cost_per_unit??draft.overhead_cost_per_unit)||0,id:draft.product_library_item_id||draft.id||crypto.randomUUID(),serverLibraryId:draft.product_library_item_id||draft.id,serverDraftId:draft.calculator_draft_id||draft.draft_id,notes:draft.notes||"",createdAt:draft.created_at||draft.library_created_at||draft.saved_at,updatedAt:draft.updated_at||draft.library_updated_at||draft.created_at||draft.saved_at,productName:draft.draft_name||draft.item_name||"Untitled item",itemType:calculatorItemType(draft.item_type),category:draft.category||"Other",status:calculatorStatus(draft.status),sellingPrice:price,targetProfitMargin:Number(draft.target_profit_margin)||0,monthlyFixedCosts:Number(draft.total_overhead_cost_monthly)||0,expectedMonthlySales:Number(draft.expected_monthly_sales)||0,materials,packagingMaterials,otherVariableCosts:{packaging:Number(draft.packaging_addon_per_unit)||0,platform:Number(draft.platform_cost_per_unit)||0,marketing:Number(draft.marketing_addon_per_unit||draft.marketing_cost_per_unit)||0,other:Number(draft.other_cost_per_unit)||0},laborConfig:{monthlyCost:Number(draft.total_labor_cost_monthly)||0},overheadConfig:{rent:0,utilities:0,miscellaneous:Number(draft.total_overhead_cost_monthly||draft.overhead_cost_per_unit)||0},costPerProduct:cost,finalCost:cost,finalCostInMind:cost,grossProfit:Number(draft.profit_per_unit??draft.gross_profit_per_unit)||0,profitMargin:Number(draft.gross_margin_percentage)||0,markup:Number(draft.markup_percentage)||0,breakEvenUnits:Number(draft.break_even_units)||0,suggestedSellingPrice:Number(draft.suggested_selling_price)||0,pricingStatus:draft.pricing_health||"not_checked",redFlags:Array.isArray(draft.red_flags)?draft.red_flags:[],pricingInputs:{breakEvenSellingPrice:draft.break_even_selling_price==null?undefined:Number(draft.break_even_selling_price),marketingAmount:draft.marketing_amount_per_unit==null?undefined:Number(draft.marketing_amount_per_unit),taxAmount:Number(draft.tax_amount_per_unit)||0,taxPercentage:Number(draft.tax_percentage)||0,taxMode:draft.tax_mode||"exempt",marketingPercentage:Number(draft.marketing_percentage)||0,markupTopup:Number(draft.markup_topup_percentage)||0,targetSellingPrice:Number(draft.target_selling_price)||0}};
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
  return {draft_name:product.productName||"Untitled calculation",item_type:String(metadata.itemType||"Product").toLowerCase()==="service"?"service":"product",category:metadata.category||product.productCategory||"Other",current_selling_price:Number(pricing.sellingPrice||product.sellingPrice)||0,expected_monthly_sales:Number(results.monthlyProductionOutput||product.expectedSales)||0,target_selling_price:Number(pricing.targetSellingPrice)||null,target_profit_margin:Number(product.targetMargin)||0,marketing_percentage:Number(pricing.marketingPercentage)||0,markup_topup_percentage:Number(pricing.markup||0),tax_mode:pricing.taxMode||"exempt",tax_percentage:Number(pricing.taxPercentage)||0,packaging_addon_per_unit:Number(product.otherCosts?.packaging)||0,platform_cost_per_unit:Number(product.otherCosts?.platform)||0,marketing_addon_per_unit:Number(product.otherCosts?.marketing)||0,other_cost_per_unit:Number(product.otherCosts?.other)||0,monthly_sales_target:Number(business?.labor?.workingDays&&business?.labor?.outputPerDay?business.labor.workingDays*business.labor.outputPerDay:results.monthlyProductionOutput)||0,total_labor_cost_monthly:Number(business?.labor?.monthlyCost)||0,total_overhead_cost_monthly:Number((business?.overhead?.rent||0)+(business?.overhead?.utilities||0)+(business?.overhead?.miscellaneous||0))||0,use_operation_cost_override:false,labor_cost_override_per_unit:Number(product.operationalOverride?.laborCostPerUnit)||0,overhead_cost_override_per_unit:Number(product.operationalOverride?.overheadCostPerUnit)||0,components:[...(product.ingredients||[]).filter((item:any)=>item.materialId||item.name).map((item:any,index:number)=>component(item,"material",index)),...(product.packaging||[]).filter((item:any)=>item.materialId||item.name).map((item:any,index:number)=>component(item,"packaging",index))]};
}


function KostaraaLayout({salesAccess,page,setPage,businessSection,setBusinessSection,onLogout,children,businessProfileId,onEditProfile,guideContext}:{salesAccess:string;page:string;setPage:(page:string)=>void;businessSection:string;setBusinessSection:(section:string)=>void;onLogout:()=>void;children:any;businessProfileId:any;onEditProfile:(field?:string)=>void;guideContext:any}){
  const[completedSetup,setCompletedSetup]=useState<string[]>(()=>readBusinessSetup(localStorage,businessSetupKey()));
  useEffect(()=>{const update=()=>setCompletedSetup(readBusinessSetup(localStorage,businessSetupKey()));const progress=(event:Event)=>setCompletedSetup((event as CustomEvent).detail);const profileChanged=(event:Event)=>{const completed=profileBusinessSetup((event as CustomEvent).detail);setCompletedSetup(completed);try{localStorage.setItem(businessSetupKey(),JSON.stringify(completed))}catch{}};window.addEventListener("kostaraa:business-settings-changed",profileChanged);window.addEventListener("kostaraa:business-setup-progress",progress);window.addEventListener("storage",update);return()=>{window.removeEventListener("kostaraa:business-settings-changed",profileChanged);window.removeEventListener("kostaraa:business-setup-progress",progress);window.removeEventListener("storage",update)}},[]);
  const remainingSetup=businessSetupSteps.length-completedSetup.length;
  const[salesCollapsed,setSalesCollapsed]=useState(()=>{try{return localStorage.getItem("kostaraa.sales-channel-collapsed")==="1"}catch{return false}});
  const toggleSales=()=>setSalesCollapsed(current=>{try{localStorage.setItem("kostaraa.sales-channel-collapsed",current?"0":"1")}catch{}return !current});
  const[costCollapsed,setCostCollapsed]=useState(()=>{try{return localStorage.getItem("kostaraa.cost-management-collapsed")==="1"}catch{return false}});
  const toggleCost=()=>setCostCollapsed(current=>{try{localStorage.setItem("kostaraa.cost-management-collapsed",current?"0":"1")}catch{}return !current});
  const[mobileOpen,setMobileOpen]=useState(false);
  const[sidebarCollapsed,setSidebarCollapsed]=useState(()=>{try{return localStorage.getItem("kostaraa.sidebar-collapsed")==="1"}catch{return false}});
  const[gridSidebarExpanded,setGridSidebarExpanded]=useState(false);
  const[supportOpen,setSupportOpen]=useState(false);
  const user=workspaceUser();
  const[guideStart]=useState(()=>guideEntry(location.search,readGuideProgress(localStorage,currentGuideKey())));
  const[guideOpen,setGuideOpen]=useState(guideStart.open);
  const[firstRun,setFirstRun]=useState(guideStart.open);
  const[profilePrompt,setProfilePrompt]=useState(guideStart.prompt);
  useEffect(()=>{if(!guideStart.requested)return;const url=new URL(location.href);url.searchParams.delete("start");history.replaceState(history.state,"",`${url.pathname}${url.search}${url.hash}`)},[guideStart]);
  const go=(id:string,section?:string,field?:string)=>{if(id==="account"){setBusinessSection(section||"identity");if(field)onEditProfile(field)}setPage(id);setMobileOpen(false)};
  const exitGuide=(completed=false)=>{setGuideOpen(false);if(completed||firstRun){if(!completed)writeGuideProgress(localStorage,currentGuideKey(),{skipped:true,started:false,profilePrompt:true});setProfilePrompt(true);go("account")}else writeGuideProgress(localStorage,currentGuideKey(),{started:false})};
  const dismissProfilePrompt=()=>{setProfilePrompt(false);writeGuideProgress(localStorage,currentGuideKey(),{profilePrompt:false})};
  const editProfile=()=>{dismissProfilePrompt();go("account");onEditProfile()};
  const sidebarIsCollapsed=page==="grid"?!gridSidebarExpanded:sidebarCollapsed;
  const toggleSidebar=()=>{if(page==="grid"){setGridSidebarExpanded(current=>!current);return}setSidebarCollapsed(current=>{const next=!current;try{localStorage.setItem("kostaraa.sidebar-collapsed",next?"1":"0")}catch{}return next})};
  useEffect(()=>{setGridSidebarExpanded(false)},[page]);
  const openSupport=()=>{window.dispatchEvent(new CustomEvent("kostaraa:feature-opened",{detail:"beta_support"}));setMobileOpen(false);setSupportOpen(true)};
  const Menu=()=> <><button className="kws-brand" onClick={()=>go("dashboard")} aria-label="Go to Dashboard"><img className="kws-brand-full" src="/kostaraa-logo.webp" alt="Kostaraa"/><img className="kws-brand-icon" src="/brand/kostaraa-blue-icon.png" alt=""/></button><nav>{navGroups.map(group=>{
    const isSales=group.label==="Sales Channel";
    if(isSales&&salesAccess!=="allowed")return null;
    const isCost=group.label==="Cost Management";
    const collapsible=isSales||isCost;
    const collapsed=isSales?salesCollapsed:isCost?costCollapsed:false;
    const GroupIcon=isSales?Store:CalculatorIcon;
    return <section className="kws-nav-group" key={group.label} aria-label={group.label}>
      {collapsible?<button type="button" className="kws-nav-group-toggle" title={`${collapsed?"Expand":"Collapse"} ${group.label}`} aria-expanded={!collapsed} onClick={isSales?toggleSales:toggleCost}><GroupIcon aria-hidden="true"/><span>{group.label}</span><ChevronDown className="kws-nav-group-chevron" aria-hidden="true" style={{transform:collapsed?"rotate(-90deg)":undefined}}/></button>:<p className="kws-nav-label">{group.label}</p>}
      {!collapsed&&group.items.map(item=>{
        const active=page===item.page&&(!item.section||businessSection===item.section);
        return <button title={item.label} key={`${item.page}-${item.section||"main"}`} className={`${collapsible?"kws-nav-child ":""}${active?"active":""}`} aria-current={active?"page":undefined} onClick={()=>go(item.page,item.section)}><item.icon aria-hidden="true" strokeWidth={1.75}/><div className="kws-module-label"><span>{item.label}</span>{item.page==="account"&&remainingSetup>0&&<b className="kws-setup-badge" aria-label={`${remainingSetup} unfinished setup steps`}>{remainingSetup}</b>}</div></button>;
      })}
    </section>;
  })}</nav><div className="kws-bottom-actions"><SidebarUpgrade/><AffiliateExpiryNotice/><button title="Getting Started" className="kws-tour" onClick={()=>{window.dispatchEvent(new CustomEvent("kostaraa:feature-opened",{detail:"getting_started"}));setMobileOpen(false);setFirstRun(false);setGuideOpen(true)}}><i>▶</i><span><b>Getting Started</b><small>Learn or revisit the app guide</small></span></button><button title="Support" className="kws-support" onClick={openSupport}><i>?</i><span><b>Support</b><small>Report an issue · 0.2.26</small></span></button><button title="Log out" className="kws-logout" onClick={onLogout}><LogOut aria-hidden="true"/><span>Log out</span></button></div></>;
  return <div className={`kws-shell dotted-canvas${sidebarIsCollapsed?" sidebar-collapsed":""}${page==="grid"?" grid-workspace":""}`}><aside className="kws-sidebar"><button className="kws-sidebar-toggle" type="button" onClick={toggleSidebar} aria-label={sidebarIsCollapsed?"Expand sidebar":"Collapse sidebar"} title={sidebarIsCollapsed?"Expand sidebar":"Collapse sidebar"}>{sidebarIsCollapsed?<PanelLeftOpen aria-hidden="true"/>:<PanelLeftClose aria-hidden="true"/>}</button><Menu/></aside><header className="kws-topbar"><p className="kws-tagline">Cost Better.Price Smarter.</p><AccountMenu firstName={user.firstName} onSettings={()=>go("subscription")} onLogout={onLogout}/></header><header className="kws-mobile-head"><button onClick={()=>setMobileOpen(true)}>☰</button><button className="kws-mobile-logo" onClick={()=>go("dashboard")} aria-label="Go to Dashboard"><img src="/kostaraa-logo.webp" alt="Kostaraa"/></button><button onClick={onLogout}>Log out</button></header>{mobileOpen&&<div className="kws-mobile-menu"><button className="kws-scrim" aria-label="Close menu" onClick={()=>setMobileOpen(false)}/><aside><button className="kws-close" onClick={()=>setMobileOpen(false)}>×</button><Menu/></aside></div>}<main className="kws-content">{profilePrompt&&!guideOpen&&<ProfileSetupPrompt onEdit={editProfile} onDismiss={dismissProfilePrompt}/>}<div inert={guideOpen?true:undefined}>{children}</div></main>{guideOpen&&<GettingStartedGuide onClose={()=>exitGuide()} onComplete={()=>exitGuide(true)} onGo={go}/>} {supportOpen&&<BetaSupportModal businessProfileId={businessProfileId} page={page} businessSection={businessSection} onClose={()=>setSupportOpen(false)}/>}<AraaChat workspace context={guideContext} onNavigate={go}/></div>
}

export function Workspace(){
  const {access:salesAccess,retry:retrySalesAccess}=useSalesChannelAccess();
  const[ready,setReady]=useState(false);
  const initial=useMemo(()=>loadState(),[]);
  const initialBusiness=useMemo(()=>{let profile:any=null;try{profile=JSON.parse(localStorage.getItem("kostaraa.businessProfile")||"null")}catch{}return {...initial.business,...businessSettingsCosts(profile)}},[initial]);
  const[upgradeNotice,setUpgradeNotice]=useState("");
  useEffect(()=>{const show=(event:any)=>setUpgradeNotice(event.detail);window.addEventListener("kostaraa:upgrade-needed",show);return()=>window.removeEventListener("kostaraa:upgrade-needed",show)},[]);
  const[page,setPage]=useState(new URLSearchParams(location.search).get("page")==="sales-best-sellers"?"sales-best-sellers":new URLSearchParams(location.search).get("page")==="sales-reviews"?"sales-reviews":new URLSearchParams(location.search).get("page")==="sales-promotions"?"sales-promotions":new URLSearchParams(location.search).get("page")==="sales-orders"?"sales-orders":new URLSearchParams(location.search).get("page")==="sales-inventory"?"sales-inventory":new URLSearchParams(location.search).get("page")==="wallet"?"wallet":new URLSearchParams(location.search).get("page")==="affiliate-records"?"affiliate-records":new URLSearchParams(location.search).get("page")==="affiliate-apply"?"affiliate-apply":new URLSearchParams(location.search).get("page")==="subscription"?"subscription":new URLSearchParams(location.search).get("page")==="account"?"account":new URLSearchParams(location.search).get("start")==="product"?"calculator":"dashboard");
  const[businessSection,setBusinessSection]=useState("identity");
  const[profileEditRequest,setProfileEditRequest]=useState(0);
  const[profileFocusField,setProfileFocusField]=useState("");
  const[returnToCalculator,setReturnToCalculator]=useState(false);
  const[business,setBusiness]=useState(initialBusiness);
  const[product,setProductState]=useState(withBusinessCosts(initial.product,initialBusiness));
  const[inventory,setInventoryState]=useState(initial.inventory);
  const[savedItems,setSavedItems]=useState(initial.savedItems);
  const[businessProfileId,setBusinessProfileId]=useState<any>(null);
  const[syncError,setSyncError]=useState("");
  const[profileMissing,setProfileMissing]=useState(false);
  const[editingItemId,setEditingItemId]=useState<string|null>(null);
  const[productLibraryFilter,setProductLibraryFilter]=useState("All products");
  const canTransferFiles=useFileTransferAccess();
  const results=useMemo(()=>calculateProduct(product,inventory),[product,inventory]);

  const applyBusinessSettings=(profile:any)=>{
    setProfileMissing(!profile.meta?.businessProfileId);
    setBusinessProfileId(profile.meta?.businessProfileId||null);
    const next={...initial.business,...businessSettingsCosts(profile)};
    setBusiness(next);saveBusiness(next);
    setProductState((current:any)=>{const updated=withBusinessCosts(current,next);saveProduct(updated);return updated});
  };
  useEffect(()=>{
    const update=(event:any)=>applyBusinessSettings(event.detail);
    window.addEventListener("kostaraa:business-settings-changed",update);
    return()=>window.removeEventListener("kostaraa:business-settings-changed",update);
  },[]);
  useEffect(()=>{let cancelled=false;(async()=>{try{const data=await loadBusinessProfile();if(cancelled)return;const profile=withSynchronizedOperationCost(await syncBusinessSetupProfile(data,readBusinessSetup(localStorage,businessSetupKey())));if(cancelled)return;window.dispatchEvent(new CustomEvent("kostaraa:business-settings-changed",{detail:profile}));setBusinessProfileId(profile.meta?.businessProfileId||null);localStorage.setItem("kostaraa.businessProfile",JSON.stringify(profile));applyBusinessSettings(profile)}catch(error:any){if(!cancelled)setSyncError(error?.message||"Unable to load setup progress. Please refresh and try again.")}})();return()=>{cancelled=true}},[]);
  useEffect(()=>{if(isOfflineUser())return;let cancelled=false;(async()=>{try{const data=await getAllApiItems("/api/inventory/getAll");if(!cancelled)setInventoryState(data.map(normalizeInventoryItem))}catch{if(!cancelled)setSyncError("Unable to load Inventory from the server. Please refresh and try again.")}})();return()=>{cancelled=true}},[]);
  useEffect(()=>{if(isOfflineUser())return;let cancelled=false;(async()=>{try{const data=await getAllApiItems("/api/product-library/items");if(!cancelled){const items=data.map(apiDraftToLibraryItem);setSavedItems(items);saveSavedItems(items)}}catch{if(!cancelled)setSyncError("Unable to load the Product Library from the server. Please refresh and try again.")}})();return()=>{cancelled=true}},[]);

  useEffect(()=>{if(sessionStorage.getItem("kostaraa.session")==="active")setReady(true);else{if(new URLSearchParams(location.search).get("page")==="subscription")sessionStorage.setItem("kostaraa.planIntent",new URLSearchParams(location.search).get("plan")||"annual");location.replace("/login")}},[]);
  const analytics=useUsageAnalytics(ready,page==="account"?`business_profile.${businessSection}`:page==="products"?"product_library":page);
  const logout=()=>{analytics.end();clearSharedSession();location.href="/"};
  const setProduct=(next:any)=>{setProductState(next);saveProduct(next)};
  const setInventory=(next:any)=>{setInventoryState(next);if(isOfflineUser())saveInventory(next)};
  const persistItems=(items:any[])=>{setSavedItems(items);saveSavedItems(items)};

  const blankCalculation=(source:any=product)=>({...blankProduct,ingredients:blankProduct.ingredients.map((item:any)=>({...item,id:crypto.randomUUID()})),packaging:blankProduct.packaging.map((item:any)=>({...item,id:crypto.randomUUID()})),otherCosts:{...blankProduct.otherCosts},labor:{...defaultLabor,...(business.labor||source.labor||blankProduct.labor)},overhead:{...defaultOverhead,...(business.overhead||source.overhead||blankProduct.overhead)}});
  const saveLibraryItem=async(metadata:any,statusOverride?:string,gridProduct?:any)=>{
    const sourceProduct=gridProduct?withBusinessCosts(gridProduct,business):product;
    const sourceResults=gridProduct?calculateProduct(sourceProduct,inventory):results;
    const existing=gridProduct?savedItems.find((item:any)=>item.id===metadata.existingItemId):savedItems.find((item:any)=>item.id===editingItemId);
    let payload=buildSavedItem(sourceProduct,sourceResults,business,{...metadata,status:statusOverride||metadata.status},existing);
    if(!isOfflineUser()){
      const draftPayload=calculatorDraftPayload(sourceProduct,sourceResults,business,metadata,inventory);
      if(existing?.serverLibraryId)draftPayload.product_library_item_id=existing.serverLibraryId;
      const draftResponse=existing?.serverDraftId?await apiJson(`/api/calculator/drafts/${encodeURIComponent(existing.serverDraftId)}`,{method:"PATCH",body:JSON.stringify(draftPayload)}):await apiJson("/api/calculator/drafts",{method:"POST",body:JSON.stringify(draftPayload)});
      const draft=apiRecord(draftResponse);
      const draftId=draft.id||existing?.serverDraftId;
      if(!draftId)throw new Error("The calculator API did not return a draft id.");
      await apiJson(`/api/calculator/drafts/${encodeURIComponent(draftId)}/calculate`,{method:"POST"});
      const response=await apiJson(`/api/calculator/drafts/${encodeURIComponent(draftId)}/save-to-library`,{method:"POST",body:JSON.stringify({notes:metadata.notes??existing?.notes??""})});
      const record=apiRecord(response);
      const saved=apiDraftToLibraryItem(record.item||record);
      const savedAt=new Date().toISOString();
      payload={...payload,...saved,createdAt:saved.createdAt||payload.createdAt||savedAt,updatedAt:saved.updatedAt||savedAt,serverDraftId:draftId,serverLibraryId:record.library_item_id||saved.serverLibraryId};
    }
    setSavedItems((current:any[])=>{const next=existing?current.map(item=>item.id===existing.id?payload:item):[payload,...current];saveSavedItems(next);return next});
    if(!gridProduct){setProduct(blankCalculation());setEditingItemId(null)}
    if(gridProduct)notifySuccess(existing?"Library item updated":"Saved to Product Library",`${payload.productName||"Your item"} was saved successfully.`);
    return payload;
  };
  const editItem=(item:any)=>{setProduct(withBusinessCosts(savedItemToProduct(item,inventory),business));setEditingItemId(item.id);setPage("calculator")};
  const duplicateItem=async(item:any)=>{
    setSyncError("");
    try{
      let copy;
      if(!isOfflineUser()){
        if(!item.serverLibraryId)throw new Error("Save this calculation to the Library before duplicating it.");
        const duplicated=apiDraftToLibraryItem(await apiJson(`/api/product-library/items/${encodeURIComponent(item.serverLibraryId)}/duplicate`,{method:"POST"}));
        const duplicatedAt=new Date().toISOString();
        copy={...duplicated,createdAt:duplicated.createdAt||duplicatedAt,updatedAt:duplicated.updatedAt||duplicatedAt};
      }else{
        const source=savedItemToProduct(item,inventory);
        copy=buildSavedItem({...source,productName:`${item.productName} Copy`},calculateProduct(source,inventory),business,{itemType:item.itemType,category:item.category,status:"Draft",notes:item.notes});
      }
      setSavedItems((current:any[])=>{const next=[copy,...current];saveSavedItems(next);return next});notifySuccess("Product duplicated",`${copy.productName||"Your item"} was added to Product Library.`);return copy;
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
      notifySuccess("Product archived",`${item?.productName||"Your item"} was archived successfully.`);
    }catch(error:any){setSyncError(error.message||"Unable to archive the library item.")}
  };
  const deleteItems=async(ids:string[])=>{
    setSyncError("");const idSet=new Set(ids.map(String));
    const targets=savedItems.filter((entry:any)=>idSet.has(String(entry.id)));
    let deleted=0;
    for(const item of targets){
      try{
        if(!isOfflineUser()){
          if(!item.serverLibraryId)throw new Error("This item has not been saved to the server.");
          await apiJson(`/api/product-library/items/${encodeURIComponent(item.serverLibraryId)}`,{method:"DELETE"});
        }
        setSavedItems((current:any[])=>{const next=current.filter(entry=>entry.id!==item.id);saveSavedItems(next);return next});
        if(editingItemId===item.id)setEditingItemId(null);
        deleted++;
      }catch(error:any){setSyncError(error.message||"Unable to delete the library item.");break}
    }
    if(deleted===targets.length&&deleted)notifySuccess("Products deleted",`${deleted} library item${deleted===1?"":"s"} deleted successfully.`);
    return targets.slice(0,deleted).map((item:any)=>String(item.id));
  };
  const deleteItem=(id:string)=>deleteItems([id]);
  const updateItem=(id:string,updates:any)=>{persistItems(savedItems.map((item:any)=>item.id===id?{...item,...updates,updatedAt:new Date().toISOString()}:item));notifySuccess("Library item updated","Your changes were saved.")};
  const resetCalculator=()=>{setProduct(blankCalculation());setEditingItemId(null)};
  const navigatePage=(nextPage:string)=>{setReturnToCalculator(false);setPage(nextPage)};
  const guideContext={page,inventoryCount:inventory.length,savedProductCount:savedItems.filter((item:any)=>item.status!=="Archived").length,productionReady:Boolean((Number(business.labor?.workingDays)||0)*(Number(business.labor?.outputPerDay)||0))};
  if(!ready)return <div className="ws-loading">Opening Kostaraa…</div>;
  const pages:any={
    "sales-inventory":<SalesInventory/>,
    "sales-orders":<SalesOrders canTransferFiles={canTransferFiles}/>,
    "sales-promotions":<SalesPromotions/>,
    "sales-reviews":<SalesReviews/>,
    "sales-best-sellers":<SalesBestSellers/>,
    grid:<Grid canTransferFiles={canTransferFiles} onInventoryChange={setInventory} inventory={inventory} business={business} libraryItems={savedItems} onSave={(draft:any,metadata:any)=>saveLibraryItem(metadata,undefined,draft)} onDeleteItems={deleteItems} onViewEdit={editItem} onDuplicate={duplicateItem} onArchive={archiveItem}/>,
    dashboard:<BusinessDashboard profileMissing={profileMissing} onSetupProfile={()=>{setBusinessSection("identity");setProfileEditRequest(value=>value+1);navigatePage("account")}} business={business} savedItems={savedItems} onViewEdit={editItem} onDuplicate={duplicateItem} onArchive={archiveItem} setPage={setPage}/>,
    products:<ProductsServices canTransferFiles={canTransferFiles} items={savedItems} onViewEdit={editItem} onDuplicate={duplicateItem} onArchive={archiveItem} onDelete={deleteItem} onDeleteItems={deleteItems} onUpdateItem={updateItem} setPage={setPage} pricingStatus={productLibraryFilter} onPricingStatusChange={setProductLibraryFilter}/>,
    inventory:<AdaptiveInventory canTransferFiles={canTransferFiles} inventory={inventory} setInventory={setInventory}/>,
    calculator:<CalculatorProfileCosts business={business} onOpenSettings={()=>{setReturnToCalculator(true);setBusinessSection("overhead");setProfileFocusField("");setProfileEditRequest(value=>value+1);setPage("account")}}><Calculator savedProductCount={savedItems.length} product={product} setProduct={setProduct} results={results} inventory={inventory} business={business} onSaveItem={saveLibraryItem} onDuplicateCurrent={()=>duplicateItem(buildSavedItem(product,results,business,{itemType:"Product",category:"Other",status:"Draft"}))} onReset={resetCalculator} editingItem={savedItems.find((item:any)=>item.id===editingItemId)}/></CalculatorProfileCosts>,
    wallet:<AffiliatesPage key="wallet" mode="wallet" onNavigate={navigatePage}/>,
    "affiliate-records":<AffiliatesPage key="affiliate-records" mode="records" onNavigate={navigatePage}/>,
    "affiliate-apply":<AffiliateApplication onBack={()=>navigatePage("subscription")}/>,
    subscription:<Subscription onNavigate={navigatePage}/>,
    account:<div className="business-settings-page"><BusinessProfile focusSection={businessSection} focusField={profileFocusField} editRequest={profileEditRequest} onEditRequestHandled={()=>setProfileEditRequest(0)} returnToCalculator={returnToCalculator} onReturnToCalculator={()=>{setReturnToCalculator(false);setProfileFocusField("");setProfileEditRequest(0);setPage("calculator")}}/></div>,
  };
  return <KostaraaLayout salesAccess={salesAccess} page={page} setPage={navigatePage} businessSection={businessSection} setBusinessSection={setBusinessSection} onLogout={logout} businessProfileId={businessProfileId} onEditProfile={(field?:string)=>{setProfileFocusField(field||"");setProfileEditRequest(value=>value+1)}} guideContext={guideContext}><SuccessMessage/><FileTransferUpgrade/>{upgradeNotice&&<p className="simple-note" role="status">{upgradeNotice} <button onClick={()=>{navigatePage("subscription");setUpgradeNotice("")}}>View Annual plan</button> <button aria-label="Dismiss upgrade notice" onClick={()=>setUpgradeNotice("")}>Dismiss</button></p>}{syncError&&<p className="simple-note" role="alert">{syncError}</p>}<Suspense fallback={<div className="ws-loading" role="status">Opening module…</div>}>{isSalesChannelPage(page)&&salesAccess!=="allowed"?<section className="ws-card"><h1>{salesAccess==="loading"?"Checking access…":salesAccess==="denied"?"Sales Channel unavailable":"Unable to verify access"}</h1><p role={salesAccess==="error"?"alert":"status"}>{salesAccess==="loading"?"Verifying your account access.":salesAccess==="denied"?"Sales Channel is not enabled for this account.":"Please retry. Sales Channel access requires the updated API."}</p>{salesAccess==="error"&&<button type="button" onClick={retrySalesAccess}>Retry</button>}<button type="button" onClick={()=>navigatePage("dashboard")}>Go to Dashboard</button></section>:pages[page]}</Suspense></KostaraaLayout>
}
