let listener = null;
let sequence = 0;
const requests = [];
const publish = () => listener?.(requests[0] || null);

export function confirmAction(message, options = {}) {
  return new Promise(resolve => {
    requests.push({id:++sequence, message, title:'Confirm action', confirmLabel:'Confirm', ...options, resolve});
    publish();
  });
}

export function showMessage(message, options = {}) {
  return confirmAction(message, {title:'Please check', confirmLabel:'Got it', ...options, alert:true});
}

export function settleConfirmation(id, confirmed) {
  if (requests[0]?.id !== id) return;
  const request = requests.shift();
  request.resolve(confirmed);
  publish();
}

export function subscribeConfirmations(callback) {
  listener = callback;
  publish();
  return () => {
    listener = null;
    for (const request of requests.splice(0)) request.resolve(false);
  };
}
