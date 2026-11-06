import { test } from "node:test";
import assert from "node:assert/strict";
import { businessSetupSteps, readBusinessSetup, completeBusinessSetupStep, nextBusinessSetupStep } from "../src/features/workspace/business-setup.js";

test("setup resumes at the earliest unfinished step and finishes only after all five saves", () => {
  let completed = [];
  assert.equal(nextBusinessSetupStep(completed), "identity");
  completed = completeBusinessSetupStep(completed, "targetMarket");
  assert.equal(nextBusinessSetupStep(completed), "identity");
  for (const step of businessSetupSteps.slice(0, -1)) {
    assert.ok(nextBusinessSetupStep(completed));
    completed = completeBusinessSetupStep(completed, step);
  }
  assert.equal(nextBusinessSetupStep(completed), undefined);
  assert.equal(completed.length, 5);
  assert.deepEqual(completeBusinessSetupStep(completed, "identity"), completed);
});

test("stored progress is isolated and tolerates invalid data", () => {
  const values = new Map([["user1", '["identity","identity","unknown","manpower"]'], ["broken", '{']]);
  const storage = { getItem: key => values.get(key) ?? null };
  assert.deepEqual(readBusinessSetup(storage, "user1"), ["identity", "manpower"]);
  assert.deepEqual(readBusinessSetup(storage, "user2"), []);
  assert.deepEqual(readBusinessSetup(storage, "broken"), []);
  assert.deepEqual(readBusinessSetup({ getItem() { throw new Error("Unavailable"); } }, "user1"), []);
});

test("database progress restores in a fresh browser and overrides stale browser counts", async () => {
  const {profileBusinessSetup, syncBusinessSetupProfile} = await import("../src/features/workspace/business-setup.js");
  const {normalizeBusinessProfile, businessProfilePayload} = await import("../src/features/costing/utils/businessProfile.js");
  const profile = normalizeBusinessProfile({data:{id:42, business_operations:{completedSetupSteps:["identity", "overhead"]}}});
  assert.deepEqual(profileBusinessSetup(profile), ["identity", "overhead"]);
  assert.deepEqual(businessProfilePayload(profile).business_operations.completedSetupSteps, ["identity", "overhead"]);
  assert.equal(await syncBusinessSetupProfile(profile, businessSetupSteps, () => assert.fail("Database progress is authoritative")), profile);
  const legacy = normalizeBusinessProfile({data:{id:42, business_operations:{operatingDaysPerMonth:20}}});
  let migrated;
  const restored = await syncBusinessSetupProfile(legacy, ["targetMarket", "unknown", "identity"], async completed => {
    migrated = completed;
    return normalizeBusinessProfile({data:{id:42, business_operations:{completedSetupSteps:completed}}});
  });
  assert.deepEqual(migrated, ["identity", "targetMarket"]);
  assert.deepEqual(profileBusinessSetup(restored), ["identity", "targetMarket"]);
  await assert.rejects(syncBusinessSetupProfile(legacy, ["identity"], async () => { throw new Error("Save failed"); }), /Save failed/);
});

test("pre-existing saved profiles recover in incognito without browser storage", async () => {
  const {recoverBusinessSetup, syncBusinessSetupProfile, profileBusinessSetup} = await import("../src/features/workspace/business-setup.js");
  const profile = {identity:{businessName:"Example",category:"Food and Beverage"},businessStage:{stage:"Still planning"},operations:{operatingDaysPerMonth:26,monthlyProductionUnits:2600},ownerLabor:{desiredMonthlyCompensation:5000},targetMarket:{customerGroups:["Students"],frequentGroup:"Students"},meta:{businessProfileId:42}};
  const expected = ["identity","operations","manpower","targetMarket"];
  assert.deepEqual(recoverBusinessSetup(profile), expected);
  const saved = await syncBusinessSetupProfile(profile, [], async completed => ({...profile, meta:{...profile.meta,completedSetupSteps:completed}}));
  assert.deepEqual(profileBusinessSetup(saved), expected);
  assert.deepEqual(recoverBusinessSetup({identity:{businessName:"Signup"},ownerLabor:{includeOwnTime:"No"},locationExpenses:{monthlyRent:0},overhead:{regular:[]},targetMarket:{}}), []);
  assert.deepEqual(recoverBusinessSetup({...profile,overhead:{regular:[{name:"Electricity",amount:0}]}}), businessSetupSteps);
  await assert.rejects(syncBusinessSetupProfile(profile, [], async () => profile), /could not be synced/);
});
