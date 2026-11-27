import { URL } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PILOT_ACTIVITIES, dueDay, pilotNavigator, readPilotAttempts, submitPilotAttempt } from '../src/lib/nexo/controlled-pilot.js';
import { getKitPuzzleSource, KIT_PUZZLES } from '../src/lib/nexo/kit-visuals.js';
import { evaluatePuzzle } from '../src/lib/nexo/association-puzzle.js';
import { mechanismForKey } from '../src/lib/cebraspe-v1-taxonomy.js';

test('only the curated bindings offer distinct D0 and D+7 items with the existing editorial keys', () => {
  assert.deepEqual(PILOT_ACTIVITIES.map(a => a.topicId), ['rf-1', 'cp-7', 'ti-5-3', 'rf-1-1', 'cp-8', 'lg-3-2']);
  const ids = new Set();
  for (const activity of PILOT_ACTIVITIES) {
    assert.ok(activity.nodeId);
    assert.equal(activity.items.length, 2);
    assert.notEqual(activity.items[0].enunciado, activity.items[1].enunciado);
    for (const item of activity.items) {
      assert.ok(mechanismForKey(item.mecanismo, item.gabarito));
      assert.ok(!ids.has(item.id));
      ids.add(item.id);
    }
  }
});

test('CP-7 requires the two positions and the purpose before complete evaluation', () => {
  const kit = JSON.parse(readFileSync(new URL('../src/data/kits/cp/cp-7/mapa.json', import.meta.url), 'utf8'));
  const model = KIT_PUZZLES.find(entry => entry.id === 'cp7-consulta');
  const source = getKitPuzzleSource(kit, model);
  assert.ok(source);
  const stage = source.model.stages.find(entry => entry.id === 'ato');
  assert.equal(stage.reviewTogether, true);
  assert.equal(evaluatePuzzle(stage, { antes: 'plebiscito', depois: 'referendo' }).status, 'incomplete');
  assert.equal(evaluatePuzzle(stage, { antes: 'plebiscito', depois: 'referendo', finalidade: 'propor' }).status, 'incorrect');
  assert.equal(evaluatePuzzle(stage, { antes: 'plebiscito', depois: 'referendo', finalidade: 'ratificar' }).status, 'correct');
  assert.doesNotMatch(stage.slots.map(slot => slot.label).join(' '), /ratificar|rejeitar/i);
});

test('only the first submitted judgment counts per item and D+7 uses the study time zone', () => {
  const [activity] = PILOT_ACTIVITIES;
  const [first, followUp] = activity.items;
  const empty = {};
  const now = new Date('2026-11-28T02:30:00Z');
  assert.throws(() => submitPilotAttempt(empty, followUp.id, 'E', now), /bloqueado/);
  assert.throws(() => submitPilotAttempt(empty, 'real-item', 'E', now), /inválida/);
  assert.throws(() => submitPilotAttempt(empty, first.id, 'B', now), /inválida/);
  const submitted = submitPilotAttempt(empty, first.id, 'C', now);
  assert.equal(dueDay(submitted[first.id]), '2026-12-04');
  assert.equal(submitPilotAttempt(submitted, first.id, 'E', now), submitted);
  const before = new Date('2026-12-04T02:59:59Z');
  const start = new Date('2026-12-04T03:00:00Z');
  assert.throws(() => submitPilotAttempt(submitted, followUp.id, 'C', before), /bloqueado/);
  const completed = submitPilotAttempt(submitted, followUp.id, 'C', start);
  assert.equal(submitPilotAttempt(completed, followUp.id, 'E', start), completed);
  const storage = raw => ({ getItem: () => JSON.stringify(raw) });
  assert.deepEqual(readPilotAttempts(storage({ ...completed, encaixe: { marked: 'C', at: now.toISOString() } }), 'fake'), completed);
  assert.deepEqual(readPilotAttempts(storage({ ...submitted, [followUp.id]: { marked: 'C', at: before.toISOString() } }), 'fake'), submitted);
  assert.equal(pilotNavigator(empty, 'fixture').events.length, 0);
  assert.equal(pilotNavigator({ encaixe: { marked: 'C' } }, 'fixture').events.length, 0);
  const navigation = pilotNavigator(completed, 'fixture');
  assert.equal(navigation.events.length, 2);
  assert.deepEqual(navigation.nodes[0].recognition, { correct: 1, total: 2 });
  assert.deepEqual(navigation.nodes[0].independentSuccesses, []);
  assert.equal(navigation.nodes[0].free.total, 0);
});
