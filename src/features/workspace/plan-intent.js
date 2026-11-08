function intentKey(user) {
  return user?.id ? `kostaraa.planIntent:${user.id}` : null;
}

export function readPlanIntent(storage, user) {
  const key = intentKey(user);
  return key ? storage.getItem(key) || "" : "";
}

export function savePlanIntent(storage, user, plan) {
  const key = intentKey(user);
  if (key && plan) storage.setItem(key, String(plan));
}

export function clearPlanIntent(storage, user) {
  const key = intentKey(user);
  if (key) storage.removeItem(key);
}

export function paymentJourneyState(data) {
  const subscription = data?.subscription;
  const paid = Number(subscription?.plan_details?.price) > 0 || subscription?.plan === "paid";
  const unexpired = !subscription?.expires_at || Date.parse(subscription.expires_at) > Date.now();
  if (subscription?.membership_type === "beta" || subscription?.plan === "beta" || (paid && unexpired)) return "active";
  return data?.payments?.some(payment => payment.status === "pending") ? "pending" : "unpaid";
}
