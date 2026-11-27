import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { TutorView } from '@/components/qb/screens/TutorView';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/tutor')({
  head: () => ({
    meta: [
      { title: 'O Arquiteto · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Estúdio de aprendizagem ativa: Tutor Socrático, Feynman, Cornell e cronômetro de estudo.' },
    ],
  }),
  component: TutorRoute,
});

function TutorRoute() {
  const { ui, setUi, go } = useQBStudy();
  return (
    <main className="qb-studio-frame" data-qb-theme={ui.theme}>
      <TutorView
        onClose={() => go('dashboard')}
        context={ui.ctx}
        onContextChange={c => setUi({ ctx: c })}
        tool={ui.studio.tool}
        onToolChange={tl => setUi({ studio: { ...ui.studio, tool: tl } })}
      />
    </main>
  );
}