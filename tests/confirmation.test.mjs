import {test} from 'node:test';
import assert from 'node:assert/strict';
import {confirmAction, showMessage, settleConfirmation, subscribeConfirmations} from '../src/components/confirmation/confirmation.js';

test('confirmation waits for a response and returns the selected decision', async () => {
  let current, resolved=false;
  const unsubscribe=subscribeConfirmations(value=>{current=value;});
  const pending=confirmAction('Delete this material?',{title:'Delete material?',confirmLabel:'Delete',danger:true}).then(value=>{resolved=true;return value;});
  await Promise.resolve();
  assert.equal(resolved,false);assert.equal(current.danger,true);assert.equal(current.confirmLabel,'Delete');
  settleConfirmation(current.id,false);assert.equal(await pending,false);assert.equal(current,null);
  const approved=confirmAction('Save changes?');settleConfirmation(current.id,true);
  assert.equal(await approved,true);unsubscribe();
});

test('multiple confirmations are queued and a stale response cannot approve the next action',async()=>{
  let current;const unsubscribe=subscribeConfirmations(value=>{current=value;});
  const first=confirmAction('First action');const firstId=current.id;
  const second=confirmAction('Second action');
  assert.equal(current.message,'First action');
  settleConfirmation(firstId,false);assert.equal(await first,false);
  assert.equal(current.message,'Second action');
  settleConfirmation(firstId,true);assert.equal(current.message,'Second action');
  settleConfirmation(current.id,true);assert.equal(await second,true);unsubscribe();
});

test('unmount cancels pending actions instead of executing them later',async()=>{
  const unsubscribe=subscribeConfirmations(()=>{});
  const first=confirmAction('Delete one');const second=confirmAction('Delete two');
  unsubscribe();assert.deepEqual(await Promise.all([first,second]),[false,false]);
});

test('informational alerts use the shared modal without a destructive action',async()=>{
  let current;const unsubscribe=subscribeConfirmations(value=>{current=value;});
  const pending=showMessage('Choose a PNG or JPG image.',{title:'Choose a different image'});
  assert.equal(current.alert,true);assert.equal(current.confirmLabel,'Got it');assert.equal(current.danger,undefined);
  settleConfirmation(current.id,true);await pending;unsubscribe();
});
