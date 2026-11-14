import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { TutorView } from '@/components/qb/screens/TutorView';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/tutor')({
  head: () => ({
    meta: [
      { title: 'Tutor Contextual · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Tutor contextual para dúvidas sobre questões e conceitos do edital.' },
    ],
  }),
  component: TutorRoute,
});

function TutorRoute() {
  const { session, go } = useQBStudy();
  return (
    <AppShell active="tutor" onNavigate={go} onProfile={() => go('welcome')}>
      <TutorView session={session} go={go} />
    </AppShell>
  );
}