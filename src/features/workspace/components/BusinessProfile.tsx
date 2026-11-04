import {useEffect,useRef,useState} from "react";
import {ArrowLeft,Building2,CalendarDays,Check,ContactRound,Info,Pencil,Plus,ReceiptText,Trash2,UsersRound,X} from "lucide-react";
import {apiJson,isOfflineUser} from "../../costing/utils/api";
import {businessProfilePayload,expenseCategoryCode,normalizeBusinessProfile} from "../../costing/utils/businessProfile";
import {capitalExpenseTotal,expenseCostType,monthlyOperationCost,withSynchronizedOperationCost} from "../business-profile-costs";

const sections=["identity","operations","manpower","overhead","targetMarket"] as const;
const sectionIcons={identity:Building2,operations:CalendarDays,manpower:UsersRound,overhead:ReceiptText,targetMarket:ContactRound};
const labels:Record<string,string>={identity:"Business Details",businessStage:"Business stage and goals",operations:"Business Operations",locationExpenses:"Business space costs",manpower:"Manpower Cost",ownerLabor:"Pay for your own work",overhead:"Business Expenses",targetMarket:"Customers",salesChannels:"Selling channels"};
const categories=["Food and Beverage","Handmade and Crafts","Customized Products","Retail and E-Commerce","Small-Scale Manufacturing","Other Product-Based Business"];
const stages=["Still planning","Newly operating","Operating and growing","Operating but breaking even","Operating but struggling","Temporarily inactive","Previously operated"];
const locationTypes=["From home","Rented commercial space","Owned commercial space","Shared kitchen","Shared workspace","Online only","Pop-up or temporary location","Multiple locations"];
const employmentTypes=["Owner","Family member","Full-time employee","Part-time employee","Freelancer","Contractual worker"];
const customerGroups=["Students","Working professionals","Parents","Office workers","Nearby residents","Online shoppers","Gift buyers","Resellers","Walk-in customers","Other"];
const buyingReasons=["Daily use","School or work","Gift giving","Special occasions","Convenience","Personal use"];
const customerPriorities=["Affordable price","Good quality","Easy to buy","Fast service","Unique product","Custom orders","Nice packaging","Trusted brand","Eco-friendly"];
const channels=["Physical store","Facebook","Instagram","TikTok Shop","Shopee","Lazada","Website","Pop-up markets","Resellers","Direct orders","Other"];
const locations=["Quezon City","Manila","Caloocan","Las Piñas","Makati","Malabon","Mandaluyong","Marikina","Muntinlupa","Navotas","Parañaque","Pasay","Pasig","San Juan","Taguig","Valenzuela","Pateros","Abra","Agusan del Norte","Agusan del Sur","Aklan","Albay","Antique","Apayao","Aurora","Basilan","Bataan","Batanes","Batangas","Benguet","Biliran","Bohol","Bukidnon","Bulacan","Cagayan","Camarines Norte","Camarines Sur","Camiguin","Capiz","Catanduanes","Cavite","Cebu","Cotabato","Davao de Oro","Davao del Norte","Davao del Sur","Davao Occidental","Davao Oriental","Dinagat Islands","Eastern Samar","Guimaras","Ifugao","Ilocos Norte","Ilocos Sur","Iloilo","Isabela","Kalinga","La Union","Laguna","Lanao del Norte","Lanao del Sur","Leyte","Maguindanao del Norte","Maguindanao del Sur","Marinduque","Masbate","Misamis Occidental","Misamis Oriental","Mountain Province","Negros Occidental","Negros Oriental","Northern Samar","Nueva Ecija","Nueva Vizcaya","Occidental Mindoro","Oriental Mindoro","Palawan","Pampanga","Pangasinan","Quezon","Quirino","Rizal","Romblon","Samar","Sarangani","Siquijor","Sorsogon","South Cotabato","Southern Leyte","Sultan Kudarat","Sulu","Surigao del Norte","Surigao del Sur","Tarlac","Tawi-Tawi","Zambales","Zamboanga del Norte","Zamboanga del Sur","Zamboanga Sibugay"];
const countries=["Philippines","Singapore","Malaysia","Indonesia","Thailand","Vietnam","Brunei","Cambodia","Laos","Myanmar","Other"];
const currencies=["PHP (₱)","USD ($)","SGD (S$)","MYR (RM)","IDR (Rp)","THB (฿)","VND (₫)"];
const currentYear=new Date().getFullYear();
const pastYears=Array.from({length:currentYear-1899},(_,index)=>String(currentYear-index));
const planningYears=Array.from({length:11},(_,index)=>String(currentYear+index));
const frequencies=["Daily","Weekly","Monthly","Quarterly","Semi-annual","Annual","One-time"];
const expenseCategories=[
  {value:"utilities",label:"Electricity, water, and utilities"},
  {value:"internet_and_communication",label:"Internet and communication"},
  {value:"Staff and admin pay",label:"Staff and admin pay"},
  {value:"Marketing and promotions",label:"Marketing and promotions"},
  {value:"Software and subscriptions",label:"Software and subscriptions"},
  {value:"Permits, licenses, and government fees",label:"Permits, licenses, and government fees · CAPEX"},
  {value:"Professional services",label:"Professional services"},
  {value:"Repairs and maintenance",label:"Repairs and maintenance"},
  {value:"Office and store supplies",label:"Office and store supplies"},
  {value:"Transportation and business travel",label:"Transportation and business travel"},
  {value:"Bank and payment fees",label:"Bank and payment fees"},
  {value:"Insurance",label:"Insurance"},
  {value:"Equipment and tools",label:"Equipment and tools · CAPEX"},
  {value:"other_business_expense",label:"Other business expense"},
];

const fieldSets:Record<string,any[]>={
  identity:[
    {key:"businessName",label:"Business name",placeholder:"e.g. Seoulful Sweets"},
    {key:"category",label:"Business category",type:"select",options:categories},
    {key:"description",label:"What does your business offer?",type:"textarea",placeholder:"Describe your main products or services in a few words.",wide:true},
    {key:"city",label:"City or province",type:"select",options:locations,wide:true},
    {key:"country",label:"Country",type:"select",options:countries},
    {key:"currency",label:"Currency",type:"select",options:currencies},
  ],
  businessStage:[
    {key:"stage",label:"Business stage",type:"select",options:stages,wide:true},
    {key:"startYear",label:"Year started",type:"select",options:pastYears,wide:true},
    {key:"plannedStartYear",label:"Planned start year",type:"select",options:planningYears,wide:true},
  ],
  operations:[
    {key:"locationType",label:"How the business operates",type:"select",options:locationTypes,helper:"Choose the setup that best describes where you usually make or sell your products.",wide:true},
    {key:"operatingDaysPerMonth",label:"Operating days per month",type:"number",helper:"Count the days your business normally operates in one month. Use a realistic month, not your busiest month."},
    {key:"operatingHoursPerDay",label:"Operating hours per day",type:"number",helper:"Enter the usual number of hours spent operating the business in one working day."},
    {key:"dailyProductionUnits",label:"Items produced per day",type:"number",helper:"Enter the usual number of finished items your business can make in one operating day."},
    {key:"dailySalesUnits",label:"Sales target per day",type:"number",helper:"Enter how many items you realistically plan to sell in one operating day."},
    {key:"averageMonthlyRevenue",label:"Average monthly revenue",type:"money",helper:"Enter your usual total sales for one month before subtracting costs and expenses.",wide:true},
    {key:"monthlyEstimate",type:"monthlyEstimate",wide:true},
  ],
  locationExpenses:[
    {key:"monthlyRent",label:"Monthly rent",type:"money"},
    {key:"associationDues",label:"Association dues",type:"money"},
    {key:"parkingFees",label:"Parking fees",type:"money"},
    {key:"storageFees",label:"Storage fees",type:"money"},
    {key:"otherLocationExpenses",label:"Other location cost",type:"money"},
  ],
  ownerLabor:[
    {key:"includeOwnTime",label:"Include your pay in product costs",type:"select",options:["Yes","No"],helper:"Choose Yes if you want the time you spend making products included in each product's labor cost.",wide:true},
    {key:"desiredMonthlyCompensation",label:"Desired monthly pay",type:"money",helper:"Enter the amount you want the business to pay you for your work each month."},
    {key:"workingHoursPerMonth",label:"Working hours per month",type:"number",helper:"Estimate the total hours you personally work for the business in a typical month."},
    {key:"productionPercent",label:"Time spent on production (%)",type:"number",helper:"Estimate what percentage of your work time is spent directly making or preparing products."},
    {key:"administrationPercent",label:"Time spent managing (%)",type:"number",helper:"Estimate what percentage of your work time is spent on planning, selling, bookkeeping, or managing the business."},
  ],
  targetMarket:[
    {key:"customerGroups",label:"Customer groups",type:"multi",options:customerGroups,helper:"Select all customer groups that commonly buy from your business.",wide:true},
    {key:"frequentGroup",label:"Most frequent customer group",type:"select",options:customerGroups,helper:"Choose the customer group that buys from you most often."},
    {key:"ageGroup",label:"Typical age group",type:"select",options:["Under 18","18–24","25–34","35–44","45–54","55 and above","Mixed ages"],helper:"Choose the age range that best represents most of your customers."},
    {key:"customerLocation",label:"Main city or area",helper:"Enter where most of your customers live, work, study, or usually order from."},
    {key:"spendingPerOrder",label:"Usual spending per order",type:"money",helper:"Enter the amount a typical customer usually spends in one order."},
    {key:"purchaseFrequency",label:"Purchase frequency",type:"select",options:["More than once a week","About once a week","A few times a month","About once a month","Only for special occasions","Not sure yet"],helper:"Choose how often a typical customer buys from your business."},
    {key:"buyingReasons",label:"Reasons they buy",type:"reasons",options:buyingReasons,helper:"Add the main situations or needs that lead customers to buy from you.",wide:true},
    {key:"priorities",label:"What matters most",type:"multi",options:customerPriorities,max:3,helper:"Choose up to three qualities customers value most when deciding to buy.",wide:true},
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
  if(key==="overhead"){const rows=[...(profile.overhead?.fixed||[]),...(profile.overhead?.variable||[]),...(profile.overhead?.periodic||[])].filter((row:any)=>row.name||Number(row.amount));const total=monthlyOperationCost(profile)+payrollMonthly(profile);const capex=capitalExpenseTotal(profile);return rows.length||spaceCostsMonthly(profile)||payrollMonthly(profile)?`${money(total)} monthly OPEX${capex?` · ${money(capex)} CAPEX`:""}`:"No business expenses recorded"}
  if(key==="targetMarket")return useful([...(profile.targetMarket?.customerGroups||[]).slice(0,2),profile.targetMarket?.customerLocation,profile.targetMarket?.spendingPerOrder?`${money(profile.targetMarket.spendingPerOrder)} typical spend`:""]).join(" · ")||"Add customer details";
  if(key==="salesChannels")return (profile.salesChannels||[]).map((row:any)=>row.name).filter(Boolean).join(" · ")||"No selling channels added";
  return "Not provided";
}

function FieldLabel({field}:any){
  return <span className="bp-field-label"><span>{field.label}</span>{field.helper&&<span className="bp-field-help" tabIndex={0} role="button" aria-label={`How to fill in ${field.label}`}><Info className="h-4 w-4" aria-hidden="true"/><span role="tooltip">{field.helper}</span></span>}</span>;
}

function Field({field,draft,setDraft}:any){
  const value=draft?.[field.key]??(field.type==="multi"?[]:"");
  const update=(next:any)=>setDraft((current:any)=>({...current,[field.key]:next}));
  const guideProps={id:`bp-field-${field.key}`,"data-profile-field":field.key};
  if(field.type==="monthlyEstimate"){
    const days=Number(draft?.operatingDaysPerMonth)||0;
    const production=Math.round(days*(Number(draft?.dailyProductionUnits)||0));
    const sales=Math.round(days*(Number(draft?.dailySalesUnits)||0));
    return <section {...guideProps} className="bp-monthly-estimate" aria-live="polite"><span>Calculated monthly estimate</span>{production||sales?<div><p><strong>{production.toLocaleString("en-PH")}</strong> items produced per month</p><p><strong>{sales.toLocaleString("en-PH")}</strong> items sales target per month</p></div>:<p>Add your operating days and daily numbers to see the monthly estimate.</p>}</section>;
  }
  if(field.type==="reasons"){
    const reasons=Array.isArray(value)&&value.length?value:[""];
    const change=(index:number,next:string)=>update(reasons.map((reason:string,i:number)=>i===index?next:reason));
    return <fieldset {...guideProps} className="bp-field wide"><legend><FieldLabel field={field}/></legend>{reasons.map((reason:string,index:number)=>{
      const custom=reason!==""&&!field.options.includes(reason);
      return <div key={index} style={{display:"grid",gap:8,marginTop:8}}>
        <label><span className="sr-only">Buying reason {index+1}</span><select value={custom?"Other":reason} onChange={event=>change(index,event.target.value==="Other"?"Other: ":event.target.value)}><option value="">Select a reason</option>{field.options.map((option:string)=><option key={option}>{option}</option>)}<option>Other</option></select></label>
        {custom&&<label><span>Please specify</span><textarea rows={2} maxLength={300} placeholder="Tell us why your customers buy" value={reason.replace(/^Other: ?/,"")} onChange={event=>change(index,`Other: ${event.target.value}`)}/></label>}
        {reasons.length>1&&<button type="button" onClick={()=>update(reasons.filter((_:string,i:number)=>i!==index))}>Remove reason</button>}
      </div>;
    })}<button type="button" onClick={()=>update([...reasons,""])}>+ Add another reason</button></fieldset>;
  }
  if(field.type==="multi")return <fieldset {...guideProps} className={`bp-field bp-choice-field${field.wide?" wide":""}`}><legend><FieldLabel field={{...field,label:`${field.label}${field.max?` · Choose up to ${field.max}`:""}`}}/></legend><div>{field.options.map((option:string)=>{const selected=(value||[]).includes(option);return <button key={option} type="button" className={selected?"selected":""} onClick={()=>{const list=value||[];if(selected)update(list.filter((item:string)=>item!==option));else if(!field.max||list.length<field.max)update([...list,option])}}>{option}</button>})}</div></fieldset>;
  const selectOptions=field.type==="select"&&value&&!field.options.includes(String(value))?[String(value),...field.options]:field.options;
  return <label {...guideProps} className={`bp-field${field.wide?" wide":""}`}><FieldLabel field={field}/>{field.type==="textarea"?<textarea rows={3} placeholder={field.placeholder} value={value} onChange={event=>update(event.target.value)}/>:field.type==="select"?<select value={value} onChange={event=>update(event.target.value)}><option value="">Select an option</option>{selectOptions.map((option:string)=><option key={option}>{option}</option>)}</select>:field.type==="money"?<div className="bp-money-input"><span>PHP</span><input type="number" min="0" value={value||""} onChange={event=>update(event.target.value===""?"":Number(event.target.value))}/></div>:<input type={field.type||"text"} min={field.type==="number"?0:undefined} placeholder={field.placeholder} value={value} onChange={event=>update(field.type==="number"?(event.target.value===""?"":Number(event.target.value)):event.target.value)}/>}</label>;
}

function TeamEditor({draft,setDraft}:any){
  const rows=Array.isArray(draft)?draft:[];
  const update=(id:string,key:string,value:any)=>setDraft(rows.map((row:any)=>row.id===id?{...row,[key]:value}:row));
  return <div className="bp-repeat-list">{rows.map((row:any)=><article key={row.id}><div className="bp-repeat-grid"><label className="wide"><FieldLabel field={{label:"Role",helper:"Enter the person's role in the business, such as Baker, Cashier, or Production Assistant."}}/><input placeholder="e.g. Baker or Cashier" value={row.nameOrRole||""} onChange={event=>update(row.id,"nameOrRole",event.target.value)}/></label><label><FieldLabel field={{label:"Employment type",helper:"Choose the arrangement that best describes how this person works with the business."}}/><select value={row.employmentType||""} onChange={event=>update(row.id,"employmentType",event.target.value)}>{employmentTypes.map(item=><option key={item}>{item}</option>)}</select></label><label><FieldLabel field={{label:"Monthly pay",helper:"Enter this person's regular pay for one month, before benefits and employer contributions."}}/><input type="number" min="0" value={row.amount||""} onChange={event=>update(row.id,"amount",event.target.value===""?"":Number(event.target.value))}/></label><label><FieldLabel field={{label:"Benefits and allowances",helper:"Add monthly benefits or allowances paid by the business, such as meals or transportation."}}/><input type="number" min="0" value={row.benefits||""} onChange={event=>update(row.id,"benefits",event.target.value===""?"":Number(event.target.value))}/></label><label><FieldLabel field={{label:"Employer contributions",helper:"Enter the business-paid monthly share for required contributions such as SSS, PhilHealth, and Pag-IBIG."}}/><input type="number" min="0" value={row.contributions||""} onChange={event=>update(row.id,"contributions",event.target.value===""?"":Number(event.target.value))}/></label><label><FieldLabel field={{label:"Working days per month",helper:"Enter the usual number of days this person works for the business in one month."}}/><input type="number" min="0" value={row.workingDays||""} onChange={event=>update(row.id,"workingDays",event.target.value===""?"":Number(event.target.value))}/></label></div><button className="bp-remove-row" type="button" onClick={()=>setDraft(rows.filter((item:any)=>item.id!==row.id))} aria-label={`Remove ${row.nameOrRole||"team member"}`}><Trash2 aria-hidden="true"/> Remove</button></article>)}<button className="bp-add-row" type="button" onClick={()=>setDraft([...rows,{id:crypto.randomUUID(),nameOrRole:"",employmentType:"Full-time employee",rateType:"Monthly salary",amount:0,workingDays:0,workingHours:0,benefits:0,contributions:0,productionPercent:0,classification:"Direct labor"}])}><Plus aria-hidden="true"/> Add team member</button></div>;
}

function ExpenseEditor({draft,setDraft,profile}:any){
  const[newExpense,setNewExpense]=useState({name:"",category:"",frequency:"Monthly",amount:""});
  const rows=[...(draft.fixed||[]),...(draft.variable||[]),...(draft.periodic||[])];
  const opexCount=rows.filter((row:any)=>expenseCostType(row)==="opex").length;
  const capexCount=rows.length-opexCount;
  const update=(id:string,key:string,value:any)=>{const change=(row:any)=>row.id===id?{...row,[key]:value,...(key==="category"?{costType:expenseCostType(value)}:{})}:row;setDraft((current:any)=>({...current,fixed:(current.fixed||[]).map(change),variable:(current.variable||[]).map(change),periodic:(current.periodic||[]).map(change)}))};
  const remove=(id:string)=>setDraft((current:any)=>({...current,fixed:(current.fixed||[]).filter((row:any)=>row.id!==id),variable:(current.variable||[]).filter((row:any)=>row.id!==id),periodic:(current.periodic||[]).filter((row:any)=>row.id!==id)}));
  const spaceMonthly=spaceCostsMonthly(profile);
  const operationMonthly=monthlyOperationCost({...profile,overhead:draft});
  const otherBusinessMonthly=Math.max(0,operationMonthly-spaceMonthly);
  const capex=capitalExpenseTotal({...profile,overhead:draft});
  const businessMonthly=otherBusinessMonthly+spaceMonthly;
  const manpower=payrollMonthly(profile);
  const monthly=businessMonthly+manpower;
  const daily=monthly/(Number(profile.operations?.operatingDaysPerMonth)||30);
  const annual=monthly*12;
  const addExpense=()=>{
    if(!newExpense.name.trim()||!newExpense.category||!Number(newExpense.amount))return;
    const group=newExpense.frequency==="Annual"||newExpense.frequency==="One-time"?"periodic":"fixed";
    setDraft((current:any)=>({...current,[group]:[...(current[group]||[]),{id:crypto.randomUUID(),group,name:newExpense.name.trim(),category:newExpense.category,costType:expenseCostType(newExpense.category),amount:Number(newExpense.amount),frequency:newExpense.frequency,startDate:"",notes:""}]}));
    setNewExpense({name:"",category:"",frequency:"Monthly",amount:""});
  };
  const categoryOptions=(current="")=>{const value=expenseCategoryCode(current);return value&&!expenseCategories.some(option=>option.value===value)?[{value,label:String(value).replaceAll("_"," ").replace(/^./,letter=>letter.toUpperCase())},...expenseCategories]:expenseCategories};
  return <div className="bp-expense-workspace">
    <section className="bp-expense-summary" aria-label="Expense overview">
      <div className="bp-expense-primary-metrics">
        <article><span>Monthly operating expenses <b>OPEX</b></span><strong>{money(monthly)}</strong><small>Included in product operation cost</small></article>
        <article><span>Capital expenses recorded <b>CAPEX</b></span><strong>{money(capex)}</strong><small>Tracked separately from operation cost</small></article>
      </div>
      <dl className="bp-expense-supporting-metrics">
        <div><dt>Daily OPEX</dt><dd>{money(daily)}</dd></div>
        <div><dt>Annual OPEX</dt><dd>{money(annual)}</dd></div>
        <div><dt>Manpower</dt><dd>{money(manpower)}</dd></div>
        <div><dt>Other OPEX</dt><dd>{money(otherBusinessMonthly)}</dd></div>
      </dl>
    </section>
    <section className="bp-expense-entry" aria-labelledby="bp-add-expense-title">
      <div><h3 id="bp-add-expense-title">Record expense</h3><p>Add the expense details. Its category determines whether it affects operation cost.</p></div>
      <div className="bp-expense-entry-grid">
        <label><span>Expense name</span><input value={newExpense.name} placeholder="e.g. Electricity" onChange={event=>setNewExpense(current=>({...current,name:event.target.value}))}/></label>
        <label><span>Category</span><select value={newExpense.category} onChange={event=>setNewExpense(current=>({...current,category:event.target.value}))}><option value="">Select category</option>{expenseCategories.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span>Frequency</span><select value={newExpense.frequency} onChange={event=>setNewExpense(current=>({...current,frequency:event.target.value}))}>{frequencies.map(item=><option key={item}>{item}</option>)}</select></label>
        <label><span>Amount</span><div className="bp-expense-amount"><span>₱</span><input type="number" min="0" value={newExpense.amount} placeholder="0.00" onChange={event=>setNewExpense(current=>({...current,amount:event.target.value}))}/></div></label><span className="bp-expense-entry-spacer" aria-hidden="true"/>
      </div>
      <div className="bp-expense-entry-actions"><button className="bp-expense-add" type="button" disabled={!newExpense.name.trim()||!newExpense.category||!Number(newExpense.amount)} onClick={addExpense}><Plus aria-hidden="true"/> Add expense</button></div>
    </section>
    <section className="bp-expense-records">
      <div className="bp-expense-toolbar"><div><h3>Expense records</h3><p>{rows.length?`${rows.length} ${rows.length===1?"expense":"expenses"} recorded`:"Your added expenses will appear here."}</p></div>{rows.length?<div className="bp-expense-record-counts" aria-label={`${opexCount} OPEX and ${capexCount} CAPEX records`}><span>{opexCount} OPEX</span><span>{capexCount} CAPEX</span></div>:null}</div>
      {rows.length?<div className="bp-expense-table" role="table" aria-label="Expense records">
        <div className="bp-expense-table-head" role="row"><span role="columnheader">Expense</span><span role="columnheader">Category and type</span><span role="columnheader">Frequency</span><span role="columnheader">Amount</span><span aria-hidden="true"/></div>
        {rows.map((row:any)=>{const costType=expenseCostType(row);return <div className={`bp-expense-row is-${costType}`} role="row" key={row.id}>
          <label><span className="bp-mobile-label">Expense</span><input aria-label="Expense name" value={row.name||""} placeholder="Expense name" onChange={event=>update(row.id,"name",event.target.value)}/></label>
          <label><span className="bp-mobile-label">Category</span><select aria-label={`Category for ${row.name||"expense"}`} value={expenseCategoryCode(row.category)} onChange={event=>update(row.id,"category",event.target.value)}><option value="">Select category</option>{categoryOptions(row.category).map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span className="bp-mobile-label">Frequency</span><select aria-label={`Frequency for ${row.name||"expense"}`} value={row.frequency||"Monthly"} onChange={event=>update(row.id,"frequency",event.target.value)}>{frequencies.map(item=><option key={item}>{item}</option>)}</select></label>
          <label><span className="bp-mobile-label">Amount</span><div className="bp-expense-amount"><span>₱</span><input aria-label={`Amount for ${row.name||"expense"}`} type="number" min="0" value={row.amount||""} onChange={event=>update(row.id,"amount",event.target.value===""?"":Number(event.target.value))}/></div></label>
          <button className="bp-expense-delete" type="button" onClick={()=>remove(row.id)} aria-label={`Remove ${row.name||"expense"}`} title="Remove expense"><Trash2 aria-hidden="true"/></button>
        </div>})}
      </div>:<div className="bp-expense-empty"><span>+</span><div><strong>No expenses yet</strong><p>Use the form above to add your first business expense.</p></div></div>}
    </section>
  </div>;
}

function ChannelEditor({draft,setDraft}:any){
  const rows=Array.isArray(draft)?draft:[];
  const isSelected=(name:string)=>name==="Other"?rows.some((row:any)=>row.name==="Other"||String(row.name).startsWith("Other: ")):rows.some((row:any)=>row.name===name);
  const toggle=(name:string)=>{const selected=isSelected(name);setDraft(selected?rows.filter((row:any)=>name==="Other"?row.name!=="Other"&&!String(row.name).startsWith("Other: "):row.name!==name):[...rows,{id:crypto.randomUUID(),name,commissionPercentage:0,transactionFeePercentage:0,listingFee:0,deliverySubsidy:0,advertisingCost:0,packagingRequirement:"",refundAllowance:0,otherCosts:0}])};
  const otherRow=rows.find((row:any)=>row.name==="Other"||String(row.name).startsWith("Other: "));
  const updateOther=(value:string)=>setDraft(rows.map((row:any)=>row.id===otherRow?.id?{...row,name:value.trimStart()?`Other: ${value.trimStart()}`:"Other"}:row));
  return <fieldset className="bp-channel-editor"><legend>Where can customers buy from you?</legend><p className="bp-channel-note">Select all that apply. You can update these anytime.</p><div className="bp-channel-options">{channels.map(name=>{const selected=isSelected(name);const isOther=name==="Other";return <div key={name} className={`bp-channel-option${selected?" selected":""}${isOther&&selected?" has-custom":""}`}><label><input type="checkbox" checked={selected} onChange={()=>toggle(name)}/><span className="bp-channel-check" aria-hidden="true">{selected?<Check/>:null}</span><span>{name}{isOther&&selected?":":""}</span></label>{isOther&&selected&&<input className="bp-channel-other-input" autoFocus aria-label="Other selling channel" type="text" value={String(otherRow?.name||"").replace(/^Other(?:: ?)?/,"")} onChange={event=>updateOther(event.target.value)}/>}</div>})}</div><p className="bp-channel-count" aria-live="polite">{rows.length?`${rows.length} ${rows.length===1?"channel":"channels"} selected`:"No channels selected yet"}</p></fieldset>;
}

function operationsDraft(value:any){
  const next=clone(value||{});
  const days=Number(next.operatingDaysPerMonth)||0;
  const usesDailyInputs=Number(next.dailyOperationsVersion)>=1;
  if(!usesDailyInputs||next.dailyProductionUnits==null||next.dailyProductionUnits==="")next.dailyProductionUnits=days&&Number(next.monthlyProductionUnits)>0?Math.round(Number(next.monthlyProductionUnits)/days*100)/100:0;
  if(!usesDailyInputs||next.dailySalesUnits==null||next.dailySalesUnits==="")next.dailySalesUnits=days&&Number(next.monthlySalesUnits||next.monthlySalesTarget)>0?Math.round(Number(next.monthlySalesUnits||next.monthlySalesTarget)/days*100)/100:0;
  return next;
}

function visibleFields(section:string,draft:any){
  const fields=fieldSets[section]||[];
  if(section==="businessStage")return fields.filter(field=>field.key!=="startYear"&&field.key!=="plannedStartYear").concat(fields.filter(field=>field.key===(draft?.stage==="Still planning"?"plannedStartYear":"startYear")));
  if(section==="ownerLabor"&&draft?.includeOwnTime!=="Yes")return fields.filter(field=>field.key==="includeOwnTime");
  return fields;
}

export default function BusinessProfile({focusSection="identity",focusField="",editRequest=0,onEditRequestHandled,returnToCalculator=false,onReturnToCalculator}:{focusSection?:string;focusField?:string;editRequest?:number;onEditRequestHandled?:()=>void;returnToCalculator?:boolean;onReturnToCalculator?:()=>void}){
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
  useEffect(()=>{let cancelled=false;(async()=>{try{const data=await apiJson("/api/business-profile");if(cancelled)return;const next=normalizeBusinessProfile(data,profile||{});setProfile(next);setRemoteProfileExists(Boolean(next.meta?.businessProfileId));localStorage.setItem("kostaraa.businessProfile",JSON.stringify(next));window.dispatchEvent(new CustomEvent("kostaraa:business-settings-changed",{detail:next}))}catch{}})();return()=>{cancelled=true}},[]);
  useEffect(()=>{if(!editing)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!saving)setEditing(null)};document.addEventListener("keydown",close);return()=>document.removeEventListener("keydown",close)},[editing,saving]);
  useEffect(()=>{if(!focusSection||!profile)return;const frame=requestAnimationFrame(()=>document.getElementById(`profile-${focusSection}`)?.scrollIntoView({behavior:"smooth",block:"start"}));return()=>cancelAnimationFrame(frame)},[focusSection,profile]);
  const openEditor=(key:string)=>{setDraft(key==="identity"?{identity:clone(profile.identity||{}),businessStage:clone(profile.businessStage||{}),salesChannels:clone(profile.salesChannels||[])}:key==="manpower"?{manpower:clone(profile.manpower||[]),ownerLabor:clone(profile.ownerLabor||{})}:key==="overhead"?{locationExpenses:clone(profile.locationExpenses||{}),overhead:clone(profile.overhead||{})}:key==="operations"?operationsDraft(profile.operations||{}):clone(profile[key]??{}));setSaveError("");setEditing(key)};
  useEffect(()=>{if(!editRequest){handledEditRequest.current=0;return}if(handledEditRequest.current===editRequest||!profile)return;handledEditRequest.current=editRequest;openEditor(focusSection||"identity");onEditRequestHandled?.()},[editRequest,focusSection,profile]);
  useEffect(()=>{
    if(editing!=="operations"||!draft)return;
    const days=Number(draft.operatingDaysPerMonth)||0;
    const monthlyProductionUnits=Math.round(days*(Number(draft.dailyProductionUnits)||0));
    const monthlySalesUnits=Math.round(days*(Number(draft.dailySalesUnits)||0));
    if(Number(draft.monthlyProductionUnits)===monthlyProductionUnits&&Number(draft.monthlySalesUnits)===monthlySalesUnits&&Number(draft.monthlySalesTarget)===monthlySalesUnits)return;
    setDraft((current:any)=>({...current,dailyOperationsVersion:1,monthlyProductionUnits,monthlySalesUnits,monthlySalesTarget:monthlySalesUnits,monthlyUnitEstimate:monthlyProductionUnits}));
  },[editing,draft?.operatingDaysPerMonth,draft?.dailyProductionUnits,draft?.dailySalesUnits]);
  useEffect(()=>{
    if(!editing||!focusField)return;
    const timer=window.setTimeout(()=>{
      const target=document.getElementById(`bp-field-${focusField}`);
      if(!target)return;
      target.classList.remove("bp-guide-focus");
      void target.offsetWidth;
      target.classList.add("bp-guide-focus");
      target.scrollIntoView({behavior:"smooth",block:"center"});
      target.querySelector<HTMLElement>("input, select, textarea, button")?.focus({preventScroll:true});
    },120);
    return()=>window.clearTimeout(timer);
  },[editing,focusField]);
  const saveSection=async()=>{if(!editing)return;setSaving(true);setSaveError("");const changed=editing==="identity"?{...profile,identity:draft.identity,businessStage:draft.businessStage,salesChannels:draft.salesChannels,meta:{...profile.meta,updatedAt:new Date().toISOString()}}:editing==="manpower"?{...profile,manpower:draft.manpower,ownerLabor:draft.ownerLabor,meta:{...profile.meta,updatedAt:new Date().toISOString()}}:editing==="overhead"?{...profile,locationExpenses:draft.locationExpenses,overhead:draft.overhead,meta:{...profile.meta,updatedAt:new Date().toISOString()}}:{...profile,[editing]:draft,meta:{...profile.meta,updatedAt:new Date().toISOString()}};if(editing==="targetMarket"&&(draft.buyingReasons||[]).some((reason:string)=>reason.startsWith("Other:")&&!reason.slice(6).trim())){setSaveError("Please describe the other reason your customers buy.");setSaving(false);return}if(editing==="targetMarket")changed.targetMarket={...changed.targetMarket,buyingReasons:(draft.buyingReasons||[]).map((reason:string)=>reason.trim()).filter(Boolean)};const next=withSynchronizedOperationCost(changed);try{let saved=next;if(!isOfflineUser()){const payload=businessProfilePayload(next,next.meta?.status||"complete",next.meta?.onboardingStep||8);const data=await apiJson("/api/business-profile",{method:remoteProfileExists||next.meta?.businessProfileId?"PATCH":"POST",body:JSON.stringify(payload)});saved=withSynchronizedOperationCost(normalizeBusinessProfile(data,next));setRemoteProfileExists(true)}setProfile(saved);localStorage.setItem("kostaraa.businessProfile",JSON.stringify(saved));window.dispatchEvent(new CustomEvent("kostaraa:business-settings-changed",{detail:saved}));window.dispatchEvent(new CustomEvent("kostaraa:araa-guide",{detail:{type:"business-settings-complete"}}));setEditing(null);setDraft(null)}catch(error:any){setSaveError(error?.message||"Unable to save these changes.")}finally{setSaving(false)}};
  return <div className="bp-page"><header>{returnToCalculator&&<button className="bp-context-back" type="button" onClick={onReturnToCalculator}><ArrowLeft aria-hidden="true"/> Back to Calculator</button>}<h1>Business Settings</h1></header><div className="bp-list" role="list">{sections.map(key=>{const SectionIcon=sectionIcons[key];return <section id={`profile-${key}`} key={key} role="listitem"><button className="bp-row-main" type="button" onClick={()=>openEditor(key)} aria-label={`Edit ${labels[key]}`}><span className="bp-row-icon"><SectionIcon aria-hidden="true"/></span><span className="bp-row-copy"><h2>{labels[key]}</h2></span></button><button type="button" onClick={()=>openEditor(key)}><Pencil aria-hidden="true"/> Edit</button></section>})}</div>{editing&&<div className={`bp-editor-modal${editing==="overhead"?" is-expenses":""}${editing==="identity"?" is-identity":""}`} role="dialog" aria-modal="true" aria-labelledby="bp-editor-title"><button className="bp-editor-scrim" type="button" onClick={()=>!saving&&setEditing(null)} aria-label="Close editor"/><article><header><div><h2 id="bp-editor-title">Edit {labels[editing].toLowerCase()}</h2>{editing==="identity"&&<p>These details help personalize your costing and business insights.</p>}</div><button type="button" onClick={()=>setEditing(null)} disabled={saving} aria-label="Close"><X aria-hidden="true"/></button></header><div className="bp-editor-body">{editing==="identity"?<div className="bp-combined-editor"><section><div className="bp-form-grid">{fieldSets.identity.map(field=><Field key={field.key} field={field} draft={draft.identity} setDraft={(update:any)=>setDraft((current:any)=>({...current,identity:typeof update==="function"?update(current.identity):update}))}/>)}</div></section><section><div className="bp-form-grid">{visibleFields("businessStage",draft.businessStage).map(field=><Field key={field.key} field={field} draft={draft.businessStage} setDraft={(update:any)=>setDraft((current:any)=>({...current,businessStage:typeof update==="function"?update(current.businessStage):update}))}/>)}</div></section><section><h3>Selling channels</h3><ChannelEditor draft={draft.salesChannels} setDraft={(update:any)=>setDraft((current:any)=>({...current,salesChannels:typeof update==="function"?update(current.salesChannels):update}))}/></section></div>:editing==="manpower"?<div className="bp-combined-editor"><section><h3>Team members</h3><TeamEditor draft={draft.manpower} setDraft={(update:any)=>setDraft((current:any)=>({...current,manpower:typeof update==="function"?update(current.manpower):update}))}/></section><section><h3>Pay for your own work</h3><div className="bp-form-grid">{visibleFields("ownerLabor",draft.ownerLabor).map(field=><Field key={field.key} field={field} draft={draft.ownerLabor} setDraft={(update:any)=>setDraft((current:any)=>({...current,ownerLabor:typeof update==="function"?update(current.ownerLabor):update}))}/>)}</div></section></div>:editing==="overhead"?<div className="bp-combined-editor"><section><h3>Space costs</h3><div className="bp-form-grid">{fieldSets.locationExpenses.map(field=><Field key={field.key} field={field} draft={draft.locationExpenses} setDraft={(update:any)=>setDraft((current:any)=>({...current,locationExpenses:typeof update==="function"?update(current.locationExpenses):update}))}/>)}</div></section><section><h3>Other business expenses</h3><ExpenseEditor draft={draft.overhead} setDraft={(update:any)=>setDraft((current:any)=>({...current,overhead:typeof update==="function"?update(current.overhead):update}))} profile={{...profile,locationExpenses:draft.locationExpenses}}/></section></div>:<div className="bp-form-grid">{visibleFields(editing,draft).map(field=><Field key={field.key} field={field} draft={draft} setDraft={setDraft}/>)}</div>}{saveError&&<p className="bp-save-error" role="alert">{saveError}</p>}</div><footer>{returnToCalculator&&<button className="bp-return-button" type="button" onClick={onReturnToCalculator} disabled={saving}><ArrowLeft aria-hidden="true"/> Back to Calculator</button>}<button type="button" onClick={()=>setEditing(null)} disabled={saving}>Cancel</button><button className="primary" type="button" onClick={saveSection} disabled={saving}>{saving?"Saving…":"Save changes"}</button></footer></article></div>}</div>;
}
