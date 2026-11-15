import test from 'node:test';
import assert from 'node:assert/strict';
import { createTutorHistory } from '../src/lib/tutor-history.js';
import { distinctRoundQuestions } from '../src/lib/study-session-rules.js';
import { groupResponsesByTopic } from '../src/lib/daily-question-performance.js';

test('histórico sobrevive à reabertura e separa contas e assuntos', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const dock = createTutorHistory(() => storage);
  dock.rememberTopic('alice', 'da-1');
  assert.equal(dock.begin('alice', 'da-1'), true);
  dock.append('alice', 'da-1', { role: 'user', text: 'Pergunta' });
  assert.equal(dock.isPending('alice', 'da-1'), true);
  assert.equal(dock.begin('alice', 'da-1'), false);
  dock.clear('alice', 'da-1');
  dock.append('alice', 'da-1', { role: 'tutor', text: 'Resposta' });
  dock.finish('alice', 'da-1');

  const studio = createTutorHistory(() => storage);
  assert.deepEqual(studio.read('alice', 'da-1').map(m => m.text), ['Pergunta', 'Resposta']);
  assert.equal(studio.lastTopic('alice'), 'da-1');
  assert.equal(studio.isPending('alice', 'da-1'), false);
  assert.deepEqual(studio.read('bob', 'da-1'), []);
  assert.deepEqual(studio.read('alice', 'da-2'), []);
  studio.clear('alice', 'da-1');
  assert.deepEqual(dock.read('alice', 'da-1'), []);
});

test('rodada apresenta uma única vez cada enunciado equivalente com o mesmo gabarito', () => {
  const questions = [
    { id: 'first', statement: 'É válido. O órgão decide.', key: 'C' },
    { id: 'copy', statement: ' É válido.\n O órgão decide. ', key: 'C' },
    { id: 'different-key', statement: 'É válido. O órgão decide.', key: 'E' },
    { id: 'first', statement: 'Reaparição do ID.', key: 'C' },
  ];
  assert.deepEqual(distinctRoundQuestions(questions).map(q => q.id), ['first', 'different-key']);
});

test('assuntos do dia registram acertos, erros e brancos vinculados ao edital', () => {
  const subjects = [{ id:'da', name:'Direito Administrativo', topics:[{ id:'da-1', num:'1' }, { id:'da-2', num:'2' }] }];
  const questions = [{ id:'a', topicId:'da-1' }, { id:'b', topicId:'da-2' }];
  const responses = [{ qid:'a', result:'wrong' }, { qid:'a', result:'correct' }, { qid:'b', result:'blank' }, { qid:'imported-without-link', result:'wrong' }];
  const [subject] = groupResponsesByTopic(responses, questions, subjects);
  assert.deepEqual([subject.correct, subject.wrong, subject.blank], [1, 1, 1]);
  assert.deepEqual(subject.topics.map(t => [t.id, t.correct, t.wrong, t.blank]), [['da-1',1,1,0], ['da-2',0,0,1]]);
});
