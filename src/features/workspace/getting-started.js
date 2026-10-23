export const guideSteps = [
  { title: "Business Profile", copy: "This is where you add your business details, labor, and expenses. We’ll help you edit your profile after this quick tour.", page: "account" },
  { title: "Inventory", copy: "Log your materials and supplies here so you can use their costs in your calculations.", page: "inventory" },
  { title: "Calculator", copy: "Choose your materials, add costs, and check a selling price that works for your product.", page: "calculator" },
  { title: "Product Library", copy: "Save your product costings here, then return to review or update them anytime.", page: "products" },
  { title: "Dashboard", copy: "See your business overview and which products may need your attention.", page: "dashboard" },
  { title: "Meet Araa", copy: "Araa is your guide to Kostaraa. Next, let’s add your business details so your estimates reflect your business.", page: "araa" },
];

export function guideStorageKey(user = {}) {
  return `kostaraa.gettingStarted:${user.user_id || user.id || user.username || user.email || "local"}`;
}

export function currentGuideKey() {
  try { return guideStorageKey(JSON.parse(sessionStorage.getItem("kostaraa.user") || "{}") || {}); }
  catch { return guideStorageKey(); }
}

export function readGuideProgress(storage, key) {
  let saved;
  try { saved = JSON.parse(storage.getItem(key) || "{}"); } catch { saved = {}; }
  const index = Number(saved?.index);
  return {
    index: Number.isFinite(index) ? Math.max(0, Math.min(Math.floor(index), guideSteps.length - 1)) : 0,
    finished: saved?.finished === true,
    skipped: saved?.skipped === true,
    started: saved?.started === true,
    profilePrompt: saved?.profilePrompt === true,
  };
}

export function writeGuideProgress(storage, key, changes) {
  const next = { ...readGuideProgress(storage, key), ...changes };
  try { storage.setItem(key, JSON.stringify(next)); } catch { /* Keep the tour usable when storage is unavailable. */ }
  return next;
}

export function shouldStartNewUserGuide(signup, user, progress) {
  return Boolean(signup?.userId && user?.id && String(signup.userId) === String(user.id) && !progress.finished && !progress.skipped);
}

export function guideEntry(search, progress) {
  const start = new URLSearchParams(search).get("start");
  const requested = start === "guide" || start === "product";
  return { requested, open: (requested || progress.started) && !progress.finished && !progress.skipped, prompt: progress.profilePrompt || (requested && (progress.finished || progress.skipped)) };
}
