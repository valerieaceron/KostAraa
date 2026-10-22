import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBusinessProfile,businessProfilePayload} from '../src/features/costing/utils/businessProfile.js';
import {getAllApiItems,apiJson} from '../src/features/costing/utils/api.js';
import {monthlyOperationCost} from '../src/features/workspace/business-profile-costs.ts';
test('profile settings round-trip codes, numeric booleans, zero owner pay, years and operation costs',()=>{
 const profile=normalizeBusinessProfile({data:{id:1,business_category:'retail_and_ecommerce',planned_start_year:2027,business_operations:{operatingDaysPerMonth:20,locationExpenses:{monthlyRent:1000}},owner_labor:{include_owner_pay:1,desired_monthly_owner_pay:0},overhead:[{expense_group:'variable_monthly',frequency:'weekly',amount:120,expense_name:'Delivery',expense_category:'transportation_and_business_travel'}],target_market:{customer_priorities:['Good quality']}}},{ownerLabor:{desiredMonthlyCompensation:500}});
 assert.equal(profile.identity.category,'Retail and E-Commerce');
 assert.equal(profile.ownerLabor.includeOwnTime,'Yes');
 assert.equal(profile.ownerLabor.desiredMonthlyCompensation,0);
 assert.equal(profile.businessStage.plannedStartYear,2027);
 assert.equal(profile.overhead.variable[0].frequency,'Weekly');
 const payload=businessProfilePayload(profile,'complete',8);
 assert.equal(payload.business_operations.operatingDaysPerMonth,20);
 assert.equal(payload.business_operations.locationExpenses.monthlyRent,1000);
 assert.equal(payload.planned_start_year,2027);
 assert.equal(payload.year_started,null);
 assert.equal(payload.overhead[0].expense_group,'Variable monthly');
 assert.equal(monthlyOperationCost(profile),1520);
});
test('removing the final expense clears stale cached operation totals',()=>{
 assert.equal(monthlyOperationCost({locationExpenses:{monthlyRent:0},overhead:{fixed:[],monthlyOverheadPool:500}}),0);
});
test('API pagination loads beyond the first 100 records and detects JSON-level errors',async()=>{
 const original=globalThis.fetch;
 globalThis.sessionStorage={getItem:()=>null};
 let calls=0;
 globalThis.fetch=async url=>{calls++;const page=new URL(url).searchParams.get('page');return {ok:true,text:async()=>JSON.stringify({type:'success',result:Array.from({length:page==='1'?100:5},(_,id)=>({id})),total_rows:105})};};
 try {
  assert.equal((await getAllApiItems('/api/inventory/getAll')).length,105);
  assert.equal(calls,2);
  globalThis.fetch=async()=>({ok:true,text:async()=>JSON.stringify({type:'error',message:'Rejected'})});
  await assert.rejects(apiJson('/api/test'),/Rejected/);
 } finally {globalThis.fetch=original;delete globalThis.sessionStorage;}
});
