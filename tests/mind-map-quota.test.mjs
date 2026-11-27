import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nodeQuota, classifyNodes, cappedChildContribution, drawNodeAssessment, buildNodeAssessment } from '../src/lib/mind-map-quota.js';
import { mapNodePerformance } from '../src/lib/mind-map-performance.js';

test('cotas com piso e teto por nível', () => {
  assert.equal(nodeQuota('subramo', 1), 1);
  assert.equal(nodeQuota('ramo', 1), 4);
  assert.equal(nodeQuota('ramo', 3), 6);
  assert.equal(nodeQuota('ramo', 9), 8);
  assert.equal(nodeQuota('topico', 3), 6);
  assert.equal(nodeQuota('topico', 8), 10);
  assert.equal(nodeQuota('topico', 30), 15);
  assert.equal(nodeQuota('nucleo', 48), 30);
  assert.equal(nodeQuota('nucleo', 73), 37);
  assert.equal(nodeQuota('nucleo', 200), 40);
});

const nodes = [
  { id: 'n', parent: null },
  { id: 't1', parent: 'n' }, { id: 't2', parent: 'n' },
  { id: 'r1', parent: 't1' }, { id: 'r2', parent: 't1' },
  { id: 's1', parent: 'r1' }, { id: 's2', parent: 'r1' }, { id: 's3', parent: 'r2' },
  { id: 'u1', parent: 't2' },
];

test('classifica níveis e conta subramos (folhas)', () => {
  const info = classifyNodes(nodes, 'n');
  assert.equal(info.get('n').kind, 'nucleo');
  assert.equal(info.get('n').leaves, 4);
  assert.equal(info.get('t1').kind, 'topico');
  assert.equal(info.get('t1').leaves, 3);
  assert.equal(info.get('r1').kind, 'ramo');
  assert.equal(info.get('r1').quota, 4);
  assert.equal(info.get('s1').kind, 'subramo');
  assert.equal(info.get('u1').quota, 1);
});

test('teto de 40% por filho só com 3 ou mais filhos', () => {
  assert.equal(cappedChildContribution(10, 10, 4), 4);
  assert.equal(cappedChildContribution(10, 10, 2), 10);
});

const card = (id, node) => ({ id, node, topicId: 'tp' });
const reviews = ids => Object.fromEntries(ids.map(id => [id, { ult: 'bom' }]));

test('subramo precisa de 1 resposta; ramo de 4 com 1 questão e 1 flashcard', () => {
  const flashcards = [card('c1', 's1'), card('c2', 's2'), card('c3', 's2'), card('c4', 's2')];
  const questions = [{ id: 'q1', node: 's1', key: 'C', response: { acertos: 1, erros: 0 } }];
  const perf = mapNodePerformance({ nodes, rootId: 'n', topicId: 'tp', questions, flashcards, reviews: reviews(['c1', 'c2', 'c3', 'c4']) });
  assert.equal(perf.get('s1').remaining, 0);
  assert.equal(perf.get('s3').remaining, 1);
  assert.equal(perf.get('r1').quota, 4);
  assert.equal(perf.get('r1').remaining, 0);
  assert.equal(perf.get('r1').status, 'correct');
  assert.equal(perf.get('n').status, 'insufficient');
  assert.equal(perf.get('n').quota, 30);
});

test('ramo sem questão continua exigindo 1 questão mesmo com cota cheia', () => {
  const flashcards = ['a', 'b', 'c', 'd'].map(id => card(id, 's1'));
  const perf = mapNodePerformance({ nodes, rootId: 'n', topicId: 'tp', questions: [], flashcards, reviews: reviews(['a', 'b', 'c', 'd']) });
  assert.equal(perf.get('r1').remaining, 1);
  assert.equal(perf.get('r1').requiredQuestions, 1);
});

test('tópico exige cobertura de pelo menos metade dos ramos', () => {
  // t1 tem 2 ramos (r1, r2); respostas só em r1 = 50%, ok. Em t2 (1 folha) cobertura trivial.
  const flashcards = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => card(id, 's1'));
  const questions = [{ id: 'q', node: 's1', key: 'C', response: { acertos: 1, erros: 0 } }];
  const perf = mapNodePerformance({ nodes, rootId: 'n', topicId: 'tp', questions, flashcards, reviews: reviews(['a', 'b', 'c', 'd', 'e', 'f']) });
  assert.equal(perf.get('t1').coverageOk, true);
});

test('sorteio estratificado cobre cada filho, respeita cota e teto de 40%', () => {
  const items = [];
  for (const [node, n] of [['s1', 12], ['s2', 2], ['s3', 2]]) for (let i = 0; i < n; i++) items.push({ id: node + i, node, priority: i % 3 });
  const picked = drawNodeAssessment(nodes, 'r1', items.filter(i => i.node !== 's3'), { random: () => 0.5 });
  assert.equal(picked.length, 4);
  assert.ok(picked.some(i => i.node === 's2'));
  const top = drawNodeAssessment(nodes, 't1', items, { random: () => 0.5 });
  assert.equal(top.length, 6);
  assert.ok(top.filter(i => i.node === 's1').length <= 3 || new Set(top.map(i => i.node)).size >= 2);
  assert.equal(new Set(top.map(i => i.id)).size, top.length);
});

test('amostra do nó divide a cota entre questões e flashcards e não repete ids', () => {
  const qs = ['s1', 's2', 's3'].flatMap(node => [0, 1, 2].map(i => ({ id: 'q' + node + i, node, priority: i })));
  const cs = ['s1', 's2', 's3'].flatMap(node => [0, 1, 2].map(i => ({ id: 'c' + node + i, node, priority: i })));
  const sample = buildNodeAssessment(nodes, 't1', { questions: qs, flashcards: cs, random: () => 0.5 });
  assert.equal(sample.quota, 6);
  assert.equal(sample.questionIds.length + sample.cardIds.length, 6);
  assert.ok(sample.questionIds.length >= 3);
  assert.equal(new Set([...sample.questionIds, ...sample.cardIds]).size, 6);
  const onlyCards = buildNodeAssessment(nodes, 't1', { flashcards: cs, random: () => 0.5 });
  assert.equal(onlyCards.cardIds.length, 6);
  assert.deepEqual(buildNodeAssessment(nodes, 'inexistente', {}).questionIds, []);
});
