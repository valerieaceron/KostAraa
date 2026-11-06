import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadBusinessProfile, businessProfilePayload} from '../src/features/costing/utils/businessProfile.js';
import {apiJson} from '../src/features/costing/utils/api.js';

async function withApi(response, run) {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.sessionStorage;
  globalThis.sessionStorage = {getItem: () => null};
  globalThis.fetch = async () => ({ok: response.status < 400, status: response.status, text: async () => JSON.stringify(response.body)});
  try { await run(); }
  finally {
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = originalStorage;
  }
}

test('missing profile becomes a creatable draft and removes stale profile IDs', async () => {
  await withApi({status:404,body:{type:'error',message:'Business profile not found.'}}, async () => {
    const profile = await loadBusinessProfile({identity:{businessName:'My Bakery'},meta:{businessProfileId:99},operations:{operatingDaysPerMonth:26}});
    assert.equal(profile.meta.businessProfileId, null);
    assert.equal(profile.identity.businessName, 'My Bakery');
    profile.operations = {...profile.operations,dailyProductionUnits:3,monthlyProductionUnits:78,dailyOperationsVersion:1};
    const payload = businessProfilePayload(profile);
    globalThis.fetch = async (url, options) => {
      assert.equal(options.method, 'POST');
      assert.equal(JSON.parse(options.body).business_operations.monthlyProductionUnits, 78);
      return {ok:true,status:200,text:async()=>JSON.stringify({type:'success',result:{id:42}})};
    };
    await apiJson('/api/business-profile', {method:profile.meta.businessProfileId?'PATCH':'POST',body:JSON.stringify(payload)});
  });
});

test('existing profiles keep their ID and business details', async () => {
  await withApi({status:200,body:{type:'success',result:{id:42,business_name:'Saved Bakery'}}}, async () => {
    const profile = await loadBusinessProfile({identity:{description:'Keep this description'}});
    assert.equal(profile.meta.businessProfileId, 42);
    assert.equal(profile.identity.businessName, 'Saved Bakery');
    assert.equal(profile.identity.description, 'Keep this description');
  });
});

test('authentication, server, and unrelated not-found errors do not become new profiles', async () => {
  for (const status of [401,500,404]) {
    await withApi({status,body:{type:'error',message:'Unable to load profile.'}}, async () => {
      await assert.rejects(loadBusinessProfile(), error => error.status === status);
    });
  }
});
