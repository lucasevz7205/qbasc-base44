import React from 'react';
import { ArchitectStudio } from '@/components/qb/architect/ArchitectStudio';
import { useRealStudy } from '@/lib/qb-real-data';

export default function TutorView({ context, onContextChange, tool, onToolChange }) {
  const { QB_EDITAL, isAdmin, architectAccess } = useRealStudy();
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
    />
  );
}
export { TutorView };
