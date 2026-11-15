import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT_COLLECTION, IMPORTABLE, PERSONAL_WRITE, workspaceCollection, bankQuestion, resetImportedDocument } from '../src/lib/account-boundary.js';

test('cada conta só resolve coleções permitidas no próprio espaço', () => {
  assert.notEqual(workspaceCollection('conta-A', 'respostas'), workspaceCollection('conta-B', 'respostas'));
  assert.notEqual(workspaceCollection('conta-A', 'questoes'), 'questoes');
  for (const name of [ACCOUNT_COLLECTION, 'qbasc-conta:conta-B:respostas', 'ClaudeDocument', '__proto__']) {
    assert.throws(() => workspaceCollection('conta-A', name), /inválida/);
  }
  assert.throws(() => workspaceCollection('conta-A:conta-B', 'respostas'), /inválida/);
  assert(!PERSONAL_WRITE.includes('questoes'));
  assert(!PERSONAL_WRITE.includes('edital'));
  assert(!IMPORTABLE.includes('respostas'));
});

test('a cópia de questão remapeia o assunto e descarta histórico e dados privados', () => {
  const source = {
    id: 'q1', enunciado: 'Item de prova', gabarito: 'C', topico: 'tema-privado', mapaNoId: 'mapa-privado',
    acertos: 8, respostas: ['E'], comentario: 'Fundamento', hist: [{ ok: false }],
    alternativas: [{ letra: 'A', texto: 'Uma opção', progresso: 3 }],
  };
  assert.deepEqual(bankQuestion(source, { id: 'tema-publico', caps: ['CAP-1'] }), {
    id: 'banco-q1', enunciado: 'Item de prova', gabarito: 'C', comentario: 'Fundamento',
    alternativas: [{ letra: 'A', texto: 'Uma opção' }], topico: 'tema-publico', cap: 'CAP-1',
  });
});

test('edital e planejamento importados começam com progresso limpo', () => {
  assert.deepEqual(resetImportedDocument('edital', {
    id: 'da-1', materia: 'Direito Administrativo', titulo: 'Princípios', status: 'dominado',
    tutory: { accuracy: 99 }, acertos: 10,
  }), { id: 'da-1', materia: 'Direito Administrativo', titulo: 'Princípios' });
  const plan = resetImportedDocument('planejamento', {
    id: 'a1', titulo: 'Estudar', data: '2026-11-15', segundos: 1800, status: 'concluida', concluidaEm: '2026-11-15',
  });
  assert.equal(plan.data, '2026-11-15');
  assert.equal(plan.status, 'planejada');
  assert.equal(plan.segundos, 0);
  assert.equal(plan.concluidaEm, null);
});
