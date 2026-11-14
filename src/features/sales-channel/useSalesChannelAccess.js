import {useEffect,useState} from 'react';
import {apiJson} from '../costing/utils/api.js';
export const isSalesChannelPage=page=>String(page).startsWith('sales-');
export async function fetchSalesChannelAccess(signal){
 const result=await apiJson('/api/sales-channel/access',{cache:'no-store',signal});
 if(result.type!=='success'||typeof result.data?.allowed!=='boolean')throw new Error('Sales Channel access could not be verified.');
 return result.data.allowed;
}
export default function useSalesChannelAccess(){
 const [access,setAccess]=useState('loading');const [attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new window.AbortController();setAccess('loading');fetchSalesChannelAccess(controller.signal).then(allowed=>{if(!controller.signal.aborted)setAccess(allowed?'allowed':'denied')}).catch(()=>{if(!controller.signal.aborted)setAccess('error')});return()=>controller.abort()},[attempt]);
 return {access,retry:()=>setAttempt(value=>value+1)};
}
