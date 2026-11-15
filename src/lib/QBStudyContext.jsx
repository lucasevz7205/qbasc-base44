import React from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { ArchitectLayer } from '@/components/qb/AppShell';
import { useRealStudy } from '@/lib/qb-real-data';
import { distinctRoundQuestions, pickQuestionRound } from '@/lib/study-session-rules';
import { StudyClockProvider } from '@/lib/StudyClockContext';

const KEY = 'qb-uikit-v2';
const SUBS = { plan: 'hoje', edital: 'lista', study: 'mapa', performance: 'diaria' };

export const QB_VIEW_LABEL = {
  train: 'Treinar',
  study: 'Estudo',
  dashboard: 'Menu principal',
  edital: 'Edital',
  plan: 'Planejamento',
  performance: 'Desempenho',
  questions: 'sessão de questões',
  flashcards: 'revisão de flashcards',
};

export const QB_NAV_REASONS = {
  'topic-not-found': 'O identificador de matéria ou assunto não existe no edital carregado.',
  'no-questions': 'Não há questões vinculadas a este assunto na base atual.',
  'no-map': 'Não há mapa mental vinculado a este assunto na base atual.',
  'node-not-found': 'O nó solicitado não existe no mapa deste assunto.',
  'no-deck': 'Não há revisão ativa (flashcards) vinculada a este assunto na base atual.',
  'no-node-questions': 'Nenhuma questão está vinculada a este nó.',
  'unknown-action': 'Ação sem destino definido.',
};

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

function startQuestionRound(bank, selection = {}) {
  const picked = pickQuestionRound(bank, selection);
  const byId = selection.scheduledReview ? new Map(picked.map(q => [q.id, q])) : null;
  const ordered = byId ? (selection.questionIds || []).map(id => byId.get(id)).filter(Boolean) : picked;
  return {
    idx: 0,
    answers: {},
    focus: false,
    selection,
    questionIds: distinctRoundQuestions(ordered).map(q => q.id),
    customQuestions: null,
    ganBatch: null,
    startedAt: new Date().toISOString(),
    sessionId: crypto.randomUUID(),
  };
}

export function QBStudyProvider({ children }) {
  const { QB_DATA, QB_EDITAL, QB_PLAN } = useRealStudy();
  const navigate = useNavigate();
  const location = useLocation();

  const [subs, setSubs] = React.useState(SUBS);
  const [ui, setUiState] = React.useState({
    bg: 'dynamic',
    theme: 'dark',
    focus: false,
    collapsed: false,
    sync: 'ok',
    studio: { open: false },
    ctx: null,
    toasts: [],
  });

  const [session, setSession] = React.useState({
    idx: 0,
    answers: {},
    focus: false,
  });
  const [cards, setCards] = React.useState({
    idx: 0,
    flipped: false,
    ratings: [],
  });
  const [studyTopicId, setStudyTopicId] = React.useState(null);
  const [studyRadialOpen, setStudyRadialOpen] = React.useState(true);
  const [mapSel, setMapSel] = React.useState(null);
  const [recentTopics, setRecentTopics] = React.useState([]);
  const [trainSel, setTrainSel] = React.useState({ subjectId: null, topicId: null });
  const [missing, setMissing] = React.useState(null);
  const [backTo, setBackTo] = React.useState('dashboard');
  const [returnTo, setReturnTo] = React.useState(null);

  const activeView = PATH_TO_VIEW[location.pathname] || 'dashboard';

  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY)) || {};
      if (saved.subs) setSubs(s => ({ ...s, ...saved.subs }));
      if (saved.prefs) setUiState(u => ({ ...u, ...saved.prefs }));
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          view: activeView,
          subs,
          prefs: { bg: ui.bg, theme: ui.theme, focus: ui.focus },
        }),
      );
    } catch {
      // ignore
    }
  }, [activeView, subs, ui.bg, ui.theme, ui.focus]);

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

  const openClock = React.useCallback(() => setUi({ studio: { open: true, tool: 'study-clock' } }), [setUi]);
  const toast = React.useCallback(t => setUi({ toast: t }), [setUi]);

  const resetStudyMapSelection = React.useCallback(() => {
    setStudyTopicId(null);
    setMapSel(null);
    setReturnTo(null);
    setStudyRadialOpen(true);
  }, []);

  const setSub = React.useCallback(
    v => t => {
      if (v === 'study' && t === 'mapa') resetStudyMapSelection();
      setSubs(s => ({ ...s, [v]: t }));
    },
    [resetStudyMapSelection],
  );

  const openArchitect = React.useCallback((ctx, tool) => {
    setUiState(u => ({
      ...u,
      ctx: ctx || u.ctx,
      studio: { open: true, tool },
    }));
  }, []);

  // Pedagogical lookup & resolution (v3 contract)
  const findTopic = React.useCallback(
    (subjectId, topicId) => {
      const allSubjects = QB_DATA.studySubjects?.length ? QB_DATA.studySubjects : QB_EDITAL.subjects;
      const s =
        (subjectId && allSubjects.find(x => x.id === subjectId)) ||
        allSubjects.find(x => x.topics.some(t => t.id === topicId));
      const t = s && s.topics.find(x => x.id === topicId);
      return { s, t };
    },
    [QB_DATA.studySubjects, QB_EDITAL.subjects],
  );

  const topicLabel = React.useCallback(
    (subjectId, topicId) => {
      const { s, t } = findTopic(subjectId, topicId);
      return s && t ? s.short + ' ' + t.num + (t.title ? ' — ' + t.title : '') : null;
    },
    [findTopic],
  );

  const pendingByTopic = React.useMemo(() => {
    const out = {};
    const allTopics = (QB_DATA.studySubjects || QB_EDITAL.subjects).flatMap(s => s.topics);
    for (const task of QB_PLAN.tasks || []) {
      if (task.status === 'done' || task.date > QB_PLAN.today) continue;
      const rawTopic = task.raw?.topico || task.raw?.topicId;
      if (rawTopic) {
        out[rawTopic] = (out[rawTopic] || 0) + 1;
        continue;
      }
      if (task.subjectId) {
        const m = String(task.title || '').match(/\b(\d+(?:\.\d+|[a-z])?)\b/i);
        if (m) {
          const hit = allTopics.find(t => t.subjectId === task.subjectId && t.num === m[1]);
          if (hit) out[hit.id] = (out[hit.id] || 0) + 1;
        }
      }
    }
    return out;
  }, [QB_DATA.studySubjects, QB_EDITAL.subjects, QB_PLAN.tasks, QB_PLAN.today]);

  const mapCounts = React.useMemo(() => {
    const out = {};
    for (const m of QB_DATA.mindMaps) {
      if (m.topicId) out[m.topicId] = (out[m.topicId] || 0) + 1;
    }
    return out;
  }, [QB_DATA.mindMaps]);

  const pendingReviewTopics = React.useMemo(() => {
    const s = new Set();
    for (const c of QB_DATA.flashcards) {
      if (!c.topicId) continue;
      const next = QB_DATA.reviews[c.id]?.prox;
      if (!next || next <= QB_PLAN.today) s.add(c.topicId);
    }
    return Array.from(s);
  }, [QB_DATA.flashcards, QB_DATA.reviews, QB_PLAN.today]);

  const resolveIntent = React.useCallback(
    i => {
      const { s, t } = findTopic(i.subjectId, i.topicId);
      if (!s || !t) return { ok: false, reason: 'topic-not-found' };
      if (i.action === 'architect') return { ok: true, view: 'architect', note: 'Tutor contextualizado' };
      if (i.action === 'train') {
        const n = QB_DATA.questionBank.filter(q => q.topicId === t.id).length;
        return n
          ? { ok: true, view: 'questions', note: n + (n === 1 ? ' questão' : ' questões') }
          : { ok: false, reason: 'no-questions' };
      }
      if (i.action === 'review') {
        const n = QB_DATA.flashcards.filter(f => f.topicId === t.id).length;
        return n
          ? { ok: true, view: 'flashcards', note: n + (n === 1 ? ' cartão' : ' cartões') }
          : { ok: false, reason: 'no-deck' };
      }
      if (i.action === 'mindmap') {
        const m = QB_DATA.mindMaps.find(x => x.topicId === t.id);
        if (!m) return { ok: false, reason: 'no-map' };
        if (i.nodeId && !m.nodes.some(n => n.id === i.nodeId)) {
          return { ok: false, reason: 'node-not-found' };
        }
        return {
          ok: true,
          view: 'map',
          mapId: m.id,
          nodeId: i.nodeId || m.id,
          note: (mapCounts[t.id] || 1) + (mapCounts[t.id] > 1 ? ' mapas' : ' mapa'),
        };
      }
      if (i.action === 'node-questions') {
        const qs = QB_DATA.questionBank.filter(q => q.node === i.nodeId);
        return qs.length
          ? { ok: true, view: 'questions', nodeId: i.nodeId, questionId: qs[0].id, note: qs.length + (qs.length === 1 ? ' questão' : ' questões') }
          : { ok: false, reason: 'no-node-questions' };
      }
      return { ok: false, reason: 'unknown-action' };
    },
    [findTopic, QB_DATA.questionBank, QB_DATA.flashcards, QB_DATA.mindMaps, mapCounts],
  );

  const pickMapTopic = React.useCallback(
    id => {
      setStudyTopicId(id);
      setStudyRadialOpen(false);
      const m = QB_DATA.mindMaps.find(x => x.topicId === id);
      setMapSel(m ? m.id : null);
      setRecentTopics(r => [id, ...r.filter(x => x !== id)].slice(0, 4));
    },
    [QB_DATA.mindMaps],
  );

  const go = React.useCallback(
    (nextView, arg) => {
      setMissing(null);
      if (nextView === 'study' && arg?.topicId) {
        setStudyTopicId(arg.topicId);
        setStudyRadialOpen(false);
        const m = QB_DATA.mindMaps.find(x => x.topicId === arg.topicId);
        setMapSel(m ? m.id : null);
        setRecentTopics(r => [arg.topicId, ...r.filter(x => x !== arg.topicId)].slice(0, 4));
        setSubs(s => ({ ...s, study: 'recursos' }));
        navigate({ to: '/estudo' });
        return;
      }
      if (nextView === 'map') {
        const o = arg || {};
        const foundByNode = o.node ? QB_DATA.mindMaps.find(m => m.id === o.node || m.nodes.some(n => n.id === o.node)) : null;
        const nextTopic = o.topicId || foundByNode?.topicId || null;
        setStudyTopicId(nextTopic);
        setStudyRadialOpen(!nextTopic);
        if (nextTopic) setRecentTopics(r => [nextTopic, ...r.filter(x => x !== nextTopic)].slice(0, 4));
        setMapSel(o.node || null);
        setReturnTo(o.returnTo || null);
        setSubs(s => ({ ...s, study: 'mapa' }));
        navigate({ to: '/estudo' });
        return;
      }
      if (['questions', 'flashcards'].includes(nextView) && !['questions', 'flashcards', 'study'].includes(activeView)) {
        setBackTo(activeView);
      }
      if (nextView === 'questions' && !arg?.resume) {
        if (arg?.ganBatch && Array.isArray(arg.ganBatch.questions)) {
          const approvedQuestions = distinctRoundQuestions(arg.ganBatch.questions.filter(q => q.statusConfronto !== 'divergencia_bloqueada' && !QB_DATA.excludedQuestionIds.has(q.id)));
          const customQuestions = Object.fromEntries(approvedQuestions.map(q => [q.id, q]));
          setSession({
            idx: 0,
            answers: {},
            focus: false,
            questionIds: approvedQuestions.map(q => q.id),
            customQuestions,
            ganBatch: arg.ganBatch,
            startedAt: new Date().toISOString(),
            sessionId: crypto.randomUUID(),
          });
        } else {
          const { subjectId, topicId, nodeId, filter, questionIds, scheduledReview } = arg || {};
          setSession(startQuestionRound(QB_DATA.questionBank, { subjectId, topicId, nodeId, filter, questionIds, scheduledReview }));
        }
      }
      if (nextView === 'flashcards' && !arg?.resume) {
        setCards({
          idx: 0, flipped: false, ratings: [], topicId: arg?.topicId, sessionId: crypto.randomUUID(),
          ...(arg?.scheduledReview ? { scheduledReview: true, queue: [...new Set(arg.cardIds || [])] } : {}),
        });
      }
      if (nextView === 'study' && (arg === 'mapa' || (!arg && !['questions', 'flashcards'].includes(activeView)))) {
        resetStudyMapSelection();
        setSubs(s => ({ ...s, study: 'mapa' }));
      }
      if (nextView === 'edital' && arg?.topicId) {
        setSubs(s => ({ ...s, edital: 'lista' }));
        navigate({ to: '/edital', hash: arg.topicId, hashScrollIntoView: false });
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
    [navigate, setUi, QB_DATA, activeView, resetStudyMapSelection],
  );

  const dispatch = React.useCallback(
    (intent, origin) => {
      const from = origin || activeView;
      const r = resolveIntent(intent);
      if (!r.ok) {
        setMissing({ intent, reason: r.reason, back: from });
        if (from !== activeView) {
          navigate({ to: VIEW_TO_PATH[from] || '/treinar' });
        }
        return;
      }
      setMissing(null);
      if (intent.action === 'architect') {
        openArchitect({ subjectId: intent.subjectId, topicId: intent.topicId, origin: QB_VIEW_LABEL[from] });
        return;
      }
      if (intent.action === 'mindmap') {
        go('map', {
          topicId: intent.topicId,
          node: r.nodeId,
          returnTo: { label: QB_VIEW_LABEL[from] || 'atividade anterior', view: from },
        });
        return;
      }
      setBackTo(from);
      if (intent.action === 'review') {
        go('flashcards', { topicId: intent.topicId });
        return;
      }
      if (intent.action === 'node-questions') {
        go('questions', { topicId: intent.topicId, subjectId: intent.subjectId, nodeId: intent.nodeId, filter: intent.filter });
        return;
      }
      go('questions', { topicId: intent.topicId, subjectId: intent.subjectId, filter: intent.filter });
    },
    [activeView, resolveIntent, openArchitect, go, navigate],
  );

  const handleSelectMapNode = React.useCallback(
    nextSel => {
      setMapSel(nextSel);
      if (nextSel) {
        const foundMap = QB_DATA.mindMaps.find(m => m.id === nextSel || m.nodes.some(n => n.id === nextSel));
        if (foundMap?.topicId) {
          setStudyTopicId(foundMap.topicId);
        }
      }
    },
    [QB_DATA.mindMaps],
  );

  const mapProps = React.useMemo(
    () => ({
      topicId: studyTopicId,
      studyTopicId: studyTopicId,
      onTopic: pickMapTopic,
      radialOpen: studyRadialOpen,
      setRadialOpen: setStudyRadialOpen,
      recents: recentTopics,
      mapCounts,
      pendingReviews: pendingReviewTopics,
      selected: mapSel,
      setSelected: handleSelectMapNode,
      dispatch,
      returnTo,
      onReturn: () => {
        const r = returnTo;
        setReturnTo(null);
        if (r && r.view) go(r.view, { resume: true });
      },
    }),
    [
      studyTopicId,
      pickMapTopic,
      studyRadialOpen,
      recentTopics,
      mapCounts,
      pendingReviewTopics,
      mapSel,
      handleSelectMapNode,
      dispatch,
      returnTo,
      go,
    ],
  );

  const currentQId = session.questionIds ? [...new Set(session.questionIds)][session.idx] : undefined;
  const q = (currentQId && session.customQuestions?.[currentQId]) || QB_DATA.questions.find(x => x.id === currentQId);
  const layerUi =
    activeView === 'questions' && q && !ui.ctx
      ? { ...ui, ctx: { subjectId: q.subjectId, topicId: q.topicId, origin: 'questão ' + q.code } }
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
      setMapSel: handleSelectMapNode,
      studyTopicId: studyTopicId,
      trainSel,
      setTrainSel,
      missing,
      clearMissing: () => setMissing(null),
      backTo,
      returnTo,
      setReturnTo,
      mapProps,
      pendingByTopic,
      resolveIntent,
      topicLabel,
      dispatch,
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
      handleSelectMapNode,
      studyTopicId,
      trainSel,
      missing,
      backTo,
      returnTo,
      mapProps,
      pendingByTopic,
      resolveIntent,
      topicLabel,
      dispatch,
      go,
    ],
  );

  return (
    <QBStudyContext.Provider value={value}>
      <StudyClockProvider onOpen={openClock}>
        {children}
        {activeView !== 'welcome' && <ArchitectLayer ui={layerUi} setUi={setUi} />}
      </StudyClockProvider>
    </QBStudyContext.Provider>
  );
}

export function useQBStudy() {
  const ctx = React.useContext(QBStudyContext);
  if (!ctx) throw new Error('useQBStudy must be used within QBStudyProvider');
  return ctx;
}