import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {createHash} from 'node:crypto';
import {classifyRepresentation,scopedRecommendations} from '../src/lib/nexo/representation-classifier.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const {profiles,sources}=JSON.parse(read('src/lib/nexo/representation-pilot.json'));
const source=p=>sources.find(s=>s.nodeId===p.nodeId&&s.topicId===p.topicId);
test('each curated descriptor has exact original node, source bytes and excerpt',()=>{
  for(const p of profiles){const s=source(p),bytes=read(s.sourcePath),m=JSON.parse(bytes),nodes=[];function walk(n){nodes.push(n);(n.f||[]).forEach(walk)}m.ramos.forEach(walk);const n=nodes.find(n=>n.id===p.nodeId);
    assert.equal(m.topico,p.topicId);assert.equal(n.x.e,s.text);assert.equal(p.version,'sha256:'+createHash('sha256').update(bytes).digest('hex'));assert.equal(classifyRepresentation(p,s).status,'recommendation');}
});
test('classifier routes all pilot objectives to intended formats, without permission to publish',()=>{
  const expected=['simulation','simulation','chart','timeline','chart','chart','architecture','chart','timeline','comparison','text'];
  assert.deepEqual(profiles.map(p=>classifyRepresentation(p,source(p)).kind),expected);
  for(const p of profiles)assert.equal(classifyRepresentation(p,source(p)).publicationAllowed,false);
});
test('wrong scope, stale version, unsupported descriptors and missing source fail closed',()=>{
 const p=profiles[0],s=source(p);for(const x of [null,{...s,topicId:'other'},{...s,version:'stale'}])assert.equal(classifyRepresentation(p,x).status,'insufficient-evidence');
 assert.equal(classifyRepresentation({...p,features:[{type:'deterministic',excerpt:'not in source'}]},s).status,'insufficient-evidence');
 assert.equal(classifyRepresentation({...p,goal:'inspect'},s).status,'insufficient-evidence');
});
test('same evidence with another explicit supported goal can change recommendation',()=>{
 const p=profiles[0],s=source(p);const f=[...p.features,{type:'verbal',excerpt:p.features[0].excerpt}];
 assert.equal(classifyRepresentation({...p,features:f,goal:'read'},s).kind,'text');
});
test('logical architecture is not 3D, incomplete analogies and interactive contracts blocked',()=>{
 const p=profiles.find(p=>p.goal==='inspect'),s=source(p);
 assert.equal(classifyRepresentation(p,s).dimensionality,'logical-2d');
 assert.equal(classifyRepresentation({...p,spatial:undefined},s).status,'insufficient-evidence');
 assert.equal(classifyRepresentation({...p,assessment:''},s).status,'insufficient-evidence');
 const a={...p,goal:'analogize',features:[{type:'analogy-mapped',excerpt:p.features[0].excerpt}]};assert.equal(classifyRepresentation(a,s).status,'insufficient-evidence');
});
test('recommendations never leak across subjects, topics or exact nodes',()=>{
 const subjects=[{id:'rf',topics:[{id:'rf-1'},{id:'rf-1-1'}]}];
 const call=(topicId,nodeId,subjectId='rf')=>scopedRecommendations({subjects,subjectId,topicId,nodeId},profiles,sources);
 assert.equal(call('rf-1').length,4);assert.equal(call('rf-1-1').length,3);assert.equal(call('rf-1','unknown').length,0);assert.equal(call('rf-1',profiles[4].nodeId).length,0);assert.equal(call('rf-1',null,'da').length,0);
});
