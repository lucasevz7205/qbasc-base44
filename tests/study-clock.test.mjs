import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initialStudyClock,
  mergeStudyClockRecords,
  studyClockRecords,
  studyClockReducer,
  studyClockTimes,
  studyTimeTotal,
} from '../src/lib/study-clock.js';

const firstId = 'e4c0ad7f-055c-4dd5-9022-b53157c1c331';
const secondId = '8dc0c704-3b85-4ef8-8c86-ae4583c7151b';
const base = Date.parse('2026-11-18T12:00:00Z');
const action = (state, now, change, epoch = base) => studyClockReducer(state, {
  now, at: epoch + now, sessionId: firstId, ...change,
});
const open = (state, now, kind, epoch) => action(state, now, { type: 'activity', activity: { kind, key: kind } }, epoch);

test('records active time separately for questions, maps, flashcards and tutor', () => {
  let state = open(initialStudyClock, 0, 'questions');
  state = open(state, 5000, 'tutor');
  state = open(state, 7000, 'maps');
  state = open(state, 11000, 'flashcards');
  state = action(state, 14000, { type: 'finish' });

  assert.deepEqual(studyClockTimes(state, 20000), { questions: 5000, tutor: 2000, maps: 4000, flashcards: 3000 });
  const [record] = studyClockRecords(state, 20000);
  assert.equal(record.date, '2026-11-18');
  assert.equal(record.sessionId, firstId);
  assert.equal(studyTimeTotal(record.time), 14000);
});

test('checkpoints exclude paused and hidden time and keep separate new sessions', () => {
  let state = open(initialStudyClock, 0, 'questions');
  state = action(state, 3000, { type: 'toggle' });
  state = action(state, 9000, { type: 'toggle' });
  state = action(state, 10000, { type: 'visibility', visible: false });
  state = action(state, 60000, { type: 'visibility', visible: true });
  const [before] = studyClockRecords(state, 62000);
  assert.equal(before.time.questions, 6000);
  state = action(state, 62000, { type: 'finish' });
  state = action(state, 63000, { type: 'start', sessionId: secondId });
  const [after] = studyClockRecords(state, 64000);
  assert.notEqual(before.id, after.id);
  assert.equal(after.time.questions, 1000);
});

test('splits a session at midnight in São Paulo', () => {
  const beforeMidnight = Date.parse('2026-11-19T02:59:58Z');
  const state = open(initialStudyClock, 0, 'tutor', beforeMidnight);
  const rows = studyClockRecords(state, 5000);
  assert.deepEqual(rows.map(row => [row.date, row.time.tutor, row.sessionId]), [
    ['2026-11-18', 2000, firstId],
    ['2026-11-19', 3000, firstId],
  ]);
});

test('a stale or retried snapshot does not add or erase time', () => {
  let state = open(initialStudyClock, 0, 'maps');
  const early = studyClockRecords(state, 3000);
  state = open(state, 4000, 'tutor');
  const latest = studyClockRecords(state, 8000);
  assert.deepEqual(mergeStudyClockRecords(latest, early, latest), latest);
});
