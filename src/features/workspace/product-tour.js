import {shouldStartNewUserGuide} from './getting-started.js';

export const productTourSteps = [
  {target:'name', title:'What do you sell?', copy:'Start with one product, such as “Iced coffee” or “Scented candle”. Type its name here so you can find it again later.'},
  {target:'materials', title:'Choose what goes into it', copy:'Choose a material from the list, such as coffee or wax. Use “Add material” for another ingredient. List each material you use to make ONE item. If the list is empty, add your supplies in Inventory first.'},
  {target:'quantity', title:'How much goes into one item?', copy:'Enter only the amount you use for ONE product. For one drink, that might be 250 ml of milk. Choose the matching unit beside the amount. Kostaraa works out the cost for you.'},
  {target:'packaging', title:'Include the container or wrapping', copy:'Add the cup, lid, box, bag, or label you give the customer. Enter how many you use for ONE item. For example, one drink needs 1 cup. You can leave this out if you don’t use packaging.'},
  {target:'operations', title:'Your time and running expenses count too', copy:'These costs come from Business → team, expenses, and production details. They include work time, rent, and electricity shared across the items you make. If you see “Not set”, use “Edit business expenses” to fill in those details.'},
  {target:'marketing', title:'Allow a little for promoting your product', copy:'If you spend on ads or promotions, move this slider to include an allowance in your price. You can leave it at 0% if you don’t need one.'},
  {target:'markup', title:'Choose how much to add on top', copy:'Move this slider to add an amount above your costs. A higher setting raises the suggested selling price. For example, adding 50% on top of a ₱100 cost adds ₱50 before any tax adjustments. This is not the same as keeping 50% of the selling price.'},
  {target:'tax', title:'Use your business’s tax setting', copy:'Choose the option that matches your business registration. If you’re unsure, check with your accountant before changing it. The tour does not choose a tax option for you.'},
  {target:'cost', title:'See what one item costs you', copy:'This total combines the materials, packaging, work, and other costs entered for one item. Check that you haven’t missed anything before deciding what to charge.'},
  {target:'suggested', title:'Use this price as a starting point', copy:'Kostaraa suggests a selling price using your costs and the settings you chose. “Not available” means more cost details are needed. Compare the suggestion with what your customers are willing to pay.'},
  {target:'price', title:'Try the price you want to charge', copy:'Already have a price in mind? Type it here. You can compare it with the suggestion and check the estimated profit when you review. This is optional, so you can leave it blank to use the suggested price.'},
  {target:'save', title:'Review, then save your product', copy:'Click “Save as Product / Service” to open the review. Check the name, costs, selling price, and estimated profit. Then click “Save to Library” in that review. Your product will be in Product Library when you need it again. Finishing this tour does not save it for you.'},
];

export function readProductTour(storage, key) {
  try {
    const saved = JSON.parse(storage.getItem(key) || '{}');
    return {index:Number.isInteger(saved?.index) ? Math.max(0, Math.min(saved.index, productTourSteps.length - 1)) : 0, status:['active','completed','dismissed'].includes(saved?.status) ? saved.status : ''};
  } catch { return {index:0, status:''}; }
}
export function writeProductTour(storage, key, index, status) {
  try { storage.setItem(key, JSON.stringify({index, status})); } catch { /* The tour stays usable without storage. */ }
}
export function isNewProductTourUser(signup, user, onboarding, savedProductCount) {
  return Boolean(shouldStartNewUserGuide(signup, user, {}) || (savedProductCount === 0 && (onboarding.finished || onboarding.skipped)));
}
