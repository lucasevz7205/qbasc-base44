import { URL } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { indexQuestionMechanisms, resolveQuestionTrap } from '../src/lib/question-feedback.js';
import { distinctRoundQuestions, pickQuestionRound, nextQuestionIndex } from '../src/lib/study-session-rules.js';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier.startsWith('@/lib/') ? new URL('../src/lib/' + specifier.slice(6) + '.js', import.meta.url).href : specifier, context);
  },
});
const { adaptStudy } = await import('../src/lib/qb-real-model.js');
hooks.deregister();

test('o vínculo do acervo por qid chega ao modelo de questão e preserva o fundamento original', () => {
  const original = { id: 'ti53-13', enunciado: 'Item do banco', gabarito: 'E', comentario: 'Comentário original', ref: 'Fonte' };
  const pegadinha = { id: 'pg-ti-5-3-10', qids: [original.id], mecanismo: 'F7', regra: 'Regra do acervo', sinal: 'Sinal do acervo' };
  const { QB_DATA } = adaptStudy({ questoes: [original], pegadinhas: [pegadinha] });
  const [q] = QB_DATA.questionBank;
  assert.equal(q.trap.code, 'F7');
  assert.equal(q.trap.source, 'Acervo de pegadinhas');
  assert.equal(q.trap.linkedRule, pegadinha.regra);
  assert.equal(q.trap.linkedSignal, pegadinha.sinal);
  assert.equal(q.trap.evidence, '');
  assert.equal(q.explanation, original.comentario);
  assert.equal(q.basis, original.ref);
  assert.deepEqual(q.raw, original);
});

test('o próprio item prevalece, a análise é a segunda fonte e divergências ficam sinalizadas', () => {
  const q = { id: 'q' };
  const traps = [{ qids: ['q'], mecanismo: 'F7' }];
  const links = indexQuestionMechanisms([{ item: 'q', gabarito: 'E', mecanismo: 'F3', evidencia: 'Trecho analítico', vacina: 'Vacina analítica' }], traps);
  const own = resolveQuestionTrap({ ...q, mecanismo: 'F2', trechoDecisivo: 'Trecho original' }, 'E', links);
  assert.equal(own.code, 'F2');
  assert.equal(own.evidence, 'Trecho original');
  assert.equal(resolveQuestionTrap(q, 'E', links).code, 'F3');
  assert.equal(resolveQuestionTrap(q, 'E', links).evidence, 'Trecho analítico');
  assert.equal(resolveQuestionTrap(q, 'E', links).vaccine, 'Vacina analítica');
  assert.equal(resolveQuestionTrap(q, 'C', links), undefined);
  assert.equal(resolveQuestionTrap({ ...q, mecanismo: 'F2' }, 'C', links).keyConflict, true);
  assert.equal(resolveQuestionTrap(q, 'E', indexQuestionMechanisms([], [...traps, { qids: ['q'], mecanismo: 'F5' }])), undefined);
  assert.equal(resolveQuestionTrap({ id: 'outro' }, 'E', links), undefined);
});

test('a sessão deduplica antes do limite e avança entre enunciados diferentes', () => {
  const first = { id: 'original', key: 'C', statement: 'É um teste “com aspas”.' };
  const repeated = { id: 'copia', key: 'C', statement: '  É  um teste "com aspas" ' };
  const others = Array.from({ length: 20 }, (_, i) => ({ id: 'item-' + i, key: 'E', statement: 'Enunciado ' + i }));
  const round = pickQuestionRound([first, repeated, ...others], {}, { unique: true });
  assert.equal(round.length, 20);
  assert.equal(round[nextQuestionIndex(round, 1, new Set())].id, 'item-0');
  assert.equal(round.filter(q => q.id === repeated.id).length, 0);
  assert.deepEqual(distinctRoundQuestions([first, repeated], { omitConflicts: true }), [first]);
  assert.deepEqual(pickQuestionRound([first, { ...repeated, key: 'E' }, others[0]], { filter: 'all' }, { unique: true }), [others[0]]);
  assert.deepEqual(pickQuestionRound([{ ...first, response: {} }, others[0]], { scheduledReview: true }, { unique: true }).map(q => q.id), [first.id, others[0].id]);
});

test('uma reformulação que troca a redação ou o gabarito não herda a pegadinha antiga', () => {
  const question = { id: 'q', enunciado: 'Enunciado original', gabarito: 'E', comentario: 'Resolução original', mecanismo: 'F2' };
  const overlay = { id: 'question:q:v1', targetId: 'q', kind: 'question', status: 'aprovada', version: 1, replacement: { statement: 'Enunciado reformulado', key: 'C', explanation: 'Nova resolução' } };
  const { QB_DATA } = adaptStudy({ questoes: [question], curadoria: [overlay] });
  const [q] = QB_DATA.questionBank;
  assert.equal(q.trap, undefined);
  assert.ok(!q.tags.some(tag => tag.startsWith('F2')));
  assert.equal(q.key, 'C');
});
