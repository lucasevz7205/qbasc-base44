import assert from 'node:assert/strict';
import { test } from 'node:test';
import { navegadorCartoes } from '../src/lib/navegador-flashcards.js';

const today = '2026-11-27';
const cartoes = [{ id: 'k1', topicId: 'rf' }, { id: 'k2', topicId: 'rf' }, { id: 'k3', topicId: 'pl' }];
const h = (em, v, rev = true) => ({ em: em + 'T12:00:00Z', v, rev });

test('só revisões na janela contam; primeira vista e dia atual ficam de fora', () => {
  const avaliacoes = [
    { id: 'k1', hist: [h('2026-11-10', 'bom', false), h('2026-11-20', 'errei'), h('2026-11-22', 'errei'), h('2026-11-27', 'bom')] },
    { id: 'k2', hist: [h('2026-11-21', 'dificil'), h('2026-11-23', 'facil'), h('2026-11-01', 'errei')] },
    { id: 'k3', hist: [h('2026-11-25', 'bom')] },
    { id: 'zz', hist: [h('2026-11-25', 'bom')] },
  ];
  const r = navegadorCartoes({ avaliacoes, cartoes, today });
  assert.equal(r.geral.C, 3);
  assert.equal(r.geral.E, 2);
  assert.equal(r.geral.dificeis, 1);
  assert.equal(r.primeirasVistas, 0);
  assert.equal(r.semTopico, 1);
  assert.deepEqual(r.reincidentes, [{ id: 'k1', topico: 'rf', esquecidos: 2 }]);
  assert.equal(r.topicos.find(t => t.topico === 'rf').sinal, 'insuficiente');
});

test('não altera os registros recebidos', () => {
  const avaliacoes = [{ id: 'k1', hist: [h('2026-11-20', 'errei')] }];
  const antes = JSON.stringify(avaliacoes);
  navegadorCartoes({ avaliacoes, cartoes, today });
  assert.equal(JSON.stringify(avaliacoes), antes);
});

test('amostra grande de acertos vira sinal forte', () => {
  const hist = Array.from({ length: 12 }, (_, i) => h('2026-11-' + String(14 + (i % 12)).padStart(2, '0'), 'bom'));
  const outro = Array.from({ length: 12 }, (_, i) => h('2026-11-' + String(14 + i).padStart(2, '0'), i % 2 ? 'bom' : 'errei'));
  const r = navegadorCartoes({ avaliacoes: [{ id: 'k1', hist }, { id: 'k3', hist: outro }], cartoes, today });
  assert.equal(r.topicos.find(t => t.topico === 'rf').sinal, 'forte');
});
