import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {generationSources} from '../src/lib/nexo/generation.js';
import {planRepresentation,chooseNewRepresentation} from '../src/lib/nexo/representation-planner.js';
const load=path=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url)));
const pilot=load('src/lib/nexo/representation-pilot.json');
const da=generationSources({'../../data/kits/da/da-8-1/mapa.json':load('src/data/kits/da/da-8-1/mapa.json')},'da','da-8-1');
const rf=generationSources({'../../data/kits/rf/rf-1/mapa.json':load('src/data/kits/rf/rf-1/mapa.json')},'rf','rf-1');
test('real RF sampling selects mathematical simulation, not an unrelated object',async()=>{
 const p=await planRepresentation(rf.find(s=>s.nodeId.endsWith('-r1.1')),pilot);
 assert.equal(p.kind,'simulation');assert.equal(p.publicationAllowed,false);
});
test('real DA subject selects the explicit 4-concept matrix without creating a model',async()=>{
 const p=await chooseNewRepresentation(da,pilot);assert.match(p.nodeId,/-r5\.2$/);assert.equal(p.kind,'comparison');assert.equal(p.evidence.length,5);assert.equal(p.requiresReview,true);assert.equal(p.publicationAllowed,false);
});
test('physical word alone does not justify visualization and missing structure abstains',async()=>{
 const p=await planRepresentation({...rf[0],lines:['O microfone converte pressão sonora em sinal elétrico.'],table:undefined},pilot);
 assert.equal(p.kind,'text');
});
test('stale curated text is not re-used and missing source is rejected',async()=>{
 const s=rf.find(s=>s.nodeId.endsWith('-r1.1'));
 const p=await planRepresentation({...s,lines:['Alterado.'],table:undefined},pilot);assert.equal(p.kind,'text');
 assert.equal(await planRepresentation(null,pilot),null);
});
