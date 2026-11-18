import React from 'react';
import { initialStudyClock, studyClockReducer } from '@/lib/study-clock';
import { useStudyClockSync } from '@/lib/study-clock-sync';

const StudyClockContext = React.createContext(null);
const ActivityRegistration = React.createContext(null);
const saveInterval = 15000;

export function StudyClockProvider({ children, onOpen, accountId }) {
  const stateRef = React.useRef(initialStudyClock);
  const [state, setState] = React.useState(initialStudyClock);
  const activities = React.useRef(new Map());
  const { checkpoint, sync, pending } = useStudyClockSync(accountId);

  const send = React.useCallback(action => {
    const previous = stateRef.current;
    const now = performance.now();
    const at = Date.now();
    const startsSession = action.type === 'start' || (previous.status === 'idle' && action.activity);
    const next = studyClockReducer(previous, { ...action, now, at, sessionId: startsSession ? crypto.randomUUID() : undefined });
    if (next === previous) return;
    stateRef.current = next;
    setState(next);
    if (action.type === 'record') return;
    checkpoint(action.type === 'start' ? previous : next, now);
    if (action.type === 'finish' || action.type === 'toggle' || action.type === 'visibility'
      || (action.type === 'activity' && !action.activity)) void sync();
  }, [checkpoint, sync]);

  const register = React.useCallback(activity => {
    const token = Symbol(activity.kind);
    const refresh = () => {
      const entries = [...activities.current.values()];
      const active = entries.findLast(entry => entry.kind === 'tutor') || entries.at(-1) || null;
      if (stateRef.current.activity !== active) send({ type: 'activity', activity: active });
    };
    activities.current.set(token, activity);
    refresh();
    return () => {
      activities.current.delete(token);
      refresh();
    };
  }, [send]);

  React.useEffect(() => {
    const updateVisibility = () => send({ type: 'visibility', visible: !document.hidden });
    const hide = () => send({ type: 'visibility', visible: false });
    const save = () => {
      checkpoint(stateRef.current, performance.now());
      void sync();
    };
    updateVisibility();
    const interval = window.setInterval(save, saveInterval);
    document.addEventListener('visibilitychange', updateVisibility);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', updateVisibility);
    window.addEventListener('online', save);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', updateVisibility);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', updateVisibility);
      window.removeEventListener('online', save);
    };
  }, [checkpoint, send, sync]);

  const value = React.useMemo(() => ({ state, send, onOpen, pending, sync }), [state, send, onOpen, pending, sync]);
  return (
    <ActivityRegistration.Provider value={register}>
      <StudyClockContext.Provider value={value}>{children}</StudyClockContext.Provider>
    </ActivityRegistration.Provider>
  );
}

export function useStudyClock() {
  return React.useContext(StudyClockContext);
}

export function useStudyActivity(kind, key) {
  const register = React.useContext(ActivityRegistration);
  React.useEffect(() => {
    if (key != null && register) return register({ kind, key });
  }, [register, kind, key]);
}

export function useStudyCompletion(kind) {
  const { state, send } = useStudyClock();
  const id = state.status === 'active' && state.visible ? state.id : null;
  return () => send({ type: 'record', kind, id });
}
