import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from "node:url";
import {generationSources,extractExplicitPairs,validateGeneration,generateAssociation,sourceVersion} from '../src/lib/nexo/generation.js';
import {evaluatePuzzle} from '../src/lib/nexo/association-puzzle.js';
const path='../../data/kits/da/da-8-1/mapa.json',kit=JSON.parse(fs.readFileSync(new URL('../src/data/kits/da/da-8-1/mapa.json',import.meta.url)));
const maps={[path]:kit};
const source=generationSources(maps,'da','da-8-1').find(s=>s.title.includes('Armadilhas Cebraspe'));
test('actual DA kit automatically generates four explicit associations with exact source excerpts',async()=>{
 assert.ok(source);const r=await generateAssociation(source);assert.equal(r.status,'candidate');assert.equal(r.puzzle.slots.length,4);assert.equal(r.publicationAllowed,false);assert.equal(r.requiresReview,true);assert.equal(r.sourceVersion,await sourceVersion(source));
 assert.equal(evaluatePuzzle(r.puzzle,Object.fromEntries(r.puzzle.slots.map(s=>[s.id,s.expected]))).status,'correct');
 for(const p of r.pairs)assert.equal(p.evidence,source.lines[p.line]);
});
test('wrong scopes, duplicate maps, unknown node and changed version are not accepted',async()=>{
 assert.equal(generationSources(maps,'rf','da-8-1').length,0);assert.equal(generationSources(maps,'da','da-8-1','unknown').length,0);
 assert.equal(generationSources({...maps,'other/da/da-8-1/mapa.json':kit},'da','da-8-1').length,0);
 assert.notEqual(await sourceVersion(source),await sourceVersion({...source,lines:[...source.lines,'modified']}));
});
test('provider output cannot inject markup fields, ungrounded text or ambiguous mappings',()=>{
 const raw=extractExplicitPairs(source);
 assert.equal(validateGeneration(source,{...raw,code:'alert(1)'}).status,'blocked');
 assert.equal(validateGeneration(source,{...raw,pairs:raw.pairs.map((p,i)=>i? p:{...p,answer:'invented'})}).status,'blocked');
 assert.equal(validateGeneration(source,{...raw,pairs:[raw.pairs[0],raw.pairs[0],raw.pairs[1]]}).status,'blocked');
 assert.equal(validateGeneration(source,{kind:'abstain',pairs:[],reason:'Not enough evidence'}).status,'abstained');
});
test('provider invoked only on demand and does not silently fall back',async()=>{
 let calls=0;const r=await generateAssociation(source,{provider:'base44',invoke:async()=>{calls++;return extractExplicitPairs(source);}});assert.equal(r.provider,'base44');assert.equal(calls,1);
 await assert.rejects(()=>generateAssociation(source,{provider:'gemini',invoke:async()=>{calls++;throw Error('quota');}}));assert.equal(calls,2);
 await generateAssociation(source,{provider:'local',invoke:async()=>{throw Error('should not call');}});
});
test('student preview remains scoped and not persisted, backend requires auth and admin',()=>{
 const s=fs.readFileSync(new URL('../src/lib/server-fns.js',import.meta.url),'utf8').split('export const generateNexoAssociation')[1];
 assert.match(s,/middleware\(\[requireUser\]\)/);assert.match(s,/role!=="admin"/);assert.match(s,/getGenerationSources/);assert.doesNotMatch(s,/entities\..*create|entities\..*update/);
});
