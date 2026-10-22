import {useMemo} from "react";
import {BookOpen,Calculator,CheckCircle2,Plus,TriangleAlert,Users} from "lucide-react";
import {withSynchronizedOperationCost} from "../business-profile-costs";
import "../styles/business-dashboard.css";

const money=(value:number)=>`₱${Number(value||0).toLocaleString(undefined,{maximumFractionDigits:2})}`;
const number=(value:number)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:1});
function readProfile(){try{return withSynchronizedOperationCost(JSON.parse(localStorage.getItem("kostaraa.businessProfile")||"{}"))}catch{return {}}}
function materialTotal(item:any){return (item.materials||[]).reduce((sum:number,row:any)=>sum+Number(row.computedCost||0),0)}
function packagingTotal(item:any){return (item.packagingMaterials||[]).reduce((sum:number,row:any)=>sum+Number(row.computedCost||0),0)+Number(item.otherVariableCosts?.packaging||0)}
function laborPerItem(item:any){if(item.operationalOverride?.enabled)return Number(item.operationalOverride.laborCostPerUnit)||0;const labor=item.laborConfig||{};const units=Number(labor.workingDays||0)*Number(labor.outputPerDay||0);return units?Number(labor.monthlyCost||0)/units:Number(item.otherVariableCosts?.labor||0)}
function operationPerItem(item:any){if(item.operationalOverride?.enabled)return Number(item.operationalOverride.overheadCostPerUnit)||0;return Number(item.expectedMonthlySales)>0?Number(item.monthlyFixedCosts||0)/Number(item.expectedMonthlySales):0}
function variableCostPerItem(item:any){const other=item.otherVariableCosts||{};return materialTotal(item)+packagingTotal(item)+Number(other.platform||0)+Number(other.marketing||0)+Number(other.other||0)+Number(item.pricingInputs?.marketingAmount||0)+Number(item.pricingInputs?.taxAmount||0)}

function pricingHealth(item:any){
  const price=Number(item.sellingPrice)||0;
  const cost=Number(item.costPerProduct??item.finalCost??item.finalCostInMind)||0;
  const margin=Number(item.profitMargin)||0;
  const targetMargin=Number(item.targetProfitMargin)||0;
  if(price>0&&cost>0&&(price<=cost||margin<=0))return{key:"risk",label:"At risk",reason:"Price may not cover saved costs",targetMargin};
  if(!price||!cost)return{key:"review",label:"Needs review",reason:"Complete the saved price and cost",targetMargin};
  if(!targetMargin)return{key:"review",label:"Needs review",reason:"Add a target margin",targetMargin};
  if(margin<targetMargin)return{key:"review",label:"Needs review",reason:"Margin is below the saved target",targetMargin};
  return{key:"healthy",label:"Healthy",reason:"Margin meets the saved target",targetMargin};
}

export default function BusinessDashboard({business,savedItems,onReviewAttention,setPage}:{business:any;savedItems:any[];onReviewAttention:()=>void;setPage:(page:string)=>void}){
  const data=useMemo(()=>{
    const profile=readProfile();
    const items=(savedItems||[]).filter(item=>item.status!=="Archived");
    const pricingRows=items.map(item=>({...item,pricingHealth:pricingHealth(item)}));
    const pricedItems=pricingRows.filter(item=>Number(item.sellingPrice)>0);
    const attention=pricingRows.filter(item=>item.pricingHealth.key!=="healthy");
    const operations=profile?.operations||{};
    const manpowerRows=(profile?.manpower||[]).filter((row:any)=>row.nameOrRole||row.position||Number(row.amount)>0||Number(row.benefits)>0||Number(row.contributions)>0);
    const ownerLabor=profile?.ownerLabor||{};
    const manpowerTotal=manpowerRows.reduce((sum:number,row:any)=>sum+Number(row.amount||0)+Number(row.benefits||0)+Number(row.contributions||0),0)+(ownerLabor.includeOwnTime==="Yes"?Number(ownerLabor.desiredMonthlyCompensation||0):0);
    const target=Number(operations.monthlySalesUnits||operations.monthlySalesTarget)||0;
    const days=Number(profile?.operations?.operatingDaysPerMonth)||26;
    const labor=manpowerTotal;
    const overhead=Number(profile?.calculatorCosts?.overheadMonthly||profile?.overhead?.monthlyOverheadPool)||Number(business?.overhead?.rent||0)+Number(business?.overhead?.utilities||0)+Number(business?.overhead?.miscellaneous||0);
    const costs=[
      {name:"Raw materials",value:items.reduce((sum,item)=>sum+materialTotal(item),0)},
      {name:"Packaging",value:items.reduce((sum,item)=>sum+packagingTotal(item),0)},
      {name:"Labor",value:items.reduce((sum,item)=>sum+laborPerItem(item),0)},
      {name:"Operation costs",value:items.reduce((sum,item)=>sum+operationPerItem(item),0)},
      {name:"Marketing",value:items.reduce((sum,item)=>sum+Number(item.pricingInputs?.marketingAmount||0),0)},
      {name:"Tax",value:items.reduce((sum,item)=>sum+Number(item.pricingInputs?.taxAmount||0),0)},
    ];
    const market=profile?.targetMarket||{};
    const groups=market.customerGroups||[];
    const channels=(profile?.salesChannels||[]).map((channel:any)=>typeof channel==="string"?channel:channel.name).filter(Boolean);
    const expenseRows=[...(profile?.overhead?.fixed||[]),...(profile?.overhead?.variable||[]),...(profile?.overhead?.periodic||[])];
    const locationExpenses=profile?.locationExpenses||{};
    const hasBusinessExpenses=expenseRows.some((row:any)=>Number(row.amount)>0)||["monthlyRent","associationDues","parkingFees","storageFees","otherLocationExpenses"].some(key=>Number(locationExpenses[key])>0);
    const completeness=[
      {label:"About your business",done:Boolean(profile?.identity?.businessName&&profile?.identity?.category)},
      {label:"Business operations",done:Boolean(operations.locationType&&Number(operations.operatingDaysPerMonth)>0&&target>0)},
      {label:"Manpower cost",done:Boolean(manpowerRows.length||ownerLabor.includeOwnTime==="Yes"&&Number(ownerLabor.desiredMonthlyCompensation)>0)},
      {label:"Business expenses",done:hasBusinessExpenses},
      {label:"Your customers",done:Boolean(groups.length)},
      {label:"Selling channels",done:Boolean(channels.length)},
    ];
    return{items,pricedItems,attention,target,days,labor,overhead,costs,market,groups,channels,completeness,completeCount:completeness.filter(row=>row.done).length};
  },[business,savedItems]);

  const costColors=["#3a74ba","#17a6a1","#f59e0b","#7c5ce5","#e85d75","#38a169"];
  const costTotal=data.costs.reduce((sum,cost)=>sum+cost.value,0);
  let costCursor=0;
  const costGradient=costTotal>0?`conic-gradient(${data.costs.map((cost,index)=>{const start=costCursor;const end=start+(cost.value/costTotal*100);costCursor=end;return `${costColors[index]} ${start}% ${end}%`}).join(", ")})`:"conic-gradient(#e8eef7 0 100%)";
  const averageContribution=data.pricedItems.length?data.pricedItems.reduce((sum,item)=>sum+(Number(item.sellingPrice)-variableCostPerItem(item)),0)/data.pricedItems.length:0;
  const monthlyCommitments=data.labor+data.overhead;
  const breakEvenUnits=averageContribution>0?Math.ceil(monthlyCommitments/averageContribution):null;
  const projectedMonthlyResult=data.target>0&&averageContribution>0?data.target*averageContribution-monthlyCommitments:null;
  const targetBuffer=data.target>0&&breakEvenUnits!==null?data.target-breakEvenUnits:null;
  const safetyPercent=targetBuffer!==null&&data.target>0?targetBuffer/data.target*100:null;
  const targetStatus=!data.target||!data.pricedItems.length?"incomplete":averageContribution<=0||Number(projectedMonthlyResult)<0?"negative":Number(safetyPercent)<10?"tight":Number(safetyPercent)<25?"watch":"healthy";
  const targetGap=targetBuffer===null?null:Math.abs(targetBuffer);
  const targetStatusCopy=targetStatus==="healthy"&&targetGap!==null?`Your goal is ${number(targetGap)} items above the projected break-even point.`:targetStatus==="watch"?"Your goal may cover costs, but the extra room is limited.":targetStatus==="tight"?"Your goal is very close to the projected break-even point.":targetStatus==="negative"&&targetGap!==null?`Your goal is ${number(targetGap)} items below the projected break-even point.`:!data.target?"Add a monthly sales goal to complete this estimate.":"Save a product with its selling price to continue.";
  const setupPercent=Math.round(data.completeCount/data.completeness.length*100);
  const runPricingReview=()=>data.attention.length?onReviewAttention():setPage(data.items.length?"products":"calculator");
  const openAddMaterial=()=>{setPage("inventory");window.setTimeout(()=>window.dispatchEvent(new Event("kostaraa:inventory-add")),0)};

  return <div className="business-dashboard">
    <header className="bd-heading"><div><h1>Dashboard</h1></div></header>

    <section className="bd-pricing-overview">
      <header><h2>Pricing overview</h2><p>Check whether your saved prices are complete, aligned with your targets, and leaving enough margin.</p></header>
      <div className="bd-metrics">
        <article className="attention"><div className="bd-metric-head"><small>Needs attention</small><div className="bd-metric-icon" aria-hidden="true"><TriangleAlert size={18}/></div></div><b>{data.attention.length} {data.attention.length===1?"product":"products"}</b><p>Below target, incomplete, or not covering costs.</p><span>{data.attention.length?"Review these products next":"No pricing action needed"}</span><button type="button" onClick={runPricingReview}>{data.attention.length?"Review pricing":"View products"} →</button></article>
        <article className="setup"><div className="bd-metric-head"><small>Business setup</small><div className="bd-metric-icon" aria-hidden="true"><CheckCircle2 size={18}/></div></div><b>{setupPercent}% complete</b><p>{data.completeCount} of {data.completeness.length} business sections completed.</p><span>{setupPercent===100?"Your business profile is ready":`${data.completeness.length-data.completeCount} sections still need details`}</span><div className="bd-setup-track" role="progressbar" aria-label="Business setup completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={setupPercent}><i style={{width:`${setupPercent}%`}}/></div>{setupPercent<100?<button type="button" onClick={()=>setPage("account")}>Complete setup →</button>:null}</article>
        <article className="customer"><div className="bd-metric-head"><small>Customer &amp; value insights</small><div className="bd-metric-icon" aria-hidden="true"><Users size={18}/></div></div><b>{data.market.frequentGroup||data.groups.slice(0,2).join(" & ")||"Not added"}</b><p>{data.market.customerLocation||data.market.locationType||"Customer location not added"}</p><span>{data.market.priceSensitivity?`${data.market.priceSensitivity} price awareness`:"Add customer details to complete this snapshot"}</span></article>
      </div>
    </section>

    <div className="bd-insights-grid">
      <section className="bd-card bd-quick-actions"><h2>Quick actions</h2><div><button onClick={openAddMaterial}><i aria-hidden="true"><Plus size={19}/></i><span><b>Add material</b><small>Record a new inventory cost</small></span><em aria-hidden="true">→</em></button><button onClick={()=>setPage("calculator")}><i aria-hidden="true"><Calculator size={19}/></i><span><b>Calculator</b><small>Build a product costing</small></span><em aria-hidden="true">→</em></button><button onClick={()=>setPage("products")}><i aria-hidden="true"><BookOpen size={19}/></i><span><b>Product library</b><small>Review saved products</small></span><em aria-hidden="true">→</em></button></div></section>

      <section className="bd-card bd-costs"><h2>Cost insights <span className="analysis-tip" tabIndex={0} aria-label="About cost insights">?<span>Combines per-item costs from saved products for comparison. It is not actual monthly spending.</span></span></h2>{data.items.length?<div className="bd-cost-chart"><div className="bd-cost-pie" style={{background:costGradient}} role="img" aria-label={`Combined recorded product costs ${money(costTotal)}`}><span><small>Combined cost</small><strong>{money(costTotal)}</strong></span></div><div className="bd-cost-legend">{data.costs.map((cost,index)=><article key={cost.name}><i style={{background:costColors[index]}}/><span>{cost.name}</span><b>{costTotal?`${number(cost.value/costTotal*100)}%`:"0%"}</b><strong>{money(cost.value)}</strong></article>)}</div></div>:<p className="bd-empty">Save products to compare their recorded costs.</p>}</section>
    </div>

    <section className={`bd-target-analysis ${targetStatus}`}><header><div><h2>Profit &amp; break-even planner <span className="analysis-tip" tabIndex={0} aria-label="How this estimate works">?<span>Kostaraa compares saved prices and product costs with monthly labor and operation costs. This is a planning estimate only.</span></span></h2><p>{targetStatusCopy}</p></div><span>{targetStatus==="healthy"?"Room above costs":targetStatus==="watch"?"Small extra room":targetStatus==="tight"?"Nearly equal to costs":targetStatus==="negative"?"Possible shortfall":"More information needed"}</span></header><div><article className="goal"><small>Monthly sales goal</small><b>{data.target?`${number(data.target)} items`:"Not set"}</b><p className="daily-breakdown"><span>Per working day</span><strong>{data.target?`${Math.ceil(data.target/data.days)} items`:"Unavailable"}</strong></p></article><article className="break-even"><small>Projected break-even</small><b>{breakEvenUnits!==null?`${number(breakEvenUnits)} items`:"Not enough information"}</b><p className="daily-breakdown"><span>Per working day</span><strong>{breakEvenUnits!==null?`${Math.ceil(breakEvenUnits/data.days)} items`:"Unavailable"}</strong></p></article><article className="outcome"><small>Projected monthly outcome</small><b className={Number(projectedMonthlyResult)<0?"negative":""}>{projectedMonthlyResult!==null?money(projectedMonthlyResult):"Not enough information"}</b><p className="daily-breakdown"><span>Per working day</span><strong className={Number(projectedMonthlyResult)<0?"negative":""}>{projectedMonthlyResult!==null?money(projectedMonthlyResult/data.days):"Unavailable"}</strong></p></article></div></section>

    <div className="bd-grid bd-secondary-grid">
      <section className="bd-card bd-announcement"><small>Announcements</small><h2>You’re all caught up</h2><p>Product tips and important Kostaraa updates will appear here.</p></section>
    </div>

  </div>;
}
