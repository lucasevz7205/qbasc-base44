import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {diarizationStageContext} from '../src/lib/nexo/diarization-context.js';
import {STAGES} from '../src/lib/nexo/visual-training.js';
const kit=JSON.parse(fs.readFileSync(new URL('../src/data/kits/rf/rf-1/mapa.json',import.meta.url)));
const node=kit.ramos.flatMap(r=>r.f||[]).find(n=>n.id.endsWith('-r4.2'));
test('every clicked stage yields distinct source-bound context',()=>{
  const contexts=STAGES.map((_,i)=>diarizationStageContext(node,i));
  assert.equal(new Set(contexts.map(c=>c.title)).size,5);
  assert.equal(new Set(contexts.map(c=>c.association)).size,5);
  for(const c of contexts){assert.ok(node.x.e.includes(c.anchor));assert.equal(c.reference,node.x.src);assert.equal(c.sourceNode,node.id);assert.ok(c.input&&c.output);}
});
test('unrelated node, missing evidence and invalid stage cannot generate context',()=>{
  assert.equal(diarizationStageContext({...node,id:'other'},0),null);
  assert.equal(diarizationStageContext({...node,x:{...node.x,e:'other'}},0),null);
  assert.equal(diarizationStageContext(node,5),null);
});
test('ressegmentation does not claim synthetic graphic performs algorithm',()=>assert.match(diarizationStageContext(node,4).association,/não calcula/));
test('panel follows selected stage and respects prediction visibility',()=>{
  const s=fs.readFileSync(new URL('../src/components/qb/architect/NexoVisualLab.jsx',import.meta.url),'utf8');
  assert.match(s,/onStageChange\?\.\(v\)/);
  assert.match(s,/stageContext&&\(!predictionMode\|\|stageRevealed\)/);
  assert.match(s,/setStage\(v\);setStageRevealed\(false\)/);
  assert.match(s,/stageContext\.association/);
});
