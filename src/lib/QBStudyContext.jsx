import React from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { ArchitectLayer } from '@/components/qb/AppShell';
import { QB_DATA } from '@/lib/qb-data';

const KEY = 'qb-uikit-v2';
const SUBS = { plan: 'hoje', edital: 'lista', study: 'mapa', performance: 'diaria' };

const VIEW_TO_PATH = {
  dashboard: '/',
  plan: '/planejamento',
  edital: '/edital',
  train: '/treinar',
  study: '/estudo',
  simulado: '/simulado',
  performance: '/desempenho',
  questions: '/questoes',
  map: '/estudo',
  flashcards: '/flashcards',
  tutor: '/tutor',
  welcome: '/boas-vindas',
};

const PATH_TO_VIEW = {
  '/': 'dashboard',
  '/planejamento': 'plan',
  '/edital': 'edital',
  '/treinar': 'train',
  '/estudo': 'study',
  '/simulado': 'simulado',
  '/desempenho': 'performance',
  '/questoes': 'questions',
  '/mapas': 'study',
  '/flashcards': 'flashcards',
  '/tutor': 'tutor',
  '/boas-vindas': 'welcome',
};

const QBStudyContext = React.createContext(null);

export function QBStudyProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [subs, setSubs] = React.useState(SUBS);
  const [ui, setUiState] = React.useState({
    bg: 'dynamic',
    density: 'wide',
    theme: 'dark',
    collapsed: false,
    sync: 'ok',
    quick: false,
    studio: { open: false },
    ctx: null,
    toasts: [],
  });

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
    try {
      const saved = JSON.parse(localStorage.getItem(KEY)) || {};
      if (saved.subs) setSubs(s => ({ ...s, ...saved.subs }));
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ view: activeView, subs }));
    } catch {
      // ignore
    }
  }, [activeView, subs]);

  React.useEffect(() => {
    if (!['questions', 'flashcards'].includes(activeView) || paused) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [activeView, paused]);

  const setUi = React.useCallback(p => {
    setUiState(u => {
      const n = { ...u, ...p };
      if (p.toast) {
        n.toasts = [...u.toasts, { id: Date.now() + Math.random(), ...p.toast }];
        delete n.toast;
      }
      return n;
    });
  }, []);

  const toast = React.useCallback(t => setUi({ toast: t }), [setUi]);

  const setSub = React.useCallback(
    v => t => setSubs(s => ({ ...s, [v]: t })),
    [],
  );

  const openArchitect = React.useCallback(
    (ctx, tool) => {
      setUiState(u => ({
        ...u,
        ctx: ctx || u.ctx,
        studio: { open: true, tool },
        quick: false,
      }));
    },
    [],
  );

  const go = React.useCallback(
    (nextView, arg) => {
      if (nextView === 'map') {
        const o = arg || {};
        if (o.node) setMapSel(o.node);
        setReturnTo(o.returnTo || null);
        setSubs(s => ({ ...s, study: 'mapa' }));
        navigate({ to: '/estudo' });
        return;
      }
      if (typeof arg === 'string' && SUBS[nextView]) {
        setSubs(s => ({ ...s, [nextView]: arg }));
      }
      if (nextView === 'tutor') {
        setUi({ studio: { open: true } });
        return;
      }
      const targetPath = VIEW_TO_PATH[nextView] || '/';
      navigate({ to: targetPath });
    },
    [navigate, setUi],
  );

  const mapProps = React.useMemo(
    () => ({
      selected: mapSel,
      setSelected: setMapSel,
      returnTo,
      onReturn: () => {
        const r = returnTo;
        setReturnTo(null);
        if (r && r.view) go(r.view);
      },
    }),
    [mapSel, returnTo, go],
  );

  const q = QB_DATA.questions[Math.min(session.idx, 4)];
  const layerUi =
    activeView === 'questions' && !ui.ctx
      ? { ...ui, ctx: { subjectId: 'dc', topicId: 'dc-2a', origin: 'questão ' + q.code } }
      : ui;

  const value = React.useMemo(
    () => ({
      activeView,
      subs,
      setSub,
      ui,
      setUi,
      toast,
      openArchitect,
      session,
      setSession,
      cards,
      setCards,
      mapSel,
      setMapSel,
      returnTo,
      setReturnTo,
      mapProps,
      elapsed,
      paused,
      onTogglePause: () => setPaused(p => !p),
      go,
    }),
    [
      activeView,
      subs,
      setSub,
      ui,
      setUi,
      toast,
      openArchitect,
      session,
      cards,
      mapSel,
      returnTo,
      mapProps,
      elapsed,
      paused,
      go,
    ],
  );

  return (
    <QBStudyContext.Provider value={value}>
      {children}
      {activeView !== 'welcome' && <ArchitectLayer ui={layerUi} setUi={setUi} />}
    </QBStudyContext.Provider>
  );
}

export function useQBStudy() {
  const ctx = React.useContext(QBStudyContext);
  if (!ctx) throw new Error('useQBStudy must be used within QBStudyProvider');
  return ctx;
}