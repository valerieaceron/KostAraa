import {cloneElement,useMemo,useState} from "react";
import {monthlyOperationCost} from "./business-profile-costs";

const money=(value:number)=>`₱${(Number(value)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
function readProfile(){try{return JSON.parse(localStorage.getItem("kostaraa.businessProfile")||"null")}catch{return null}}
function profileTotals(profile:any,business:any){
  const salesTarget=Number(profile?.operations?.monthlySalesUnits||profile?.calculatorCosts?.salesTarget)||0;
  const manpowerTotal=(profile?.manpower||[]).reduce((sum:number,worker:any)=>sum+(Number(worker.amount)||0)+(Number(worker.benefits)||0)+(Number(worker.contributions)||0),0);
  const ownerPay=profile?.ownerLabor?.includeOwnTime==="Yes"?(Number(profile.ownerLabor.desiredMonthlyCompensation)||0):0;
  const labor=Number(profile?.calculatorCosts?.totalLaborMonthly)||(manpowerTotal+ownerPay)||Number(business?.labor?.monthlyCost)||0;
  const profileOverhead=monthlyOperationCost(profile);
  const overhead=profileOverhead||((Number(business?.overhead?.rent)||0)+(Number(business?.overhead?.utilities)||0)+(Number(business?.overhead?.miscellaneous)||0));
  return{salesTarget,totalLaborMonthly:labor,overheadMonthly:overhead};
}
function Tip({children}:{children:any}){return <span className="calc-tip" tabIndex={0}>?<em>{children}</em></span>}

export default function CalculatorProfileCosts({business,onSaveBusiness,children}:{business:any;onSaveBusiness:(value:any)=>void;children:any}){
  const[profile,setProfile]=useState<any>(()=>readProfile());
  const totals=useMemo(()=>profileTotals(profile,business),[profile,business]);
  const[open,setOpen]=useState(false);
  const[draft,setDraft]=useState({salesTarget:totals.salesTarget,totalLaborMonthly:totals.totalLaborMonthly});
  const save=()=>{
    const target=Number(draft.salesTarget)||0;
    const labor=Number(draft.totalLaborMonthly)||0;
    const overhead=monthlyOperationCost(profile);
    const nextProfile={...(profile||{}),operations:{...(profile?.operations||{}),volumeBasis:"Sold",monthlyUnitEstimate:target,monthlySalesUnits:target},overhead:{...(profile?.overhead||{}),monthlyOverheadPool:overhead},calculatorCosts:{...(profile?.calculatorCosts||{}),salesTarget:target,totalLaborMonthly:labor,overheadMonthly:overhead}};
    localStorage.setItem("kostaraa.businessProfile",JSON.stringify(nextProfile));
    const days=Number(business?.labor?.workingDays)||26;
    const nextBusiness={...business,labor:{...(business?.labor||{}),monthlyCost:labor,workingDays:days,outputPerDay:days?target/days:0},overhead:{rent:0,utilities:0,miscellaneous:overhead}};
    localStorage.setItem("bizcost.business",JSON.stringify(nextBusiness));
    setProfile(nextProfile);onSaveBusiness(nextBusiness);setOpen(false);
  };
  const costCard=<section className="profile-cost-card"><header><div><span>3</span><section><h2>Labor and operation costs</h2><p>These amounts use the Monthly Sales Target from your Business Profile.</p></section></div><button onClick={()=>{setDraft({salesTarget:totals.salesTarget,totalLaborMonthly:totals.totalLaborMonthly});setOpen(true)}}>✎ Edit target and labor</button></header><div className="profile-cost-grid"><article><p>Monthly Sales Target <Tip>The number of items you plan to sell each month in your Business Profile.</Tip></p><b>{totals.salesTarget.toLocaleString()} items</b></article><article><p>Labor cost per item <Tip>Your total monthly labor cost divided by your Monthly Sales Target.</Tip></p><b>{money(totals.salesTarget?totals.totalLaborMonthly/totals.salesTarget:0)}</b><small>{money(totals.totalLaborMonthly)} total labor cost per month</small></article><article><p>Operation Cost <Tip>Your saved Business Profile expenses divided by your Monthly Sales Target.</Tip></p><b>{money(totals.salesTarget?totals.overheadMonthly/totals.salesTarget:0)}</b><small>{money(totals.overheadMonthly)} calculated business expenses per month</small></article></div></section>;
  return <div className="kostaraa-calculator">{cloneElement(children,{operationCostsCard:costCard})}{open&&<div className="cost-modal" role="dialog" aria-modal="true"><button className="cost-scrim" onClick={()=>setOpen(false)} aria-label="Close"/><article><header><div><h2>Edit monthly target and labor</h2><p>Saving here updates your Business Profile and related calculations.</p></div><button onClick={()=>setOpen(false)}>×</button></header><label>Monthly Sales Target <Tip>How many units you plan to sell each month.</Tip><input type="number" min="0" value={draft.salesTarget||""} onChange={event=>setDraft({...draft,salesTarget:Number(event.target.value)})}/></label><label>Total labor cost per month <Tip>Include employee payroll, benefits, contributions, and owner pay that you chose to include.</Tip><input type="number" min="0" value={draft.totalLaborMonthly||""} onChange={event=>setDraft({...draft,totalLaborMonthly:Number(event.target.value)})}/></label><section className="overhead-readonly"><div><span>Calculated business expenses <Tip>This total comes from the individual expenses saved in your Business Profile. Edit those expense records to change it.</Tip></span><b>{money(totals.overheadMonthly)} per month</b></div><a href="/onboarding?edit=1&step=4">Edit expenses in Business Profile →</a></section><footer><button onClick={()=>setOpen(false)}>Cancel</button><button className="save" onClick={save}>Save changes</button></footer></article></div>}</div>;
}
