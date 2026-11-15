import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { DashboardView } from '@/components/qb/screens/DashboardView';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Conhecimento · Estratégia · Disciplina · Conquista' },
    ],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  const { ui, setUi, go, openArchitect } = useQBStudy();

  React.useEffect(() => {
    const urlView = new URLSearchParams(window.location.search).get('view');
    if (urlView && urlView !== 'dashboard') {
      go(urlView);
    }
  }, [go]);

  return (
    <AppShell ui={ui} setUi={setUi} view="dashboard" go={go}>
      <DashboardView go={go} openArchitect={() => openArchitect()} />
    </AppShell>
  );
}