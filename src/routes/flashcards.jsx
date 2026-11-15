import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { FlashcardSessionView } from '@/components/qb/screens/FlashcardSessionView';
import { useQBStudy } from '@/lib/QBStudyContext';

export const Route = createFileRoute('/flashcards')({
  head: () => ({
    meta: [
      { title: 'Revisão de Flashcards · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Revisão ativa espaçada de flashcards de Direito Constitucional.' },
    ],
  }),
  component: FlashcardsRoute,
});

function FlashcardsRoute() {
  const { cards, setCards, elapsed, paused, onTogglePause, go, backTo } = useQBStudy();
  return <FlashcardSessionView cards={cards} setCards={setCards} elapsed={elapsed} paused={paused} onTogglePause={onTogglePause} go={go} backTo={backTo} />;
}