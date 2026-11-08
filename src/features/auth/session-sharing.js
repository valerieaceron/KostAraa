const SESSION_KEYS = ['kostaraa.session', 'kostaraa.token', 'kostaraa.user', 'kostaraa.loadedVersion'];

function readSession(storage) {
  if (storage.getItem('kostaraa.session') !== 'active' || !storage.getItem('kostaraa.token')) return null;
  try {
    const user = JSON.parse(storage.getItem('kostaraa.user') || 'null');
    if (!user || typeof user !== 'object' || Array.isArray(user)) return null;
    return Object.fromEntries(SESSION_KEYS.map(key => [key, storage.getItem(key)]));
  } catch { return null; }
}

// Share only the login session with live tabs on this origin. Signup checkout
// credentials stay in their own tab, and no login token is persisted locally.
export function createSessionBridge({storage, channel, onChange, timeout = 500}) {
  const requestId = `${Date.now()}-${Math.random()}`;
  let waiting = !readSession(storage), timer, resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const finish = () => { waiting = false; clearTimeout(timer); resolveReady(); };
  const apply = session => {
    const previous = readSession(storage);
    if (session !== null && (!session || session['kostaraa.session'] !== 'active' || typeof session['kostaraa.token'] !== 'string' || !session['kostaraa.token'] || typeof session['kostaraa.user'] !== 'string')) return;
    if (session) {
      try {
        const user = JSON.parse(session['kostaraa.user']);
        if (!user || typeof user !== 'object' || Array.isArray(user)) return;
      } catch { return; }
    }
    for (const key of SESSION_KEYS) {
      if (typeof session?.[key] === 'string') storage.setItem(key, session[key]);
      else storage.removeItem(key);
    }
    const initializing = waiting;
    if (waiting) finish();
    if (!initializing && JSON.stringify(previous) !== JSON.stringify(readSession(storage))) onChange();
  };
  channel.onmessage = ({data}) => {
    if (data?.type === 'request') {
      const session = readSession(storage);
      if (session) channel.postMessage({type: 'response', requestId: data.requestId, session});
    } else if (data?.type === 'response' && waiting && data.requestId === requestId) {
      apply(data.session);
    } else if (data?.type === 'changed') {
      apply(data.session);
    }
  };
  if (waiting) {
    timer = setTimeout(finish, timeout);
    channel.postMessage({type: 'request', requestId});
  } else finish();
  return {
    ready,
    publish: () => channel.postMessage({type: 'changed', session: readSession(storage)}),
    close: () => { finish(); channel.close(); },
  };
}

let bridge;
export function initializeSessionSharing() {
  if (bridge) return bridge.ready;
  try {
    if (window.BroadcastChannel) bridge = createSessionBridge({
      storage: sessionStorage,
      channel: new window.BroadcastChannel('kostaraa.session'),
      onChange: () => window.location.reload(),
    });
  } catch { /* Keep the normal single-tab session when messaging is unavailable. */ }
  return bridge?.ready || Promise.resolve();
}

export function publishSession() { bridge?.publish(); }

export function clearSharedSession() {
  SESSION_KEYS.forEach(key => sessionStorage.removeItem(key));
  publishSession();
}

if (import.meta.hot) import.meta.hot.dispose(() => bridge?.close());
