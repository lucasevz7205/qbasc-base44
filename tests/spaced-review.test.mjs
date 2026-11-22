import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { flashcardOptions } from '../src/lib/study-session-rules.js';
import { advanceFlashcardSession, enterRepescagem } from '../src/lib/flashcard-review.js';
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

test('cartões ajustam os degraus (Difícil recua 1) e Errei vai para repescagem após o baralho', () => {
  const novo = flashcardOptions({}, today);
  assert.deepEqual(
    [novo.errei.label, novo.dificil.label, novo.bom.label, novo.facil.label],
    ['Repescagem e amanhã', '1 dia', '3 dias', '7 dias'],
  );
  assert.equal(novo.dificil.level, 0);

  const rating = flashcardOptions({ intervalo: 7 }, today);
  assert.deepEqual([rating.dificil.level, rating.dificil.days, rating.bom.level, rating.facil.level], [1, 3, 3, 4]);
  assert.equal(rating.errei.date, '2026-11-16');
  assert.equal(rating.errei.repeat, true);

  const level3 = flashcardOptions({ nivel: 3 }, '2026-11-22');
  assert.deepEqual([level3.dificil.label, level3.bom.label, level3.facil.label], ['7 dias', '11 dias', '11 dias']);

  let session = { idx: 0, ratings: [], queue: ['a', 'b', 'c'] };
  session = advanceFlashcardSession(session, session.queue, 'errei', rating.errei.repeat);
  assert.deepEqual(session.queue, ['a', 'b', 'c']);
  assert.equal(session.idx, 1);
  assert.deepEqual(session.errados, ['a']);
  session = enterRepescagem(session, 3);
  assert.equal(session.repescagem, undefined);

  session = advanceFlashcardSession(session, session.queue, 'bom', false);
  session = enterRepescagem(advanceFlashcardSession(session, session.queue, 'bom', false), 3);
  assert.equal(session.repescagem, true);
  assert.deepEqual(session.queue, ['a']);
  assert.equal(session.idx, 0);
  assert.deepEqual(session.errados, []);

  const repescagemMulti = advanceFlashcardSession({ idx: 0, ratings: [], queue: ['a', 'b'], repescagem: true }, ['a', 'b'], 'errei', true);
  assert.deepEqual(repescagemMulti.queue, ['b', 'a']);
  assert.equal(repescagemMulti.idx, 0);
  const doneRepescagem = advanceFlashcardSession(session, session.queue, 'bom', false);
  assert.equal(doneRepescagem.idx, 1);

  assert.equal(flashcardIsDue(undefined, today), false);
  assert.equal(flashcardIsDue({ hist: [{ v: 'n' }] }, today), true);
  assert.equal(flashcardIsDue({ ult: 'bom', prox: '2026-11-16' }, today), false);
});

test('fila limita revisões do dia, prioriza atrasos e erros, intercala tópicos por matéria e mantém o escopo', () => {
  const q = (id, chapter, extra = {}) => ({ id, subjectId: 'da', topicId: chapter, response: { tentativas: 1, proxRevisao: previousDay }, ...extra });
  const questions = [
    q('a', 'da-1', { response: { tentativas: 1, proxRevisao: previousDay, noCaderno: true } }),
    q('b', 'da-1'),
    q('c', 'da-2'),
    q('outside', 'cp-1', { subjectId: 'cp' }),
    q('unseen', 'da-1', { response: null }),
    q('out-of-level', 'da-2', { raw: { foraNivel: true } }),
  ];
  const flashcards = ['x', 'y', 'new', 'future'].map(id => ({ id, topicId: 'da-1', subjectId: 'da' }));
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

  const multi = scheduledReviewQueues({
    questions: [
      q('da1a', 'da-1'),
      q('cp1a', 'cp-1', { subjectId: 'cp' }),
      q('da2a', 'da-2'),
      q('cp2a', 'cp-2', { subjectId: 'cp' }),
      q('da1b', 'da-1'),
    ],
    flashcards: [
      { id: 'fc-da1a', topicId: 'da-1', subjectId: 'da' },
      { id: 'fc-cp1', topicId: 'cp-1', subjectId: 'cp' },
      { id: 'fc-da2', topicId: 'da-2', subjectId: 'da' },
      { id: 'fc-da1b', topicId: 'da-1', subjectId: 'da' },
    ],
    reviews: {
      'fc-da1a': { ult: 'bom', prox: previousDay, nivel: 1 },
      'fc-cp1': { ult: 'bom', prox: previousDay, nivel: 1 },
      'fc-da2': { ult: 'bom', prox: previousDay, nivel: 1 },
      'fc-da1b': { ult: 'bom', prox: previousDay, nivel: 1 },
    },
    today,
  });
  assert.deepEqual(multi.questions.ids, ['da1a', 'da2a', 'da1b', 'cp1a', 'cp2a']);
  assert.deepEqual(multi.flashcards.ids, ['fc-da1a', 'fc-da2', 'fc-da1b', 'fc-cp1']);
});
