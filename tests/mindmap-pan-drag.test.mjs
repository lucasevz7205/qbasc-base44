import test from 'node:test';
import assert from 'node:assert/strict';
import { startDrag, moveDrag } from '../src/components/qb/mindmap/pan-drag.js';

const pan = { x: 10, y: 20 };

test('botão secundário não inicia arrasto', () => {
  assert.equal(startDrag({ button: 2, clientX: 5, clientY: 5 }, pan), null);
});
test('botão primário inicia arrasto', () => {
  assert.deepEqual(startDrag({ button: 0, clientX: 50, clientY: 60 }, pan), { x: 40, y: 40 });
});
test('mover com botão pressionado atualiza pan', () => {
  const r = moveDrag({ x: 40, y: 40 }, { buttons: 1, clientX: 60, clientY: 70 });
  assert.deepEqual(r.pan, { x: 20, y: 30 });
});
test('mover sem botão pressionado encerra o arrasto (cursor não fica preso)', () => {
  const r = moveDrag({ x: 40, y: 40 }, { buttons: 0, clientX: 60, clientY: 70 });
  assert.equal(r.drag, null);
  assert.equal(r.pan, null);
});
