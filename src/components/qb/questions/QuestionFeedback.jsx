import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { Button } from '@/components/qb/core/Button';
import { ERROR_ORIGINS } from '@/lib/question-feedback';

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

export function QuestionFeedback({ explanation, legalBasis, trap, reflection, onFlashcards }) {
  const noteId = React.useId();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="Fundamento" icon="scale">
        {(explanation || !legalBasis) && <p style={{ margin: 0, font: '400 16px/1.65 var(--font-body)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {explanation || 'Fundamento indisponível para esta questão.'}
        </p>}
        {legalBasis && <span style={{ font: '500 13px/1.4 var(--font-mono)', color: 'var(--text-muted)' }}>{legalBasis}</span>}
      </Section>
      {(trap || reflection) && (
        <Section title="Mecanismo de pegadinha da banca" icon="shield-alert">
          {trap ? (
            <div style={{ display: 'grid', gap: 6, overflowWrap: 'anywhere' }}>
              <strong>{trap.name}</strong>
              {trap.description && <span>{trap.description}</span>}
              {trap.evidence && trap.evidence !== trap.description && <span><strong>Trecho decisivo</strong> · {trap.evidence}</span>}
              {trap.vaccine && trap.vaccine !== trap.description && !explanation?.includes(trap.vaccine) && <span><strong>Como evitar</strong> · {trap.vaccine}</span>}
            </div>
          ) : <span style={{ color: 'var(--text-muted)' }}>Esta questão ainda não tem um mecanismo registrado.</span>}
        </Section>
      )}
      {reflection && (
        <Section title="Justificativa do erro" icon="notebook-pen">
          <fieldset disabled={reflection.disabled} style={{ display: 'grid', gap: 10, margin: 0, padding: 0, border: 0, minWidth: 0 }}>
            <legend style={{ marginBottom: 8 }}>De onde veio o erro?</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(ERROR_ORIGINS).map(([id, label]) => (
                <button key={id} type="button" className="qb-seg__opt" aria-pressed={reflection.origin === id} onClick={() => reflection.onChange({ errorOrigin: id })}>{label}</button>
              ))}
            </div>
            <label htmlFor={noteId}>Por que você errou e qual é a regra correta?</label>
            <textarea id={noteId} ref={reflection.inputRef} className="qb-input" rows={3} value={reflection.text} onChange={event => reflection.onChange({ errorJustification: event.target.value })}
              style={{ minHeight: 84, resize: 'vertical', scrollMarginBlock: '12px 116px' }} />
            <small style={{ color: 'var(--text-muted)' }}>Marque a origem e escreva a justificativa para avançar.</small>
          </fieldset>
        </Section>
      )}
      {onFlashcards && <Button variant="ghost" size="sm" icon="layers" onClick={onFlashcards} style={{ alignSelf: 'flex-start' }}>Revisar flashcards do assunto</Button>}
    </div>
  );
}
