import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { flashcardOptions } from '../src/lib/study-session-rules.js';
import { advanceFlashcardSession } from '../src/lib/flashcard-review.js';
import { flashcardIsDue, questionReviewDate, reviewDay, scheduleReview, scheduledReviewQueues } from '../src/lib/spaced-review.js';

const today = '2026-11-15';
const previousDay = '2026-11-14';

test('calendário da V1 limita o intervalo pela prova e retoma diariamente na última semana', () => {
  assert.deepEqual(scheduleReview(today, 30), { days: 12, date: '2026-11-27' });
  assert.deepEqual(scheduleReview('2027-01-09', 30), { days: 1, date: '2027-01-10' });
  assert.deepEqual(scheduleReview('2027-01-12', 30), { days: 1, date: '2027-01-13' });
  assert.equal(reviewDay('2026-11-16T02:05:00Z'), today);
});

test('questões antigas recuperam a agenda e respeitam o mínimo de confiança da V1', () => {
  const old = { tentativas: 2, atualizadoEm: '2026-11-14T20:00:00Z' };
  assert.equal(questionReviewDate({ ...old, noCaderno: true }), today);
  assert.equal(questionReviewDate({ ...old, conf: 3, proxRevisao: today }), '2026-11-21');
  assert.equal(questionReviewDate({ ...old, conf: 2, proxRevisao: today }), '2026-11-17');
  assert.equal(questionReviewDate({ ...old, proxRevisao: '2026-11-30' }), '2026-11-30');
  assert.equal(questionReviewDate({}), null);
});

test('registro de questões reage a erro, chute, dúvida e acerto com certeza', async () => {
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === '../api/base44Client.js' && context.parentURL?.endsWith('/study-store.js')) {
        return { url: 'data:text/javascript,export const base44 = {}', shortCircuit: true };
      }
      return next(specifier, context);
    },
  });
  const { buildAnswerRecord } = await import('../src/lib/study-store.js');
  hooks.deregister();
  const question = { id: 'q', gabarito: 'C' };
  const date = new Date('2026-11-16T02:50:00Z');
  const record = (marked, confidence, prev) => buildAnswerRecord({ question, marked, confidence, prev, now: date }).record;
  assert.equal(record('E', 3).proxRevisao, '2026-11-16');
  assert.equal(record('C', 1).proxRevisao, '2026-11-16');
  assert.equal(record('C', 2).proxRevisao, '2026-11-18');
  assert.equal(record('C', 3).proxRevisao, '2026-11-22');
  const first = record('C', 3, record('E', 3));
  assert.equal(first.noCaderno, true);
  assert.equal(first.proxRevisao, '2026-11-18');
  const second = record('C', 3, first);
  assert.equal(second.noCaderno, false);
  assert.equal(second.proxRevisao, '2026-11-22');
});

test('cartões mantêm degraus importados, e Errei volta hoje e agenda amanhã', () => {
  const rating = flashcardOptions({ intervalo: 7 }, today);
  assert.deepEqual([rating.dificil.days, rating.bom.level, rating.facil.level], [7, 3, 4]);
  assert.equal(rating.errei.date, '2026-11-16');
  assert.equal(rating.errei.repeat, true);
  assert.deepEqual(advanceFlashcardSession({ idx: 0, ratings: [] }, ['a', 'b'], 'errei', rating.errei.repeat).queue, ['b', 'a']);
  assert.equal(flashcardIsDue(undefined, today), false);
  assert.equal(flashcardIsDue({ hist: [{ v: 'n' }] }, today), true);
  assert.equal(flashcardIsDue({ ult: 'bom', prox: '2026-11-16' }, today), false);
});

test('fila limita revisões do dia, prioriza atrasos e erros, intercala e mantém o escopo', () => {
  const q = (id, chapter, extra = {}) => ({ id, subjectId: 'da', topicId: chapter, response: { tentativas: 1, proxRevisao: previousDay }, ...extra });
  const questions = [
    q('a', 'da-1', { response: { tentativas: 1, proxRevisao: previousDay, noCaderno: true } }),
    q('b', 'da-1'),
    q('c', 'da-2'),
    q('outside', 'cp-1', { subjectId: 'cp' }),
    q('unseen', 'da-1', { response: null }),
    q('out-of-level', 'da-2', { raw: { foraNivel: true } }),
  ];
  const flashcards = ['x', 'y', 'new', 'future'].map(id => ({ id, topicId: 'da-1' }));
  const reviews = {
    x: { ult: 'errei', prox: today, nivel: 0 },
    y: { ult: 'bom', prox: previousDay, nivel: 2 },
    future: { ult: 'bom', prox: '2026-11-16' },
  };
  const data = { questions, flashcards, reviews, today, subjectId: 'da', cardTopicIds: new Set(['da-1']) };
  const result = scheduledReviewQueues(data);
  assert.deepEqual(result.questions.ids, ['a', 'c', 'b']);
  assert.deepEqual(result.flashcards.ids, ['x', 'y']);
  const rounds = [{ modo: 'revisao', inicio: today, itens: Array.from({ length: 49 }, (_, i) => ({ qid: 'p' + i })) }];
  const limited = scheduledReviewQueues({ ...data, rounds });
  assert.deepEqual(limited.questions, { ids: ['a'], due: 3, postponed: 2 });
  assert.deepEqual(scheduledReviewQueues({ ...data, topicId: 'da-2' }).flashcards.ids, []);
});
