import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { DashboardView } from '@/components/qb/screens/DashboardView';
import { MindMapView } from '@/components/qb/screens/MindMapView';
import { useQBStudy } from '@/lib/QBStudyContext';

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
  component: HomeRoute,
});

function HomeRoute() {
  const { go, progress, mapSel, setMapSel, returnTo, setReturnTo } = useQBStudy();

  React.useEffect(() => {
    const urlView = new URLSearchParams(window.location.search).get('view');
    if (urlView && urlView !== 'dashboard') {
      go(urlView);
    }
  }, [go]);

  return (
    <AppShell active="dashboard" onNavigate={go} onProfile={() => go('welcome')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        <DashboardView go={go} progress={progress} />
        <section id="mapa-mental-home" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
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
        </section>
      </div>
    </AppShell>
  );
}