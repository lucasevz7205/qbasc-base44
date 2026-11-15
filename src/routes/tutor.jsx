import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { TutorView } from '@/components/qb/screens/TutorView';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/tutor')({
  head: () => ({
    meta: [
      { title: 'O Arquiteto · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Estúdio de aprendizagem ativa: Tutor Socrático, Feynman, Cornell, Scanner e cronômetro de estudo.' },
    ],
  }),
  component: TutorRoute,
});

function TutorRoute() {
  const { ui, setUi, go } = useQBStudy();
  return (
    <AppShell ui={ui} setUi={setUi} view="dashboard" go={go} wide>
      <TutorView
        context={ui.ctx}
        onContextChange={c => setUi({ ctx: c })}
        tool={ui.studio.tool}
        onToolChange={tl => setUi({ studio: { ...ui.studio, tool: tl } })}
      />
    </AppShell>
  );
}