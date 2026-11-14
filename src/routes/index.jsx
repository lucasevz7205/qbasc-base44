import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { WelcomeView } from '@/components/qb/screens/WelcomeView';
import { DashboardView } from '@/components/qb/screens/DashboardView';
import { QuestionSessionView } from '@/components/qb/screens/QuestionSessionView';
import { MindMapView } from '@/components/qb/screens/MindMapView';
import { FlashcardSessionView } from '@/components/qb/screens/FlashcardSessionView';
import { TutorView } from '@/components/qb/screens/TutorView';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Quebrando a Banca — A Ascensão' },
      {
        name: 'description',
        content: 'Plataforma estratégica de aprendizagem para concursos públicos · Câmara dos Deputados — Analista Legislativo.',
      },
    ],
  }),
  component: QuebrandoABancaApp,
});

function QuebrandoABancaApp() {
  const [view, setView] = React.useState('dashboard');
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

  React.useEffect(() => {
    const urlView = new URLSearchParams(window.location.search).get('view');
    if (urlView) setView(urlView);
  }, []);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  React.useEffect(() => {
    if (!['questions', 'flashcards'].includes(view) || paused) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [view, paused]);

  const go = (nextView, opts = {}) => {
    if (nextView === 'map') {
      if (opts.node) setMapSel(opts.node);
      setReturnTo(opts.returnTo || null);
    }
    setView(nextView);
  };

  const progress = {
    answered: Object.values(session.answers).filter((a) => a.revealed).length,
    cards: cards.ratings.length,
  };
  const timer = { elapsed, paused, onTogglePause: () => setPaused((p) => !p) };

  if (view === 'welcome') {
    return <WelcomeView onEnter={() => go('dashboard')} />;
  }
  if (view === 'questions') {
    return <QuestionSessionView session={session} setSession={setSession} go={go} {...timer} />;
  }
  if (view === 'flashcards') {
    return <FlashcardSessionView cards={cards} setCards={setCards} go={go} {...timer} />;
  }

  return (
    <AppShell active={view} onNavigate={go} onProfile={() => go('welcome')} wide={view === 'map'}>
      {view === 'dashboard' && <DashboardView go={go} progress={progress} />}
      {view === 'map' && (
        <MindMapView
          selected={mapSel}
          setSelected={setMapSel}
          returnTo={returnTo}
          onReturn={() => {
            const r = returnTo;
            setReturnTo(null);
            if (r?.view) go(r.view);
          }}
          go={go}
        />
      )}
      {view === 'tutor' && <TutorView session={session} go={go} />}
    </AppShell>
  );
}