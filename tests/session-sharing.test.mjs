import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSessionBridge} from '../src/features/auth/session-sharing.js';

function storage(values = {}) {
  const items = new Map(Object.entries(values));
  return {getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key)};
}
function session(id = 42) {
  return {'kostaraa.session': 'active', 'kostaraa.token': `session-${id}`, 'kostaraa.user': JSON.stringify({id, username: `owner${id}`}), 'kostaraa.loadedVersion': '0.2.26'};
}
function hub() {
  const channels = new Set();
  return () => {
    const channel = {
      onmessage: null,
      postMessage(data) {
        for (const peer of channels) if (peer !== channel) queueMicrotask(() => {
          if (channels.has(peer)) peer.onmessage?.({data: structuredClone(data)});
        });
      },
      close() {channels.delete(channel);},
    };
    channels.add(channel);
    return channel;
  };
}
const flush = () => new Promise(resolve => queueMicrotask(resolve));

test('a payment link opened in a new tab receives the active login before rendering protected pages', async t => {
  const channel = hub();
  const original = storage({...session(), 'kostaraa.signupCheckout': 'private checkout credential', 'kostaraa.signup': 'private signup data'});
  const paymentTab = storage();
  const active = createSessionBridge({storage: original, channel: channel(), onChange: () => assert.fail('No change in original tab'), timeout: 10});
  const opened = createSessionBridge({storage: paymentTab, channel: channel(), onChange: () => assert.fail('Initial hydration must not reload'), timeout: 10});
  t.after(() => {active.close(); opened.close();});
  await opened.ready;
  assert.equal(paymentTab.getItem('kostaraa.session'), 'active');
  assert.equal(paymentTab.getItem('kostaraa.token'), 'session-42');
  assert.equal(JSON.parse(paymentTab.getItem('kostaraa.user')).id, 42);
  assert.equal(paymentTab.getItem('kostaraa.signupCheckout'), null);
  assert.equal(paymentTab.getItem('kostaraa.signup'), null);
});

test('logout clears credentials in other tabs and cannot be restored by an old tab', async t => {
  const channel = hub(), first = storage(session()), second = storage();
  let changes = 0;
  const a = createSessionBridge({storage: first, channel: channel(), onChange: () => {}, timeout: 10});
  const b = createSessionBridge({storage: second, channel: channel(), onChange: () => {changes++;}, timeout: 10});
  t.after(() => {a.close(); b.close();});
  await b.ready;
  Object.keys(session()).forEach(key => first.removeItem(key));
  a.publish();
  await flush();
  assert.equal(second.getItem('kostaraa.token'), null);
  assert.equal(second.getItem('kostaraa.user'), null);
  assert.equal(second.getItem('kostaraa.session'), null);
  assert.equal(changes, 1);
  const fresh = storage();
  const c = createSessionBridge({storage: fresh, channel: channel(), onChange: () => {}, timeout: 5});
  t.after(() => c.close());
  await c.ready;
  assert.equal(fresh.getItem('kostaraa.token'), null);
});

test('signing into another account synchronizes identity and refreshes stale workspace state', async t => {
  const channel = hub(), first = storage(session()), second = storage();
  let changes = 0;
  const a = createSessionBridge({storage: first, channel: channel(), onChange: () => {}, timeout: 10});
  const b = createSessionBridge({storage: second, channel: channel(), onChange: () => {changes++;}, timeout: 10});
  t.after(() => {a.close(); b.close();});
  await b.ready;
  for (const [key, value] of Object.entries(session(99))) first.setItem(key, value);
  a.publish();
  await flush();
  assert.equal(JSON.parse(second.getItem('kostaraa.user')).id, 99);
  assert.equal(second.getItem('kostaraa.token'), 'session-99');
  assert.equal(changes, 1);
  a.publish();
  await flush();
  assert.equal(changes, 1);
});

test('with no open signed-in tabs, startup completes as signed out instead of inventing a session', async t => {
  const channel = hub(), guest = storage();
  const bridge = createSessionBridge({storage: guest, channel: channel(), onChange: () => assert.fail('No session change'), timeout: 5});
  t.after(() => bridge.close());
  await bridge.ready;
  assert.equal(guest.getItem('kostaraa.token'), null);
  assert.equal(guest.getItem('kostaraa.session'), null);
});

test('malformed session announcements cannot overwrite a valid login', async t => {
  const channel = hub(), signedIn = storage(session());
  const bridge = createSessionBridge({storage: signedIn, channel: channel(), onChange: () => assert.fail('Invalid messages must be ignored'), timeout: 10});
  const sender = channel();
  t.after(() => {bridge.close(); sender.close();});
  for (const invalid of [undefined, {}, {'kostaraa.session': 'active', 'kostaraa.token': 'bad', 'kostaraa.user': 'not json'}]) sender.postMessage({type: 'changed', session: invalid});
  await flush();
  assert.equal(signedIn.getItem('kostaraa.token'), 'session-42');
});

test('native BroadcastChannel delivers a live session to a separately initialized tab', async t => {
  const {BroadcastChannel} = await import('node:worker_threads');
  const name = `kostaraa-session-test-${Date.now()}-${Math.random()}`;
  const first = storage(session()), opened = storage();
  const a = createSessionBridge({storage: first, channel: new BroadcastChannel(name), onChange: () => {}, timeout: 1000});
  const b = createSessionBridge({storage: opened, channel: new BroadcastChannel(name), onChange: () => assert.fail('Must hydrate without reloading'), timeout: 1000});
  t.after(() => {a.close(); b.close();});
  await b.ready;
  assert.equal(opened.getItem('kostaraa.token'), 'session-42');
  assert.equal(JSON.parse(opened.getItem('kostaraa.user')).id, 42);
});
