import test from 'node:test';
import assert from 'node:assert/strict';
import { pickQuestionRound } from '../src/lib/study-session-rules.js';

const question = (id, extra = {}) => ({ id, subjectId: 'da', topicId: 'da-1', node: 'concept', key: 'C', ...extra });
const ids = questions => questions.map(item => item.id);

test('Todas inclui o assunto inteiro e preserva o limite das rodadas antigas', () => {
  const bank = Array.from({ length: 27 }, (_, index) => question(index));
  bank.push(question('other', { topicId: 'da-2' }));
  bank.push(question('blocked', { statusConfronto: 'divergencia_bloqueada' }));
  assert.deepEqual(ids(pickQuestionRound(bank, { topicId: 'da-1', filter: 'all' })), bank.slice(0, 27).map(q => q.id));
  assert.equal(pickQuestionRound(bank, { topicId: 'da-1' }).length, 20);
});

test('Treino aleatório embaralha só o assunto selecionado, depois dos filtros e da deduplicação', () => {
  const bank = [
    question('first', { statement: 'Item A', response: { ultimaMarcada: 'E' } }),
    question('second', { statement: 'Item B', response: { ultimaMarcada: 'E' } }),
    question('third', { statement: 'Item C' }),
    question('same-item', { statement: 'Item A', response: { ultimaMarcada: 'E' } }),
    question('other-subject', { subjectId: 'ti', response: { ultimaMarcada: 'E' } }),
    question('other-topic', { topicId: 'da-2', response: { ultimaMarcada: 'E' } }),
    question('blocked', { statusConfronto: 'divergencia_bloqueada', response: { ultimaMarcada: 'E' } }),
  ];
  const original = ids(bank);
  const scope = { subjectId: 'da', topicId: 'da-1', randomOrder: true };
  const options = { unique: true, random: () => 0 };
  assert.deepEqual(ids(pickQuestionRound(bank, { ...scope, filter: 'all' }, options)), ['second', 'third', 'first']);
  assert.deepEqual(ids(pickQuestionRound(bank, { ...scope, filter: 'wrong' }, options)), ['second', 'first']);
  assert.deepEqual(ids(pickQuestionRound(bank, { ...scope, filter: 'unseen' }, options)), ['third']);
  assert.deepEqual(ids(pickQuestionRound(bank, { ...scope, filter: 'all', scheduledReview: true }, options)), ['first', 'second', 'third']);
  assert.deepEqual(ids(bank), original);
});

test('Erradas usa a última resposta válida, o gabarito da tentativa e registros importados', () => {
  const bank = [
    question('wrong', { response: { ultimaMarcada: 'E' } }),
    question('revised', { key: 'E', response: { ultimaMarcada: 'C', gabaritoUsado: 'E' } }),
    question('revised-correct', { key: 'E', response: { ultimaMarcada: 'C', gabaritoUsado: 'C' } }),
    question('legacy', { response: { hist: [{ m: 'C', ok: false }] } }),
    question('blank', { response: { ultimaMarcada: 'B', hist: [{ m: 'E', ok: false }, { m: 'B', ok: false }] } }),
    question('recovered', { response: { ultimaMarcada: 'C', hist: [{ m: 'E', ok: false }, { m: 'C', ok: true }] } }),
    question('unseen'),
    question('other-node', { node: 'different', response: { ultimaMarcada: 'E' } }),
  ];
  assert.deepEqual(ids(pickQuestionRound(bank, { subjectId: 'da', nodeId: 'concept', filter: 'wrong' })), ['wrong', 'revised', 'legacy']);
});

test('Inéditas respeita o assunto, considera tentativas em branco e retorna vazio sem correspondências', () => {
  const bank = [
    question('new'),
    question('empty-import', { response: {} }),
    question('blank', { response: { ultimaMarcada: 'B' } }),
    question('attempted', { response: { tentativas: 1 } }),
    question('other', { topicId: 'da-2' }),
  ];
  assert.deepEqual(ids(pickQuestionRound(bank, { topicId: 'da-1', filter: 'unseen' })), ['new', 'empty-import']);
  assert.deepEqual(pickQuestionRound(bank, { topicId: 'does-not-exist', filter: 'unseen' }), []);
});
