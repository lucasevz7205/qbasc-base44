export const STUDY_ACTIVITIES = {
  questions: 'Questões',
  flashcards: 'Flashcards',
  maps: 'Mapas mentais',
};

const emptySession = { id: 0, status: 'idle', since: null, time: {}, counts: { questions: 0, flashcards: 0 }, maps: [] };
export const initialStudyClock = { ...emptySession, activity: null, visible: true };

export function studyClockReducer(state, action) {
  const { type, now } = action;
  if (type === 'record') {
    if (state.status !== 'active' || action.id !== state.id) return state;
    return { ...state, counts: { ...state.counts, [action.kind]: state.counts[action.kind] + 1 } };
  }

  let next = state.since === null ? { ...state } : {
    ...state,
    since: null,
    time: { ...state.time, [state.activity.kind]: (state.time[state.activity.kind] || 0) + Math.max(0, now - state.since) },
  };

  if (type === 'activity') {
    next.activity = action.activity;
    if (next.activity && next.status === 'idle') {
      next = { ...next, status: 'active', id: state.id + 1 };
    }
  }
  if (type === 'visibility') next.visible = action.visible;
  if (type === 'start') {
    next = { ...next, ...emptySession, status: 'active', id: state.id + 1 };
  }
  if (type === 'toggle') next.status = state.status === 'paused' ? 'active' : 'paused';
  if (type === 'finish') next.status = 'finished';

  if (next.status === 'active' && next.visible && next.activity) {
    next.since = now;
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

export function formatStudyTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const parts = [minutes % 60, seconds % 60];
  if (minutes >= 60) parts.unshift(Math.floor(minutes / 60));
  return parts.map(part => String(part).padStart(2, '0')).join(':');
}
