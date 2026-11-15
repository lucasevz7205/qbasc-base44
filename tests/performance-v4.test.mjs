import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarBuckets, recurringTopicErrors, buildPerformanceNodes } from '../src/lib/performance-v4.js';

const addDays = (day, n) => new Date(Date.parse(day) + n * 86400000).toISOString().slice(0, 10);

test('semanas do desempenho começam no domingo, inclusive na virada do ano', () => {
  const days = ['2025-12-31', '2026-01-01', '2026-01-03', '2026-01-04', '2026-01-05'].map(date => ({ date }));
  assert.deepEqual(calendarBuckets(days, 'semana', addDays).map(rows => rows.map(row => row.date)),
    [['2025-12-31', '2026-01-01', '2026-01-03'], ['2026-01-04', '2026-01-05']]);
});

test('erros recorrentes exigem cinco erros e dois dias no mesmo assunto', () => {
  const wrong = qid => ({ qid, result: 'wrong' });
  const questions = new Map([['one', { topicId: 'linked' }], ['two', { topicId: 'linked' }], ['three', { topicId: 'one-day' }]]);
  const result = recurringTopicErrors([
    { date: '2026-11-14', attempts: [...Array(4).fill(wrong('one')), ...Array(6).fill(wrong('three'))] },
    { date: '2026-11-15', attempts: [wrong('two'), wrong('unlinked'), { qid: 'three', result: 'blank' }] },
  ], questions);
  assert.deepEqual(result.map(row => [row.topicId, row.errors, row.dates.size, [...row.ids]]), [['linked', 5, 2, ['one', 'two']]]);
});

test('subtópico usa o nó real e ignora remissões que apontam só para a raiz', () => {
  const groups = [{ id: 's', topics: [{ id: 't', title: 'Assunto', correct: 1, wrong: 2, blank: 0 }] }];
  const data = {
    questions: [{ id: 'a', topicId: 't', node: 'real' }, { id: 'b', topicId: 't', node: 'root' }, { id: 'c', topicId: 't', node: 'missing' }],
    mindMaps: [{ id: 'root', topicId: 't', nodes: [{ id: 'root' }, { id: 'real', label: 'Conceito' }] }],
    flashcards: [{ topicId: 't' }],
  };
  const nodes = buildPerformanceNodes(groups, data.questions.map(q => ({ qid: q.id, result: 'wrong' })), data);
  const [topic] = nodes[0].children;
  assert.deepEqual(topic.actions, ['edital', 'mindmap', 'review']);
  assert.deepEqual(topic.children.map(node => [node.nodeId, node.name, node.wrong]), [['real', 'Conceito', 1]]);
  assert.equal(topic.wrong, 2);
});
