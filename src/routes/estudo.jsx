import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { StudyScreen } from '@/components/qb/screens/StudyScreen';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/estudo')({
  head: () => ({
    meta: [
      { title: 'Estudo · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Teoria, mapas mentais e revisão espaçada.' },
    ],
  }),
  component: EstudoRoute,
});

function EstudoRoute() {
  const { ui, setUi, subs, setSub, go, mapProps } = useQBStudy();
  return (
    <AppShell ui={ui} setUi={setUi} view="study" go={go} wide>
      <StudyScreen tab={subs.study} setTab={setSub('study')} go={go} mapProps={mapProps} />
    </AppShell>
  );
}