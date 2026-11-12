export const successMessageEvent = 'kostaraa:cost-management-success';

export function notifySuccess(title, message, detail = '') {
  window.dispatchEvent(new window.CustomEvent(successMessageEvent, {detail:{title, message, detail}}));
}
