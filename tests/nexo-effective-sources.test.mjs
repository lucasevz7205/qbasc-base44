import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {registerHooks} from 'node:module';
import {effectiveGenerationSources,decodeNexoDocuments,resolveEffectiveSource} from '../src/lib/nexo/effective-sources.js';
import {generationSources,sourceVersion} from '../src/lib/nexo/generation.js';
import {generateContextual} from '../src/lib/nexo/contextual-generation.js';
const hooks=registerHooks({resolve(specifier,context,nextResolve){return specifier.startsWith('@/lib/')?nextResolve(new URL('../src/lib/'+specifier.slice(6)+'.js',import.meta.url).href,context):nextResolve(specifier,context);}});
const {adaptStudy}=await import('../src/lib/qb-real-model.js');hooks.deregister();
const pilot={profiles:[],sources:[]};
const topic={id:'ti-4',sigla:'TI',materia:'TI',titulo:'Tipos e conceitos',num:'4'};
const doc={id:'ti-4',topico:'ti-4',fontes:[{titulo:'Fonte geral da aula'}],mapa:{centro:'TI',ramos:[{id:'parent',t:'Tipos de controle',x:{e:'Duas categorias de controle.'},f:[{id:'a',t:'Controle A',x:{e:'Descrição A.',src:'Fonte A'}},{id:'b',t:'Controle B',x:{e:'Descrição B.'}}]}]}};
const adapt=(revisao=[doc])=>adaptStudy({edital:[topic],revisao},{role:'admin'},new Date('2026-11-24T12:00:00Z'),{centralKitModules:{}}).QB_DATA;
test('stored noncentral map gets canonical node IDs, exact child descriptions and honest source level',async()=>{
 const rows=effectiveGenerationSources(adapt(),'ti','ti-4',[]);
 assert.equal(rows.length,3);
 const s=resolveEffectiveSource(rows,'parent');
 assert.ok(s.nodeId.includes('ti-4::'));
 assert.equal(s.referenceLevel,'map');
 assert.deepEqual(s.table.rows,[['Controle A','Descrição A.'],['Controle B','Descrição B.']]);
 assert.equal(s.rowSources[0].reference,'Fonte A');
 const r=await generateContextual(s,pilot);
 assert.equal(r.status,'candidate');assert.equal(r.kind,'matrix');
 assert.equal(resolveEffectiveSource(rows,s.mapNodeId),s);
 assert.equal(effectiveGenerationSources(adapt(),'pl','ti-4',[]).length,0);
 assert.equal(effectiveGenerationSources(adapt(),'ti','ti-4',[],'nonexistent').length,0);
});
test('effective snapshot excludes stale central content, missing references labelled honestly, version tracks changed child',async()=>{
 const before=resolveEffectiveSource(effectiveGenerationSources(adapt(),'ti','ti-4'),'parent');
 const updated=JSON.parse(JSON.stringify(doc));updated.mapa.ramos[0].f[1].x.e='Descrição B alterada.';
 const after=resolveEffectiveSource(effectiveGenerationSources(adapt([updated]),'ti','ti-4'),'parent');
 assert.notEqual(await sourceVersion(before),await sourceVersion(after));
 assert.equal(resolveEffectiveSource(effectiveGenerationSources(adapt([updated]),'ti','ti-4'),'b').lines[0],'Descrição B alterada.');
 const noRefs=JSON.parse(JSON.stringify(doc));delete noRefs.fontes;
 assert.equal(resolveEffectiveSource(effectiveGenerationSources(adapt([noRefs]),'ti','ti-4'),'b').referenceLevel,'internal');
});
test('fragment reconstruction validates exact indexes and rejects duplicate/missing fragments',()=>{
 const payload=JSON.stringify(doc),chunks=[payload.slice(0,50),payload.slice(50)];
 const rows=[{legacy_id:'ti-4',payload_json:JSON.stringify({_claudeParts:2,fragmentId:'f'})}];
 const parts=chunks.map((payload_chunk,part)=>({legacy_id:'f',part,payload_chunk}));
 assert.deepEqual(decodeNexoDocuments(rows,parts.reverse()),[doc]);
 assert.throws(()=>decodeNexoDocuments(rows,parts.slice(0,1)));
 assert.throws(()=>decodeNexoDocuments(rows,[...parts,parts[0]]));
 assert.throws(()=>decodeNexoDocuments([...rows,...rows],parts));
});
test('stored procurement copy retains reviewed contract only when both linked nodes are identical',async()=>{
 const path='../../data/kits/da-10-1/mapa.json',kit=JSON.parse(fs.readFileSync(new URL('../src/data/kits/da-10-1/mapa.json',import.meta.url)));
 const modules={[path]:kit};const records={edital:[{id:'da-10-1',sigla:'DA',materia:'DA',titulo:'Licitação'}],revisao:[{id:'da-10-1',topico:'da-10-1',mapa:kit}]};
 const load=()=>adaptStudy(records,{role:'admin'},new Date('2026-11-24T12:00:00Z'),{centralKitModules:modules}).QB_DATA;
 const central=generationSources(modules,'da','da-10-1');
 let s=resolveEffectiveSource(effectiveGenerationSources(load(),'da','da-10-1',central),'r4');
 assert.equal(s.origin,'mapa-armazenado');assert.ok(s.procedure);assert.equal((await generateContextual(s,pilot)).kind,'procedure');
 records.revisao[0].mapa=JSON.parse(JSON.stringify(kit));records.revisao[0].mapa.ramos.find(n=>n.id==='r4').f.find(n=>n.id==='r4.2').x.e='Outro texto';
 s=resolveEffectiveSource(effectiveGenerationSources(load(),'da','da-10-1',central),'r4');assert.equal(s.procedure,undefined);
});
test('a reviewed visual route is dropped if a supporting concept changes in the effective map',()=>{
 const path='../../data/kits/cp/cp-7/mapa.json';
 const kit=JSON.parse(fs.readFileSync(new URL('../src/data/kits/cp/cp-7/mapa.json',import.meta.url)));
 const modules={[path]:kit};
 const central=generationSources(modules,'cp','cp-7');
 const act=central.find(s=>s.learningRoute?.format==='Linha do ato');
 const supportingId=act.learningRoute.requiredNodes.find(id=>id!==act.nodeId);
 const read=mapa=>{
  const records={edital:[{id:'cp-7',sigla:'CP',materia:'cp',titulo:'Organização política'}],revisao:[{id:'cp-7',topico:'cp-7',mapa}]};
  const {QB_DATA}=adaptStudy(records,{role:'admin'},new Date('2026-11-24T12:00:00Z'),{centralKitModules:modules});
  return resolveEffectiveSource(effectiveGenerationSources(QB_DATA,'cp','cp-7',central),act.nodeId);
 };
 assert.equal(read(kit).learningRoute.modelId,'cp7-consulta');
 const updated=JSON.parse(JSON.stringify(kit));
 const change=nodes=>nodes.forEach(n=>{
  if(n.id===supportingId)n.x.e='Outro texto com o mesmo identificador e título.';
  change(n.f||[]);
 });
 change(updated.ramos);
 assert.equal(read(updated).learningRoute,undefined);
});
test('semantic reply can recommend unimplemented format with literal evidence, cannot invent evidence',async()=>{
 const s=resolveEffectiveSource(effectiveGenerationSources(adapt(),'ti','ti-4'),'a');
 const raw={kind:'recommendation',column:-1,pairs:[],reason:'Visualização para revisão.',modality:'architecture',evidence:s.lines[0],objective:'Analisar a descrição'};
 const r=await generateContextual(s,pilot,{provider:'gemini',invoke:async()=>raw});
 assert.equal(r.status,'recommended');assert.equal(r.plan.kind,'architecture');assert.equal(r.publicationAllowed,false);assert.equal(r.puzzle,undefined);
 assert.equal((await generateContextual(s,pilot,{provider:'gemini',invoke:async()=>({...raw,evidence:'texto inexistente'})})).status,'blocked');
});
