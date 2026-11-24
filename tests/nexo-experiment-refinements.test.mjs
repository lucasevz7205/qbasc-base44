import test from 'node:test';
import assert from 'node:assert/strict';
import {quantizationWindow,werComposition,diarizationFrame,rotatePieces} from '../src/lib/nexo/experiment-refinements.js';
import {quantize,wer} from '../src/lib/nexo/experiments.js';
import {GUIDED_VARIANTS,guidedConfig,guidedExercise,gradeGuided} from '../src/lib/nexo/guided-cycle.js';
import {DAHL_NODES} from '../src/lib/nexo/dahl-puzzle.js';
test('quantization window is a real adjacent subset of exact levels, includes input and selected level',()=>{
 for(const bits of [2,3,4,8,16])for(let i=-100;i<=100;i++){const x=i/100,q=quantizationWindow(x,bits),actual=quantize(x,bits);assert.equal(q.code,actual.code);assert.ok(q.levels.length<=5);assert.ok(q.levels.some(l=>l.code===q.code));assert.ok(x>=q.min-1e-12&&x<=q.max+1e-12);assert.ok(q.error<=q.maxError+1e-12);assert.ok(q.levels.every((l,i)=>i===0||Math.abs(l.value-q.levels[i-1].value-q.step)<1e-12));}
});
test('more bits reduce maximum error, not necessarily individual error',()=>{const x=1/3,a=quantizationWindow(x,2),b=quantizationWindow(x,3);assert.ok(b.maxError<a.maxError);assert.ok(b.error>a.error);});
test('WER reference, errors and hypothesis remain distinct for every valid small scenario',()=>{for(let n=1;n<=10;n++)for(let s=0;s<=n;s++)for(let d=0;d<=n-s;d++)for(const i of [0,1,n,2*n]){const p={n,s,d,i},v=werComposition(p);assert.equal(v.rate,wer(p));assert.equal(v.hypothesis,n-d+i);assert.equal(v.errors,s+d+i);assert.equal(v.classification,v.errors>n?'above':v.errors===n?'equal':'below');}});
test('diarization preserves input, speaker labels and changes only scripted boundaries in last stage',()=>{for(const e of [0,1]){const before=diarizationFrame(3,e),after=diarizationFrame(4,e);assert.deepEqual(before.input,after.input);assert.ok(after.spans.every((s,i)=>s.speaker===before.spans[i].speaker&&s.start>before.spans[i].start&&s.end<before.spans[i].end&&s.start<s.end));assert.deepEqual(before.vectors,after.vectors);}assert.notDeepEqual(diarizationFrame(0,0).input,diarizationFrame(0,1).input);});
test('rotating association pieces changes order, preserves all IDs',()=>{const p=[{id:'a'},{id:'b'},{id:'c'}];assert.deepEqual(rotatePieces(p,1).map(x=>x.id),['b','c','a']);assert.deepEqual(rotatePieces(p,3),p);assert.deepEqual(p.map(x=>x.id),['a','b','c']);});
test('all 15 model/scenario combinations and Dahl exact nodes are valid and score their own target',()=>{
 const cases=[['sampling'],['quantization'],['wer'],['diarization'],['dahl'],...DAHL_NODES.map(id=>['dahl',id])];
 for(const [kind,node] of cases)for(let v=0;v<GUIDED_VARIANTS;v++){const c=guidedConfig(kind,node,v);assert.notDeepEqual(c.initial,c.target);assert.notDeepEqual(c.target,c.transfer);const a={};for(const phase of ['target','transfer']){a[phase]=Object.fromEntries(guidedExercise(kind,node,phase,v).fields.map(f=>[f.id,String(f.expected)]));assert.equal(gradeGuided(kind,node,phase,a[phase],v).status,'correct');assert.equal(gradeGuided(kind,node,phase,{},v).status,'incomplete');}assert.equal(gradeGuided(kind,node,'transfer',a.target,v).status,'incorrect');}
});
