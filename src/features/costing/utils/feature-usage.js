import {getSessionUser} from './api.js';

const sessionCounts = new Map();
function usageKey(user) {
  const id = user?.id || user?.username || user?.email;
  return id ? `kostaraa.feature-visits.${encodeURIComponent(String(id))}` : null;
}
function readCounts(key) {
  try {
    const counts = JSON.parse(localStorage.getItem(key) || 'null');
    if (counts && typeof counts === 'object' && !Array.isArray(counts)) return counts;
  } catch { /* Keep tracking this account in memory when storage is unavailable. */ }
  return sessionCounts.get(key) || {};
}
export function featureVisitCount(feature, user = getSessionUser()) {
  const key = usageKey(user);
  if (!key) return 0;
  const count = Number(readCounts(key)[feature]);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}
export function recordFeatureVisit(feature, user = getSessionUser()) {
  const key = usageKey(user);
  if (!key || !feature) return;
  const counts = {...readCounts(key), [feature]: Math.min(Number.MAX_SAFE_INTEGER, featureVisitCount(feature, user) + 1)};
  sessionCounts.set(key, counts);
  try { localStorage.setItem(key, JSON.stringify(counts)); } catch { /* In-memory counts still work for this session. */ }
}
