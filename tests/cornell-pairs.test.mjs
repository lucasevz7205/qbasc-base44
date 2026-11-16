import test from 'node:test';
import assert from 'node:assert/strict';
import { cornellPairsTopicId, readCornellPairs } from '../src/lib/cornell-pairs.js';
import { cleanCornell, cornellDraftKey, reconcileCornell } from '../src/lib/cornell-logic.js';

test('pares Cornell usam documento e rascunho independentes do caderno original', () => {
  const original = { notes: 'Nota original de RF 2.1', cues: '1) Governabilidade\n2) Governança', summary: '' };
  const id = 'rf-2-1';
  const pairsTopicId = cornellPairsTopicId(id);
  assert.notEqual(pairsTopicId, id);
  assert.notEqual(pairsTopicId, cornellPairsTopicId('da-9-1'));
  assert.notEqual(cornellDraftKey('owner', id), cornellDraftKey('owner', pairsTopicId));
  assert.deepEqual(reconcileCornell(original, null, null).data, original);
  assert.deepEqual(readCornellPairs(original.notes), []);
});

test('pistas continuam vinculadas às respectivas notas após sincronizar ou recuperar um rascunho', () => {
  const pairs = [{ id: 'p1', cue: 'Pista 1', note: 'Nota 1' }, { id: 'p2', cue: 'Pista 2', note: 'Nota 2' }];
  const saved = cleanCornell({ notes: JSON.stringify(pairs) });
  const cloud = reconcileCornell(saved, saved, null);
  assert.deepEqual(readCornellPairs(cloud.data.notes), pairs);
  assert.equal(cloud.recovery, null);
  const changed = { ...saved, notes: JSON.stringify([{ ...pairs[0], note: 'Nota revisada' }, pairs[1]]) };
  const conflict = reconcileCornell(saved, changed, null);
  assert.deepEqual(readCornellPairs(conflict.data.notes), pairs);
  assert.equal(readCornellPairs(conflict.recovery.notes)[0].note, 'Nota revisada');
});
