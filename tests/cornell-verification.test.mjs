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
