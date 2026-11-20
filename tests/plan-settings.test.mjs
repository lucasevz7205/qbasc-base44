import { URL } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { PLAN_SETTINGS_ID, advanceCycle, planSettings, taskRecord } from '../src/lib/plan-settings.js';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/lib/')) {
      return nextResolve(new URL('../src/lib/' + specifier.slice(6) + '.js', import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { adaptStudy } = await import('../src/lib/qb-real-model.js');
hooks.deregister();

const today = new Date('2026-11-15T14:00:00Z');
const date = '2026-11-15';
const timestamp = today.toISOString();
const subjects = [
  { subjectId: 'lp', name: 'Português', minutes: 45 },
  { subjectId: 'da', name: 'Direito Administrativo', minutes: 60 },
];

test('a agenda antiga carrega no modo semanal e mantém os registros', () => {
  const imported = { id: 'original', titulo: 'Princípios', materia: 'Direito Administrativo', tipo: 'revisao', data: date, status: 'planejada' };
  const { QB_PLAN } = adaptStudy({ planejamento: [imported] }, null, today);
  assert.equal(QB_PLAN.mode, 'weekly');
  assert.deepEqual(QB_PLAN.weeks[0].map(task => task.raw), [imported]);
  assert.deepEqual(QB_PLAN.cycle, []);
});

test('ativar e alternar o modo preserva a agenda e a posição do ciclo após recarregar', () => {
  const schedule = { id: 'original', titulo: 'Atividade original', data: date };
  let settings = planSettings({ mode: 'cycle', cycle: subjects, hours: [2] });
  settings = advanceCycle(settings);
  const reload = mode => adaptStudy({ planejamento: [schedule, { id: PLAN_SETTINGS_ID, ...settings, mode }] }, null, today).QB_PLAN;
  const cycle = reload('cycle');
  assert.equal(cycle.mode, 'cycle');
  assert.equal(cycle.currentSubjectId, 'da');
  assert.equal(advanceCycle(cycle).currentSubjectId, 'lp');
  assert.deepEqual(cycle.hours, [2, 0, 0, 0, 0, 0, 0]);
  const weekly = reload('weekly');
  assert.equal(weekly.mode, 'weekly');
  assert.equal(weekly.currentSubjectId, 'da');
  assert.deepEqual(weekly.weeks[0].map(task => task.id), ['original']);
  assert.equal(planSettings({ ...settings, cycle: subjects.slice(0, 1) }).currentSubjectId, 'lp');
});

test('editar preserva a origem e arquivar remove apenas da agenda ativa', () => {
  const raw = { id: 't1', titulo: 'Atividade', data: date, origem: 'tutory', materia: 'Direito Administrativo', topico: 'da-1' };
  const result = taskRecord({ raw }, { titulo: 'Tema revisado', minutos: 30, horario: '14:00', arquivadaEm: timestamp }, timestamp);
  assert.equal(result.origem, 'tutory');
  assert.equal(result.topico, 'da-1');
  assert.equal(result.horario, '14:00');
  const archived = adaptStudy({ planejamento: [result] }, null, today).QB_PLAN;
  assert.equal(archived.tasks.length, 0);
  assert.equal(archived.archivedTasks[0].id, 't1');
  const restored = adaptStudy({ planejamento: [{ ...result, arquivadaEm: null }] }, null, today).QB_PLAN;
  assert.equal(restored.weeks[0][0].title, 'Tema revisado');
  assert.equal(restored.weeks[0][0].minutes, 30);
  assert.equal(taskRecord({ raw }, { materia: 'Português' }, timestamp).topico, undefined);
  assert.equal(taskRecord(undefined, { titulo: 'Nova' }, timestamp).status, 'planejada');
});
