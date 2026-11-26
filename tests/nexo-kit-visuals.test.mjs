import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {validPuzzle,evaluatePuzzle} from '../src/lib/nexo/association-puzzle.js';
import {KIT_PUZZLES,getKitPuzzleSource,getNepSource,nepSum,kitPuzzleStages,kitVisualSources,kitVisualDefinitions,NEP_NODE} from '../src/lib/nexo/kit-visuals.js';
import {scopedVisualModels} from '../src/lib/nexo/visual-catalog.js';
const load=p=>JSON.parse(fs.readFileSync(new URL('../src/data/kits/'+p+'/mapa.json',import.meta.url)));
const kits={'cp-6':load('cp/cp-6'),'cp-7':load('cp/cp-7'),'ti-5-3':load('ti/ti-5-3'),'cp-1':load('cp/cp-1')};
const clone=o=>JSON.parse(JSON.stringify(o));

test('every kit visual model validates against the real kit text',()=>{
  for(const m of KIT_PUZZLES)assert.ok(getKitPuzzleSource(kits[m.topicId],m),m.id);
  assert.ok(getNepSource(kits['cp-6']));
  assert.equal(Object.keys(kitVisualSources(Object.values(kits))).length,KIT_PUZZLES.length+1);
});
test('every stage is a valid one-to-one puzzle solvable only by its key',()=>{
  for(const m of KIT_PUZZLES)for(const s of m.stages){
    assert.ok(validPuzzle(s),m.id+':'+s.id);
    const solved=Object.fromEntries(s.slots.map(x=>[x.id,x.expected]));
    assert.equal(evaluatePuzzle(s,solved).status,'correct');
    assert.equal(evaluatePuzzle(s,{}).status,'incomplete');
  }
});
test('fails closed when an anchored sentence changes in the kit',()=>{
  for(const m of KIT_PUZZLES){
    const kit=clone(kits[m.topicId]);
    const [suffix,anchor]=m.anchors[0];
    const walk=n=>{if(n.id===m.prefix+suffix)n.x.e=n.x.e.replace(anchor,'texto alterado');(n.f||[]).forEach(walk);};
    kit.ramos.forEach(walk);
    assert.equal(getKitPuzzleSource(kit,m),null,m.id);
  }
  const k=clone(kits['cp-6']);
  const walk=n=>{if(n.id===NEP_NODE)n.x.e=n.x.e.replace('0,315','0,400');(n.f||[]).forEach(walk);};
  k.ramos.forEach(walk);
  assert.equal(getNepSource(k),null);
});
test('models never leak to another topic or subject',()=>{
  const m=KIT_PUZZLES[0];
  assert.equal(getKitPuzzleSource(kits['cp-1'],m),null);
  assert.equal(getKitPuzzleSource({...kits[m.topicId],materia:'ti'},m),null);
});
test('NEP formula reproduces the worked example of the material',()=>{
  const r=nepSum([40,35,15,10]);
  assert.ok(Math.abs(r.sum-0.315)<1e-12);
  assert.equal(Math.round(r.nep*10)/10,3.2);
  assert.equal(nepSum([50,50]).nep,2);
});
test('node selection narrows stages to the selected node',()=>{
  const m=KIT_PUZZLES.find(x=>x.id==='cp7-consulta');
  const s=getKitPuzzleSource(kits['cp-7'],m);
  assert.equal(kitPuzzleStages(s).length,3);
  assert.deepEqual(kitPuzzleStages(s,m.prefix+'r3.3').map(x=>x.id),['iniciativa']);
  assert.deepEqual(kitPuzzleStages(s,m.prefix+'r1.1'),[]);
});
test('supporting nodes are evidence for the activity but have no borrowed model',()=>{
  const kit=kits['ti-5-3'];
  const model=KIT_PUZZLES.find(m=>m.id==='ti53-ciclo');
  const subjects=[{id:'ti',topics:[{id:'ti-5-3'}]}];
  const defs=kitVisualDefinitions(kitVisualSources([kit]));
  const scope={subjects,subjectId:'ti',topicId:'ti-5-3'};
  assert.equal(scopedVisualModels({...scope,nodeId:model.prefix+'r1.3'},[kit],defs)[0]?.id,model.id);
  assert.deepEqual(scopedVisualModels({...scope,nodeId:model.prefix+'r1.3.1'},[kit],defs),[]);
});
test('catalog exposes the new models in the lab for cp-6, cp-7 and ti-5-3',()=>{
  const sources=kitVisualSources(Object.values(kits));
  const defs=kitVisualDefinitions(sources);
  const subjects=[{id:'cp',topics:[{id:'cp-1'},{id:'cp-6'},{id:'cp-7'}]},{id:'ti',topics:[{id:'ti-5-3'}]}];
  const ids=(subjectId,topicId)=>scopedVisualModels({subjects,subjectId,topicId},Object.values(kits),defs).map(m=>m.id).sort();
  assert.deepEqual(ids('cp','cp-6'),['cp6-modelos','cp6-nep','cp6-sartori']);
  assert.deepEqual(ids('cp','cp-7'),['cp7-competencias','cp7-consulta','cp7-idades']);
  assert.deepEqual(ids('ti','ti-5-3'),['ti53-ciclo','ti53-gendisc']);
});
