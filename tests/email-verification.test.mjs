import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';

async function fixture(search, request) {
  const file = '../src/features/auth/VerifyEmailPage.tsx';
  const {code} = await transformWithOxc(await readFile(new URL(file, import.meta.url), 'utf8'), file, {jsx: {runtime: 'classic'}});
  const executable = code.replace(/^import .*;\n/gm, '').replace(/^export default /gm, '');
  const states = [], refs = [], effects = [], redirects = [], calls = [];
  let stateIndex, refIndex;
  const Component = vm.runInNewContext(`${executable}\nVerifyEmailPage`, {
    React: {createElement: (type, props, ...children) => ({type, props: props || {}, children})},
    MailCheck: () => {}, URLSearchParams,
    location: {search, replace: url => redirects.push(url)},
    useState: initial => {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], value => {states[index] = value;}];
    },
    useRef: initial => refs[refIndex++] ??= {current: initial},
    useEffect: callback => effects.push(callback),
    authRequest: (action, payload) => {calls.push({action, payload}); return request(action, payload);},
  });
  const render = () => {stateIndex = 0; refIndex = 0; return Component();};
  return {render, effects, calls, redirects};
}
function find(node, predicate) {
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  return find(node.children, predicate);
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('email links verify automatically once during StrictMode replay and redirect after success', async () => {
  let resolve;
  const f = await fixture('?token=example-token', () => new Promise(done => {resolve = done;}));
  const tree = f.render();
  assert.equal(find(tree, node => node.type === 'button'), undefined);
  const cleanup = f.effects[0]();
  cleanup();
  f.effects[0]();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].action, 'verify-email');
  assert.equal(f.calls[0].payload.token, 'example-token');
  assert.deepEqual(f.redirects, []);
  resolve({type: 'success'});
  await settle();
  assert.deepEqual(f.redirects, ['/login?registered=1']);
});

test('invalid or expired links show the API error and recovery without redirecting', async () => {
  const f = await fixture('?token=expired', () => Promise.reject(new Error('Verification link has expired.')));
  f.render(); f.effects[0](); await settle();
  const tree = f.render();
  assert.deepEqual(f.redirects, []);
  assert.ok(find(tree, node => node.props.role === 'alert').children.includes('Verification link has expired.'));
  assert.ok(find(tree, node => node.type === 'a' && node.props.href === '/verify-email'));
});

test('visiting without a token preserves the resend form without automatic API calls', async () => {
  const f = await fixture('?email=owner%40example.test', async () => ({message: 'Email sent.'}));
  const tree = f.render(); f.effects[0]();
  assert.equal(f.calls.length, 0);
  assert.equal(find(tree, node => node.type === 'input').props.value, 'owner@example.test');
  find(tree, node => node.type === 'form').props.onSubmit({preventDefault() {}});
  await settle();
  assert.equal(f.calls[0].action, 'resend-verification');
  assert.equal(f.calls[0].payload.email, 'owner@example.test');
  assert.deepEqual(f.redirects, []);
});
