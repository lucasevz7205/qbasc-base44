import React from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';

const VIEW_TO_PATH = {
  dashboard: '/',
  questions: '/questoes',
  map: '/mapas',
  flashcards: '/flashcards',
  tutor: '/tutor',
  welcome: '/boas-vindas',
};

const PATH_TO_VIEW = {
  '/': 'dashboard',
  '/questoes': 'questions',
  '/mapas': 'map',
  '/flashcards': 'flashcards',
  '/tutor': 'tutor',
  '/boas-vindas': 'welcome',
};

const QBStudyContext = React.createContext(null);

export function QBStudyProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = React.useState({
    idx: 0,
    answers: {},
    drawer: false,
    focus: false,
    bannerDismissed: false,
  });
  const [cards, setCards] = React.useState({
    idx: 0,
    flipped: false,
    ratings: [],
  });
  const [mapSel, setMapSel] = React.useState('em');
  const [returnTo, setReturnTo] = React.useState(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const activeView = PATH_TO_VIEW[location.pathname] || 'dashboard';

  React.useEffect(() => {
    if (!['questions', 'flashcards'].includes(activeView) || paused) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [activeView, paused]);

  const go = React.useCallback(
    (nextView, opts = {}) => {
      if (nextView === 'map') {
        if (opts.node) setMapSel(opts.node);
        setReturnTo(opts.returnTo || null);
      }
      const targetPath = VIEW_TO_PATH[nextView] || '/';
      navigate({ to: targetPath });
    },
    [navigate],
  );

  const progress = React.useMemo(
    () => ({
      answered: Object.values(session.answers).filter((a) => a.revealed).length,
      cards: cards.ratings.length,
    }),
    [session.answers, cards.ratings.length],
  );

  const value = React.useMemo(
    () => ({
      activeView,
      session,
      setSession,
      cards,
      setCards,
      mapSel,
      setMapSel,
      returnTo,
      setReturnTo,
      elapsed,
      paused,
      onTogglePause: () => setPaused((p) => !p),
      progress,
      go,
    }),
    [activeView, session, cards, mapSel, returnTo, elapsed, paused, progress, go],
  );

  return <QBStudyContext.Provider value={value}>{children}</QBStudyContext.Provider>;
}

export function useQBStudy() {
  const ctx = React.useContext(QBStudyContext);
  if (!ctx) throw new Error('useQBStudy must be used within QBStudyProvider');
  return ctx;
}