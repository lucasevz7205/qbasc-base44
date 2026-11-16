import React from 'react';
import { ArchitectStudio } from '@/components/qb/architect/ArchitectStudio';
import { useRealStudy } from '@/lib/qb-real-data';

export default function TutorView({ context, onContextChange, tool, onToolChange }) {
  const { QB_DATA, QB_EDITAL, isAdmin, architectAccess } = useRealStudy();
  const deck = QB_DATA.flashcards.filter(f=>!context?.topicId||f.topicId===context.topicId).slice(0,30).map(f => ({ front: f.front, back: f.back }));
  if (!architectAccess) return <p>O Arquiteto ainda não está liberado para esta conta.</p>;
  return (
    <ArchitectStudio
      open
      mode="inline"
      personal={!isAdmin}
      subjects={QB_EDITAL.subjects}
      context={context || undefined}
      onContextChange={onContextChange}
      tool={tool}
      onToolChange={onToolChange}
      deck={deck}
    />
  );
}
export { TutorView };
