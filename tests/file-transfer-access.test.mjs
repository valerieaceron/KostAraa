import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {canUseFileTransfers} from '../src/features/costing/utils/file-transfer-access.js';

for (const [name, data, expected] of [
  ['unverified', null, false],
  ['free', {subscription:{plan:'free',membership_type:'free',plan_details:{price:0}}}, false],
  ['pending payment', {subscription:{plan:'free'},payments:[{status:'pending'}]}, false],
  ['expired paid', {subscription:{plan:'paid',expires_at:'2000-01-01'}}, false],
  ['active paid', {subscription:{plan:'paid',expires_at:'2099-01-01'}}, true],
  ['active custom plan', {subscription:{plan_details:{price:500},expires_at:'2099-01-01'}}, true],
  ['beta', {subscription:{membership_type:'beta'}}, true],
]) {
  test(`${name} account file transfer access is ${expected}`, () => assert.equal(canUseFileTransfers(data),expected));
}

for (const [page, handler] of [['Inventory','exportInventory'],['Inventory','importInventory'],['ProductsServices','exportLibrary'],['Grid','exportGrid']]) {
  test(`${page} ${handler} blocks forced invocation when file transfers are unavailable`, async () => {
    const source=await readFile(new URL(`../src/features/costing/pages/${page}.jsx`,import.meta.url),'utf8');
    const start=source.indexOf(`  const ${handler} = async`);
    const end=source.indexOf('\n  };',start)+5;
    assert.ok(start>=0&&end>start);
    let upgrades=0;
    const action=vm.runInNewContext(source.slice(start,end)+`\n${handler}`, {canTransferFiles:false,requestFileTransferUpgrade:()=>{upgrades++;}});
    const event={target:{value:'file.xlsx'}};
    await action(event);
    assert.equal(upgrades,1);
    if(handler==='importInventory')assert.equal(event.target.value,'');
  });
}
