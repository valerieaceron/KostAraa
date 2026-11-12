import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../src/features/costing/pages/Grid.jsx',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('  const removeProductRow = '),source.indexOf('  const bulkDelete = '));
function setup({rows,confirm=true,deleted=[],failure=false,savingId=null}) {
  const state={rows,history:0,cleared:0,errors:{},notices:[],confirmations:[],deletes:[],selected:new Set(rows.map(row=>row.id))};
  const updateRows=next=>{state.rows=next(state.rows);};
  const remove=vm.runInNewContext(handler+'\nremoveProductRow',{
    savingId,saveLock:{current:false},setSavingId:()=>{},
    hasInput:row=>Boolean(row.name),confirmAction:async message=>{state.confirmations.push(message);return confirm;},
    onDeleteItems:async ids=>{state.deletes.push(...ids);if(failure)throw Error('Delete failed');return deleted;},
    setErrors:next=>{state.errors=next(state.errors);},
    createGridProduct:()=>({id:'blank',name:''}),setRows:updateRows,
    changeRows:next=>{state.history++;updateRows(next);},clearHistory:()=>{state.cleared++;},
    setSelectedIds:next=>{state.selected=next(state.selected);},setEditingCell:()=>{},setActive:()=>{},
    notifySuccess:(...notice)=>state.notices.push(notice),
  });
  return {state,remove};
}
const draft={id:'draft',name:'Coffee'},saved={id:'saved-row',name:'Cake',savedItem:{id:42}},blank={id:'empty',name:''};

test('empty product rows can be removed without confirmation and draft removal supports undo',async()=>{
  const {state,remove}=setup({rows:[draft,blank]});await remove(blank);
  assert.deepEqual(state.rows,[draft]);assert.equal(state.confirmations.length,0);
  assert.equal(state.history,1);assert.equal(state.deletes.length,0);
  assert.equal(state.selected.has(blank.id),false);assert.equal(state.notices.length,1);
});
test('removing the last row leaves one editable blank row',async()=>{
  const {state,remove}=setup({rows:[blank]});await remove(blank);
  assert.equal(state.rows.length,1);assert.equal(state.rows[0].name,'');
});
test('canceling a populated row removal preserves its data',async()=>{
  const {state,remove}=setup({rows:[draft],confirm:false});await remove(draft);
  assert.deepEqual(state.rows,[draft]);assert.equal(state.history,0);assert.equal(state.notices.length,0);
});
test('saved row deletion explicitly warns about Product Library and waits for confirmed deletion',async()=>{
  const {state,remove}=setup({rows:[saved,draft],deleted:['42']});await remove(saved);
  assert.match(state.confirmations[0],/permanently removes.*Product Library/);
  assert.deepEqual(state.deletes,['42']);assert.deepEqual(state.rows,[draft]);
  assert.equal(state.cleared,1);assert.equal(state.history,0);
});
for(const failure of [false,true])test(`failed saved product deletion retains the row (${failure?'exception':'unconfirmed result'})`,async()=>{
  const {state,remove}=setup({rows:[saved,draft],failure});await remove(saved);
  assert.deepEqual(state.rows,[saved,draft]);assert.ok(state.errors[saved.id]);assert.equal(state.notices.length,0);
});
test('row removal is blocked while a product is being saved',async()=>{
  const {state,remove}=setup({rows:[saved],savingId:saved.id});await remove(saved);
  assert.equal(state.deletes.length,0);assert.equal(state.confirmations.length,0);
});
