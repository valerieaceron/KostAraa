import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
import {savePlanIntent,readPlanIntent} from '../src/features/workspace/plan-intent.js';

function storage() {
  const items = new Map();
  return {getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key)};
}
async function component(file, name, globals) {
  const {code} = await transformWithOxc(await readFile(new URL(file, import.meta.url), 'utf8'), file, {jsx: {runtime: 'classic'}});
  const executable = code.replace(/^import .*;\n/gm, '').replace(/^export default /gm, '').replace(/^export /gm, '');
  return vm.runInNewContext(`${executable}\n${name}`, {
    React: {createElement: (type, props, ...children) => ({type, props: props || {}, children})},
    useState: value => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {}, URLSearchParams, ...globals,
  });
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  return (node.children || []).map(child => find(child, predicate)).find(Boolean);
}

test('successful Business Plus signup navigates straight to payment without requesting login', async () => {
  const local = storage(), session = storage(), calls = [];
  const location = {search: '?plan=2', href: ''};
  const AuthForm = await component('../src/features/auth/AuthForm.tsx', 'AuthForm', {
    localStorage: local, sessionStorage: session, location, savePlanIntent,
    FormData: class {constructor(data) {this.data = data;} get(key) {return this.data[key] || null;}},
    requireVerificationSignup: value => value,
    authRequest: async (action, payload) => {
      calls.push({action, payload});
      return {data: 42, verification_required: true, email_sent: false, checkout: {token: 'a'.repeat(64), plan_id: 2}};
    },
  });
  const tree = AuthForm({mode: 'signup'});
  await find(tree, node => node.type === 'form').props.onSubmit({preventDefault() {}, currentTarget: {firstName: 'New', lastName: 'Owner', username: 'newowner', email: 'owner@example.test', password: 'password123'}});
  assert.equal(location.href, '/payment');
  assert.deepEqual(calls.map(call => call.action), ['add']);
  assert.equal(calls[0].payload.selected_plan_id, '2');
  const checkout = JSON.parse(session.getItem('kostaraa.signupCheckout'));
  assert.equal(checkout.token, 'a'.repeat(64));
  assert.equal(checkout.deliveryFailed, true);
  assert.equal(session.getItem('kostaraa.token'), null);
  assert.equal(session.getItem('kostaraa.session'), null);
  assert.equal(readPlanIntent(local, {id: 42}), '2');
});

test('pay later continues to verification, clears the checkout credential and preserves the dashboard reminder', async () => {
  const local = storage(), session = storage();
  savePlanIntent(local, {id: 42}, 2);
  session.setItem('kostaraa.signupCheckout', JSON.stringify({token: 'a'.repeat(64), email: 'owner@example.test', deliveryFailed: true}));
  const location = {href: ''};
  const PaymentPage = await component('../src/features/marketing/pages/SignupPaymentPage.tsx', 'SignupPaymentPage', {
    localStorage: local, sessionStorage: session, location,
  });
  const tree = PaymentPage();
  const payLater = find(tree, node => node.type === 'button' && node.children.some(child => typeof child === 'string' && child.startsWith('Pay later')));
  assert.ok(payLater);
  payLater.props.onClick();
  assert.equal(location.href, '/verify-email?email=owner%40example.test&delivery=failed');
  assert.equal(session.getItem('kostaraa.signupCheckout'), null);
  assert.equal(readPlanIntent(local, {id: 42}), '2');
});
