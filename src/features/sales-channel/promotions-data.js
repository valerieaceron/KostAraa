export const promoTypes = {delivery: "Free Delivery", pickup: "For Pickup", percentage: "Percentage Discount"};
export function generatePromoCode(existing = []) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const used = new Set(existing.map(item => item.code));
  for (let attempt = 0; attempt < 100; attempt++) {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), value => alphabet[value % alphabet.length]).join("");
    if (!used.has(code)) return code;
  }
  throw new Error("Unable to generate a unique code. Please try again.");
}
export function promotionStatus(promotion, today) {
  return today < promotion.startsOn ? "Scheduled" : today > promotion.endsOn ? "Expired" : "Active";
}
export function manilaDate() {
  return new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date());
}

export function validatePromotion(promotion,existing=[]){
 const {name,code,type,startsOn,endsOn,discountPercent}=promotion;
 const validDate=value=>typeof value==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 if(typeof name!=='string'||!name.trim()||name.trim().length>80)return 'Enter a promotion name up to 80 characters.';
 if(!/^[A-Z0-9]{6}$/.test(code))return 'Generate a valid six-character code.';
 if(existing.some(item=>item.code===code))return 'This code is already used. Generate another code.';
 if(!Object.hasOwn(promoTypes,type))return 'Choose a valid promotion type.';
 if(!validDate(startsOn)||!validDate(endsOn)||endsOn<startsOn)return 'Choose valid start and end dates, with the end on or after the start.';
 if(type==='percentage'){
  const percent=Number(discountPercent);
  if(discountPercent===null||discountPercent===''||!Number.isFinite(percent)||percent<=0||percent>100||Math.abs(percent*100-Math.round(percent*100))>0.000001)return 'Enter a discount greater than 0 and up to 100%, with at most two decimal places.';
 }
 return '';
}
export function promotionsView(promotions,filter,query,page,today){
 const search=query.trim().toLowerCase();const filtered=promotions.filter(promotion=>(filter==='All promotions'||promotionStatus(promotion,today)===filter)&&[promotion.name,promotion.code,promoTypes[promotion.type]].join(' ').toLowerCase().includes(search));
 const totalPages=Math.max(1,Math.ceil(filtered.length/10));const safePage=Math.min(Math.max(1,page),totalPages);
 return {filtered,totalPages,safePage,rows:filtered.slice((safePage-1)*10,safePage*10),start:filtered.length?(safePage-1)*10+1:0,end:Math.min(safePage*10,filtered.length)};
}
