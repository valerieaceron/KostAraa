export function pricingHealth(item){
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

export function needsPricingAttention(item) {
  return item.status !== "Archived" && pricingHealth(item).key !== "healthy";
}
