import {API_BASE_URL} from '../costing/utils/api';

export async function authRequest(action, payload) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/user/${action}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Unable to reach Kostaraa. Check your connection and try again.');
  }

  let data;
  try {
    data = JSON.parse(await response.text());
  } catch {
    throw new Error(response.status === 404
      ? 'This feature is not available on the API server yet. The updated backend must be deployed and restarted before email verification can work.'
      : 'The API server returned an unexpected response. Please try again later.');
  }
  if (!response.ok || data?.type !== 'success') {
    throw new Error(data?.message || 'Unable to complete your request. Please try again.');
  }
  return data;
}

export function requireVerificationSignup(data) {
  if (!data.data) throw new Error('The API did not return your account details. Please contact support before registering again.');
  if (data.verification_required !== true) {
    throw new Error('Your account was created, but the API server is running an older signup flow and did not send a verification email. The updated backend must be deployed. Please do not register again.');
  }
  return data;
}
