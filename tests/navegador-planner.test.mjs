import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validarPropostas, revisaoRecord, revisaoId, lerRespostaPlanner, podeAlterarTarefa, plannerPrompt,
  MAX_REVISOES_SEMANA, DATA_PROVA,
} from '../src/lib/navegador-planner.js';

const subjects = [{ id: 'da', name: 'Direito Administrativo', topics: [{ id: 'da-1', title: 'Atos' }, { id: 'da-2', title: 'Poderes' }, { id: 'da-3', title: 'X' }] }];
const today = '2026-11-27'; // sexta
const horas = [0, 2, 2, 2, 2, 2, 2];
const base = { today, subjects, horas };
const p = (over = {}) => ({ topicId: 'da-1', data: '2026-11-30', minutos: 30, motivo: 'erro com certeza', ...over });

test('proposta válida vira registro novo de planejamento com origem navegador', () => {
  const { validas, descartadas } = validarPropostas([p()], base);
  assert.equal(descartadas.length, 0);
  const rec = revisaoRecord(validas[0], today, '2026-11-27T10:00:00Z');
  assert.equal(rec.origem, 'navegador');
  assert.equal(rec.tipo, 'revisao');
  assert.equal(rec.status, 'planejada');
  assert.equal(rec.data, '2026-11-30');
  assert.equal(rec.materia, 'Direito Administrativo');
  assert.equal(validas[0].id, revisaoId(today, 'da-1'));
  assert.equal(rec.automatica, undefined);
});

test('descarta assunto fora do edital, data inválida, passada, após a prova e duração fora da faixa', () => {
  const r = validarPropostas([
    p({ topicId: 'zz' }), p({ data: '30/11' }), p({ data: '2026-11-26' }), p({ data: DATA_PROVA }),
    p({ minutos: 5 }), p({ minutos: 90 }),
  ], base);
  assert.equal(r.validas.length, 0);
  assert.equal(r.descartadas.length, 6);
});

test('não duplica id existente nem repete assunto na mesma semana', () => {
  const ex = new Set([revisaoId(today, 'da-1')]);
  assert.equal(validarPropostas([p()], { ...base, existentes: ex }).validas.length, 0);
  assert.equal(validarPropostas([p(), p({ data: '2026-12-01' })], base).validas.length, 1);
});

test('respeita limite semanal e horas disponíveis do dia', () => {
  const muitas = Array.from({ length: 8 }, (_, i) => p({ topicId: 'da-' + (i % 3 + 1), data: '2026-12-0' + (i % 3 + 1) }));
  assert.ok(validarPropostas(muitas, base).validas.length <= MAX_REVISOES_SEMANA);
  assert.equal(validarPropostas([p()], { ...base, jaNaSemana: MAX_REVISOES_SEMANA }).validas.length, 0);
  // segunda tem 2 h; 45+45 cabe, 45+45+45 não.
  const r = validarPropostas([p({ topicId: 'da-1', minutos: 45 }), p({ topicId: 'da-2', minutos: 45 }), p({ topicId: 'da-3', minutos: 45 })], base);
  assert.equal(r.validas.length, 2);
  // dia sem horas (domingo = 0)
  assert.equal(validarPropostas([p({ data: '2026-11-29' })], base).validas.length, 0);
  // tarefas existentes ocupam o dia
  const tasks = [{ date: '2026-11-30', minutes: 100 }];
  assert.equal(validarPropostas([p({ minutos: 30 })], { ...base, tasks }).validas.length, 0);
});

test('resposta malformada da IA não lança e não gera propostas', () => {
  assert.deepEqual(lerRespostaPlanner('texto solto'), { resposta: 'texto solto', propostas: [] });
  assert.deepEqual(lerRespostaPlanner('{"resposta":"ok","propostas":[1]}').propostas, [1]);
  assert.deepEqual(lerRespostaPlanner(null), { resposta: '', propostas: [] });
  assert.equal(lerRespostaPlanner('```json\n{"resposta":"a","propostas":[]}\n```').resposta, 'a');
  assert.equal(validarPropostas([null, 7, {}], base).validas.length, 0);
});

test('o Navegador só altera tarefas que ele criou e que não foram concluídas', () => {
  assert.equal(podeAlterarTarefa({ raw: { origem: 'navegador' }, status: 'pending' }), true);
  assert.equal(podeAlterarTarefa({ raw: { origem: 'navegador' }, status: 'done' }), false);
  assert.equal(podeAlterarTarefa({ raw: { origem: 'qbasc' }, status: 'pending' }), false);
  assert.equal(podeAlterarTarefa(null), false);
});

test('o prompt carrega regras de amostra e proibições, e só os dados fornecidos', () => {
  const t = plannerPrompt({ resumo: { hoje: today }, history: [], userMessage: 'oi' });
  assert.match(t, /Nunca invente/);
  assert.match(t, /Tutory/);
  assert.match(t, /8 respostas/);
  assert.match(t, /"hoje":"2026-11-27"/);
});

import { atrasadasParaConfirmar, pedidoDeAtrasadas, registroConcluida } from '../src/lib/navegador-planner.js';

test('metas atrasadas: lista só as do estudante, ignora automáticas e arquivadas', () => {
  const tasks = [
    { id: 'a', status: 'late', auto: false, date: '2026-11-20', title: 'A', raw: {} },
    { id: 'b', status: 'late', auto: true, date: '2026-11-21', title: 'B', raw: {} },
    { id: 'c', status: 'late', auto: false, date: '2026-11-19', title: 'C', raw: { arquivadaEm: 'x' } },
    { id: 'd', status: 'pending', auto: false, date: '2026-12-01', title: 'D', raw: {} },
  ];
  const r = atrasadasParaConfirmar(tasks);
  assert.deepEqual(r.itens.map(i => i.id), ['a']);
  assert.equal(r.automaticasIgnoradas, 1);
});

test('pedido de retirar atrasadas é reconhecido e a conclusão preserva o registro', () => {
  assert.equal(pedidoDeAtrasadas('retire as metas atrasadas, porque elas ja foram cumpridas'), true);
  assert.equal(pedidoDeAtrasadas('o que está atrasado?'), false);
  const rec = registroConcluida({ raw: { titulo: 'T', status: 'planejada' } }, '2026-11-27T10:00:00Z');
  assert.equal(rec.titulo, 'T');
  assert.equal(rec.status, 'concluida');
});
