import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { WelcomeView } from '@/components/qb/screens/WelcomeView';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/boas-vindas')({
  head: () => ({
    meta: [
      { title: 'Boas-vindas · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Conhecimento · Estratégia · Disciplina · Conquista.' },
    ],
  }),
  component: BoasVindasRoute,
});

function BoasVindasRoute() {
  const { go } = useQBStudy();
  return <WelcomeView onEnter={() => go('dashboard')} />;
}