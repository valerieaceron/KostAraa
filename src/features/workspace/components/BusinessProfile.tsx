import {useEffect,useRef,useState} from "react";
import {Pencil,Plus,Trash2,X} from "lucide-react";
import {apiJson,isOfflineUser} from "../../costing/utils/api";
import {businessProfilePayload,expenseCategoryCode,normalizeBusinessProfile} from "../../costing/utils/businessProfile";
import {monthlyOperationCost,withSynchronizedOperationCost} from "../business-profile-costs";

const sections=["identity","operations","manpower","overhead","targetMarket"];
const labels:Record<string,string>={identity:"About your business",businessStage:"Business stage and goals",operations:"Business Operations",locationExpenses:"Business space costs",manpower:"Manpower Cost",ownerLabor:"Pay for your own work",overhead:"Business Expenses",targetMarket:"Customers",salesChannels:"Selling channels"};
const categories=["Food and Beverage","Handmade and Crafts","Customized Products","Retail and E-Commerce","Small-Scale Manufacturing","Other Product-Based Business"];
const stages=["Still planning","Newly operating","Operating and growing","Operating but breaking even","Operating but struggling","Temporarily inactive","Previously operated"];
const locationTypes=["From home","Rented commercial space","Owned commercial space","Shared kitchen","Shared workspace","Online only","Pop-up or temporary location","Multiple locations"];
const employmentTypes=["Owner","Family member","Full-time employee","Part-time employee","Freelancer","Contractual worker"];
const customerGroups=["Students","Working professionals","Parents","Office workers","Nearby residents","Online shoppers","Gift buyers","Resellers","Walk-in customers","Other"];
const buyingReasons=["Daily use","School or work","Gift giving","Special occasions","Convenience","Personal use"];
const customerPriorities=["Affordable price","Good quality","Easy to buy","Fast service","Unique product","Custom orders","Nice packaging","Trusted brand","Eco-friendly"];
const channels=["Physical store","Facebook","Instagram","TikTok Shop","Shopee","Lazada","Website","Pop-up markets","Resellers","Direct orders","Other"];
const frequencies=["Daily","Weekly","Monthly","Quarterly","Semi-annual","Annual","One-time"];
const expenseCategories=[
  {value:"utilities",label:"Electricity, water, and utilities"},
  {value:"internet_and_communication",label:"Internet and communication"},
  {value:"Staff and admin pay",label:"Staff and admin pay"},
  {value:"Marketing and promotions",label:"Marketing and promotions"},
  {value:"Software and subscriptions",label:"Software and subscriptions"},
  {value:"Permits, licenses, and government fees",label:"Permits, licenses, and government fees"},
  {value:"Professional services",label:"Professional services"},
  {value:"Repairs and maintenance",label:"Repairs and maintenance"},
  {value:"Office and store supplies",label:"Office and store supplies"},
  {value:"Transportation and business travel",label:"Transportation and business travel"},
  {value:"Bank and payment fees",label:"Bank and payment fees"},
  {value:"Insurance",label:"Insurance"},
  {value:"Equipment and tools",label:"Equipment and tools"},
  {value:"other_business_expense",label:"Other business expense"},
];

const fieldSets:Record<string,any[]>={
  identity:[
    {key:"businessName",label:"Business name"},
    {key:"description",label:"Short description",type:"textarea",wide:true},
    {key:"category",label:"Business category",type:"select",options:categories},
    {key:"city",label:"City or province"},
    {key:"country",label:"Country"},
    {key:"currency",label:"Currency"},
  ],
  businessStage:[
    {key:"stage",label:"Business stage",type:"select",options:stages,wide:true},
    {key:"startYear",label:"Year started",type:"number"},
    {key:"plannedStartYear",label:"Planned start year",type:"number"},
  ],
  operations:[
    {key:"locationType",label:"How the business operates",type:"select",options:locationTypes,wide:true},
    {key:"operatingDaysPerMonth",label:"Operating days per month",type:"number"},
    {key:"operatingHoursPerDay",label:"Operating hours per day",type:"number"},
    {key:"monthlyProductionUnits",label:"Items produced per month",type:"number"},
    {key:"monthlySalesUnits",label:"Monthly sales target",type:"number"},
    {key:"averageMonthlyRevenue",label:"Average monthly revenue",type:"money"},
  ],
  locationExpenses:[
    {key:"monthlyRent",label:"Monthly rent",type:"money"},
    {key:"associationDues",label:"Association dues",type:"money"},
    {key:"parkingFees",label:"Parking fees",type:"money"},
    {key:"storageFees",label:"Storage fees",type:"money"},
    {key:"otherLocationExpenses",label:"Other location cost",type:"money"},
  ],
  ownerLabor:[
    {key:"includeOwnTime",label:"Include your pay in product costs",type:"select",options:["Yes","No"],wide:true},
    {key:"desiredMonthlyCompensation",label:"Desired monthly pay",type:"money"},
    {key:"workingHoursPerMonth",label:"Working hours per month",type:"number"},
    {key:"productionPercent",label:"Time spent on production (%)",type:"number"},
    {key:"administrationPercent",label:"Time spent managing (%)",type:"number"},
  ],
  targetMarket:[
    {key:"customerGroups",label:"Customer groups",type:"multi",options:customerGroups,wide:true},
    {key:"frequentGroup",label:"Most frequent customer group",type:"select",options:customerGroups},
    {key:"ageGroup",label:"Typical age group",type:"select",options:["Under 18","18–24","25–34","35–44","45–54","55 and above","Mixed ages"]},
    {key:"customerLocation",label:"Main city or area"},
    {key:"spendingPerOrder",label:"Usual spending per order",type:"money"},
    {key:"purchaseFrequency",label:"Purchase frequency",type:"select",options:["More than once a week","About once a week","A few times a month","About once a month","Only for special occasions","Not sure yet"]},
    {key:"buyingReasons",label:"Reasons they buy",type:"multi",options:buyingReasons,wide:true},
    {key:"priorities",label:"What matters most",type:"multi",options:customerPriorities,max:3,wide:true},
  ],
};

function clone<T>(value:T):T{return JSON.parse(JSON.stringify(value))}
function money(value:any){return `₱${Number(value||0).toLocaleString("en-PH",{maximumFractionDigits:2})}`}
function useful(values:any[]){return values.filter(value=>value!==undefined&&value!==null&&value!==""&&value!=="Not provided")}
function payrollMonthly(profile:any){const team=(profile.manpower||[]).reduce((sum:number,row:any)=>sum+Number(row.amount||0)+Number(row.benefits||0)+Number(row.contributions||0),0);const owner=profile.ownerLabor?.includeOwnTime==="Yes"?Number(profile.ownerLabor?.desiredMonthlyCompensation||0):0;return team+owner}
function spaceCostsMonthly(profile:any){return ["monthlyRent","associationDues","parkingFees","storageFees","otherLocationExpenses"].reduce((sum,key)=>sum+Number(profile.locationExpenses?.[key]||0),0)}
function summaryFor(key:string,profile:any){
  if(key==="identity"){const selectedChannels=(profile.salesChannels||[]).map((row:any)=>row.name).filter(Boolean);return useful([profile.identity?.businessName,profile.identity?.category,profile.businessStage?.stage,profile.identity?.city,selectedChannels.length?`${selectedChannels.length} selling ${selectedChannels.length===1?"channel":"channels"}`:""]).join(" · ")||"Add your business details, current stage, and selling channels"}
  if(key==="businessStage")return useful([profile.businessStage?.stage,profile.businessStage?.startYear?`Started ${profile.businessStage.startYear}`:"",profile.businessStage?.plannedStartYear?`Plans to start ${profile.businessStage.plannedStartYear}`:""]).join(" · ")||"Add your current business stage";
  if(key==="operations")return useful([profile.operations?.locationType,profile.operations?.operatingDaysPerMonth?`${profile.operations.operatingDaysPerMonth} operating days/month`:"",profile.operations?.monthlySalesUnits?`${Number(profile.operations.monthlySalesUnits).toLocaleString()} items/month target`:""]).join(" · ")||"Add your operating schedule and sales target";
  if(key==="locationExpenses"){const total=["monthlyRent","associationDues","parkingFees","storageFees","otherLocationExpenses"].reduce((sum,name)=>sum+Number(profile.locationExpenses?.[name]||0),0);return total?`${money(total)} recorded per month`:"No business space costs recorded"}
  if(key==="manpower"){const workers=profile.manpower||[];const ownerIncluded=profile.ownerLabor?.includeOwnTime==="Yes";const total=payrollMonthly(profile);const details=useful([workers.length?`${workers.length} ${workers.length===1?"team member":"team members"}`:"",ownerIncluded?"Owner pay included":""]);return total?`${details.join(" · ")}${details.length?" · ":""}${money(total)} monthly manpower cost`:"No manpower costs recorded"}
  if(key==="ownerLabor")return profile.ownerLabor?.includeOwnTime==="Yes"?`Included in costs · ${money(profile.ownerLabor?.desiredMonthlyCompensation)} per month`:"Owner pay is not included in product costs";
  if(key==="overhead"){const rows=[...(profile.overhead?.fixed||[]),...(profile.overhead?.variable||[]),...(profile.overhead?.periodic||[])].filter((row:any)=>row.name||Number(row.amount));const total=monthlyOperationCost(profile)+spaceCostsMonthly(profile)+payrollMonthly(profile);return rows.length||spaceCostsMonthly(profile)||payrollMonthly(profile)?`${money(total)} monthly · Includes space, manpower, and saved expenses`:"No business expenses recorded"}
  if(key==="targetMarket")return useful([...(profile.targetMarket?.customerGroups||[]).slice(0,2),profile.targetMarket?.customerLocation,profile.targetMarket?.spendingPerOrder?`${money(profile.targetMarket.spendingPerOrder)} typical spend`:""]).join(" · ")||"Add customer details";
  if(key==="salesChannels")return (profile.salesChannels||[]).map((row:any)=>row.name).filter(Boolean).join(" · ")||"No selling channels added";
  return "Not provided";
}

function Field({field,draft,setDraft}:any){
  const value=draft?.[field.key]??(field.type==="multi"?[]:"");
  const update=(next:any)=>setDraft((current:any)=>({...current,[field.key]:next}));
  if(field.type==="multi")return <fieldset className={`bp-field bp-choice-field${field.wide?" wide":""}`}><legend>{field.label}{field.max?<small> Choose up to {field.max}</small>:null}</legend><div>{field.options.map((option:string)=>{const selected=(value||[]).includes(option);return <button key={option} type="button" className={selected?"selected":""} onClick={()=>{const list=value||[];if(selected)update(list.filter((item:string)=>item!==option));else if(!field.max||list.length<field.max)update([...list,option])}}>{option}</button>})}</div></fieldset>;
  return <label className={`bp-field${field.wide?" wide":""}`}><span>{field.label}</span>{field.type==="textarea"?<textarea rows={3} value={value} onChange={event=>update(event.target.value)}/>:field.type==="select"?<select value={value} onChange={event=>update(event.target.value)}><option value="">Select an option</option>{field.options.map((option:string)=><option key={option}>{option}</option>)}</select>:field.type==="money"?<div className="bp-money-input"><span>PHP</span><input type="number" min="0" value={value||""} onChange={event=>update(Number(event.target.value))}/></div>:<input type={field.type||"text"} min={field.type==="number"?0:undefined} value={value} onChange={event=>update(field.type==="number"?Number(event.target.value):event.target.value)}/>}</label>;
}

function TeamEditor({draft,setDraft}:any){
  const rows=Array.isArray(draft)?draft:[];
  const update=(id:string,key:string,value:any)=>setDraft(rows.map((row:any)=>row.id===id?{...row,[key]:value}:row));
  return <div className="bp-repeat-list">{rows.map((row:any)=><article key={row.id}><div className="bp-repeat-grid"><label className="wide"><span>Name or role</span><input value={row.nameOrRole||""} onChange={event=>update(row.id,"nameOrRole",event.target.value)}/></label><label><span>Employment type</span><select value={row.employmentType||""} onChange={event=>update(row.id,"employmentType",event.target.value)}>{employmentTypes.map(item=><option key={item}>{item}</option>)}</select></label><label><span>Monthly pay</span><input type="number" min="0" value={row.amount||""} onChange={event=>update(row.id,"amount",Number(event.target.value))}/></label><label><span>Benefits and allowances</span><input type="number" min="0" value={row.benefits||""} onChange={event=>update(row.id,"benefits",Number(event.target.value))}/></label><label><span>Employer contributions</span><input type="number" min="0" value={row.contributions||""} onChange={event=>update(row.id,"contributions",Number(event.target.value))}/></label><label><span>Working days per month</span><input type="number" min="0" value={row.workingDays||""} onChange={event=>update(row.id,"workingDays",Number(event.target.value))}/></label></div><button className="bp-remove-row" type="button" onClick={()=>setDraft(rows.filter((item:any)=>item.id!==row.id))} aria-label={`Remove ${row.nameOrRole||"team member"}`}><Trash2 aria-hidden="true"/> Remove</button></article>)}<button className="bp-add-row" type="button" onClick={()=>setDraft([...rows,{id:crypto.randomUUID(),nameOrRole:"",employmentType:"Full-time employee",rateType:"Monthly salary",amount:0,workingDays:0,workingHours:0,benefits:0,contributions:0,productionPercent:0,classification:"Direct labor"}])}><Plus aria-hidden="true"/> Add team member</button></div>;
}

function ExpenseEditor({draft,setDraft,profile}:any){
  const[newExpense,setNewExpense]=useState({name:"",category:"",frequency:"Monthly",amount:""});
  const rows=[...(draft.fixed||[]),...(draft.variable||[]),...(draft.periodic||[])];
  const update=(id:string,key:string,value:any)=>setDraft((current:any)=>({...current,fixed:(current.fixed||[]).map((row:any)=>row.id===id?{...row,[key]:value}:row),variable:(current.variable||[]).map((row:any)=>row.id===id?{...row,[key]:value}:row),periodic:(current.periodic||[]).map((row:any)=>row.id===id?{...row,[key]:value}:row)}));
  const remove=(id:string)=>setDraft((current:any)=>({...current,fixed:(current.fixed||[]).filter((row:any)=>row.id!==id),variable:(current.variable||[]).filter((row:any)=>row.id!==id),periodic:(current.periodic||[]).filter((row:any)=>row.id!==id)}));
  const otherBusinessMonthly=monthlyOperationCost({...profile,overhead:draft});
  const spaceMonthly=spaceCostsMonthly(profile);
  const businessMonthly=otherBusinessMonthly+spaceMonthly;
  const manpower=payrollMonthly(profile);
  const monthly=businessMonthly+manpower;
  const daily=monthly/(Number(profile.operations?.operatingDaysPerMonth)||30);
  const annual=monthly*12;
  const addExpense=()=>{
    if(!newExpense.name.trim()||!newExpense.category||!Number(newExpense.amount))return;
    const group=newExpense.frequency==="Annual"||newExpense.frequency==="One-time"?"periodic":"fixed";
    setDraft((current:any)=>({...current,[group]:[...(current[group]||[]),{id:crypto.randomUUID(),group,name:newExpense.name.trim(),category:newExpense.category,amount:Number(newExpense.amount),frequency:newExpense.frequency,startDate:"",notes:""}]}));
    setNewExpense({name:"",category:"",frequency:"Monthly",amount:""});
  };
  const categoryOptions=(current="")=>{const value=expenseCategoryCode(current);return value&&!expenseCategories.some(option=>option.value===value)?[{value,label:String(value).replaceAll("_"," ").replace(/^./,letter=>letter.toUpperCase())},...expenseCategories]:expenseCategories};
  return <div className="bp-expense-workspace">
    <section className="bp-expense-summary"><div className="bp-expense-total"><span>Monthly expenses</span><strong>{money(monthly)}</strong><small>Includes space, manpower, and saved business expenses</small></div><div className="bp-expense-periods"><article><span>Daily</span><strong>{money(daily)}</strong></article><article><span>Annual</span><strong>{money(annual)}</strong></article></div><div className="bp-expense-breakdown"><span>Space costs <b>{money(spaceMonthly)}</b></span><span>Other expenses <b>{money(otherBusinessMonthly)}</b></span><span>Manpower <b>{money(manpower)}</b></span></div></section>
    <section className="bp-expense-entry" aria-labelledby="bp-add-expense-title"><div><h3 id="bp-add-expense-title">Add an expense</h3><p>Enter a cost, then add it to your records below.</p></div><div className="bp-expense-entry-grid"><label><span>Expense name</span><input value={newExpense.name} placeholder="e.g. Electricity" onChange={event=>setNewExpense(current=>({...current,name:event.target.value}))}/></label><label><span>Category</span><select value={newExpense.category} onChange={event=>setNewExpense(current=>({...current,category:event.target.value}))}><option value="">Select category</option>{expenseCategories.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label><span>Frequency</span><select value={newExpense.frequency} onChange={event=>setNewExpense(current=>({...current,frequency:event.target.value}))}>{frequencies.map(item=><option key={item}>{item}</option>)}</select></label><label><span>Amount</span><div className="bp-expense-amount"><span>₱</span><input type="number" min="0" value={newExpense.amount} placeholder="0.00" onChange={event=>setNewExpense(current=>({...current,amount:event.target.value}))}/></div></label><span className="bp-expense-entry-spacer" aria-hidden="true"/></div><div className="bp-expense-entry-actions"><button className="bp-expense-add" type="button" disabled={!newExpense.name.trim()||!newExpense.category||!Number(newExpense.amount)} onClick={addExpense}><Plus aria-hidden="true"/> Add expense</button></div></section>
    <section className="bp-expense-records"><div className="bp-expense-toolbar"><div><h3>Expense records</h3><p>{rows.length?`${rows.length} ${rows.length===1?"expense":"expenses"} recorded`:"Your added expenses will appear here."}</p></div></div>{rows.length?<div className="bp-expense-table" role="table" aria-label="Expense records"><div className="bp-expense-table-head" role="row"><span role="columnheader">Expense</span><span role="columnheader">Category</span><span role="columnheader">Frequency</span><span role="columnheader">Amount</span><span aria-hidden="true"/></div>{rows.map((row:any)=><div className="bp-expense-row" role="row" key={row.id}><label><span className="bp-mobile-label">Expense</span><input aria-label="Expense name" value={row.name||""} placeholder="Expense name" onChange={event=>update(row.id,"name",event.target.value)}/></label><label><span className="bp-mobile-label">Category</span><select aria-label={`Category for ${row.name||"expense"}`} value={expenseCategoryCode(row.category)} onChange={event=>update(row.id,"category",event.target.value)}><option value="">Select category</option>{categoryOptions(row.category).map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label><span className="bp-mobile-label">Frequency</span><select aria-label={`Frequency for ${row.name||"expense"}`} value={row.frequency||"Monthly"} onChange={event=>update(row.id,"frequency",event.target.value)}>{frequencies.map(item=><option key={item}>{item}</option>)}</select></label><label><span className="bp-mobile-label">Amount</span><div className="bp-expense-amount"><span>₱</span><input aria-label={`Amount for ${row.name||"expense"}`} type="number" min="0" value={row.amount||""} onChange={event=>update(row.id,"amount",Number(event.target.value))}/></div></label><button className="bp-expense-delete" type="button" onClick={()=>remove(row.id)} aria-label={`Remove ${row.name||"expense"}`} title="Remove expense"><Trash2 aria-hidden="true"/></button></div>)}</div>:<div className="bp-expense-empty"><span>+</span><div><strong>No expenses yet</strong><p>Use the form above to add your first business expense.</p></div></div>}</section>
  </div>;
}

function ChannelEditor({draft,setDraft}:any){
  const rows=Array.isArray(draft)?draft:[];
  const toggle=(name:string)=>setDraft(rows.some((row:any)=>row.name===name)?rows.filter((row:any)=>row.name!==name):[...rows,{id:crypto.randomUUID(),name,commissionPercentage:0,transactionFeePercentage:0,listingFee:0,deliverySubsidy:0,advertisingCost:0,packagingRequirement:"",refundAllowance:0,otherCosts:0}]);
  return <div className="bp-channel-editor"><span className="bp-control-label">Select every channel you currently use</span><div className="bp-choice-grid">{channels.map(name=><button type="button" key={name} className={rows.some((row:any)=>row.name===name)?"selected":""} aria-pressed={rows.some((row:any)=>row.name===name)} onClick={()=>toggle(name)}>{name}</button>)}</div><p className="bp-channel-note">Choose all the places where customers can currently buy from you.</p></div>;
}

function visibleFields(section:string,draft:any){
  const fields=fieldSets[section]||[];
  if(section==="businessStage")return fields.filter(field=>field.key!=="startYear"&&field.key!=="plannedStartYear").concat(fields.filter(field=>field.key===(draft?.stage==="Still planning"?"plannedStartYear":"startYear")));
  if(section==="ownerLabor"&&draft?.includeOwnTime!=="Yes")return fields.filter(field=>field.key==="includeOwnTime");
  return fields;
}

export default function BusinessProfile({focusSection="identity",editRequest=0,onEditRequestHandled}:{focusSection?:string;editRequest?:number;onEditRequestHandled?:()=>void}){
  const[profile,setProfile]=useState<any>(()=>{
    try{const stored=JSON.parse(localStorage.getItem("kostaraa.businessProfile")||"null");if(stored)return stored}catch{}
    let signup:any={};
    try{const candidate=JSON.parse(sessionStorage.getItem("kostaraa.signup")||"{}");const user=JSON.parse(sessionStorage.getItem("kostaraa.user")||"{}");if(candidate?.userId&&String(candidate.userId)===String(user?.id))signup=candidate}catch{}
    return normalizeBusinessProfile({},{identity:{businessName:signup.businessName||"",country:"Philippines",currency:"PHP (₱)"},meta:{status:"draft",ownerName:signup.fullName||"",ownerEmail:signup.email||""}});
  });
  const handledEditRequest=useRef(0);
  const[remoteProfileExists,setRemoteProfileExists]=useState(Boolean(profile?.meta?.businessProfileId));
  const[editing,setEditing]=useState<string|null>(null);
  const[draft,setDraft]=useState<any>(null);
  const[saving,setSaving]=useState(false);
  const[saveError,setSaveError]=useState("");
  useEffect(()=>{let cancelled=false;(async()=>{try{const data=await apiJson("/api/business-profile");if(cancelled)return;const next=normalizeBusinessProfile(data,profile||{});setProfile(next);setRemoteProfileExists(Boolean(next.meta?.businessProfileId));localStorage.setItem("kostaraa.businessProfile",JSON.stringify(next))}catch{}})();return()=>{cancelled=true}},[]);
  useEffect(()=>{if(!editing)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!saving)setEditing(null)};document.addEventListener("keydown",close);return()=>document.removeEventListener("keydown",close)},[editing,saving]);
  useEffect(()=>{if(!focusSection||!profile)return;const frame=requestAnimationFrame(()=>document.getElementById(`profile-${focusSection}`)?.scrollIntoView({behavior:"smooth",block:"start"}));return()=>cancelAnimationFrame(frame)},[focusSection,profile]);
  const openEditor=(key:string)=>{setDraft(key==="identity"?{identity:clone(profile.identity||{}),businessStage:clone(profile.businessStage||{}),salesChannels:clone(profile.salesChannels||[])}:key==="manpower"?{manpower:clone(profile.manpower||[]),ownerLabor:clone(profile.ownerLabor||{})}:key==="overhead"?{locationExpenses:clone(profile.locationExpenses||{}),overhead:clone(profile.overhead||{})}:clone(profile[key]??{}));setSaveError("");setEditing(key)};
  useEffect(()=>{if(!editRequest){handledEditRequest.current=0;return}if(handledEditRequest.current===editRequest||!profile)return;handledEditRequest.current=editRequest;openEditor("identity");onEditRequestHandled?.()},[editRequest,profile]);
  const saveSection=async()=>{if(!editing)return;setSaving(true);setSaveError("");const changed=editing==="identity"?{...profile,identity:draft.identity,businessStage:draft.businessStage,salesChannels:draft.salesChannels,meta:{...profile.meta,updatedAt:new Date().toISOString()}}:editing==="manpower"?{...profile,manpower:draft.manpower,ownerLabor:draft.ownerLabor,meta:{...profile.meta,updatedAt:new Date().toISOString()}}:editing==="overhead"?{...profile,locationExpenses:draft.locationExpenses,overhead:draft.overhead,meta:{...profile.meta,updatedAt:new Date().toISOString()}}:{...profile,[editing]:draft,meta:{...profile.meta,updatedAt:new Date().toISOString()}};const next=withSynchronizedOperationCost(changed);try{let saved=next;if(!isOfflineUser()){const payload=businessProfilePayload(next,next.meta?.status||"complete",next.meta?.onboardingStep||8);const data=await apiJson("/api/business-profile",{method:remoteProfileExists||next.meta?.businessProfileId?"PATCH":"POST",body:JSON.stringify(payload)});saved=withSynchronizedOperationCost(normalizeBusinessProfile(data,next));setRemoteProfileExists(true)}setProfile(saved);localStorage.setItem("kostaraa.businessProfile",JSON.stringify(saved));setEditing(null);setDraft(null)}catch(error:any){setSaveError(error?.message||"Unable to save these changes.")}finally{setSaving(false)}};
  return <div className="bp-page"><header><h1>Business Settings</h1></header><div className="bp-list" role="list">{sections.map(key=><section id={`profile-${key}`} key={key} role="listitem"><div><h2>{labels[key]}</h2><p>{summaryFor(key,profile)}</p></div><button type="button" onClick={()=>openEditor(key)}><Pencil aria-hidden="true"/> Edit</button></section>)}</div>{editing&&<div className={`bp-editor-modal${editing==="overhead"?" is-expenses":""}`} role="dialog" aria-modal="true" aria-labelledby="bp-editor-title"><button className="bp-editor-scrim" type="button" onClick={()=>!saving&&setEditing(null)} aria-label="Close editor"/><article><header><div><h2 id="bp-editor-title">Edit {labels[editing].toLowerCase()}</h2></div><button type="button" onClick={()=>setEditing(null)} disabled={saving} aria-label="Close"><X aria-hidden="true"/></button></header><div className="bp-editor-body">{editing==="identity"?<div className="bp-combined-editor"><section><h3>Business details</h3><div className="bp-form-grid">{fieldSets.identity.map(field=><Field key={field.key} field={field} draft={draft.identity} setDraft={(update:any)=>setDraft((current:any)=>({...current,identity:typeof update==="function"?update(current.identity):update}))}/>)}</div></section><section><h3>Business stage and goals</h3><div className="bp-form-grid">{visibleFields("businessStage",draft.businessStage).map(field=><Field key={field.key} field={field} draft={draft.businessStage} setDraft={(update:any)=>setDraft((current:any)=>({...current,businessStage:typeof update==="function"?update(current.businessStage):update}))}/>)}</div></section><section><h3>Selling channels</h3><ChannelEditor draft={draft.salesChannels} setDraft={(update:any)=>setDraft((current:any)=>({...current,salesChannels:typeof update==="function"?update(current.salesChannels):update}))}/></section></div>:editing==="manpower"?<div className="bp-combined-editor"><section><h3>Team members</h3><TeamEditor draft={draft.manpower} setDraft={(update:any)=>setDraft((current:any)=>({...current,manpower:typeof update==="function"?update(current.manpower):update}))}/></section><section><h3>Pay for your own work</h3><div className="bp-form-grid">{visibleFields("ownerLabor",draft.ownerLabor).map(field=><Field key={field.key} field={field} draft={draft.ownerLabor} setDraft={(update:any)=>setDraft((current:any)=>({...current,ownerLabor:typeof update==="function"?update(current.ownerLabor):update}))}/>)}</div></section></div>:editing==="overhead"?<div className="bp-combined-editor"><section><h3>Space costs</h3><div className="bp-form-grid">{fieldSets.locationExpenses.map(field=><Field key={field.key} field={field} draft={draft.locationExpenses} setDraft={(update:any)=>setDraft((current:any)=>({...current,locationExpenses:typeof update==="function"?update(current.locationExpenses):update}))}/>)}</div></section><section><h3>Other business expenses</h3><ExpenseEditor draft={draft.overhead} setDraft={(update:any)=>setDraft((current:any)=>({...current,overhead:typeof update==="function"?update(current.overhead):update}))} profile={{...profile,locationExpenses:draft.locationExpenses}}/></section></div>:<div className="bp-form-grid">{visibleFields(editing,draft).map(field=><Field key={field.key} field={field} draft={draft} setDraft={setDraft}/>)}</div>}{saveError&&<p className="bp-save-error" role="alert">{saveError}</p>}</div><footer><button type="button" onClick={()=>setEditing(null)} disabled={saving}>Cancel</button><button className="primary" type="button" onClick={saveSection} disabled={saving}>{saving?"Saving…":"Save changes"}</button></footer></article></div>}</div>;
}
