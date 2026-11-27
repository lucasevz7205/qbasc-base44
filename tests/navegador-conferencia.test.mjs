import test from 'node:test';
import assert from 'node:assert/strict';
import { gerarRelatorio, janelaDe, navegadorExport, navegadorSemanal, referenciaDe } from '../src/lib/navegador.js';

const questions = Array.from({ length: 12 }, (_, i) => ({ id: 'q' + i, topicId: i % 4 === 0 ? undefined : 't' + (i % 3), key: 'C', raw: {} }));
const respostas = questions.map((q, i) => ({
  id: q.id, qid: q.id,
  hist: [{ m: i % 3 ? 'C' : 'E', em: `2026-11-${String(14 + (i % 7)).padStart(2, '0')}T12:${String(10 + i)}:00-03:00`, gabarito: 'C', c: 2 }].concat(
    i % 2 ? [{ m: 'C', em: '2026-11-25T12:00:00-03:00', gabarito: 'C' }] : []),
}));
const records = { respostas, rodadas: [], simulados: [], justificativas: [] };

test('relatório salvo e semana recalculada para a mesma janela dão o mesmo volume e nota', () => {
  const today = '2026-11-27';
  const ref = referenciaDe(today);
  assert.equal(ref, '2026-11-21');
  const janela = janelaDe(ref);
  const payload = navegadorExport(records, questions, ref, { desde: janela.start });
  const doc = gerarRelatorio({ respostas: payload.respostas, today: ref });
  const semanal = navegadorSemanal(payload.respostas, ref, janela);
  assert.equal(doc.placar.atual.n, semanal.atual.n);
  assert.equal(doc.placar.atual.liquida, semanal.atual.liquida);
  assert.equal(doc.placar.atual.de, '2026-11-14');
  assert.equal(doc.placar.atual.ate, '2026-11-20');
});

test('repetições e o dia de hoje não entram no volume do Navegador', () => {
  const today = '2026-11-27';
  const payload = navegadorExport(records, questions, today);
  const semanal = navegadorSemanal(payload.respostas, today);
  const primeiras = new Set(payload.respostas.map(r => r.itemId));
  assert.ok(semanal.atual.n + semanal.anterior.n <= primeiras.size);
  assert.ok(semanal.repetidas >= 0);
});
