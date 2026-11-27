import assert from 'node:assert/strict';
import { test } from 'node:test';
import { navegadorCartoes, eventosDoCartao, estadoDoCartao, cartoesExport } from '../src/lib/navegador-cartoes.js';
const today = '2026-11-27';
const h = (em, v, int) => ({ em, v, int, rev: true });
const cards = [{ id: 'c1', topicId: 'rf' }, { id: 'c2', topicId: 'rf' }, { id: 'c3', topicId: 'pl' }];

test('repescagem do mesmo dia não conta como lembrança com intervalo', () => {
  const { eventos } = eventosDoCartao({ hist: [h('2026-11-20T12:00:00Z', 'errei', 1), h('2026-11-20T12:10:00Z', 'bom', 3), h('2026-11-24T12:00:00Z', 'bom', 7)] });
  assert.deepEqual(eventos.map(e => e.tipo), ['primeira', 'repescagem', 'revisao']);
  assert.equal(eventos[2].gap, 4); assert.equal(eventos[2].lembrou, true);
});
test('taxa principal usa só intervalos >= 3 dias e não mexe nos registros', () => {
  const reviews = [{ id: 'c1', hist: [h('2026-11-10T12:00:00Z', 'bom', 3), h('2026-11-24T12:00:00Z', 'errei', 1)], prox: '2026-11-25' },
    { id: 'c2', hist: [h('2026-11-23T12:00:00Z', 'bom', 3), h('2026-11-25T12:00:00Z', 'bom', 7)] }];
  const before = JSON.stringify(reviews);
  const r = navegadorCartoes(reviews, cards, today);
  assert.equal(JSON.stringify(reviews), before);
  assert.equal(r.principal.n, 1); assert.equal(r.principal.esqueceu, 1);
  assert.equal(r.faixas.find(f => f.faixa === '1-2').n, 1);
  assert.equal(r.principal.amostraSuficiente, false); assert.equal(r.principal.falta, 19);
  assert.equal(r.estados.novo, 1);
});
test('dominado exige duas lembranças seguidas com intervalo >= 7 dias', () => {
  const hist = [h('2026-10-01T12:00:00Z', 'bom', 3), h('2026-10-10T12:00:00Z', 'bom', 7), h('2026-10-20T12:00:00Z', 'facil', 15)];
  const { eventos } = eventosDoCartao({ hist });
  assert.equal(estadoDoCartao({ nivel: 3 }, eventos), 'dominado');
  const { eventos: e2 } = eventosDoCartao({ hist: hist.slice(0, 2) });
  assert.equal(estadoDoCartao({ nivel: 2 }, e2), 'retencao');
  const { eventos: e3 } = eventosDoCartao({ hist: [...hist, h('2026-10-30T12:00:00Z', 'errei', 1)] });
  assert.equal(estadoDoCartao({ nivel: 0 }, e3), 'aprendendo');
});
test('lapso: errei depois de intervalo agendado >= 7; atraso e entradas sem data', () => {
  const reviews = [{ id: 'c1', prox: '2026-11-20', hist: [h('2026-11-01T12:00:00Z', 'bom', 7), h('2026-11-10T12:00:00Z', 'errei', 1), { v: 'bom' }] }];
  const r = navegadorCartoes(reviews, cards, today);
  assert.equal(r.atrasados, 1); assert.equal(r.limites.semData, 1);
  assert.equal(r.faixas.find(f => f.faixa === '7-14').n, 0); // fora da janela atual
  const { eventos } = eventosDoCartao(reviews[0]);
  assert.equal(eventos.at(-1).lapso, true);
});
test('export compacto sem texto do cartão', () => {
  const x = cartoesExport([{ id: 'c1', front: 'privado', hist: [h('2026-11-24T12:00:00Z', 'bom', 3)] }], cards);
  assert.deepEqual(x, [{ data: '2026-11-24T12:00:00.000Z', cartaoId: 'c1', topico: 'rf', nota: 'bom', intervalo: 3 }]);
});
