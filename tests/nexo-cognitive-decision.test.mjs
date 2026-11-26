import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {STRUCTURE_IDS,STRUCTURES,decisionEvidence,decideCognitive,validateCognitiveDecision,buildDecidedCandidate,structureViability} from '../src/lib/nexo/cognitive-decision.js';
import {generationSources,sourceVersion} from '../src/lib/nexo/generation.js';
const load=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const pilot=load('src/lib/nexo/representation-pilot.json');
const sources=(subject,topic,path)=>generationSources({[path]:load(path)},subject,topic);
const da=sources('da','da-8-1','src/data/kits/da/da-8-1/mapa.json').find(s=>s.nodeId.endsWith('-r5.2'));
const proc=sources('da','da-10-1','src/data/kits/da-10-1/mapa.json').find(s=>s.nodeId==='r4');
const bobbio=sources('cp','cp-1','src/data/kits/cp/cp-1/mapa.json').find(s=>s.nodeId.endsWith('-r1.3a'));
const sampling=sources('rf','rf-1','src/data/kits/rf/rf-1/mapa.json').find(s=>s.nodeId.endsWith('-r1.1'));
const fixture={subjectId:'ti',topicId:'ti-8-2',nodeId:'fixture',title:'Gráficos',reference:'Aula',lines:['Um histograma mostra a distribuição de frequência em classes ordenadas no eixo horizontal.']};
const reply=(s,primary,secondary='none')=>({primary,secondary,objective:'Compreender o conceito',reason:'A estrutura corresponde ao objetivo.',backupReason:secondary==='none'?'Sem alternativa fundamentada.':'Preserva a compreensão do mesmo conceito.',assessments:STRUCTURE_IDS.map(structure=>({structure,suitability:structure===primary?'strong':structure===secondary?'possible':'unsupported',reason:'Avaliação de teste',evidence:[primary,secondary].includes(structure)?[{id:'line:0',excerpt:s.lines[0]}]:[]}))});
test('all nine structures in semantic contract, independently of renderer availability',async()=>{
 assert.equal(STRUCTURE_IDS.length,9);
 for(const structure of STRUCTURE_IDS){
  let calls=0;const r=await decideCognitive(fixture,pilot,{provider:'gemini',invoke:async({prompt,schema})=>{calls++;assert.ok(prompt.includes('TODAS as nove'));assert.equal(schema.properties.assessments.items.properties.structure.enum.length,9);return reply(fixture,structure);}});
  assert.equal(calls,1);assert.equal(r.primary.structure,structure);assert.equal(r.assessments.length,9);assert.equal(r.constructionAllowed,false);assert.equal(r.publicationAllowed,false);
 }
});
test('procurement keeps the reviewed conditional procedure and withholds the sequential backup',async()=>{
 const d=await decideCognitive(proc,pilot);assert.equal(d.primary.structure,'conditional');assert.equal(d.secondary,null);assert.equal(d.primary.viability.status,'local-recipe');
 assert.equal(d.assessments.find(a=>a.structure==='sequential').suitability,'strong');
 const r=await buildDecidedCandidate(proc,d);assert.equal(r.kind,'procedure');assert.equal(r.status,'candidate');assert.equal(r.publicationAllowed,false);
});
test('actual comparison and sampling keep pedagogy distinct from capability',async()=>{
 const d=await decideCognitive(da,pilot);assert.equal(d.primary.structure,'comparative');assert.equal((await buildDecidedCandidate(da,d)).kind,'matrix');
 const r=await decideCognitive(sampling,pilot);assert.equal(r.primary.structure,'simulation');assert.equal(r.primary.viability.status,'existing');assert.equal((await buildDecidedCandidate(sampling,r)).status,'recommended');
});
test('actual quantitative cue can recommend unimplemented structure, no silent substitution',async()=>{
 const d=await decideCognitive(fixture,pilot);assert.equal(d.primary.structure,'quantitative');assert.equal(d.primary.viability.status,'unavailable');assert.equal((await buildDecidedCandidate(fixture,d)).status,'recommended');
 const r=await decideCognitive(da,pilot,{provider:'base44',invoke:async()=>reply(da,'temporal','comparative')});
 assert.equal(r.primary.structure,'temporal');assert.equal(r.secondary.structure,'comparative');assert.equal(r.secondary.equivalenceStatus,'unverified');assert.equal((await buildDecidedCandidate(da,r)).status,'recommended');
});
test('source grounding rejects invented, duplicate, incomplete or unsupported assessments and wrong primary',async()=>{
 const raw=reply(fixture,'quantitative','comparative');
 const bad=[{...raw,secondary:'quantitative'},{...raw,assessments:raw.assessments.slice(1)},{...raw,primary:'anatomy'},{...raw,primary:'none'},{...raw,primary:'architectural'},{...raw,extra:'code'}];
 for(const v of bad)assert.equal((await validateCognitiveDecision(fixture,v)).status,'blocked');
 const wrong=reply(fixture,'quantitative');wrong.assessments.find(a=>a.structure==='quantitative').evidence[0].excerpt='inventado';
 assert.equal((await validateCognitiveDecision(fixture,wrong)).status,'blocked');
 const duplicate=reply(fixture,'quantitative');duplicate.assessments[0]=duplicate.assessments[1];assert.equal((await validateCognitiveDecision(fixture,duplicate)).status,'blocked');
});
test('no evidence does not force backup, provider error propagates, changed source rejects build',async()=>{
 const s={...fixture,title:'Definição',lines:['Uma explicação verbal.']};
 const d=await decideCognitive(s,pilot);assert.equal(d.status,'abstained');assert.equal(d.primary,null);assert.equal(d.secondary,null);
 await assert.rejects(decideCognitive(s,pilot,{provider:'base44',invoke:async()=>{throw Error('quota');}}),/quota/);
 const good=await decideCognitive(da,pilot);assert.equal(good.sourceVersion,await sourceVersion(da));assert.equal((await buildDecidedCandidate({...da,lines:['alterado']},good)).status,'blocked');
 assert.equal((await buildDecidedCandidate(da,{...good,scope:{...good.scope,subjectId:'rf'}})).status,'blocked');
});
test('evidence references include child and procedure with exact node remissions',()=>{
 assert.ok(decisionEvidence(proc).some(e=>e.id==='procedure:exception'&&e.nodeId==='r4.2'));
 const s={...fixture,children:[{nodeId:'child-1',title:'Parte',text:'Descrição',reference:'Fonte da parte'}]};
 assert.ok(decisionEvidence(s).some(e=>e.id==='child:0:text'&&e.reference==='Fonte da parte'&&e.nodeId==='child-1'));
 assert.equal(structureViability(fixture,'hierarchical').status,'unavailable');
 assert.equal(Object.keys(STRUCTURES).length,9);
});
test('classification with direct subdivisions outranks the derived comparison even if only the latter can render',async()=>{
 const s={...fixture,title:'Tipos de controle',lines:['A classificação distingue categorias de controle.'],children:[{nodeId:'a',title:'Tipo A',text:'Descrição A.',reference:'Fonte A'},{nodeId:'b',title:'Tipo B',text:'Descrição B.',reference:'Fonte B'}],table:{headers:['Conceito','Descrição'],rows:[['Tipo A','Descrição A.'],['Tipo B','Descrição B.']]},rowSources:[{nodeId:'a',reference:'Fonte A'},{nodeId:'b',reference:'Fonte B'}]};
 const d=await decideCognitive(s,pilot);
 assert.equal(d.primary.structure,'hierarchical');assert.equal(d.primary.viability.status,'unavailable');assert.equal(d.secondary,null);
 const comparative=d.assessments.find(a=>a.structure==='comparative');
 assert.equal(comparative.suitability,'possible');assert.equal(comparative.viability.status,'local-recipe');
 assert.equal((await buildDecidedCandidate(s,d)).status,'recommended');
});
test('semantic secondary stays a hypothesis: never built and never publishable',async()=>{
 const d=await decideCognitive(proc,pilot,{provider:'base44',invoke:async()=>reply(proc,'conditional','sequential')});
 assert.equal(d.secondary.equivalenceStatus,'unverified');
 const r=await buildDecidedCandidate(proc,d);
 assert.equal(r.publicationAllowed,false);
 assert.equal(r.kind,'procedure');
});
test('local possible indicator does not block a semantic conditional decision with literal evidence',async()=>{
 const s={subjectId:'da',topicId:'da-10-1',nodeId:'n2-semantic',title:'Habilitação antecipada',reference:'Lei 14.133/2021, art. 17',lines:['A habilitação poderá anteceder o julgamento desde que haja ato motivado e previsão expressa no edital; salvo essas condições, o julgamento precede a habilitação.']};
 const local=await decideCognitive(s,pilot);
 assert.equal(local.assessments.find(a=>a.structure==='conditional').suitability,'possible');
 const d=await decideCognitive(s,pilot,{provider:'base44',invoke:async()=>reply(s,'conditional')});
 assert.equal(d.status,'decided');assert.equal(d.primary.structure,'conditional');assert.equal(d.provider,'base44');
});
test('Bobbio lexical cues do not suffice for conditional selection',async()=>{
 const d=await decideCognitive(bobbio,pilot);
 assert.equal(d.assessments.find(a=>a.structure==='conditional').suitability,'possible');
 assert.notEqual(d.primary?.structure,'conditional');
});
test('an incidental deadline in ordered steps does not promote a temporal structure',async()=>{
 const s={...fixture,title:'Ordem das etapas',lines:['O prazo de 10 dias consta do enunciado. O objetivo é ordenar os passos.','Receber pedido → Conferir documentos → Registrar conclusão.']};
 const d=await decideCognitive(s,pilot);
 assert.equal(d.assessments.find(a=>a.structure==='temporal').suitability,'possible');
 assert.equal(d.primary?.structure,'sequential');
});
