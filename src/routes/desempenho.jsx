import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { PerformanceScreen } from '@/components/qb/screens/PerformanceScreen';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/desempenho')({
  head: () => ({
    meta: [
      { title: 'Desempenho · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Análise diária, histórica e metodologia de métricas do estudo.' },
    ],
  }),
  component: DesempenhoRoute,
});

function DesempenhoRoute() {
  const { ui, setUi, subs, setSub, go } = useQBStudy();
  return (
    <AppShell ui={ui} setUi={setUi} view="performance" go={go}>
      <PerformanceScreen tab={subs.performance} setTab={setSub('performance')} go={go} />
    </AppShell>
  );
}