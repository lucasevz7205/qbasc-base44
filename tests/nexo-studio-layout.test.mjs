import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
test('studio preserves viewport margin and full width',()=>{
 const studio=fs.readFileSync(new URL('../src/components/qb/architect/ArchitectStudio.jsx',import.meta.url),'utf8');
 assert.match(studio,/padding: 'min\(1cm, 5vw, 5vh\)'/);assert.match(studio,/createPortal\(overlay, document.body\)/);assert.doesNotMatch(studio,/1180px/);
});
