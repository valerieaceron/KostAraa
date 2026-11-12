// Frontend fallback until the server exposes a public, aggregate-only user-count endpoint.
export const INTRODUCTORY_USERS = 19;
export const INTRODUCTORY_USER_LIMIT = 100;

export const introductoryOfferFull = INTRODUCTORY_USERS >= INTRODUCTORY_USER_LIMIT;
export const introductoryProgress = Math.min(100, Math.round((INTRODUCTORY_USERS / INTRODUCTORY_USER_LIMIT) * 100));
export const introductorySpotsRemaining = Math.max(0, INTRODUCTORY_USER_LIMIT - INTRODUCTORY_USERS);
