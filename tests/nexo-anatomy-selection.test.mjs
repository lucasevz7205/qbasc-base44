import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {generationSources} from '../src/lib/nexo/generation.js';
import {retrieveAnatomyCandidates,validateAnatomySelection,selectAnatomy} from '../src/lib/nexo/anatomy-selection.js';
const kit=JSON.parse(fs.readFileSync(new URL('../src/data/kits/rf/rf-1/mapa.json',import.meta.url)));
const sources=generationSources({'../../data/kits/rf/rf-1/mapa.json':kit},'rf','rf-1');
const source=sources.find(s=>s.nodeId.endsWith('-r1'));
const reply={status:'needs-source',nodeId:source.nodeId,evidence:'onda contínua de pressão do ar convertida em sinal elétrico analógico pelo microfone',object:'Microfone de bobina móvel',objective:'Compreender a conversão acústico-elétrica',reason:'É um transdutor físico ligado diretamente ao assunto.',missing:'Fonte técnica sobre o tipo de microfone, peças e funcionamento.'};
test('actual source supports physical shortlist but no construction approval',async()=>{
 assert.ok(retrieveAnatomyCandidates(sources).some(s=>s.nodeId===source.nodeId));
 const r=await validateAnatomySelection(sources,reply);assert.equal(r.status,'candidate');assert.equal(r.providerAssessment,'needs-source');assert.equal(r.constructionAllowed,false);assert.equal(r.publicationAllowed,false);
});
test('invalid evidence, arbitrary node, missing gaps and injected code are blocked',async()=>{
 for(const raw of [{...reply,evidence:'inventado'},{...reply,nodeId:'other'},{...reply,missing:''},{...reply,code:'run()'}])assert.equal((await validateAnatomySelection(sources,raw)).status,'blocked');
});
test('semantic provider is invoked once on shortlist and errors propagate without fallback',async()=>{
 let calls=0;const r=await selectAnatomy(sources,async({prompt})=>{calls++;assert.ok(prompt.includes(source.nodeId));return reply;});assert.equal(calls,1);assert.equal(r.status,'candidate');
 await assert.rejects(()=>selectAnatomy(sources,async()=>{throw Error('quota');}));
});
test('valid abstention and direct claim cannot authorize construction',async()=>{
 const r=await validateAnatomySelection(sources,{status:'abstain',nodeId:'',evidence:'',object:'',objective:'',reason:'Sem fonte suficiente.',missing:''});assert.equal(r.status,'abstained');
 const direct=await validateAnatomySelection(sources,{...reply,status:'direct',missing:''});assert.equal(direct.constructionAllowed,false);
});
