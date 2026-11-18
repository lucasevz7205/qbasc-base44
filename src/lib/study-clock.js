import { reviewDay } from './spaced-review.js';

export const STUDY_ACTIVITIES = {
  questions: 'Questões',
  flashcards: 'Flashcards',
  maps: 'Mapas mentais',
  tutor: 'Tutor',
};

const emptySession = {
  id: null, status: 'idle', startedAt: null, since: null, sinceAt: null,
  time: {}, daily: {}, counts: { questions: 0, flashcards: 0 }, maps: [],
};
export const initialStudyClock = { ...emptySession, activity: null, visible: true };

export function studyClockReducer(state, action) {
  const { type, now, at, sessionId } = action;
  if (type === 'record') {
    if (!['active', 'paused'].includes(state.status) || action.id !== state.id) return state;
    return { ...state, counts: { ...state.counts, [action.kind]: state.counts[action.kind] + 1 } };
  }

  let next = state.since === null ? { ...state } : {
    ...state,
    since: null,
    sinceAt: null,
    time: studyClockTimes(state, now),
    daily: clockDailyTimes(state, now),
  };

  if (type === 'activity') {
    next.activity = action.activity;
    if (next.activity && next.status === 'idle') {
      next = { ...next, status: 'active', id: sessionId, startedAt: at };
    }
  }
  if (type === 'visibility') next.visible = action.visible;
  if (type === 'start') {
    next = { ...next, ...emptySession, status: 'active', id: sessionId, startedAt: at };
  }
  if (type === 'toggle') next.status = state.status === 'paused' ? 'active' : 'paused';
  if (type === 'finish') next.status = 'finished';

  if (next.status === 'active' && next.visible && next.activity) {
    next.since = now;
    next.sinceAt = at;
    if (next.activity.kind === 'maps' && !next.maps.includes(next.activity.key)) {
      next.maps = [...next.maps, next.activity.key];
    }
  }
  return next;
}

export function studyClockTimes(state, now) {
  if (state.since === null) return state.time;
  const kind = state.activity.kind;
  return { ...state.time, [kind]: (state.time[kind] || 0) + Math.max(0, now - state.since) };
}

function dayBoundary(start, end, date) {
  if (reviewDay(Math.ceil(end) - 1) === date) return end;
  let low = start + 1;
  let high = Math.ceil(end);
  while (low < high) {
    const midpoint = Math.floor((low + high) / 2);
    if (reviewDay(midpoint) === date) low = midpoint + 1;
    else high = midpoint;
  }
  return low;
}

function clockDailyTimes(state, now) {
  const elapsed = state.since === null ? 0 : Math.max(0, now - state.since);
  if (!elapsed) return state.daily;
  const daily = { ...state.daily };
  const end = state.sinceAt + elapsed;
  const kind = state.activity.kind;
  let start = state.sinceAt;
  while (start < end) {
    const date = reviewDay(start);
    const stop = dayBoundary(start, end, date);
    const times = daily[date] || {};
    daily[date] = { ...times, [kind]: (times[kind] || 0) + stop - start };
    start = stop;
  }
  return daily;
}

export function studyClockRecords(state, now) {
  if (!state.id) return [];
  return Object.entries(clockDailyTimes(state, now)).flatMap(([date, times]) => {
    const time = Object.fromEntries(Object.keys(STUDY_ACTIVITIES).map(kind => [kind, Math.floor(times[kind] || 0)]));
    return studyTimeTotal(time) > 0 ? [{ id: state.id + ':' + date, sessionId: state.id, date, startedAt: state.startedAt, time }] : [];
  });
}

export function studyTimeTotal(time) {
  return Object.values(time).reduce((sum, value) => sum + value, 0);
}

// Each update is cumulative for this session and day. Retrying it cannot add time twice.
export function mergeStudyClockRecord(before, next) {
  const time = Object.fromEntries(Object.keys(STUDY_ACTIVITIES).map(kind => [kind, Math.max(before.time[kind], next.time[kind])]));
  return { ...next, time };
}

export function mergeStudyClockRecords(...lists) {
  const records = new Map();
  for (const record of lists.flat()) {
    const prior = records.get(record.id);
    records.set(record.id, prior ? mergeStudyClockRecord(prior, record) : record);
  }
  return [...records.values()];
}

export function formatStudyTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const parts = [minutes % 60, seconds % 60];
  if (minutes >= 60) parts.unshift(Math.floor(minutes / 60));
  return parts.map(part => String(part).padStart(2, '0')).join(':');
}
