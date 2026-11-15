import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyQuestionPerformance } from '../src/lib/daily-question-performance.js';
import { pickQuestionRound } from '../src/lib/study-session-rules.js';

const day = value => value && new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date(value));
const at = (hour, minute) => `2026-11-15T${hour}:${minute}:00-03:00`;
const analyze = (answers, rounds = []) => dailyQuestionPerformance({ answers, rounds, questions: { q1: { gabarito: 'C' } }, day });

test('respostas entram no dia ao confirmar e não duplicam quando a rodada termina', () => {
  const em = at('23', '59');
  const fim = '2026-11-16T00:03:00-03:00';
  const answers = { q1: { hist: [{ m: 'C', ok: true, em, sessionId: 'one' }] } };
  const round = { id: 'qbasc-one', inicio: at('23', '50'), fim, certos: 1, itens: [{ qid: 'q1', marcada: 'C', gabarito: 'C', em }] };
  const pending = analyze(answers);
  const completed = analyze(answers, [round]);
  assert.deepEqual(completed.days, pending.days);
  assert.deepEqual(completed.attemptsByDay['2026-11-15'], [{ qid: 'q1', result: 'correct' }]);
  assert.equal(completed.roundsByDay['2026-11-16'], 1);
});

test('rodadas antigas usam tentativa correspondente no intervalo e preservam tentativas posteriores', () => {
  const answers = { q1: { hist: [
    { m: 'E', ok: false, em: at('12', '01') },
    { m: 'E', ok: false, em: at('13', '00') },
  ] } };
  const legacy = { inicio: at('12', '00'), fim: at('12', '10'), errados: 1, brancos: 1,
    itens: [{ qid: 'q1', marcada: 'E', gabarito: 'C' }, { qid: 'q2', marcada: 'B' }] };
  const pf = analyze(answers, [legacy]);
  assert.deepEqual(pf.days['2026-11-15'], { date: '2026-11-15', correct: 0, wrong: 2, blank: 1, n: 3 });
  assert.ok(pf.attemptsByDay['2026-11-15'].some(item => item.qid === 'q2' && item.result === 'blank'));
});

test('totalizações antigas e simulados mantêm seu tratamento', () => {
  const answers = { q1: { hist: [{ m: 'C', ok: true, em: at('12', '01') }] } };
  const legacy = { inicio: at('12', '00'), fim: at('12', '05'), certos: 3, errados: 2, modo: 'revisao' };
  const exam = { inicio: at('16', '00'), fim: at('17', '00'), certos: 100, modo: 'simulado' };
  const pf = analyze(answers, [legacy, exam]);
  assert.deepEqual(pf.days['2026-11-15'], { date: '2026-11-15', correct: 3, wrong: 2, blank: 0, n: 5 });
  assert.deepEqual(pf.review, { correct: 3, wrong: 2, blank: 0 });
});

test('remissão para treinar usa exatamente as questões ativas vinculadas', () => {
  const bank = [{ id: 'a' }, { id: 'b' }, { id: 'c', statusConfronto: 'divergencia_bloqueada' }];
  assert.deepEqual(pickQuestionRound(bank, { filter: 'all', questionIds: ['b', 'c', 'missing'] }).map(q => q.id), ['b']);
  assert.deepEqual(pickQuestionRound(bank, { filter: 'all', questionIds: [] }), []);
});
