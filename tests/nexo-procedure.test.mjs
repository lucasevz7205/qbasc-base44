import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {generationSources,sourceVersion} from '../src/lib/nexo/generation.js';
import {procurementProcedure,procedureRoute,procedurePuzzle,sequenceLines} from '../src/lib/nexo/procedure.js';
import {generateContextual,buildContextual} from '../src/lib/nexo/contextual-generation.js';
import {evaluatePuzzle} from '../src/lib/nexo/association-puzzle.js';
const kit=JSON.parse(fs.readFileSync(new URL('../src/data/kits/da-10-1/mapa.json',import.meta.url)));
const maps={'../../data/kits/da-10-1/mapa.json':kit};
const source=generationSources(maps,'da','da-10-1','r4')[0];
const pilot={profiles:[],sources:[]};
test('exact parent and two sibling remissions form a bounded procurement model',async()=>{
 assert.ok(source.procedure);assert.equal(source.procedure.order.referenceNodeId,'r4');
 assert.equal(source.procedure.order.nodeId,'r4.1');assert.equal(source.procedure.exception.nodeId,'r4.2');
 assert.equal(generationSources(maps,'da','da-10-1','r4.2')[0].procedure,undefined);
 const r=await generateContextual(source,pilot);assert.equal(r.kind,'procedure');assert.equal(r.plan.kind,'procedure');assert.equal(r.publicationAllowed,false);assert.equal(r.sourceVersion,await sourceVersion(source));
});
test('all eight scenarios preserve seven phases; both conditions permit but do not compel inversion',()=>{
 const model=procurementProcedure(kit);
 for(const motivated of [false,true])for(const notice of [false,true])for(const requestInversion of [false,true]){
  const r=procedureRoute(model,{motivated,notice,requestInversion});assert.equal(r.inverted,motivated&&notice&&requestInversion);assert.equal(r.steps.length,7);assert.equal(new Set(r.steps).size,7);
  assert.equal(r.steps.indexOf('habilitação'),r.inverted?2:4);
  const puzzle=procedurePuzzle(r.steps,model.order.text);assert.equal(evaluatePuzzle(puzzle,Object.fromEntries(puzzle.slots.map(s=>[s.id,s.expected]))).status,'correct');
 }
});
test('changed exception or order fails closed; wrong scope and unregistered recipe rejected',()=>{
 const changed=JSON.parse(JSON.stringify(kit));changed.ramos.find(n=>n.id==='r4').f.find(n=>n.id==='r4.2').x.e='Alterado';
 assert.equal(procurementProcedure(changed),null);
 assert.equal(buildContextual({...source,procedure:undefined},{kind:'procedure'}).status,'blocked');
 assert.equal(buildContextual(source,{kind:'procedure',code:'x'}).status,'blocked');
});
test('general literal chain uses exact original sequence and refuses ambiguous prose',async()=>{
 const s={subjectId:'da',topicId:'da-1',nodeId:'fixture',title:'Ordem das etapas',reference:'fixture',lines:['A → B → C.']};
 const r=await generateContextual(s,pilot);assert.equal(r.kind,'sequence');assert.equal(r.puzzle.slots.length,3);
 assert.equal(sequenceLines({...s,lines:['A → B → B.']}).length,0);
 assert.equal(buildContextual(s,{kind:'sequence',line:99}).status,'blocked');
});
test('semantic provider can select only the supported procedure, no invented branch',async()=>{
 const invoke=async()=>({kind:'procedure',column:-1,pairs:[],reason:'Ordem e exceção explícitas.',modality:'procedure',evidence:source.lines[0],objective:'Ordenar fases'});
 assert.equal((await generateContextual(source,pilot,{provider:'gemini',invoke})).kind,'procedure');
 assert.equal((await generateContextual(source,pilot,{provider:'gemini',invoke:async()=>({kind:'association',column:-1,pairs:[],reason:'wrong',modality:'comparison',evidence:source.lines[0],objective:'Comparar'})})).status,'blocked');
});
