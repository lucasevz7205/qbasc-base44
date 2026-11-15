import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { SimuladoScreen } from '@/components/qb/screens/SimuladoScreen';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/simulado')({
  head: () => ({
    meta: [
      { title: 'Simulado · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Simulados objetivos e discursivos com composição por bloco e histórico.' },
    ],
  }),
  component: SimuladoRoute,
});

function SimuladoRoute() {
  const { ui, setUi, go, toast } = useQBStudy();
  return (
    <AppShell ui={ui} setUi={setUi} view="simulado" go={go}>
      <SimuladoScreen toast={toast} />
    </AppShell>
  );
}