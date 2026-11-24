import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {visualNeighborhood} from '../src/lib/nexo/visual-preview.js';
const inventory=JSON.parse(fs.readFileSync(new URL('../docs/nexo/source-inventory.json',import.meta.url)));
test('real kit neighborhood includes only existing structural links and exact activity counts',()=>{
  for(const k of inventory.kits)for(const c of k.concepts){
    const d=visualNeighborhood(k,c.id);
    assert.ok(d.neighbors.length<=5);
    assert.equal(d.questions,k.activities.filter(a=>a.conceptId===c.id&&a.kind==='question').length);
    for(const n of d.neighbors)assert.ok(k.structuralLinks.some(l=>l.from===c.id&&l.to===n.id||l.to===c.id&&l.from===n.id));
  }
});
test('unavailable topic or node does not fabricate knowledge',()=>{assert.equal(visualNeighborhood(null,'x'),null);assert.equal(visualNeighborhood(inventory.kits[0],'x'),null);});
test('studio swaps only scanner entry; original scanner and other learning tools remain',()=>{
  const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
  const studio=read('src/components/qb/architect/ArchitectStudio.jsx');
  assert.match(studio,/id: 'cards', label: 'Laboratório Visual'/);
  assert.match(studio,/<NexoVisualLab/);
  assert.doesNotMatch(studio,/<ScannerFlashcards/);
  assert.match(studio,/<FeynmanLab/);assert.match(studio,/<CornellNotebook/);
  assert.match(read('src/components/qb/architect/ScannerFlashcards.jsx'),/function ScannerFlashcards/);
  assert.doesNotMatch(read('src/components/qb/architect/NexoVisualLab.jsx'),/useServerFn|localStorage|base44\.|\.save\(/);
});
