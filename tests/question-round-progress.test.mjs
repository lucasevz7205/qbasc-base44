import test from 'node:test';
import assert from 'node:assert/strict';
import { nextQuestionIndex, questionRoundProgress, questionTrainingProgress } from '../src/lib/study-session-rules.js';

test('posição, respostas confirmadas e encerramento usam a mesma fila', () => {
  const questions = ['a', 'b', 'c', 'd'].map(id => ({ id }));
  const excluded = new Set(['b', 'd']);
  assert.deepEqual(questionRoundProgress(questions, 0, {}, excluded), { total: 2, completed: 0, position: 1 });
  const answers = { a: { revealed: true, answer: 'E' } };
  assert.deepEqual(questionRoundProgress(questions, 0, answers, excluded), { total: 2, completed: 1, position: 1 });
  const next = nextQuestionIndex(questions, 1, excluded);
  assert.equal(next, 2);
  assert.deepEqual(questionRoundProgress(questions, next, answers, excluded), { total: 2, completed: 1, position: 2 });
  assert.equal(nextQuestionIndex(questions, next + 1, excluded), questions.length);
  assert.deepEqual(questionRoundProgress(questions, questions.length, answers, excluded), { total: 2, completed: 1, position: 2 });
});

test('questão excluída depois de responder conserva o resultado da rodada', () => {
  const questions = [{ id: 'a' }, { id: 'b' }];
  const answers = { a: { revealed: true } };
  assert.deepEqual(questionRoundProgress(questions, 1, answers, new Set(['a'])), { total: 2, completed: 1, position: 2 });
});

test('progresso por matéria e assunto distingue itens únicos de tentativas válidas', () => {
  const bank = [
    { id: 'a', subjectId: 'da', topicId: 'da-1', response: { acertos: 2, erros: 1, brancos: 4 } },
    { id: 'b', subjectId: 'da', topicId: 'da-1', response: { ultimaMarcada: 'B', brancos: 1 } },
    { id: 'c', subjectId: 'da', topicId: 'da-2', response: { hist: [{ m: 'E', ok: false }] } },
    { id: 'd', subjectId: 'dc', topicId: 'dc-1', response: { acertos: 1 } },
    { id: 'blocked', subjectId: 'da', statusConfronto: 'divergencia_bloqueada' },
  ];
  assert.deepEqual(questionTrainingProgress([...bank, bank[0]], { subjectId: 'da', topicId: 'da-1' }), { total: 2, completed: 1, errors: 1, valid: 3 });
  assert.deepEqual(questionTrainingProgress(bank, { subjectId: 'da' }), { total: 3, completed: 2, errors: 2, valid: 4 });
  assert.deepEqual(questionTrainingProgress(bank, { subjectId: 'other' }), { total: 0, completed: 0, errors: 0, valid: 0 });
});
