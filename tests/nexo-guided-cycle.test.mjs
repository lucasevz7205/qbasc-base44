import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedConfig,guidedExercise,gradeGuided,initialCycle,advanceCycle} from '../src/lib/nexo/guided-cycle.js';
import {DAHL_NODES} from '../src/lib/nexo/dahl-puzzle.js';
const cases=[['sampling'],['quantization'],['wer'],['diarization'],['dahl'],...DAHL_NODES.map(id=>['dahl',id])];
const answers=(kind,node,phase)=>Object.fromEntries(guidedExercise(kind,node,phase).fields.map(f=>[f.id,String(f.expected)]));
test('every model has distinct initial, target and transfer states, objectively evaluated',()=>{
 for(const [kind,node] of cases){const c=guidedConfig(kind,node);assert.notDeepEqual(c.initial,c.target);assert.notDeepEqual(c.target,c.transfer);for(const phase of ['target','transfer']){assert.equal(gradeGuided(kind,node,phase,answers(kind,node,phase)).status,'correct');assert.equal(gradeGuided(kind,node,phase,{}).status,'incomplete');}assert.equal(gradeGuided(kind,node,'transfer',answers(kind,node,'target')).status,'incorrect');}
});
test('six-stage state requires committed prediction before observation and self explanation before transfer',()=>{
 let s=initialCycle();assert.equal(advanceCycle(s,{type:'observe'}),s);s=advanceCycle(s,{type:'anchor'});assert.equal(s.stage,1);assert.equal(advanceCycle(s,{type:'commit',result:{status:'incomplete'}}),s);
 const a=answers('sampling',null,'target');s=advanceCycle(s,{type:'commit',answers:a,result:gradeGuided('sampling',null,'target',a)});assert.equal(s.stage,2);assert.deepEqual(s.hypothesis,a);s=advanceCycle(s,{type:'observe'});assert.equal(s.stage,3);assert.equal(advanceCycle(s,{type:'explain',text:'x'}),s);s=advanceCycle(s,{type:'explain',text:'Minha explicação da relação.'});assert.equal(s.stage,4);s=advanceCycle(s,{type:'recall',text:'Minha regra'});assert.equal(s.stage,5);s=advanceCycle(s,{type:'transfer',result:gradeGuided('sampling',null,'transfer',answers('sampling',null,'transfer'))});assert.equal(s.transfer.status,'correct');
});
test('incorrect prediction can progress and is preserved for comparison',()=>{const s=advanceCycle(advanceCycle(initialCycle(),{type:'anchor'}),{type:'commit',answers:{x:'wrong'},result:{status:'incorrect'}});assert.equal(s.stage,2);assert.equal(s.prediction.status,'incorrect');});
test('Dahl axis-only entry evaluates dimensions, not regime names',()=>{assert.equal(guidedExercise('dahl',DAHL_NODES[0],'target').fields[0].id,'axis');assert.equal(guidedExercise('dahl',DAHL_NODES[3],'target').fields[0].id,'regime');});
