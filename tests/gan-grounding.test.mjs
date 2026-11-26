import assert from 'node:assert/strict';
import test from 'node:test';
import { GAN_MAP_EXERCISE_PREFIX, ganMapExercisePassages, ganSourcePassages, verifyGanEvidence } from '../src/lib/gan-grounding.js';
import { normalizeGanConfrontation } from '../src/lib/mindmap-gan.js';
import { approveGanReview, ganReviewDraft } from '../src/lib/gan-review.js';
import { buildGanQuestionRecord } from '../src/lib/gan-queue.js';

const request = { topicId: 't', targetNodeLabel: 'competência para autorizar despesa', targetNodePath: ['Governança'] };
const original = { id: 'texto-t', topicos: ['t'], titulo: 'Regulamento da unidade — texto extraído',
  referenceText: 'Compete ao dirigente autorizar a despesa. A assessoria jurídica atua como órgão consultivo.' };
const input = { mapaNoId: 'n', enunciado: 'A assessoria jurídica decide sobre a execução do orçamento.',
  gabarito: 'E', mecanismo: 'F3', comentario: '', correcaoMinima: 'A competência decisória pertence ao dirigente.', trechoDecisivo: 'Compete ao dirigente autorizar a despesa.' };
const map = { nodes: [{ id: 'n', label: 'Competência' }] };
const sources = ganSourcePassages([original], request);
const judgment = { index: 0, veredicto: 'APROVADA', gabaritoDiscriminador: 'E', scoreRealismo: 95,
  falhasDetectadas: [], fundamento: {
    fonteId: sources[0].id, trecho: 'Compete ao dirigente autorizar a despesa.',
    explicacao: 'A autorização pertence ao dirigente e a assessoria atua como órgão consultivo.',
    limitacao: '',
  } };
const confront = (judge = judgment, list = sources) => normalizeGanConfrontation([input], [judge], map, { sources: list });

test('seleção de fontes respeita o assunto, ignora títulos sem texto e mantém a identificação do material', () => {
  const list = ganSourcePassages([
    original, { id: 'url', titulo: 'Fonte online', topicos: ['t'], url: 'https://example.org' },
    { id: 'outro', topicos: ['outro'], texto: 'Um segredo de outro assunto.' },
  ], request);
  assert.equal(list.length, 1);
  assert.equal(list[0].natureza, 'texto');
  assert.equal(list[0].titulo, original.titulo);
  assert.equal(list[0].texto.replace(/\s+/g, ' '), original.referenceText);
  assert.ok(list[0].id.startsWith('texto-t:referenceText:'));
});

test('texto longo prioriza o trecho do nó e mantém o orçamento de quatro passagens', () => {
  const body = Array.from({ length: 12 }, (_, i) => ('Parágrafo ' + i + ' de material não relacionado. ').repeat(30)).join('\n\n') +
    '\n\nCompete ao dirigente autorizar a despesa e verificar a competência no processo de governança.';
  const list = ganSourcePassages([{ ...original, referenceText: body }], request);
  assert.equal(list.length, 4);
  assert.match(list[0].texto, /Compete ao dirigente/);
  assert.ok(list.every(entry => entry.texto.length <= 1600));
  assert.equal(new Set(list.map(entry => entry.texto)).size, list.length);
});

test('somente correspondência literal em fonte identificada recebe o selo de trecho localizado', () => {
  assert.equal(verifyGanEvidence({ ...judgment.fundamento, trecho: 'Compete ao dirigente\nautorizar a despesa.' }, sources).verificacao, 'trecho_localizado');
  assert.equal(verifyGanEvidence({ ...judgment.fundamento, fonteId: 'inventada' }, sources).verificacao, 'trecho_nao_localizado');
  assert.equal(verifyGanEvidence({ ...judgment.fundamento, trecho: 'Compete à assessoria autorizar a despesa.' }, sources).verificacao, 'trecho_nao_localizado');
  assert.equal(verifyGanEvidence(judgment.fundamento, []).verificacao, 'sem_fonte');
});

test('item fundamentado mantém a resolução cega e grava a evidência sem exigir comentário', () => {
  const result = confront();
  assert.equal(result.aprovadas.length, 1);
  const record = buildGanQuestionRecord(result.aprovadas[0], { chosen: { topicId: 't', title: 'Governança' }, node: map.nodes[0] });
  assert.equal(record.fundamentacaoCega.titulo, original.titulo);
  assert.equal(record.fundamentacaoCega.verificacao, 'trecho_localizado');
  assert.equal(record.fundamentacaoCega.trecho, judgment.fundamento.trecho);
});

test('ausência de fonte, trecho inventado, divergência e ambiguidade seguem para decisão manual', () => {
  const cases = [
    confront(judgment, []),
    confront({ ...judgment, fundamento: { ...judgment.fundamento, trecho: 'Citação que o material não contém.' } }),
    confront({ ...judgment, fundamento: undefined }),
    confront({ ...judgment, gabaritoDiscriminador: 'C' }),
    confront({ ...judgment, falhasDetectadas: ['Ambiguidade na competência.'] }),
    confront({ ...judgment, fundamento: { ...judgment.fundamento, limitacao: 'Não há informação sobre a vigência.' } }),
    confront({ ...judgment, fundamento: { ...judgment.fundamento, explicacao: '' } }),
  ];
  for (const result of cases) {
    assert.equal(result.aprovadas.length, 0);
    assert.equal(result.bloqueadas.length, 1);
  }
  const pending = cases[0].bloqueadas[0];
  const approved = approveGanReview(pending, ganReviewDraft(pending));
  assert.equal(approved.statusConfronto, 'aprovada_manual');
  assert.equal(approved.fundamentacaoCega.verificacao, 'sem_fonte');
  assert.equal(approved.comentario, '');
});

test('anotação ou resumo coincidente e refinamento escrito pela revisora requerem revisão manual', () => {
  for (const natureza of ['anotacoes', 'resumo']) {
    const result = confront(judgment, sources.map(source => ({ ...source, natureza })));
    assert.equal(result.aprovadas.length, 0);
    assert.match(result.bloqueadas[0].motivosConfronto.join(' '), /anotação ou resumo/);
  }
  const refined = confront({ ...judgment, veredicto: 'REFINAR', itemRefinado: {
    enunciado: 'A autorização de despesa é competência decisória do dirigente.',
    gabarito: 'C', comentario: '',
  } });
  assert.equal(refined.aprovadas.length, 0);
  assert.equal(refined.bloqueadas.length, 1);
});

test('exercício pelo mapa usa somente notas substanciais do nó e de filhos diretos', () => {
  const notes = ganMapExercisePassages({
    targetNodeId: 'n',
    mapa: { nodes: [
      { id: 'p', label: 'Raiz', summary: 'A regra de outro nó não deve fundamentar este exercício.' },
      { id: 'n', parent: 'p', label: 'Competência', summary: original.referenceText },
      { id: 'child', parent: 'n', label: 'Prazo', summary: 'O prazo regulamentar começa na data do recebimento.' },
      { id: 'empty', parent: 'n', label: 'Etiqueta', summary: 'Sem regra' },
      { id: 'other', parent: 'p', label: 'Outro ramo', summary: 'Informação que deve ficar fora do contexto usado.' },
    ] },
  });
  assert.equal(notes.length, 2);
  assert.equal(notes[0].natureza, 'mapa');
  assert.equal(notes[0].texto, original.referenceText);
  assert.equal(notes[1].titulo, 'Notas do mapa · Prazo');
  assert.deepEqual(ganMapExercisePassages({ mapa: map, targetNodeId: 'outro' }), []);
});

test('notas fundamentam só um exercício explicitamente limitado ao mapa e com evidência literal', () => {
  const mapSources = [{ ...sources[0], natureza: 'mapa' }];
  const scoped = { ...input, enunciado: GAN_MAP_EXERCISE_PREFIX + input.enunciado, comentario: 'O dirigente tem competência decisória.' };
  const run = (item, options = {}, judge = judgment) => normalizeGanConfrontation([item], [judge], map, { sources: mapSources, ...options });
  assert.equal(run(input, { mapExercise: true }).bloqueadas.length, 1);
  assert.equal(run(scoped).bloqueadas.length, 1);
  const result = run(scoped, { mapExercise: true });
  assert.equal(result.aprovadas.length, 1);
  assert.equal(result.aprovadas[0].fundamentacaoCega.natureza, 'mapa');
  assert.equal(run(scoped, { mapExercise: true }, {
    ...judgment, fundamento: { ...judgment.fundamento, trecho: 'Trecho que não existe nas notas.' },
  }).bloqueadas.length, 1);
});
