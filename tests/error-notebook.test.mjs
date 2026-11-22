/* global URL */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildErrorNotebook, questionErrorCount } from '../src/lib/error-notebook.js';

const subjects = [
  {
    id: 'da',
    name: 'Direito Administrativo',
    short: 'DA',
    topics: [
      { id: 'da-1', num: '1', title: 'Organização Administrativa' },
      { id: 'da-2', num: '2', title: 'Atos Administrativos' },
    ],
  },
  {
    id: 'dc',
    name: 'Direito Constitucional',
    short: 'DC',
    topics: [
      { id: 'dc-1', num: '1', title: 'Direitos Fundamentais' },
    ],
  },
  {
    id: 'lp',
    name: 'Língua Portuguesa',
    short: 'LP',
    topics: [
      { id: 'lp-1', num: '1', title: 'Interpretação' },
    ],
  },
];

test('questionErrorCount conta apenas erros reais e exclui brancos, chutes e acertos', () => {
  assert.equal(questionErrorCount({ id: 'q0', key: 'C' }), 0);
  assert.equal(questionErrorCount({ id: 'q1', key: 'C', response: { acertos: 3, erros: 0, ultimaMarcada: 'C' } }), 0);
  assert.equal(questionErrorCount({ id: 'q2', key: 'C', response: { acertos: 1, erros: 0, noCaderno: true, motivo: 'chute' } }), 0);
  assert.equal(questionErrorCount({ id: 'q3', key: 'C', response: { brancos: 2, erros: 0, hist: [{ m: 'B', ok: false }] } }), 0);
  assert.equal(questionErrorCount({ id: 'q4', key: 'C', statusConfronto: 'divergencia_bloqueada', response: { erros: 4 } }), 0);

  // Mantém a contagem total acumulada mesmo após sair do caderno (2 acertos seguidos) ou com hist limitado.
  assert.equal(questionErrorCount({
    id: 'q5',
    key: 'C',
    response: { erros: 5, acertos: 2, noCaderno: false, hist: [{ m: 'E', ok: false }, { m: 'C', ok: true }, { m: 'C', ok: true }] },
  }), 5);

  // Recupera contagem pelo histórico quando `erros` não estiver presente.
  assert.equal(questionErrorCount({
    id: 'q6',
    key: 'C',
    response: { hist: [{ m: 'E', ok: false }, { m: 'C', ok: true }, { m: 'E', ok: false }] },
  }), 2);

  // Registro legado somente com ultimaMarcada divergente do gabarito.
  assert.equal(questionErrorCount({
    id: 'q7',
    key: 'C',
    response: { tentativas: 1, ultimaMarcada: 'E', gabaritoUsado: 'C' },
  }), 1);
});

test('buildErrorNotebook agrupa somente questões erradas por matéria e assunto, soma e ordena por erros', () => {
  const questions = [
    { id: 'da1-ok', code: 'DA-1-Q01', subjectId: 'da', topicId: 'da-1', key: 'C', statement: 'Correta.', response: { acertos: 2, erros: 0 } },
    { id: 'da1-chute', code: 'DA-1-Q02', subjectId: 'da', topicId: 'da-1', key: 'C', statement: 'Chute.', response: { acertos: 1, erros: 0, noCaderno: true, motivo: 'chute' } },
    { id: 'da1-e1', code: 'DA-1-Q03', subjectId: 'da', topicId: 'da-1', key: 'E', statement: 'Erro único.', trap: { code: 'F3', name: 'F3 · Troca' }, response: { erros: 1 } },
    { id: 'da2-e3', code: 'DA-2-Q01', subjectId: 'da', topicId: 'da-2', key: 'C', statement: 'Erro triplo.', response: { erros: 3 } },
    { id: 'da2-e1', code: 'DA-2-Q02', subjectId: 'da', topicId: 'da-2', key: 'E', statement: 'Erro simples.', response: { erros: 1 } },
    { id: 'dc1-e5', code: 'DC-1-Q01', subjectId: 'dc', topicId: 'dc-1', key: 'E', statement: 'Cinco erros.', explanation: 'Explicação.', basis: 'CF art. 5º', response: { erros: 5 } },
    { id: 'dc1-e5', code: 'DC-1-Q01', subjectId: 'dc', topicId: 'dc-1', key: 'E', statement: 'Duplicada ignorada.', response: { erros: 5 } },
    { id: 'extra-e2', code: 'EXT-01', subjectId: 'ti', topicId: 'ti-99', subject: 'TI', chapter: 'Tópico avulso', key: 'C', statement: 'Sem edital.', response: { erros: 2 } },
  ];

  const notebook = buildErrorNotebook(questions, subjects);
  assert.equal(notebook.totalQuestions, 5);
  assert.equal(notebook.totalErrors, 12);

  // Ordem das matérias pelo total de erros: DC (5), DA (5 - vem antes de TI), TI (2). LP sem erros fica de fora.
  assert.deepEqual(notebook.subjects.map(s => [s.id, s.questionCount, s.errorCount]), [
    ['da', 3, 5],
    ['dc', 1, 5],
    ['ti', 1, 2],
  ]);

  const da = notebook.subjects.find(s => s.id === 'da');
  assert.deepEqual(da.topics.map(t => [t.id, t.label, t.questionCount, t.errorCount]), [
    ['da-2', '2 · Atos Administrativos', 2, 4],
    ['da-1', '1 · Organização Administrativa', 1, 1],
  ]);
  assert.deepEqual(da.topics[0].questions.map(q => [q.id, q.errorCount]), [
    ['da2-e3', 3],
    ['da2-e1', 1],
  ]);
  assert.equal(da.topics[1].questions[0].trapCode, 'F3');

  const ti = notebook.subjects.find(s => s.id === 'ti');
  assert.equal(ti.name, 'TI');
  assert.equal(ti.topics[0].label, 'Tópico avulso');
});

test('TrainScreen integra o Caderno de erros somente leitura com o Design System', () => {
  const train = readFileSync(new URL('../src/components/qb/screens/TrainScreen.jsx', import.meta.url), 'utf8');
  const component = readFileSync(new URL('../src/components/qb/study/ErrorNotebook.jsx', import.meta.url), 'utf8');
  assert.match(train, /Caderno de erros/);
  assert.match(train, /<ErrorNotebook/);
  assert.match(train, /buildErrorNotebook/);
  assert.match(component, /qb-train-fold qb-train-fold--nested/);
  assert.doesNotMatch(component, /save\(|respostas/);
});
