import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isBetaUser} from '../src/features/costing/utils/beta-access.js';
test('Grid is only available to explicitly identified beta accounts',()=>{
 assert.equal(isBetaUser({user_type:'beta user'}),true);
 assert.equal(isBetaUser({userType:'Beta User'}),true);
 for(const user of [{},{user_type:'normal user'},{user_type:'admin user'},{user_type:'offline user'},{user_type:'not beta user'}])assert.equal(isBetaUser(user),false);
});
