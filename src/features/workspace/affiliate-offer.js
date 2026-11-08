export function affiliateOfferCountdown(expiresAt, now = Date.now()) {
  const deadline = Date.parse(expiresAt);
  const seconds = Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return {expired: seconds === 0, label: seconds ? `${days}d ${hours}h ${minutes}m ${seconds % 60}s` : 'Expired'};
}
