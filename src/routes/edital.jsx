import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { EditalScreen } from '@/components/qb/screens/EditalScreen';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/edital')({
  head: () => ({
    meta: [
      { title: 'Edital Verticalizado · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Bloco, matéria, assunto e tópico com status de estudo e mapa de calor de acertos.' },
    ],
  }),
  component: EditalRoute,
});

function EditalRoute() {
  const { ui, setUi, subs, setSub, go, openArchitect, toast } = useQBStudy();
  return (
    <AppShell ui={ui} setUi={setUi} view="edital" go={go}>
      <EditalScreen tab={subs.edital} setTab={setSub('edital')} go={go} openArchitect={openArchitect} toast={toast} />
    </AppShell>
  );
}