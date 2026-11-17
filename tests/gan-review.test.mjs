import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGanConfrontation } from '../src/lib/mindmap-gan.js';
import { approveGanReview, ganReviewDraft, ganReviewEntries, ganReviewQuality } from '../src/lib/gan-review.js';
import { buildGanQuestionRecord, isApprovedGanQuestion, runGanQueue } from '../src/lib/gan-queue.js';

const node = { id: 'n', label: 'Governança' };
const map = { nodes: [node] };
const chosen = { id: 'm', title: 'Gestão pública', topicId: 't' };
const candidate = {
  mapaNoId: 'n', enunciado: 'As competências da unidade consultiva incluem decidir sobre a execução do orçamento.',
  gabarito: 'E', mecanismo: 'F3',
  comentario: 'A regra de organização administrativa atribui a decisão ao dirigente. A assessoria jurídica apenas recomenda providências e não possui poder decisório próprio.',
  correcaoMinima: 'A competência decisória pertence ao dirigente da instituição.',
  trechoDecisivo: 'Compete ao dirigente decidir.',
};
const rejection = {
  index: 0, veredicto: 'REJEITADA', scoreRealismo: 54, gabaritoDiscriminador: 'C',
  falhasDetectadas: ['Possível ambiguidade'], criticaAdversaria: 'Confira o alcance da competência no regulamento.',
};

test('lote inteiro bloqueado mantém enunciado, escore, os dois gabaritos e a recomendação', () => {
  const result = normalizeGanConfrontation([candidate], [rejection], map);
  assert.equal(result.aprovadas.length, 0);
  assert.equal(result.bloqueadas.length, 1);
  const [entry] = ganReviewEntries(node, result, true);
  assert.equal(entry.status, 'pending');
  assert.equal(entry.item.enunciado, candidate.enunciado);
  assert.equal(entry.item.ganScore, 54);
  assert.equal(entry.item.veredictoDiscriminador, 'REJEITADA');
  assert.equal(entry.item.gabaritoGerador, 'E');
  assert.equal(entry.item.gabaritoDiscriminador, 'C');
  assert.match(entry.item.criticaAdversaria, /regulamento/);
  assert.match(entry.item.motivosConfronto.join(' '), /Escore de realismo abaixo do mínimo/);
});

test('escore ausente e enunciados frágeis ou duplicados aparecem bloqueados no relatório', () => {
  const approved = { ...rejection, veredicto: 'APROVADA', gabaritoDiscriminador: 'E' };
  const result = normalizeGanConfrontation(
    [candidate, { ...candidate }, { ...candidate, enunciado: 'Curto' }],
    [{ ...approved, scoreRealismo: null }, { ...approved, index: 1, scoreRealismo: 76 }, { ...approved, index: 2, scoreRealismo: 80 }], map,
  );
  assert.equal(result.aprovadas.length, 0);
  assert.equal(result.bloqueadas.length, 3);
  assert.equal(result.questoes[0].ganScore, null);
  assert.match(result.questoes[1].motivosConfronto.join(' '), /repetido/);
  assert.match(result.questoes[2].motivosConfronto.join(' '), /incompleto/);
  assert.equal(result.resumoConfronto.mediaScoreGan, 78);
});

test('validação manual pode aprovar um item divergente e preserva o diagnóstico da IA como histórico', () => {
  const [item] = normalizeGanConfrontation([candidate], [rejection], map).bloqueadas;
  const draft = ganReviewDraft(item);
  assert.equal(ganReviewQuality(draft).problems.length, 0);
  const approved = approveGanReview(item, draft);
  const record = buildGanQuestionRecord(approved, { chosen, node });
  assert.equal(record.statusConfronto, 'aprovada_manual');
  assert.equal(record.revisaoManual.statusAnterior, 'divergencia_bloqueada');
  assert.equal(record.veredictoDiscriminador, 'REJEITADA');
  assert.equal(record.gabaritoDiscriminador, 'C');
  assert.equal(record.gabarito, 'E');
  assert.ok(record.tags.includes('Aprovada em revisão manual'));
  assert.equal(isApprovedGanQuestion(approved), false, 'a aprovação manual não é uma aprovação automática');
});

test('aprovação manual exige o portão de qualidade e detecta duplicação no banco', () => {
  const [item] = normalizeGanConfrontation([candidate], [rejection], map).bloqueadas;
  const draft = ganReviewDraft(item);
  assert.throws(() => approveGanReview(item, { ...draft, key: 'C' }), /mecanismo.*não combina/);
  assert.throws(() => approveGanReview(item, { ...draft, explanation: 'Muito curto.' }), /pelo menos duas frases/);
  assert.throws(() => approveGanReview(item, draft, [{ id: 'outro', statement: draft.statement.toUpperCase() }]), /Já existe/);
});

test('lote administrativo entrega candidatos para revisão e adia a gravação', async () => {
  const result = normalizeGanConfrontation([candidate], [rejection], map);
  const reviews = [];
  const report = await runGanQueue({
    chosen, pending: [node], generate: async () => result,
    save: async () => assert.fail('A fila em revisão não pode gravar antes da decisão.'),
    onReview: (target, batch) => reviews.push(...ganReviewEntries(target, batch, true)),
  });
  assert.equal(report.paraRevisao, 1);
  assert.equal(report.aprovadas, 0);
  assert.equal(report.erros, 0);
  assert.equal(reviews[0].status, 'pending');
  assert.equal(reviews[0].record, undefined);
  assert.equal(ganReviewEntries(node, result, false)[0].status, 'report');
});
