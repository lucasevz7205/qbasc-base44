import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { QuestionSessionView } from '@/components/qb/screens/QuestionSessionView';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/questoes')({
  head: () => ({
    meta: [
      { title: 'Sessão de Questões · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Sessão de questões CEBRASPE Certo/Errado sobre Processo Legislativo.' },
    ],
  }),
  component: QuestoesRoute,
});

function QuestoesRoute() {
  const { session, setSession, elapsed, paused, onTogglePause, go } = useQBStudy();
  return <QuestionSessionView session={session} setSession={setSession} elapsed={elapsed} paused={paused} onTogglePause={onTogglePause} go={go} />;
}