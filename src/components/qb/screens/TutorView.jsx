import React from 'react';
import { ArchitectStudio } from '@/components/qb/architect/ArchitectStudio';
import { QB_DATA, QB_EDITAL } from '@/lib/qb-data';

export default function TutorView({ context, onContextChange, tool, onToolChange }) {
  const ctx = context || { subjectId: 'da', topicId: 'da-10.6' };
  const deck = QB_DATA.flashcards.map(f => ({ front: f.front, back: f.back }));
  return (
    <ArchitectStudio
      open
      mode="inline"
      subjects={QB_EDITAL.subjects}
      context={{ subjectId: ctx.subjectId || 'da', topicId: ctx.topicId || 'da-10.6', origin: ctx.origin }}
      onContextChange={onContextChange}
      tool={tool}
      onToolChange={onToolChange}
      deck={deck}
    />
  );
}
export { TutorView };