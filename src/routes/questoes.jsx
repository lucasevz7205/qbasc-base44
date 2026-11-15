import React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
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
  const { session, setSession, go, backTo } = useQBStudy();
  const navigate = useNavigate();
  const hasRound = Array.isArray(session.questionIds);
  React.useEffect(() => {
    if (!hasRound) void navigate({ to: '/', replace: true });
  }, [hasRound, navigate]);
  if (!hasRound) return null;
  return <QuestionSessionView session={session} setSession={setSession} go={go} backTo={backTo} />;
}