import {apiJson,isOfflineUser} from '../costing/utils/api.js';
export async function listBestSellers(signal){
 if(isOfflineUser())throw new Error('Sign in with an online Kostaraa account to view best sellers.');
 try{
  const result=await apiJson('/api/sales-channel/best-sellers',{cache:'no-store',signal});
  if(result.type!=='success'||!Array.isArray(result.data))throw new Error('The best sellers API returned an unexpected response.');
  return result.data.map(row=>({...row,rank:Number(row.rank),unitsPurchased:Number(row.unitsPurchased),orderCount:Number(row.orderCount)}));
 }catch(error){if(error.status===401)error.message='Your session expired. Please log in again.';throw error}
}
