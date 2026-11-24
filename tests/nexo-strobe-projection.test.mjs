import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {projectStrobe} from '../src/lib/nexo/strobe-projection.js';
test('projected solid geometry is visible and fits the view at all supported representative angles and separations',()=>{
 for(const yaw of [-60,0,35,75])for(const exploded of [0,.5,1]){
  const scene=projectStrobe({angle:.7,yaw,exploded});
  assert.ok(scene.faces.length>100);
  assert.equal(scene.visibleIds.length,7);
  for(const f of scene.faces){
   assert.match(f.fill,/^#[0-9a-f]{6}$/);
   for(const point of f.points.split(' ')){const [x,y]=point.split(',').map(Number);assert.ok(Number.isFinite(x)&&x>=44&&x<=956);assert.ok(Number.isFinite(y)&&y>=54&&y<=486);}
  }
 }
});
test('rotation, disassembly and sampling angle all change projected geometry',()=>{
 const base=projectStrobe();
 assert.notDeepEqual(base,projectStrobe({yaw:65}));
 assert.notDeepEqual(base,projectStrobe({exploded:0}));
 assert.notDeepEqual(base.faces.filter(f=>f.id==='wheel'),projectStrobe({angle:1.2}).faces.filter(f=>f.id==='wheel'));
});
test('renderer no longer depends on WebGL and studio removes width cap with viewport margin',()=>{
 const ui=fs.readFileSync(new URL('../src/components/qb/architect/NexoStrobeAnatomy.jsx',import.meta.url),'utf8');
 assert.match(ui,/projectStrobe/);assert.match(ui,/<polygon/);assert.doesNotMatch(ui,/WebGLRenderer/);
 const studio=fs.readFileSync(new URL('../src/components/qb/architect/ArchitectStudio.jsx',import.meta.url),'utf8');
 assert.match(studio,/padding: 'min\(1cm, 5vw, 5vh\)'/);assert.match(studio,/createPortal\(overlay, document.body\)/);assert.doesNotMatch(studio,/1180px/);
});
