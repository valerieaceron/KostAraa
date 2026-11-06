export const businessSetupSteps = ["identity", "operations", "manpower", "overhead", "targetMarket"];

export function businessSetupKey() {
  try {
    const user = JSON.parse(sessionStorage.getItem("kostaraa.user") || "{}");
    return `kostaraa.business-setup.v1.${encodeURIComponent(String(user.id || user.username || user.email || "workspace"))}`;
  } catch { return "kostaraa.business-setup.v1.workspace"; }
}

export function readBusinessSetup(storage, key) {
  try {
    const saved = JSON.parse(storage.getItem(key) || "[]");
    return businessSetupSteps.filter(step => Array.isArray(saved) && saved.includes(step));
  } catch { return []; }
}

export function completeBusinessSetupStep(completed, step) {
  return businessSetupSteps.filter(key => key === step || completed.includes(key));
}

export function nextBusinessSetupStep(completed) {
  return businessSetupSteps.find(step => !completed.includes(step));
}
