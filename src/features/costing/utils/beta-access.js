export function isBetaUser(user) {
  try {
    const account = user ?? JSON.parse(sessionStorage.getItem('kostaraa.user') || '{}');
    return String(account.user_type ?? account.userType ?? '').trim().toLowerCase() === 'beta user';
  } catch { return false; }
}
