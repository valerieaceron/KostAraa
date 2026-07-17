import {useEffect,useMemo,useState} from "react";
import BusinessDashboard from "./BusinessDashboard";
import ProductsServices from "../../src/bizcost/pages/ProductsServices";
import AdaptiveInventory from "./AdaptiveInventory";
import Calculator from "../../src/bizcost/pages/Calculator";
import BusinessProfile from "./BusinessProfile";
import CalculatorProfileCosts from "./CalculatorProfileCosts";
import {withSynchronizedOperationCost} from "./business-profile-costs";
import {blankProduct} from "../../src/bizcost/data/demoData";
import {buildSavedItem,calculateProduct,savedItemToProduct} from "../../src/bizcost/utils/calculations";
import {loadState,saveBusiness,saveInventory,saveProduct,saveSavedItems} from "../../src/bizcost/utils/storage";

const defaultLabor={staffCount:0,monthlyCost:0,workingDays:0,outputPerDay:0};
const defaultOverhead={rent:0,utilities:0,miscellaneous:0};
// Keep one canonical order for both the desktop sidebar and mobile drawer.
const nav=[
  ["dashboard","Dashboard","▥"],
  ["inventory","Inventory","◇"],
  ["calculator","Calculator","▦"],
  ["products","Library","▤"],
  ["recommendations","Business Health Simulator","◉"],
  ["account","Business Profile","▣"],
];
const guideSteps=[
  {title:"Tell us how your business works",copy:"Add what you sell, your monthly sales goal, your team, regular business expenses, customers, and selling channels. Kostaraa uses these answers to estimate a clearer cost for every product.",page:"account",action:"Set up Business Profile",note:"Your monthly sales goal helps divide staff and business expenses into an estimated cost per item. Your customer and selling-channel answers also help Araa give guidance that fits your business."},
  {title:"Build your starting inventory",copy:"Add one material, ingredient, packaging item, or supply you regularly buy. Enter its purchase price, the total quantity inside the package, and the unit shown on its label.",page:"inventory",action:"Add your first material",note:"Kostaraa uses this information to calculate the cost per gram, milliliter, piece, or other base unit. When you use that material in Calculator, Kostaraa can estimate how much one product consumes and costs. You can add more materials anytime; Food and Beverage businesses may also create optional ingredient-specific cup conversions."},
  {title:"Calculate your first product",copy:"Name your product, choose its materials and packaging, then enter how much one product uses. Review the included labor and operation costs before testing your selling price, marketing allowance, markup, and tax.",page:"calculator",action:"Open Calculator",note:"Kostaraa combines your product inputs with the monthly costs saved in your Business Profile. It then shows the estimated true product cost, profit per item, markup, and gross margin so you can review whether the price works."},
  {title:"Save it to your Library",copy:"Save the completed calculation so you can edit, duplicate, archive, or review it later.",page:"products",action:"Open Library",note:"Your Library contains saved product calculations—not raw inventory materials."},
  {title:"Review your Dashboard",copy:"See your business-health summary, monthly target and costs, average saved margin, products needing attention, cost contribution, customer fit, and missing profile information.",page:"dashboard",action:"Open Dashboard",note:"The Dashboard turns saved Business Profile and product-calculation data into clear priorities. Use Araa’s recommended next step or open a flagged product directly in Calculator to review its costs and price."},
  {title:"Meet Araa",copy:"Ask how to use Kostaraa and review the customer-fit guidance generated from your saved Business Profile.",page:"araa",action:"Open Araa",note:"Araa answers only from features currently available in Beta 0.2.26."},
];

function guideStorageKey(){try{const user=JSON.parse(sessionStorage.getItem("kostaraa.user")||"{}");return `kostaraa.gettingStarted:${user.user_id||user.id||user.username||user.email||"local"}`}catch{return "kostaraa.gettingStarted:local"}}
function GettingStartedGuide({onClose,onGo}:{onClose:()=>void;onGo:(page:string)=>void}){
  const key=guideStorageKey();const saved=(()=>{try{return JSON.parse(localStorage.getItem(key)||"{}") }catch{return {}}})();const[index,setIndex]=useState(Math.min(Number(saved.index)||0,guideSteps.length-1));const completed=Number(saved.completed)||0;const step=guideSteps[index];const persist=(nextIndex:number,nextCompleted:number,finished=false)=>localStorage.setItem(key,JSON.stringify({index:nextIndex,completed:nextCompleted,finished,updatedAt:new Date().toISOString()}));
  const act=()=>{const nextCompleted=Math.max(completed,index+1);if(step.page==="araa")window.dispatchEvent(new CustomEvent("kostaraa:open-araa"));else onGo(step.page);if(index===guideSteps.length-1){persist(index,nextCompleted,true);onClose()}else{persist(index+1,nextCompleted);onClose()}};
  const restart=()=>{persist(0,0,false);setIndex(0)};
  return <div className="getting-started-modal" role="dialog" aria-modal="true" aria-labelledby="getting-started-title"><button className="getting-started-scrim" onClick={onClose} aria-label="Close guide"/><article><header><div><small>GETTING STARTED · BETA 0.2.26</small><h2 id="getting-started-title">Learn Kostaraa one task at a time</h2><p>Use your own business information and return to this guide whenever you need it.</p></div><button onClick={onClose} aria-label="Close">×</button></header><div className="guide-progress"><div>{guideSteps.map((item,i)=><button key={item.title} className={`${i===index?"active":""} ${i<completed?"done":""}`} onClick={()=>setIndex(i)} aria-label={`Step ${i+1}: ${item.title}`}><i>{i<completed?"✓":i+1}</i><span>{item.title}</span></button>)}</div><p><span style={{width:`${((index+1)/guideSteps.length)*100}%`}}/></p></div><section className="guide-step-card"><small>STEP {index+1} OF {guideSteps.length}</small><h3>{step.title}</h3><p>{step.copy}</p><aside><b>Why it matters</b><span>{step.note}</span></aside></section><footer><button onClick={()=>setIndex(value=>Math.max(0,value-1))} disabled={index===0}>← Back</button><button className="restart" onClick={restart}>Restart guide</button><span/><button className="primary" onClick={act}>{step.action} →</button></footer></article></div>
}

function withBusinessCosts(product:any,business:any){return{...product,labor:{...defaultLabor,...(business.labor||{})},overhead:{...defaultOverhead,...(business.overhead||{})}}}

function BusinessHealthComingSoon(){return <section className="business-health-soon" aria-live="polite"><div className="health-loader" aria-hidden="true"><span/><span/><span/></div><small>Business Health Simulator</small><h1>Coming soon</h1><p>We’re preparing a clearer way to test how changes in your prices, costs, and sales targets may affect your business.</p><div className="health-progress"><i/></div><span>We’re building this for you.</span></section>}

function BetaSupportModal({onClose}:{onClose:()=>void}){
  const[sent,setSent]=useState(false);
  const submit=(event:any)=>{event.preventDefault();const form=new FormData(event.currentTarget);const report={id:crypto.randomUUID(),version:"0.2.26",type:String(form.get("type")||"Other"),page:String(form.get("page")||location.pathname),message:String(form.get("message")||"").trim(),email:String(form.get("email")||"").trim(),createdAt:new Date().toISOString(),status:"saved-locally"};let reports:any[]=[];try{reports=JSON.parse(localStorage.getItem("kostaraa.betaReports")||"[]")}catch{}localStorage.setItem("kostaraa.betaReports",JSON.stringify([report,...reports]));setSent(true)};
  return <div className="beta-support-modal" role="dialog" aria-modal="true" aria-labelledby="beta-support-title"><button className="beta-support-scrim" onClick={onClose} aria-label="Close beta support"/><article>{sent?<div className="beta-support-success"><span>✓</span><small>BETA 0.2.26 SUPPORT</small><h2 id="beta-support-title">Your report is saved.</h2><p>This preview saved the report on this device. Direct online delivery will be connected during beta development.</p><div><button onClick={onClose}>Close</button><a href="/contact">Contact Us</a></div></div>:<><header><div><small>BETA 0.2.26 SUPPORT</small><h2 id="beta-support-title">Report an issue</h2><p>Tell us what happened so it can guide future Kostaraa improvements.</p></div><button onClick={onClose} aria-label="Close">×</button></header><form onSubmit={submit}><div className="beta-support-grid"><label>What kind of issue?<select name="type" defaultValue="Something is not working"><option>Something is not working</option><option>Hard to understand</option><option>Display or mobile issue</option><option>Wrong calculation or result</option><option>Feature suggestion</option><option>Other</option></select></label><label>Page<input name="page" value={location.pathname} readOnly/></label></div><label>What happened?<textarea name="message" required rows={5} autoFocus placeholder="Tell us what you clicked, what you expected, and what happened instead."/></label><label>Email for follow-up <small>Optional</small><input name="email" type="email" placeholder="you@example.com"/></label><aside><b>Privacy note</b><span>Do not include passwords, payment information, or other sensitive details.</span></aside><footer><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">Save beta report</button></footer></form></>}</article></div>;
}

function KostaraaLayout({page,setPage,onLogout,children}:{page:string;setPage:(page:string)=>void;onLogout:()=>void;children:any}){
  const[mobileOpen,setMobileOpen]=useState(false);
  const[supportOpen,setSupportOpen]=useState(false);
  const[guideOpen,setGuideOpen]=useState(()=>{const isNewAccountSetup=new URLSearchParams(location.search).get("start")==="product";if(isNewAccountSetup)history.replaceState({},"","/workspace");return isNewAccountSetup});
  const go=(id:string)=>{setPage(id);setMobileOpen(false)};
  const openSupport=()=>{setMobileOpen(false);setSupportOpen(true)};
  const Menu=()=> <><button className="kws-brand" onClick={()=>go("dashboard")} aria-label="Go to Dashboard"><img src="/kostaraa-logo.png" alt="Kostaraa"/><small>Cost Better. Price Smarter.</small></button><nav>{nav.map(([id,label,icon])=><button key={id} className={page===id?"active":""} onClick={()=>go(id)}><i>{icon}</i><span>{label}</span></button>)}</nav><div className="kws-bottom-actions"><button className="kws-tour" onClick={()=>{setMobileOpen(false);setGuideOpen(true)}}><i>▶</i><span><b>Getting Started</b><small>Learn or revisit the app guide</small></span></button><button className="kws-support" onClick={openSupport}><i>?</i><span><b>Beta Support</b><small>Report an issue · 0.2.26</small></span></button><button className="kws-logout" onClick={onLogout}>↪ Log out</button></div></>;
  return <div className="kws-shell dotted-canvas"><aside className="kws-sidebar"><Menu/></aside><header className="kws-mobile-head"><button onClick={()=>setMobileOpen(true)}>☰</button><button className="kws-mobile-logo" onClick={()=>go("dashboard")} aria-label="Go to Dashboard"><img src="/kostaraa-logo.png" alt="Kostaraa"/></button><button onClick={onLogout}>Log out</button></header>{mobileOpen&&<div className="kws-mobile-menu"><button className="kws-scrim" aria-label="Close menu" onClick={()=>setMobileOpen(false)}/><aside><button className="kws-close" onClick={()=>setMobileOpen(false)}>×</button><Menu/></aside></div>}<main className="kws-content">{children}</main>{guideOpen&&<GettingStartedGuide onClose={()=>setGuideOpen(false)} onGo={go}/>} {supportOpen&&<BetaSupportModal onClose={()=>setSupportOpen(false)}/>}</div>
}

export function Workspace(){
  const[ready,setReady]=useState(false);
  const initial=useMemo(()=>loadState(),[]);
  const initialBusiness=useMemo(()=>{let profile:any=null;try{profile=JSON.parse(localStorage.getItem("kostaraa.businessProfile")||"null")}catch{}const baseLabor={...defaultLabor,...(initial.business.labor||initial.product.labor||{})};const days=Number(profile?.operations?.operatingDaysPerMonth)||Number(baseLabor.workingDays)||26;const salesTarget=Number(profile?.operations?.monthlySalesUnits||profile?.calculatorCosts?.salesTarget)||0;const manpowerTotal=(profile?.manpower||[]).reduce((sum:number,worker:any)=>sum+(Number(worker.amount)||0)+(Number(worker.benefits)||0)+(Number(worker.contributions)||0),0);const ownerPay=profile?.ownerLabor?.includeOwnTime==="Yes"?(Number(profile.ownerLabor.desiredMonthlyCompensation)||0):0;const laborTotal=Number(profile?.calculatorCosts?.totalLaborMonthly)||(manpowerTotal+ownerPay)||Number(baseLabor.monthlyCost)||0;const overheadTotal=Number(profile?.calculatorCosts?.overheadMonthly||profile?.overhead?.monthlyOverheadPool)||0;return{...initial.business,labor:{...baseLabor,monthlyCost:laborTotal,workingDays:days,outputPerDay:salesTarget?salesTarget/days:baseLabor.outputPerDay},overhead:overheadTotal?{rent:0,utilities:0,miscellaneous:overheadTotal}:{...defaultOverhead,...(initial.business.overhead||initial.product.overhead||{})}}},[initial]);
  const[page,setPage]=useState(new URLSearchParams(location.search).get("page")==="account"?"account":new URLSearchParams(location.search).get("start")==="product"?"calculator":"dashboard");
  const[business,setBusiness]=useState(initialBusiness);
  const[product,setProductState]=useState(withBusinessCosts(initial.product,initialBusiness));
  const[inventory,setInventoryState]=useState(initial.inventory);
  const[savedItems,setSavedItems]=useState(initial.savedItems);
  const[editingItemId,setEditingItemId]=useState<string|null>(null);
  const results=useMemo(()=>calculateProduct(product,inventory),[product,inventory]);

  useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem("kostaraa.businessProfile")||"null");if(!stored)return;const synced=withSynchronizedOperationCost(stored);localStorage.setItem("kostaraa.businessProfile",JSON.stringify(synced));const overhead=Number(synced.calculatorCosts?.overheadMonthly)||0;if(overhead){setBusiness((current:any)=>{const next={...current,overhead:{rent:0,utilities:0,miscellaneous:overhead}};localStorage.setItem("bizcost.business",JSON.stringify(next));return next})}}catch{}},[]);

  useEffect(()=>{sessionStorage.getItem("kostaraa.session")==="active"?setReady(true):location.replace("/login")},[]);
  const logout=()=>{sessionStorage.removeItem("kostaraa.session");sessionStorage.removeItem("kostaraa.token");sessionStorage.removeItem("kostaraa.user");location.href="/"};
  const setProduct=(next:any)=>{setProductState(next);saveProduct(next)};
  const setInventory=(next:any)=>{setInventoryState(next);saveInventory(next)};
  const persistItems=(items:any[])=>{setSavedItems(items);saveSavedItems(items)};
  const saveBusinessProfile=(next:any)=>{const synced={...next,labor:{...defaultLabor,...(next.labor||{})},overhead:{...defaultOverhead,...(next.overhead||{})}};const syncedProduct=withBusinessCosts(product,synced);setBusiness(synced);saveBusiness(synced);setProductState(syncedProduct);saveProduct(syncedProduct)};
  const blankCalculation=(source:any=product)=>({...blankProduct,ingredients:blankProduct.ingredients.map((item:any)=>({...item,id:crypto.randomUUID()})),packaging:blankProduct.packaging.map((item:any)=>({...item,id:crypto.randomUUID()})),otherCosts:{...blankProduct.otherCosts},labor:{...defaultLabor,...(business.labor||source.labor||blankProduct.labor)},overhead:{...defaultOverhead,...(business.overhead||source.overhead||blankProduct.overhead)}});
  const saveLibraryItem=(metadata:any,statusOverride?:string)=>{const existing=savedItems.find((item:any)=>item.id===editingItemId);const payload=buildSavedItem(product,results,business,{...metadata,status:statusOverride||metadata.status},existing);const next=existing?savedItems.map((item:any)=>item.id===existing.id?payload:item):[payload,...savedItems];persistItems(next);setProduct(blankCalculation());setEditingItemId(null);return payload};
  const editItem=(item:any)=>{setProduct(withBusinessCosts(savedItemToProduct(item,inventory),business));setEditingItemId(item.id);setPage("calculator")};
  const duplicateItem=(item:any)=>{const source=savedItemToProduct(item,inventory);const calculated=calculateProduct(source,inventory);const copy=buildSavedItem({...source,productName:`${item.productName} Copy`},calculated,business,{itemType:item.itemType,category:item.category,status:"Draft",notes:item.notes});persistItems([copy,...savedItems]);return copy};
  const archiveItem=(id:string)=>persistItems(savedItems.map((item:any)=>item.id===id?{...item,status:"Archived",updatedAt:new Date().toISOString()}:item));
  const deleteItem=(id:string)=>{persistItems(savedItems.filter((item:any)=>item.id!==id));if(editingItemId===id)setEditingItemId(null)};
  const updateItem=(id:string,updates:any)=>persistItems(savedItems.map((item:any)=>item.id===id?{...item,...updates,updatedAt:new Date().toISOString()}:item));
  const resetCalculator=()=>{setProduct(blankCalculation());setEditingItemId(null)};
  if(!ready)return <div className="ws-loading">Opening Kostaraa…</div>;
  const pages:any={
    dashboard:<BusinessDashboard business={business} savedItems={savedItems} onReview={editItem} setPage={setPage}/>,
    products:<ProductsServices items={savedItems} onViewEdit={editItem} onDuplicate={duplicateItem} onArchive={archiveItem} onDelete={deleteItem} onUpdateItem={updateItem} setPage={setPage}/>,
    inventory:<AdaptiveInventory inventory={inventory} setInventory={setInventory}/>,
    calculator:<CalculatorProfileCosts business={business} onSaveBusiness={saveBusinessProfile}><Calculator product={product} setProduct={setProduct} results={results} inventory={inventory} business={business} onSaveItem={saveLibraryItem} onDuplicateCurrent={()=>duplicateItem(buildSavedItem(product,results,business,{itemType:"Product",category:"Other",status:"Draft"}))} onReset={resetCalculator} editingItem={savedItems.find((item:any)=>item.id===editingItemId)}/></CalculatorProfileCosts>,
    recommendations:<BusinessHealthComingSoon/>,
    account:<BusinessProfile/>,
  };
  return <KostaraaLayout page={page} setPage={setPage} onLogout={logout}>{pages[page]}</KostaraaLayout>
}
