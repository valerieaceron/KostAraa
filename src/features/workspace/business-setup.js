import {apiJson} from "../costing/utils/api.js";
import {normalizeBusinessProfile} from "../costing/utils/businessProfile.js";

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

export function profileBusinessSetup(profile) {
  const completed = profile?.meta?.completedSetupSteps;
  return businessSetupSteps.filter(step => Array.isArray(completed) && completed.includes(step));
}

// Recover older profiles from meaningful saved values, never from signup defaults
// or empty cost rows (zero-cost sections are completed explicitly on Save).
export function recoverBusinessSetup(profile) {
  const has = value => typeof value === "string" && value.trim().length > 0;
  const spaceCosts = ["monthlyRent", "associationDues", "parkingFees", "storageFees", "otherLocationExpenses"];
  const complete = {
    identity: has(profile.identity?.businessName) && has(profile.identity?.category) && has(profile.businessStage?.stage),
    operations: Number(profile.operations?.operatingDaysPerMonth) > 0 && Number(profile.operations?.monthlyProductionUnits || profile.operations?.monthlyUnitEstimate) > 0,
    manpower: (profile.manpower || []).some(row => has(row.nameOrRole)) || Number(profile.ownerLabor?.desiredMonthlyCompensation) > 0,
    overhead: ["regular", "variable", "periodic"].some(group => (profile.overhead?.[group] || []).some(row => has(row.name))) || spaceCosts.some(key => Number(profile.locationExpenses?.[key]) > 0),
    targetMarket: (profile.targetMarket?.customerGroups || []).length > 0 && has(profile.targetMarket?.frequentGroup),
  };
  return businessSetupSteps.filter(step => complete[step]);
}

export function assertBusinessSetupSaved(profile, expected) {
  const actual = profileBusinessSetup(profile);
  if (!Array.isArray(profile.meta?.completedSetupSteps) || expected.some(step => !actual.includes(step))) {
    throw new Error("Your business details are saved, but setup progress could not be synced. Please try again.");
  }
  return profile;
}

export async function syncBusinessSetupProfile(profile, legacyCompleted, persist = async completed => {
  const data = await apiJson("/api/business-profile", {method:"PATCH", body:JSON.stringify({business_operations:{...profile.operations, locationExpenses:profile.locationExpenses || {}, completedSetupSteps:completed}})});
  return normalizeBusinessProfile(data, profile);
}) {
  if (Array.isArray(profile.meta?.completedSetupSteps) || !profile.meta?.businessProfileId) return profile;
  const recovered = recoverBusinessSetup(profile);
  const completed = businessSetupSteps.filter(step => legacyCompleted.includes(step) || recovered.includes(step));
  return completed.length ? assertBusinessSetupSaved(await persist(completed), completed) : profile;
}
