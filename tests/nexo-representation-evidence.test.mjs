import test from 'node:test';
import assert from 'node:assert/strict';
import {representationEvidence,PEDAGOGICAL_REFERENCES} from '../src/lib/nexo/representation-evidence.js';
test('all supported modalities expose bounded scientific references and limitations',()=>{
  for(const kind of ['simulation','chart','timeline','comparison','analogy','text']){
    const refs=representationEvidence(kind);
    assert.ok(refs.some(r=>r.id==='deft'));
    assert.ok(refs.some(r=>r.id==='transfer'));
    assert.equal(new Set(refs.map(r=>r.id)).size,refs.length);
    for(const r of refs){assert.match(r.url,/^https:\/\//);assert.ok(r.title&&r.application&&r.limit);}
  }
  assert.deepEqual(representationEvidence('unknown'),[]);
});
test('correct authorship and scope of multimedia meta-analysis',()=>{
  assert.match(PEDAGOGICAL_REFERENCES.cromley.title,/Cromley e Chen/);
  assert.match(PEDAGOGICAL_REFERENCES.cromley.url,/100730/);
  assert.match(PEDAGOGICAL_REFERENCES.cromley.limit,/não valida o QBAsc/);
});
