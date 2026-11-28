import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioResume } from '../src/lib/studio-resume.js';

const memory = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v), m }; };

test('guarda e devolve só ponteiros, por conta', () => {
  const s = memory(); const r = createStudioResume(() => s);
  r.write('a', { tool: 'visual-lab', pilotTask: 't1', pilotItem: 'i1', resposta: 'segredo' });
  r.write('a', { topicId: 'da-8' });
  assert.deepEqual(r.read('a'), { tool: 'visual-lab', topicId: 'da-8', pilotTask: 't1', pilotItem: 'i1' });
  assert.deepEqual(r.read('b'), {});
  assert.ok(![...s.m.values()].some(v => v.includes('segredo')));
});

test('null apaga o campo; valores inválidos são ignorados', () => {
  const s = memory(); const r = createStudioResume(() => s);
  r.write('a', { pilotItem: 'i1', tool: 'cornell' });
  r.write('a', { pilotItem: null, tool: 42 });
  assert.deepEqual(r.read('a'), {});
});

test('sem conta ou com armazenamento quebrado não lança', () => {
  const r = createStudioResume(() => { throw new Error('x'); });
  assert.deepEqual(r.read('a'), {});
  r.write('a', { tool: 'cornell' });
  assert.deepEqual(r.read(null), {});
  const s = memory(); s.setItem('qbasc-studio-ponto:v1:["a"]', '{lixo');
  assert.deepEqual(createStudioResume(() => s).read('a'), {});
});
