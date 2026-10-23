import { test } from "node:test";
import assert from "node:assert/strict";
import { guideEntry, guideSteps, guideStorageKey, readGuideProgress, shouldStartNewUserGuide, writeGuideProgress } from "../src/features/workspace/getting-started.js";

function memoryStorage() {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) };
}

test("new signup opens the guide; finished and skipped tours do not repeat at login", () => {
  const storage = memoryStorage();
  const user = { id: 42 };
  const key = guideStorageKey(user);
  const signup = { userId: "42" };
  assert.equal(shouldStartNewUserGuide(signup, user, readGuideProgress(storage, key)), true);
  assert.equal(shouldStartNewUserGuide({ userId: 43 }, user, readGuideProgress(storage, key)), false);
  assert.equal(shouldStartNewUserGuide(null, user, readGuideProgress(storage, key)), false);
  writeGuideProgress(storage, key, { index: 5, finished: true, profilePrompt: true });
  assert.equal(shouldStartNewUserGuide(signup, user, readGuideProgress(storage, key)), false);
  assert.equal(guideEntry("", readGuideProgress(storage, key)).prompt, true);
  writeGuideProgress(storage, key, { profilePrompt: false });
  assert.equal(guideEntry("", readGuideProgress(storage, key)).prompt, false);
  writeGuideProgress(storage, key, { finished: false, skipped: true });
  assert.equal(shouldStartNewUserGuide(signup, user, readGuideProgress(storage, key)), false);
});

test("tour progress resumes for the right user without leaking to another account", () => {
  const storage = memoryStorage();
  const firstKey = guideStorageKey({ id: 1 });
  const secondKey = guideStorageKey({ id: 2 });
  writeGuideProgress(storage, firstKey, { index: 3, started: true });
  assert.equal(readGuideProgress(storage, firstKey).index, 3);
  assert.equal(readGuideProgress(storage, secondKey).index, 0);
  assert.equal(guideEntry("?start=guide&page=account", readGuideProgress(storage, firstKey)).open, true);
  assert.equal(guideEntry("?start=product", readGuideProgress(storage, firstKey)).open, true);
  assert.equal(guideEntry("?page=account", readGuideProgress(storage, firstKey)).open, true);
  assert.equal(guideEntry("", readGuideProgress(storage, secondKey)).open, false);
});

test("malformed or unavailable storage cannot break the tour", () => {
  const storage = memoryStorage();
  storage.setItem("guide", "invalid JSON");
  assert.equal(readGuideProgress(storage, "guide").index, 0);
  storage.setItem("guide", "null");
  assert.equal(readGuideProgress(storage, "guide").finished, false);
  storage.setItem("guide", JSON.stringify({ index: -4, finished: "true" }));
  assert.equal(readGuideProgress(storage, "guide").index, 0);
  assert.equal(readGuideProgress(storage, "guide").finished, false);
  storage.setItem("guide", JSON.stringify({ index: 99 }));
  assert.equal(readGuideProgress(storage, "guide").index, guideSteps.length - 1);
  const unavailable = { getItem() { throw new Error("unavailable"); }, setItem() { throw new Error("unavailable"); } };
  assert.equal(readGuideProgress(unavailable, "guide").index, 0);
  assert.doesNotThrow(() => writeGuideProgress(unavailable, "guide", { finished: true }));
});
