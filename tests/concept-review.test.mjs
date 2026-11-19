import test from 'node:test';
import assert from 'node:assert/strict';
import { conceptReviewItems, indexConceptRemissions } from '../src/lib/concept-review.js';
import { pickQuestionRound } from '../src/lib/study-session-rules.js';

const map = { topicId: 'cp-4', nodes: [
  { id: 'root', label: 'Poderes' },
  { id: 'jud', parent: 'root', label: 'Judiciário' },
  { id: 'controle', parent: 'jud', label: 'Controle' },
  { id: 'pl', parent: 'root', label: 'Legislativo' },
] };

test('a revisão abre itens do nó e dos sub-ramos sem misturar irmãos, outros assuntos ou itens bloqueados', () => {
  const questions = [
    { id: 'q-child', topicId: 'cp-4', node: 'controle', statement: 'Uma regra de controle judicial.' },
    { id: 'q-direct', topicId: 'cp-4', node: 'jud', statement: 'Uma regra de organização judiciária.' },
    { id: 'q-sibling', topicId: 'cp-4', node: 'pl' },
    { id: 'q-other-topic', topicId: 'dc-1', node: 'jud' },
    { id: 'q-rejected', topicId: 'cp-4', node: 'jud', raw: { statusConfronto: 'divergencia_bloqueada' } },
  ];
  const cards = [
    { id: 'card-child', topicId: 'cp-4', node: 'controle' },
    { id: 'card-sibling', topicId: 'cp-4', node: 'pl' },
  ];
  const selected = conceptReviewItems(map, 'jud', questions, cards);
  assert.deepEqual(selected, { questionIds: ['q-direct', 'q-child'], cardIds: ['card-child'], includesChildren: true });
  assert.deepEqual(pickQuestionRound(questions, { topicId: 'cp-4', questionIds: selected.questionIds, filter: 'all' }).map(q => q.id), ['q-child', 'q-direct']);
  assert.deepEqual(conceptReviewItems(map, 'não-existe', questions, cards).cardIds, []);
});

test('remissões editoriais exigem nó e título correspondentes e não resolvem vínculos ambíguos', () => {
  const records = [
    { topico: 'cp-4', kind: 'concept-remissions', links: [
      { nodeId: 'jud', label: '  JUDICIÁRIO ', questoes: ['q1', 'duvida'], cartoes: ['c1'] },
      { nodeId: 'controle', label: 'Controle', questoes: ['duvida'] },
      { nodeId: 'pl', label: 'Judiciário', questoes: ['invalida'] },
    ] },
    { topico: 'cp-5', kind: 'concept-remissions', links: [{ nodeId: 'jud', label: 'Judiciário', questoes: ['outro'] }] },
  ];
  const index = indexConceptRemissions([map], records).get('cp-4');
  assert.equal(index.questoes.get('q1'), 'jud');
  assert.equal(index.cartoes.get('c1'), 'jud');
  assert.equal(index.questoes.get('duvida'), null);
  assert.equal(index.questoes.has('invalida'), false);
  assert.equal(index.questoes.has('outro'), false);
});

test('itens legados respeitam matéria, assunto e ambiguidades de conceito', async () => {
  const { matchLegacyConcept } = await import('../src/lib/concept-review.js');
  const makeMap = (topicId, names) => ({ topicId, nodes: [
    { id: topicId, label: topicId },
    ...names.map((label, i) => ({ id: topicId + i, parent: topicId, label })),
  ] });
  const maps = [
    makeMap('ti-1', ['Rede local', 'Rede local virtual', 'Firewall']),
    makeMap('da-1', ['Licitação', 'Delegação']),
  ];
  const topics = indexConceptRemissions(maps, []);
  assert.equal(matchLegacyConcept(topics.get('ti-1'), '', 'O que é rede local virtual?'), 'ti-11');
  assert.equal(matchLegacyConcept(topics.get('da-1'), 'Licitação', ''), 'da-10');
  assert.equal(matchLegacyConcept(topics.get('da-1'), '', 'O que é firewall?'), undefined);
  assert.equal(matchLegacyConcept(topics.get('da-1'), '', 'Compare licitação e delegação.'), undefined);
});
