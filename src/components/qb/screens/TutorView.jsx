import React from 'react';
import { ArchitectStudio } from '@/components/qb/architect/ArchitectStudio';
import { useRealStudy } from '@/lib/qb-real-data';

export default function TutorView({ context, onContextChange, tool, onToolChange, onClose }) {
  const { QB_EDITAL, isAdmin, architectAccess } = useRealStudy();
  if (!architectAccess) return (
    <>
      <p>O Arquiteto ainda não está liberado para esta conta.</p>
      <button type="button" className="qb-btn qb-btn--secondary" onClick={onClose}>Voltar ao menu principal</button>
    </>
  );
  return (
    <ArchitectStudio
      open
      mode="inline"
      onClose={onClose}
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
