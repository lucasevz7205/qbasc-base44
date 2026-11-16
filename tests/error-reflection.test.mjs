import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { buildErrorReflection, findErrorReflection } from '../src/lib/question-feedback.js';
import { PERSONAL_WRITE, workspaceCollection } from '../src/lib/account-boundary.js';

const answer = { id: 'q-1', hist: [{ m: 'C', ok: false, em: '2026-11-16T13:15:20.000Z' }] };
const draft = {
  questionId: answer.id, sessionId: 'rodada-1', attemptAt: answer.hist[0].em,
  marked: 'C', origin: 'leitura', text: '  Confundi o prazo da regra.  ',
};

test('salva o texto e a classificação em um único registro associado à tentativa', () => {
  const entry = buildErrorReflection(draft);
  assert.equal(entry.qid, answer.id);
  assert.equal(entry.tentativaEm, answer.hist[0].em);
  assert.equal(entry.marcada, 'C');
  assert.equal(entry.origem, 'leitura');
  assert.equal(entry.texto, 'Confundi o prazo da regra.');
  assert.equal(buildErrorReflection(draft).id, entry.id);
  assert.notEqual(buildErrorReflection({ ...draft, attemptAt: '2026-11-16T14:15:20.000Z' }).id, entry.id);
  assert.throws(() => buildErrorReflection({ ...draft, origin: '' }));
  assert.throws(() => buildErrorReflection({ ...draft, text: ' ' }));
  assert.equal(answer.hist.length, 1);
});

test('a justificativa só aparece na questão e tentativa correspondentes e lê notas antigas', () => {
  const saved = buildErrorReflection(draft);
  const legacy = { tentativaEm: draft.attemptAt, texto: 'Histórico anterior', origem: 'recuperacao' };
  const older = { ...answer, justificativas: [legacy] };
  assert.equal(findErrorReflection([saved], 'q-2', draft.attemptAt), undefined);
  assert.equal(findErrorReflection([saved], answer.id, '2026-11-16T14:15:20.000Z'), undefined);
  assert.equal(findErrorReflection([], answer.id, draft.attemptAt, older), legacy);
  assert.equal(findErrorReflection([saved], answer.id, draft.attemptAt, older), saved);
});

test('justificativas ficam separadas dos documentos de respostas e das outras contas', () => {
  assert(PERSONAL_WRITE.includes('justificativas'));
  assert.notEqual(workspaceCollection('aluno-1', 'justificativas'), workspaceCollection('aluno-1', 'respostas'));
  assert.notEqual(workspaceCollection('aluno-1', 'justificativas'), workspaceCollection('aluno-2', 'justificativas'));
});

test('o cartão conserva a identidade do estágio sem dividir a chave do painel de curadoria', () => {
  const source = readFileSync(new URL('../src/components/qb/screens/QuestionSessionView.jsx', import.meta.url), 'utf8');
  assert.match(source, /<main key=\{stageKey\}/);
  assert.match(source, /<EditorialCurator key=\{q.id\}/);
  assert.doesNotMatch(source, /<QuestionCard\s+key=\{q.id\}/);
});
