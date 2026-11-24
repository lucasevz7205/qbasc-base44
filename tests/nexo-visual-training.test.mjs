import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {visualExercise,evaluateVisual,scenarioKey} from '../src/lib/nexo/visual-training.js';
import {scopedVisualModels,VISUAL_BINDINGS} from '../src/lib/nexo/visual-catalog.js';
const load=p=>JSON.parse(fs.readFileSync(new URL('../src/data/kits/rf/'+p+'/mapa.json',import.meta.url)));
const kits=[load('rf-1'),load('rf-1-1')];
const subjects=[{id:'rf',topics:[{id:'rf-1'},{id:'rf-1-1'},{id:'rf-3'}]}];
const defs=['sampling','quantization','wer','diarization','asr','strobe'].map(id=>({id}));
const scope=(topicId,nodeId,subjectId='rf')=>scopedVisualModels({subjects,subjectId,topicId,nodeId},kits,defs);
test('RF 1 includes five distinct models, RF 1.1 two after Anatomy integration, no inheritance',()=>{assert.equal(scope('rf-1').length,5);assert.deepEqual(scope('rf-1-1').map(m=>m.id),['asr','wer']);assert.equal(scope('rf-3').length,0);assert.equal(scope('rf-1-1',null,'da').length,0);});
test('all exact node bindings exist and never leak to another topic',()=>{for(const b of VISUAL_BINDINGS.filter(b=>b.subjectId==='rf')){const result=scope(b.topicId,b.nodeId);assert.ok(result.some(m=>m.id===b.modelId&&m.source.id===b.nodeId));assert.equal(scope(b.topicId==='rf-1'?'rf-1-1':'rf-1',b.nodeId).length,0);}assert.equal(scope('rf-1','unknown').length,0);});
const answer=(kind,p)=>Object.fromEntries(visualExercise(kind,p).fields.map(f=>[f.id,String(f.expected)]));
test('all four models grade current scenarios; stale answers rejected when result changes',()=>{
  const cases=[['sampling',{frequency:5000,rate:8000},{frequency:5000,rate:16000}],['quantization',{bits:3,amplitude:.37},{bits:8,amplitude:.37}],['wer',{n:4,s:0,d:0,i:6},{n:8,s:0,d:0,i:6}],['diarization',{step:0},{step:3}]];
  for(const [kind,a,b] of cases){assert.equal(evaluateVisual(kind,a,answer(kind,a)).status,'correct');assert.equal(evaluateVisual(kind,b,answer(kind,a)).status,'incorrect');assert.equal(evaluateVisual(kind,b,answer(kind,b)).status,'correct');assert.notEqual(scenarioKey(kind,a),scenarioKey(kind,b));assert.equal(evaluateVisual(kind,b,{}).status,'incomplete');}
});
test('quantization supports all bits and WER threshold cases',()=>{for(const bits of [2,3,4,8,16])for(const amplitude of [-1,-.37,0,.37,1]){const p={bits,amplitude};assert.equal(evaluateVisual('quantization',p,answer('quantization',p)).status,'correct');}for(const i of [0,3,4,6]){const p={n:4,s:0,d:0,i};assert.equal(visualExercise('wer',p).fields[0].expected,i/4*100);}});
test('diarization stages each have distinct correction including terminal stage',()=>{for(let step=0;step<5;step++){const p={step};assert.equal(evaluateVisual('diarization',p,answer('diarization',p)).status,'correct');assert.equal(visualExercise('diarization',p).fields[1].expected,step===4?'end':String(step+1));}});
test('unknown model fails closed',()=>assert.throws(()=>visualExercise('unregistered',{})));
test('all four renderers use shared training, without hiding the model',()=>{const s=fs.readFileSync(new URL('../src/components/qb/architect/NexoVisualLab.jsx',import.meta.url),'utf8');for(const kind of defs.map(d=>d.id).filter(id=>!['asr','strobe'].includes(id)))assert.ok(s.includes('<NexoVisualTraining kind="'+kind+'"'));assert.match(s,/scopedVisualModels/);assert.doesNotMatch(s,/\\|\\|models\\[0\\]/);});
