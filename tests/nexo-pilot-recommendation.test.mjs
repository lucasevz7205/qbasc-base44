import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { generationSources } from '../src/lib/nexo/generation.js';
import { scopedVisualModels } from '../src/lib/nexo/visual-catalog.js';
import { LG_LESSON, PILOT_BOARDS } from '../src/lib/nexo/pilot-lessons.js';
import { validPuzzle } from '../src/lib/nexo/association-puzzle.js';
import { PILOT_ACTIVITIES, PILOT_BINDINGS } from '../src/lib/nexo/controlled-pilot.js';
import { PILOT_TASKS, recommendPilotTask } from '../src/lib/nexo/pilot-recommendation.js';

for (const task of PILOT_TASKS) {
  test(task.id + ' requires the exact effective concept, model and evidence for every part', () => {
    const activity = PILOT_ACTIVITIES.find(entry => entry.modelId === task.modelId);
    const { subjectId, topicId, nodeId, modelId } = activity;
    if (modelId === 'lg32-leitura') {
      const lessons = [{ id: modelId, source: { id: nodeId }, binding: activity }];
      assert.equal(recommendPilotTask(task.id, [LG_LESSON], lessons).status, 'recommended');
      assert.equal(recommendPilotTask(task.id, [], lessons).status, 'review');
      assert.equal(recommendPilotTask(task.id, [{ ...LG_LESSON, lines: [] }], lessons).status, 'review');
      return;
    }
    const path = '../src/data/kits/' + subjectId + '/' + topicId + '/mapa.json';
    const kit = JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
    const [central] = generationSources({ [path]: kit }, subjectId, topicId, nodeId);
    const source = { ...central, referenceLevel: 'node', central: true };
    const subjects = [{ id: subjectId, topics: [{ id: topicId }] }];
    const models = scopedVisualModels({ subjects, ...activity }, [kit], [{ id: modelId }], PILOT_BINDINGS);
    const decision = recommendPilotTask(task.id, [source], models);
    assert.equal(decision.model.id, modelId);
    assert.equal(decision.reference, source.reference);
    assert.equal(decision.evidence.length, task.parts.length);
    for (const { part, excerpt } of decision.evidence) {
      assert.ok(source.lines.some(line => line.includes(excerpt)));
      const lines = source.lines.map(line => line.replaceAll(excerpt, ''));
      const partial = recommendPilotTask(task.id, [{ ...source, lines }], models);
      assert.equal(partial.status, 'review');
      assert.ok(partial.reason.includes(part.toLocaleLowerCase('pt-BR')));
    }
    for (const override of [{ nodeId: 'other' }, { subjectId: 'other' }, { topicId: 'other' },
      { reference: '' }, { referenceLevel: 'map' }, { central: false }, { lines: [] }]) {
      assert.equal(recommendPilotTask(task.id, [{ ...source, ...override }], models).status, 'review');
    }
    assert.equal(recommendPilotTask(task.id, [source, source], models).status, 'review');
    assert.equal(recommendPilotTask(task.id, [source], []).status, 'review');
    assert.equal(recommendPilotTask('nova-tarefa', [source], models).status, 'review');
    if (['cp7-consulta', 'ti53-gendisc'].includes(modelId)) {
      assert.equal(recommendPilotTask(task.id, [{ ...source, learningRoute: null }], models).status, 'review');
    }
  });
}

test('daily reading boards have complete, unique matches', () => {
  for (const board of Object.values(PILOT_BOARDS)) assert.ok(validPuzzle(board));
});
