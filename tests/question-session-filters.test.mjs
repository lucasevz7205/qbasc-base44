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
