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
