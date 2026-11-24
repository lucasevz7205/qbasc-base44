import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {createHash} from 'node:crypto';
import {exactConcept} from '../src/lib/nexo/shadow.js';
const root=new URL('../',import.meta.url);
const inventory=JSON.parse(fs.readFileSync(new URL('docs/nexo/source-inventory.json',root)));
test('inventory uses actual QBAsc kits, exact IDs and file hashes only',()=>{
  assert.equal(inventory.sourceApp,'QBAsc');
  assert.equal(inventory.approvedConcepts.length,0);
  assert.equal(inventory.approvedEdges.length,0);
  assert.ok(inventory.kits.length>0);
  const checked=new Map();
  for(const kit of inventory.kits){
    const nodes=new Set(kit.concepts.map(c=>c.id));
    for(const r of [...kit.concepts,...kit.activities]){
      const ref=r.source;
      assert.ok(ref.sourceId.startsWith('src/data/kits/'));
      if(!checked.has(ref.sourceId)){
        const bytes=fs.readFileSync(new URL(ref.sourceId,root));
        checked.set(ref.sourceId,'sha256:'+createHash('sha256').update(bytes).digest('hex'));
      }
      assert.equal(checked.get(ref.sourceId),ref.version);
      assert.equal(r.status,'candidate');
      if(r.conceptId)assert.ok(nodes.has(r.conceptId));
    }
  }
});
test('raw QBAsc no field is accepted as exact stable ID, not fuzzy remissão',()=>{
  const map={id:'m',version:'v',mapa:{ramos:[{id:'n',t:'fixture'}]}};
  const binding={questionId:'q',mapNodeId:'n',mapId:'m',mapVersion:'v',graphVersion:'g',conceptId:'c'};
  assert.equal(exactConcept({question:{id:'q',no:'n'},map,binding,graphVersion:'g'}),'c');
  assert.equal(exactConcept({question:{id:'q',tema:'fixture'},map,binding,graphVersion:'g'}),null);
});
