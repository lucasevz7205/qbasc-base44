import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { MindMapView } from '@/components/qb/screens/MindMapView';
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
  const { go, mapSel, setMapSel, returnTo, setReturnTo } = useQBStudy();

  return (
    <AppShell active="map" onNavigate={go} onProfile={() => go('welcome')} wide>
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
    </AppShell>
  );
}