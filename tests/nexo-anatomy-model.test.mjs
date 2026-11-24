import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {ASR_NODE,ASR_PARTS,getAsrBoard,validateComponentBoard,componentFocus} from '../src/lib/nexo/anatomy-model.js';
import {evaluateVisual,visualExercise,scenarioKey} from '../src/lib/nexo/visual-training.js';
import {guidedConfig,guidedExercise,gradeGuided,GUIDED_VARIANTS} from '../src/lib/nexo/guided-cycle.js';
import {scopedVisualModels} from '../src/lib/nexo/visual-catalog.js';
const kit=JSON.parse(fs.readFileSync(new URL('../src/data/kits/rf/rf-1-1/mapa.json',import.meta.url)));
const model=getAsrBoard(kit);
const answers=(fields)=>Object.fromEntries(fields.map(f=>[f.id,String(f.expected)]));
test('source-exact ASR board has five parts and four logical dependency edges',()=>{
 assert.ok(validateComponentBoard(model));assert.equal(model.parts.length,5);assert.equal(model.edges.length,4);
 assert.equal(model.sourceNode,ASR_NODE);assert.deepEqual(componentFocus(model,'decoder').neighbors,['acoustic','lexicon','language']);assert.deepEqual(componentFocus(model,'features').neighbors,['acoustic']);
 const stale=JSON.parse(JSON.stringify(kit));stale.ramos[1].f[1].caixa.itens[0]='changed';assert.equal(getAsrBoard(stale),null);
});
test('declarative renderer refuses unknown components, overlapping bounds and executable fields',()=>{
 assert.equal(validateComponentBoard({...model,edges:[['features','unknown']]}),false);
 assert.equal(validateComponentBoard({...model,parts:model.parts.map(p=>p.id==='features'?{...p,x:250,y:30}:p)}),false);
 assert.equal(validateComponentBoard({...model,parts:model.parts.map(p=>({...p,script:'alert(1)'}))}),false);
 assert.equal(validateComponentBoard({...model,dimension:'physical-3d'}),false);
});
test('all five focused components grade role and source from same model',()=>{
 for(const p of ASR_PARTS){const state={part:p.id},e=visualExercise('asr',state);assert.equal(evaluateVisual('asr',state,answers(e.fields)).status,'correct');assert.equal(evaluateVisual('asr',state,{}).status,'incomplete');for(const other of ASR_PARTS.filter(o=>o.id!==p.id)){assert.notEqual(scenarioKey('asr',state),scenarioKey('asr',{part:other.id}));assert.equal(evaluateVisual('asr',{part:other.id},answers(e.fields)).status,'incorrect');}}
});
test('three guided ASR scenarios with distinct target and transfer',()=>{
 for(let v=0;v<GUIDED_VARIANTS;v++){const c=guidedConfig('asr',ASR_NODE,v);assert.notDeepEqual(c.initial,c.target);assert.notDeepEqual(c.target,c.transfer);const a=answers(guidedExercise('asr',ASR_NODE,'target',v).fields);assert.equal(gradeGuided('asr',ASR_NODE,'target',a,v).status,'correct');assert.equal(gradeGuided('asr',ASR_NODE,'transfer',a,v).status,'incorrect');assert.equal(gradeGuided('asr',ASR_NODE,'transfer',answers(guidedExercise('asr',ASR_NODE,'transfer',v).fields),v).status,'correct');}
});
test('new board is only linked to exact ASR parent node, WER still separate',()=>{
 const subjects=[{id:'rf',topics:[{id:'rf-1-1'}]}],defs=[{id:'asr'},{id:'wer'}];
 const scope=nodeId=>scopedVisualModels({subjects,subjectId:'rf',topicId:'rf-1-1',nodeId},[kit],defs);
 assert.deepEqual(scope().map(m=>m.id),['asr','wer']);assert.deepEqual(scope(ASR_NODE).map(m=>m.id),['asr']);assert.equal(scope(ASR_NODE+'a').length,0);
});
test('guided questions identify a component rather than echo its function',()=>{
 const e=guidedExercise('asr',ASR_NODE,'transfer',0);
 assert.equal(e.fields[0].id,'component');assert.equal(e.fields[0].expected,'language');assert.equal(e.fields[1].expected,'text');
 assert.equal(gradeGuided('asr',ASR_NODE,'transfer',{component:'language',origin:'audio'}).status,'incorrect');
 assert.equal(validateComponentBoard({...model,html:'<script>'}),false);
});
