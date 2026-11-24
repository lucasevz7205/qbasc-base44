import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {generationSources} from '../src/lib/nexo/generation.js';
import {generateContextual,buildContextual,availableColumns} from '../src/lib/nexo/contextual-generation.js';
import {evaluatePuzzle} from '../src/lib/nexo/association-puzzle.js';
const load=path=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url)));
const pilot=load('src/lib/nexo/representation-pilot.json');
const da=generationSources({'../../data/kits/da/da-8-1/mapa.json':load('src/data/kits/da/da-8-1/mapa.json')},'da','da-8-1');
const source=da.find(s=>s.nodeId.endsWith('-r5.2'));
test('selection drives real DA matrix generation with two criteria and four exact rows',async()=>{
 assert.deepEqual(availableColumns(source),[1,2]);
 for(const column of [1,2]){
  const r=await generateContextual(source,pilot,{column});
  assert.equal(r.status,'candidate');assert.equal(r.kind,'matrix');assert.equal(r.plan.kind,'comparison');assert.equal(r.publicationAllowed,false);assert.equal(r.puzzle.slots.length,4);
  assert.equal(evaluatePuzzle(r.puzzle,Object.fromEntries(r.puzzle.slots.map(s=>[s.id,s.expected]))).status,'correct');
  assert.deepEqual(r.puzzle.pieces.map(p=>p.label).reverse(),source.table.rows.map(row=>row[column]));
 }
});
test('explicit arrow relationships retain association generation',async()=>{
 const s=da.find(s=>s.title.includes('Armadilhas Cebraspe'));const r=await generateContextual(s,pilot);assert.equal(r.kind,'association');assert.equal(r.status,'candidate');
});
test('invalid column and injected executable modality blocked',()=>{
 assert.equal(buildContextual(source,{kind:'matrix',column:0}).status,'blocked');assert.equal(buildContextual(source,{kind:'matrix',column:1,code:'x'}).status,'blocked');assert.equal(buildContextual(source,{kind:'anatomy'}).status,'blocked');
});
test('semantic adapter selects matrix and fails closed without fallback',async()=>{
 let calls=0;const r=await generateContextual(source,pilot,{provider:'gemini',invoke:async()=>{calls++;return {kind:'matrix',column:2,pairs:[],reason:'Critério explícito.'};}});assert.equal(calls,1);assert.equal(r.recipe.column,2);
 await assert.rejects(()=>generateContextual(source,pilot,{provider:'base44',invoke:async()=>{throw Error('quota');}}));
});
test('mathematical content is not forced into a generated puzzle',async()=>{
 const rf=generationSources({'../../data/kits/rf/rf-1/mapa.json':load('src/data/kits/rf/rf-1/mapa.json')},'rf','rf-1').find(s=>s.nodeId.endsWith('-r1.1'));
 assert.equal((await generateContextual(rf,pilot)).status,'abstained');
 assert.equal((await generateContextual(rf,pilot,{provider:'gemini',invoke:async()=>({kind:'matrix',column:1,pairs:[],reason:'wrong'})})).status,'blocked');
});
