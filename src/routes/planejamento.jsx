import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { PlanScreen } from '@/components/qb/screens/PlanScreen';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/planejamento')({
  head: () => ({
    meta: [
      { title: 'Planejamento · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Tarefas do dia, calendário da semana e sequência do ciclo de matérias.' },
    ],
  }),
  component: PlanejamentoRoute,
});

function PlanejamentoRoute() {
  const { ui, setUi, subs, setSub, go, openArchitect, toast } = useQBStudy();
  return (
    <AppShell ui={ui} setUi={setUi} view="plan" quick={subs.plan} go={go} wide>
      <PlanScreen tab={subs.plan} setTab={setSub('plan')} go={go} openArchitect={openArchitect} toast={toast} />
    </AppShell>
  );
}