import test from 'node:test';
import assert from 'node:assert/strict';
import { cornellVerificationContext, reviewCornellNotebook } from '../src/lib/cornell-verification.js';
import { writeCornellRich } from '../src/lib/cornell-rich.js';

const originalLine = 'A governabilidade envolve a legitimidade do governo.';
const original = { notes: originalLine, cues: 'O que distingue os conceitos?' };
const linked = { notes: JSON.stringify([
  { id: 'p1', title: 'Governabilidade', cue: 'Como o governo se legitima?', note: writeCornellRich({ ops: [
    { insert: 'A legitimidade do governo favorece a governabilidade.', attributes: { bold: true } }, { insert: '\n' },
  ] }) },
  { id: 'p2', title: 'Capacidade de execução', cue: 'Como executar políticas?', note: '' },
]) };
const map = [
  { id: 1, label: 'Governabilidade', parent: 'Administração' },
  { id: 2, label: 'Capacidade de execução', parent: 'Administração' },
];

test('revisa os dois cadernos, considera a formatação e sinaliza cobertura pela nota, não pela pista', () => {
  const result = reviewCornellNotebook({ original, linked, map, sources: [] });
  assert.deepEqual(result.gaps.map(gap => gap.label), ['Capacidade de execução']);
  assert.ok(result.relations.some(item => item.label === 'Capacidade de execução' && /sem nota/.test(item.feedback)));
  assert.ok(result.relations.some(item => /legitimidade/.test(item.label)));
  assert.ok(result.checks.some(item => item.claim === 'A legitimidade do governo favorece a governabilidade.'));
  assert.ok(result.checks.every(item => item.status === 'pending'));
});

test('uma fonte literal, uma passagem semelhante e um texto sem fonte recebem estados diferentes', () => {
  const result = reviewCornellNotebook({
    original: { notes: originalLine + '\nO governo não depende da legitimidade para a governabilidade.\nO plenário recebe as proposições do Senado.' },
    linked: null, map: [],
    sources: [{ title: 'Trecho original', text: originalLine.replace(' legitimidade', '\nlegitimidade') }],
  });
  assert.deepEqual(result.gaps, []);
  assert.deepEqual(result.checks.map(item => item.status), ['literal', 'related', 'pending']);
  assert.equal(result.checks[1].quote, originalLine);
  assert.equal(result.checks[2].sourceId, undefined);
});

test('separa ramos do tópico e referências de resumos e rejeita links inseguros', () => {
  const topic = { id: 'tema', resources: { materials: [
    { tipo: 'material', titulo: 'Resumo derivado', referenceText: originalLine },
    { tipo: 'fonte', titulo: 'Texto original', url: 'https://example.org/texto' },
  ] } };
  const data = {
    mindMaps: [
      { topicId: 'outro', nodes: [{ id: 'other', label: 'Outro' }] },
      { topicId: 'tema', nodes: [{ id: 'root', label: 'Administração' }, { id: 'node', label: 'Governabilidade', parent: 'root' }] },
    ],
    concepts: { node: { sources: [{ label: 'Referência local', url: 'javascript:alert(1)' }] } },
  };
  const result = cornellVerificationContext(data, topic);
  assert.deepEqual(result.map, [{ id: 1, label: 'Governabilidade', parent: 'Administração' }]);
  assert.deepEqual(result.references, [
    { title: 'Texto original', url: 'https://example.org/texto' },
    { title: 'Referência local', url: undefined },
  ]);
  assert.throws(() => reviewCornellNotebook({ original: {}, linked: {}, map: [], sources: [] }), /Faça uma anotação/);
});

test('consulta o acervo da matéria e usa o fundamento das questões C/E', () => {
  const topic = { id: 't1', num: '1', title: 'Administração', resources: {
    materials: [{ titulo: 'Aula', conteudo: ['O controle hierárquico decorre da subordinação administrativa.'] }],
    revision: [{ k: 'Princípios', regra: 'A revisão reforça a finalidade administrativa.' }],
  } };
  const sibling = { id: 't2', num: '2', title: 'Atos' };
  const other = { id: 't3', num: '3', title: 'Tributos' };
  const data = {
    studySubjects: [{ topics: [topic, sibling] }, { topics: [other] }],
    mindMaps: [{ topicId: 't1', nodes: [{ id: 'n1', label: 'Competência' }] }],
    concepts: { n1: { summary: 'A competência administrativa tem previsão legal.' } },
    questions: [
      { id: 'q1', topicId: 't2', statement: 'Afirmação falsa do item C/E.', explanation: 'A competência decorre da norma aplicável.', basis: 'Lei de processo administrativo' },
      { id: 'q2', topicId: 't2', explanation: 'Questão excluída do banco.' },
      { id: 'q3', topicId: 't3', explanation: 'Registro de outra matéria.' },
    ],
    excludedQuestionIds: ['q2'],
    flashcards: [{ topicId: 't1', front: 'Qual o alcance?', back: 'O alcance depende da competência prevista em lei.' }],
  };
  const { bank } = cornellVerificationContext(data, topic);
  assert.deepEqual(bank.map(item => item.kind), ['Material', 'Revisão ativa', 'Mapa mental', 'Fundamento de questão', 'Flashcard']);
  assert.equal(bank.find(item => item.kind === 'Fundamento de questão').text, 'A competência decorre da norma aplicável.');
  assert.ok(bank.every(item => !/falsa|excluída|outra matéria/.test(item.text)));
});

test('mostra trecho e identificação do acervo sem dar por conferida a fonte original', () => {
  const original = { notes: 'O controle hierárquico decorre da subordinação administrativa.\nO imposto sobre serviços é de competência municipal.' };
  const bank = [
    { title: 'Aula do tópico', kind: 'Material', text: 'O controle hierárquico decorre da subordinação administrativa.', currentTopic: true },
    { title: 'Aula da mesma matéria', kind: 'Material', text: 'O controle hierárquico decorre da subordinação administrativa.', currentTopic: false },
  ];
  const result = reviewCornellNotebook({ original, linked: {}, map: [], sources: [], bank });
  assert.equal(result.checks[0].bank.title, 'Aula do tópico');
  assert.equal(result.checks[0].bank.literal, true);
  assert.equal(result.checks[0].status, 'pending');
  assert.equal(result.checks[1].bank, undefined);
});
