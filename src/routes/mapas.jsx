import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { StudyScreen } from '@/components/qb/screens/StudyScreen';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/mapas')({
  head: () => ({
    meta: [
      { title: 'Mapas Mentais · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Mapa mental espacial e painel de conceitos de Processo Legislativo (CF/88).' },
    ],
  }),
  component: MapasRoute,
});

function MapasRoute() {
  const { ui, setUi, setSub, go, mapProps } = useQBStudy();
  return (
    <AppShell ui={ui} setUi={setUi} view="study" go={go} mapReturn={mapProps.sessionReturn} wide>
      <StudyScreen tab="mapa" setTab={setSub('study')} go={go} mapProps={mapProps} />
    </AppShell>
  );
}