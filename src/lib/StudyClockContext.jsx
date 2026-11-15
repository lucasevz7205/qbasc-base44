import React from 'react';
import { initialStudyClock, studyClockReducer } from '@/lib/study-clock';

const StudyClockContext = React.createContext(null);
const ActivityDispatch = React.createContext(null);

export function StudyClockProvider({ children, onOpen }) {
  const [state, dispatch] = React.useReducer(studyClockReducer, initialStudyClock);
  const send = React.useCallback(action => dispatch({ ...action, now: performance.now() }), []);
  React.useEffect(() => {
    const updateVisibility = () => send({ type: 'visibility', visible: !document.hidden });
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, [send]);

  const value = React.useMemo(() => ({ state, send, onOpen }), [state, send, onOpen]);
  return (
    <ActivityDispatch.Provider value={send}>
      <StudyClockContext.Provider value={value}>{children}</StudyClockContext.Provider>
    </ActivityDispatch.Provider>
  );
}

export function useStudyClock() {
  return React.useContext(StudyClockContext);
}

export function useStudyActivity(kind, key) {
  const send = React.useContext(ActivityDispatch);
  React.useEffect(() => {
    if (key == null) return;
    send({ type: 'activity', activity: { kind, key } });
    return () => send({ type: 'activity', activity: null });
  }, [send, kind, key]);
}

export function useStudyCompletion(kind) {
  const { state, send } = useStudyClock();
  const id = state.status === 'active' && state.visible ? state.id : null;
  return () => send({ type: 'record', kind, id });
}
