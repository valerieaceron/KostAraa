import {apiJson,isOfflineUser} from '../costing/utils/api.js';
import {validatePromotion} from './promotions-data.js';
async function request(options={}){
 if(isOfflineUser())throw new Error('Sign in with an online Kostaraa account to manage live promotions.');
 try{const result=await apiJson('/api/sales-channel/promotions',{cache:'no-store',...options});if(result.type!=='success')throw new Error('The promotions API returned an unexpected response.');return result.data}catch(error){if(error.status===401)error.message='Your session expired. Please log in again.';throw error}
}
export async function listPromotions(signal){const rows=await request({signal});if(!Array.isArray(rows))throw new Error('The promotions API returned an unexpected list.');return rows}
export async function createPromotion(promotion){const error=validatePromotion(promotion);if(error)throw new Error(error);const saved=await request({method:'POST',body:JSON.stringify(promotion)});if(!saved?.code||!saved?.name)throw new Error('The saved promotion was not returned. Refresh before trying again.');return saved}
