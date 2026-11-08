import PaymentReminder from "./PaymentReminder";
import {useMemo,useState} from "react";
import {BookOpen,Calculator,Plus,Settings2} from "lucide-react";
import {DetailModal} from "../../costing/pages/ProductsServices";
import {titleCaseName} from "../../costing/utils/display-text";
import {withSynchronizedOperationCost} from "../business-profile-costs";
import "../styles/business-dashboard.css";

const money=(value:number)=>`₱${Number(value||0).toLocaleString(undefined,{maximumFractionDigits:2})}`;
const number=(value:number)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:1});
function readProfile(){try{return withSynchronizedOperationCost(JSON.parse(localStorage.getItem("kostaraa.businessProfile")||"{}"))}catch{return {}}}
function materialTotal(item:any){return Number(item.materialCostPerUnit??(item.materials||[]).reduce((sum:number,row:any)=>sum+Number(row.computedCost||0),0))||0}
function packagingTotal(item:any){return Number(item.packagingCostPerUnit??((item.packagingMaterials||[]).reduce((sum:number,row:any)=>sum+Number(row.computedCost||0),0)+Number(item.otherVariableCosts?.packaging||0)))||0}
function laborPerItem(item:any){if(item.laborCostPerUnit!=null)return Number(item.laborCostPerUnit)||0;const labor=item.laborConfig||{};const units=Number(item.expectedMonthlySales)||(Number(labor.workingDays||0)*Number(labor.outputPerDay||0));return units?Number(labor.monthlyCost||0)/units:Number(item.otherVariableCosts?.labor||0)}
function operationPerItem(item:any){if(item.operationCostPerUnit!=null)return Number(item.operationCostPerUnit)||0;const labor=item.laborConfig||{};const output=Number(item.expectedMonthlySales)||(Number(labor.workingDays||0)*Number(labor.outputPerDay||0));return output?Number(item.monthlyFixedCosts||0)/output:0}
function itemCostBreakdown(item:any){
  const other=item.otherVariableCosts||{};
  const pricing=item.pricingInputs||{};
  const marketingAllowance=pricing.marketingAmount??(Number(item.costPerProduct)||0)*(Number(pricing.marketingPercentage)||0)/100;
  return{
    materials:materialTotal(item),
    packaging:packagingTotal(item),
    labor:laborPerItem(item),
    operation:operationPerItem(item),
    platform:Number(other.platform)||0,
    marketing:(Number(other.marketing)||0)+(Number(marketingAllowance)||0),
    tax:Number(pricing.taxAmount)||0,
    other:Number(other.other)||0,
  };
}
function variableCostPerItem(item:any){const saved=Number(item.costPerProduct??item.finalCost??item.finalCostInMind);if(Number.isFinite(saved)&&saved>0)return saved;const cost=itemCostBreakdown(item);return cost.materials+cost.packaging+cost.labor+cost.operation+cost.platform+Number(item.otherVariableCosts?.marketing||0)+cost.other}
function priceComparison(target:number,suggested:number){
  if(!target)return{tone:"review",label:"Add target price"};
  if(!suggested)return{tone:"review",label:"No suggested price"};
  const difference=Math.round((target-suggested)*100)/100;
  if(difference===0)return{tone:"match",label:"Matches suggested"};
  return difference<0
    ?{tone:"below",label:`${money(Math.abs(difference))} below suggested`}
    :{tone:"above",label:`${money(difference)} above suggested`};
}


export default function BusinessDashboard({business,savedItems,onViewEdit,onDuplicate,onArchive,setPage,summaryOnly=false,profileMissing=false,onSetupProfile}:{business:any;savedItems:any[];onViewEdit:(item:any)=>void;onDuplicate:(item:any)=>void;onArchive:(id:string)=>void|Promise<void>;setPage:(page:string)=>void;summaryOnly?:boolean;profileMissing?:boolean;onSetupProfile?:()=>void}){
  const[selectedProduct,setSelectedProduct]=useState<any>(null);
  const data=useMemo(()=>{
    const profile=readProfile();
    const items=(savedItems||[]).filter(item=>item.status!=="Archived");
    const pricedItems=items.filter(item=>Number(item.sellingPrice)>0);
    const recentItems=items.map((item,index)=>({item,index})).sort((left,right)=>{
      const rightTime=Date.parse(right.item.createdAt||"")||0;
      const leftTime=Date.parse(left.item.createdAt||"")||0;
      return leftTime&&rightTime&&leftTime!==rightTime?rightTime-leftTime:left.index-right.index;
    }).slice(0,5).map(row=>row.item);
    const operations=profile?.operations||{};
    const manpowerRows=(profile?.manpower||[]).filter((row:any)=>row.nameOrRole||row.position||Number(row.amount)>0||Number(row.benefits)>0||Number(row.contributions)>0);
    const ownerLabor=profile?.ownerLabor||{};
    const manpowerTotal=manpowerRows.reduce((sum:number,row:any)=>sum+Number(row.amount||0)+Number(row.benefits||0)+Number(row.contributions||0),0)+(ownerLabor.includeOwnTime==="Yes"?Number(ownerLabor.desiredMonthlyCompensation||0):0);
    const usesDailyOperations=Number(operations.dailyOperationsVersion)>=1;
    const operatingDays=Number(operations.operatingDaysPerMonth)||0;
    const target=usesDailyOperations&&operatingDays&&Number(operations.dailySalesUnits)>0?Math.round(operatingDays*Number(operations.dailySalesUnits)):Number(operations.monthlySalesUnits||operations.monthlySalesTarget)||0;
    const production=usesDailyOperations&&operatingDays&&Number(operations.dailyProductionUnits)>0?Math.round(operatingDays*Number(operations.dailyProductionUnits)):Number(operations.monthlyProductionUnits)||(Number(business?.labor?.workingDays||0)*Number(business?.labor?.outputPerDay||0))||0;
    const labor=manpowerTotal;
    const overhead=Number(profile?.calculatorCosts?.overheadMonthly||profile?.overhead?.monthlyOverheadPool)||Number(business?.overhead?.rent||0)+Number(business?.overhead?.utilities||0)+Number(business?.overhead?.miscellaneous||0);
    const breakdowns=items.map(itemCostBreakdown);
    const costs=[
      {name:"Raw materials",value:breakdowns.reduce((sum,cost)=>sum+cost.materials,0)},
      {name:"Packaging",value:breakdowns.reduce((sum,cost)=>sum+cost.packaging,0)},
      {name:"Labor",value:breakdowns.reduce((sum,cost)=>sum+cost.labor,0)},
      {name:"Operation costs",value:breakdowns.reduce((sum,cost)=>sum+cost.operation,0)},
      {name:"Platform fees",value:breakdowns.reduce((sum,cost)=>sum+cost.platform,0)},
      {name:"Marketing",value:breakdowns.reduce((sum,cost)=>sum+cost.marketing,0)},
      {name:"Tax",value:breakdowns.reduce((sum,cost)=>sum+cost.tax,0)},
      {name:"Other costs",value:breakdowns.reduce((sum,cost)=>sum+cost.other,0)},
    ].filter(cost=>cost.value>0);
    const market=profile?.targetMarket||{};
    const customerType=market.frequentGroup||(market.customerGroups||[]).slice(0,2).join(" & ")||"Not set";
    const customerLocation=market.customerLocation||market.locationType||"Customer details not set";
    const median=(values:number[])=>{const sorted=values.filter(Boolean).sort((a,b)=>a-b);const middle=Math.floor(sorted.length/2);return sorted.length?(sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2):0};
    const typicalPrice=median(pricedItems.map(item=>Number(item.pricingInputs?.targetSellingPrice)||Number(item.sellingPrice)||0));
    const typicalSuggestedPrice=median(pricedItems.map(item=>Number(item.suggestedSellingPrice)||0));
    const customerBudget=Number(market.willingnessToPay)||Number(market.spendingPerOrder)||0;
    return{items,pricedItems,recentItems,target,production,labor,overhead,costs,customerType,customerLocation,typicalPrice,typicalSuggestedPrice,customerBudget};
  },[business,savedItems]);

  const costColors=["#3a74ba","#17a6a1","#f59e0b","#7c5ce5","#e85d75","#38a169","#0f9f8f","#64748b"];
  const costTotal=data.costs.reduce((sum,cost)=>sum+cost.value,0);
  const largestCost=data.costs.reduce((largest,cost)=>cost.value>largest.value?cost:largest,{name:"",value:0});
  const costRemark=costTotal>0?`${largestCost.name} makes up the largest share at ${number(largestCost.value/costTotal*100)}%.`:"Add complete cost details to see the breakdown.";
  let costCursor=0;
  const costGradient=costTotal>0?`conic-gradient(${data.costs.map((cost,index)=>{const start=costCursor;const end=start+(cost.value/costTotal*100);costCursor=end;return `${costColors[index]} ${start}% ${end}%`}).join(", ")})`:"conic-gradient(#e8eef7 0 100%)";
  const averageContribution=data.pricedItems.length?data.pricedItems.reduce((sum,item)=>sum+(Number(item.sellingPrice)-variableCostPerItem(item)),0)/data.pricedItems.length:0;
  const monthlyCommitments=data.labor+data.overhead;
  const breakEvenUnits=averageContribution>0?Math.ceil(monthlyCommitments/averageContribution):null;
  const projectedMonthlyResult=data.target>0&&averageContribution>0?data.target*averageContribution-monthlyCommitments:null;
  const productionMeetsTarget=data.production>0&&data.target>0?data.production>=data.target:null;
  const targetMeetsBreakEven=data.target>0&&breakEvenUnits!==null?data.target>=breakEvenUnits:null;
  const capacityMeetsBreakEven=data.production>0&&breakEvenUnits!==null?data.production>=breakEvenUnits:null;
  const planSummary=(()=>{
    if(!data.production)return{tone:"incomplete",label:"Production capacity not set",title:"Add items produced per month",detail:"This tells you whether the business can physically make enough products to reach its sales and break-even goals."};
    if(!data.target)return{tone:"incomplete",label:"Sales target not set",title:"Add a monthly sales target",detail:"A sales target is needed to compare your production capacity with the number of items you plan to sell."};
    if(breakEvenUnits===null)return{tone:"incomplete",label:"Pricing details needed",title:"Complete a product price and cost",detail:"Kostaraa needs at least one priced product to estimate the minimum sales needed to cover monthly costs."};
    if(!capacityMeetsBreakEven)return{tone:"risk",label:"Capacity below break-even",title:"Your current capacity cannot reach break-even",detail:`You can produce ${number(data.production)} items, but the current estimate requires about ${number(breakEvenUnits)}. Review capacity, price, or costs.`};
    if(!targetMeetsBreakEven)return{tone:"risk",label:"Target below break-even",title:"Your sales target may not cover monthly costs",detail:`Your target is ${number((breakEvenUnits||0)-data.target)} items below the estimated break-even minimum.`};
    if(!productionMeetsTarget)return{tone:"watch",label:"Capacity below target",title:"Your sales goal is higher than your production capacity",detail:`You would need capacity for ${number(data.target-data.production)} more items each month to meet the target.`};
    return{tone:"good",label:"Plan aligned",title:"Your production and sales plan are aligned",detail:`You can produce enough for your target, and the target is ${number(data.target-(breakEvenUnits||0))} items above break-even.`};
  })();
  const pricingGap=data.typicalSuggestedPrice-data.typicalPrice;
  const customerProfile=data.customerType==="Not set"
    ?"Customer not set"
    :data.customerLocation==="Customer details not set"
      ?data.customerType
      :`${data.customerType} in ${data.customerLocation}`;
  const pricingAnalysis=!data.typicalPrice||!data.typicalSuggestedPrice?[
    {tone:"incomplete",label:"Price check",detail:"Add a target price and suggested price first."},
  ]:[
    !data.customerBudget
      ?{tone:"incomplete",label:"Customer budget",detail:"Add how much your customer usually spends."}
      :data.typicalSuggestedPrice<=data.customerBudget
        ?{tone:"good",label:"Customer budget",detail:`The ${money(data.typicalSuggestedPrice)} suggested price fits within their ${money(data.customerBudget)} budget.`}
        :{tone:"watch",label:"Customer budget",detail:`The suggested price is ${money(data.typicalSuggestedPrice-data.customerBudget)} above their saved budget.`},
    pricingGap>0
      ?{tone:"info",label:"Covers costs",detail:`${money(data.typicalSuggestedPrice)} supports your costs and profit better than ${money(data.typicalPrice)}.`}
      :{tone:"good",label:"Covers costs",detail:`Your ${money(data.typicalPrice)} target already meets the suggested price.`},
    pricingGap>0
      ?{tone:"info",label:"Price to test",detail:`Try increasing by ${money(pricingGap)} toward ${money(data.typicalSuggestedPrice)}.`}
      :{tone:"good",label:"Price to test",detail:"No price increase is suggested right now."},
    pricingGap>0
      ?{tone:"watch",label:"Current price",detail:`Your ${money(data.typicalPrice)} price may be too low.`}
      :{tone:"good",label:"Current price",detail:"Your current price does not look too low."},
  ];
  const businessSummary=<section className="bd-card bd-business-summary">
    <header><div><h2>Business summary</h2><p>See whether production, sales, and pricing work together.</p></div><div className="bd-summary-actions"><button className="bd-analysis-coming-soon" type="button" disabled>Request Business Analysis <small>Coming soon</small></button>{!summaryOnly?<button type="button" onClick={()=>setPage("account")}>View business settings →</button>:null}</div></header>
    <div className={`bd-plan-summary ${planSummary.tone}`}>
      <div className="bd-plan-status"><i aria-hidden="true">!</i><span>{planSummary.label}</span></div>
      <div className="bd-plan-message"><h3>{planSummary.title}</h3><p>{planSummary.detail}</p></div>
      <div className="bd-plan-numbers">
        <article><small>Items you can produce</small><b>{data.production?number(data.production):"Not set"}</b><p>per month</p></article>
        <article><small>Items you plan to sell</small><b>{data.target?number(data.target):"Not set"}</b><p>monthly target</p></article>
        <article><small>Minimum sales needed</small><b>{breakEvenUnits!==null?number(breakEvenUnits):"Unavailable"}</b><p>estimated break-even</p></article>
      </div>
    </div>
    <div className="bd-business-context">
      <article className="bd-customer-match"><div className="bd-customer-profile"><small>Target customer</small><b>{customerProfile}</b><p>{data.customerType==="Not set"?"Add your customer details in Business Settings.":"Pricing is checked against this customer’s saved budget."}</p></div><h3>Price check</h3><div className="bd-pricing-analysis"><header><span>Check</span><span>What This Means</span></header>{pricingAnalysis.map(insight=><p className={insight.tone} key={insight.label}><b>{insight.label}</b><span>{insight.detail}</span></p>)}</div></article>
      <article className="bd-income-panel"><small>Projected monthly income</small><b className={projectedMonthlyResult!==null&&projectedMonthlyResult<0?"negative":""}>{projectedMonthlyResult!==null?money(projectedMonthlyResult):"Unavailable"}</b><p>{projectedMonthlyResult===null?"Add a sales target and product price.":projectedMonthlyResult>=0?"Estimated amount after recorded labor and operation costs.":"The current plan may result in a monthly shortfall."}</p></article>
    </div>
  </section>;
  const openAddMaterial=()=>{setPage("inventory");window.setTimeout(()=>window.dispatchEvent(new Event("kostaraa:inventory-add")),0)};

  if(summaryOnly)return <div className="business-dashboard business-dashboard-summary-only">{businessSummary}</div>;

  return <div className="business-dashboard">
    <header className="bd-heading"><div><h1>Dashboard</h1></div></header>
    <PaymentReminder/>
    {profileMissing&&<section className="bd-card bd-profile-setup" role="status"><span className="bd-notice-icon" aria-hidden="true"><Settings2/></span><div className="bd-notice-copy"><h2>Let’s set up your business profile</h2><p>Add your business details to personalize your costing and dashboard insights.</p></div><button type="button" onClick={onSetupProfile||(()=>setPage("account"))}>Set up business profile</button></section>}

    <section className="bd-card bd-recent-products">
      <header><div><h2>Recently added products</h2></div><button type="button" onClick={()=>setPage("products")}>View product library →</button></header>
      {data.recentItems.length?<><div className="bd-recent-heading" aria-hidden="true"><span>Product</span><span>Target price</span><span>Suggested price</span><span>Estimated profit/item</span><span>Profit margin</span><span>Remarks</span></div><div className="bd-recent-list">{data.recentItems.map(item=>{
        const targetPrice=Number(item.pricingInputs?.targetSellingPrice)||Number(item.sellingPrice)||0;
        const suggestedPrice=Number(item.suggestedSellingPrice)||0;
        const estimatedProfit=Number(item.grossProfit)||0;
        const margin=Number(item.profitMargin)||0;
        const comparison=priceComparison(targetPrice,suggestedPrice);
        return <button key={item.id} type="button" onClick={()=>setSelectedProduct(item)} aria-label={`Open overview for ${item.productName||"Unnamed Product"}`}>
          <b data-label="Product">{titleCaseName(item.productName,"Unnamed Product")}</b>
          <span data-label="Target price">{targetPrice>0?money(targetPrice):"—"}</span>
          <span data-label="Suggested price">{suggestedPrice>0?money(suggestedPrice):"—"}</span>
          <span className={estimatedProfit<0?"negative":""} data-label="Estimated profit/item">{money(estimatedProfit)}</span>
          <span className={margin<0?"negative":""} data-label="Profit margin">{number(margin)}%</span>
          <em className={comparison.tone} data-label="Remarks">{comparison.label}</em>
        </button>;
      })}</div></>:<div className="bd-empty"><b>No saved products yet</b><span>Use the calculator to add your first product costing.</span><button type="button" onClick={()=>setPage("calculator")}>Create a costing</button></div>}
    </section>

    <div className="bd-insights-grid">
      <section className="bd-card bd-quick-actions"><h2>Quick actions</h2><div><button onClick={openAddMaterial}><i aria-hidden="true"><Plus size={19}/></i><span><b>Add material</b><small>Record a new inventory cost</small></span><em aria-hidden="true">→</em></button><button onClick={()=>setPage("calculator")}><i aria-hidden="true"><Calculator size={19}/></i><span><b>Add New Product</b><small>Build a product costing</small></span><em aria-hidden="true">→</em></button><button onClick={()=>setPage("products")}><i aria-hidden="true"><BookOpen size={19}/></i><span><b>Product library</b><small>Review saved products</small></span><em aria-hidden="true">→</em></button></div></section>

      <section className="bd-card bd-costs"><h2>Cost insights <span className="analysis-tip" tabIndex={0} aria-label="About cost insights">?<span>Combines per-item costs from saved products for comparison. It is not actual monthly spending.</span></span></h2>{data.items.length?<><div className="bd-cost-chart"><div className="bd-cost-pie" style={{background:costGradient}} role="img" aria-label={`Combined recorded product costs ${money(costTotal)}`}><span><small>Combined cost</small></span></div><div className="bd-cost-legend">{data.costs.map((cost,index)=><article key={cost.name}><i style={{background:costColors[index]}}/><span>{cost.name}</span><b>{costTotal?`${number(cost.value/costTotal*100)}%`:"0%"}</b><strong>{money(cost.value)}</strong></article>)}</div></div><p className="bd-cost-remark">{costRemark}</p></>:<p className="bd-empty">Save products to compare their recorded costs.</p>}</section>
    </div>

    {businessSummary}

    <div className="bd-grid bd-secondary-grid">
      <section className="bd-card bd-announcement"><small>Announcements</small><h2>You’re all caught up</h2><p>Product tips and important Kostaraa updates will appear here.</p></section>
    </div>

    {selectedProduct&&<DetailModal item={selectedProduct} onClose={()=>setSelectedProduct(null)} onViewEdit={onViewEdit} onDuplicate={onDuplicate} onArchive={onArchive}/>}
  </div>;
}
