import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {strobeState,strobeSource,STROBE_NODE} from '../src/lib/nexo/strobe-anatomy.js';
import {evaluateVisual,visualExercise} from '../src/lib/nexo/visual-training.js';
import {guidedConfig,guidedExercise,gradeGuided} from '../src/lib/nexo/guided-cycle.js';
test('physical analogy uses the same phase as every captured frame',()=>{for(const f of [1,2,3,4,5])for(const r of [4,8,12]){const d=strobeState(f,r,2);assert.ok(Math.abs(d.frames[0]-d.angle)<1e-12);for(let i=0;i<5;i++)assert.ok(Math.abs(Math.cos(d.frames[i])-Math.cos(2*Math.PI*d.signed*(2+i)/r))<1e-12);}});
test('forward, reverse, stationary and boundary correct across configurations',()=>{for(const [f,r,c] of [[1,4,'forward'],[3,4,'reverse'],[4,4,'stationary'],[2,4,'boundary']]){assert.equal(strobeState(f,r).condition,c);assert.equal(evaluateVisual('strobe',{frequency:f,rate:r},{direction:c,limit:String(r/2)}).status,'correct');}});
test('exact existing sampling node supports the remitted analogue',()=>{const kit=JSON.parse(fs.readFileSync(new URL('../src/data/kits/rf/rf-1/mapa.json',import.meta.url)));assert.equal(strobeSource(kit)?.id,STROBE_NODE);assert.equal(strobeSource({...kit,topico:'other'}),null);});
test('each guided variant uses valid target and transfer answer keys',()=>{for(let v=0;v<3;v++){const c=guidedConfig('strobe',STROBE_NODE,v);assert.notDeepEqual(c.target,c.transfer);for(const phase of ['target','transfer']){const a=Object.fromEntries(guidedExercise('strobe',STROBE_NODE,phase,v).fields.map(f=>[f.id,String(f.expected)]));assert.equal(gradeGuided('strobe',STROBE_NODE,phase,a,v).status,'correct');}assert.equal(visualExercise('strobe',c.target).fields.length,2);}});

test('RF1 sampling exact node exposes both mathematical and tangible representations without inheriting others',async()=>{
 const {scopedVisualModels}=await import('../src/lib/nexo/visual-catalog.js');
 const kit=JSON.parse(fs.readFileSync(new URL('../src/data/kits/rf/rf-1/mapa.json',import.meta.url)));
 const subjects=[{id:'rf',topics:[{id:'rf-1'}]}];
 const defs=['strobe','sampling','quantization'].map(id=>({id}));
 assert.deepEqual(scopedVisualModels({subjects,subjectId:'rf',topicId:'rf-1',nodeId:STROBE_NODE},[kit],defs).map(m=>m.id),['strobe','sampling']);
});
