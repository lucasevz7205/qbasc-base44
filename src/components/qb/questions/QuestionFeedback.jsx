import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { Button } from '@/components/qb/core/Button';

function Section({ title, icon, children }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 12px/1.2 var(--font-body)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--qb-gold)' }}>
        <Icon name={icon} size={16} />
        {title}
      </h3>
      {children}
    </section>
  );
}

export function QuestionFeedback({ result, explanation, legalBasis, trap, onFlashcards }) {
  const [showTrap, setShowTrap] = React.useState(result === 'incorrect');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="Fundamento" icon="scale">
        {(explanation || !legalBasis) && <p style={{ margin: 0, font: '400 16px/1.65 var(--font-body)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {explanation || 'Fundamento indisponível para esta questão.'}
        </p>}
        {legalBasis && <span style={{ font: '500 13px/1.4 var(--font-mono)', color: 'var(--text-muted)' }}>{legalBasis}</span>}
      </Section>
      {trap && (
        <Section title="Mecanismo da pegadinha" icon="shield-alert">
          {showTrap ? (
            <div style={{ padding: 16, borderRadius: 12, background: 'var(--surface-sunken)', border: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ font: '600 15px/1.3 var(--font-body)', color: 'var(--text-primary)' }}>{trap.name}</span>
              <span style={{ font: '400 15px/1.6 var(--font-body)', color: 'var(--text-secondary)' }}>{trap.description}</span>
            </div>
          ) : (
            <button className="qb-linkbtn" onClick={() => setShowTrap(true)}>
              <Icon name="chevron-down" size={16} />
              Ver como o item tenta induzir ao erro
            </button>
          )}
        </Section>
      )}
      {onFlashcards && <Button variant="ghost" size="sm" icon="layers" onClick={onFlashcards} style={{ alignSelf: 'flex-start' }}>Revisar flashcards do assunto</Button>}
    </div>
  );
}
