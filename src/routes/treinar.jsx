import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { TrainScreen } from '@/components/qb/screens/TrainScreen';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/treinar')({
  head: () => ({
    meta: [
      { title: 'Treinar · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Rodadas de questões CEBRASPE Certo/Errado, revisões e armadilhas da banca.' },
    ],
  }),
  component: TreinarRoute,
});

function TreinarRoute() {
  const { ui, setUi, go, openArchitect } = useQBStudy();
  return (
    <AppShell ui={ui} setUi={setUi} view="train" go={go}>
      <TrainScreen go={go} openArchitect={openArchitect} />
    </AppShell>
  );
}