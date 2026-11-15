import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Icon } from '@/components/qb/core/Icon';
import { Button } from '@/components/qb/core/Button';
import { ERROR_ORIGINS } from '@/lib/question-feedback';
import { Badge } from '@/components/qb/core/Badge';
import { assessQuestionMechanism } from '@/lib/architect-mechanism';
import { recordedMechanism } from '@/lib/mechanism-comparison';
import { mechanismDetail } from '@/lib/cebraspe-v1-taxonomy';

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

export function QuestionFeedback({ statement, answerKey, generatorName, generatorReference, explanation, legalBasis, trap, identifiedMechanism, identifiedClue, reflection, onFlashcards }) {
  const noteId = React.useId();
  const assess = useServerFn(assessQuestionMechanism);
  const [assessment, setAssessment] = React.useState(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const requestLock = React.useRef(false);
  const reference = recordedMechanism(trap, answerKey, generatorName);
  const comparison = reference || assessment;
  const aligned = comparison?.code && identifiedMechanism && comparison.code === identifiedMechanism.value;

  const evaluate = async () => {
    if (requestLock.current) return;
    requestLock.current = true;
    setPending(true);
    setError('');
    try {
      setAssessment(await assess({ data: {
        statement: statement.slice(0, 8000),
        key: answerKey,
        explanation: (explanation || '').slice(0, 6500),
        basis: (legalBasis || '').slice(0, 2000),
      } }));
    } catch (err) {
      setError(err?.message || 'O Arquiteto não conseguiu avaliar a questão. Tente novamente.');
    } finally {
      requestLock.current = false;
      setPending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="Fundamento" icon="scale">
        {(explanation || !legalBasis) && <p style={{ margin: 0, font: '400 16px/1.65 var(--font-body)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {explanation || 'Fundamento indisponível para esta questão.'}
        </p>}
        {legalBasis && <span style={{ font: '500 13px/1.4 var(--font-mono)', color: 'var(--text-muted)' }}>{legalBasis}</span>}
      </Section>
      <Section title="Mecanismo de pegadinha da banca" icon="shield-alert">
          {trap ? (
            <div style={{ display: 'grid', gap: 6, overflowWrap: 'anywhere' }}>
              <strong>{generatorReference ? 'Registro do gerador' : 'Classificação registrada'} · {trap.name}</strong>
              {trap.description && <span>{trap.description}</span>}
              {trap.evidence && trap.evidence !== trap.description && <span><strong>Trecho decisivo</strong> · {trap.evidence}</span>}
              {trap.vaccine && trap.vaccine !== trap.description && !explanation?.includes(trap.vaccine) && <span><strong>Como evitar</strong> · {trap.vaccine}</span>}
              {trap.keyQuestion && <span><strong>Pergunta preventiva</strong> · {trap.keyQuestion}</span>}
              {trap.practicalAction && <span><strong>Ação na prova</strong> · {trap.practicalAction}</span>}
              {trap.strategy?.maxima && <span style={{ color: 'var(--qb-gold)', font: 'italic 400 14px/1.6 var(--font-heading)' }}>
                “{trap.strategy.maxima}”
                <small style={{ display: 'block', color: 'var(--text-muted)', font: '400 12px/1.45 var(--font-body)' }}>
                  Adaptação pedagógica inspirada em {trap.strategy.autor}; não é citação literal.
                </small>
              </span>}
              {trap.legacyConflict && <span role="note" style={{ color: 'var(--state-incorrect)' }}>
                Código classificado segundo nomenclatura anterior à V1. Confira a fonte: a classificação não foi alterada automaticamente.
              </span>}
            </div>
          ) : <span style={{ color: 'var(--text-muted)' }}>Esta questão ainda não tem um mecanismo registrado.</span>}
          {identifiedMechanism && <span><strong>Você identificou</strong> · {identifiedMechanism.label}</span>}
          {identifiedMechanism && (() => {
            const choice = mechanismDetail(identifiedMechanism.value);
            return choice ? <span style={{ display: 'grid', gap: 4, padding: 12,
              border: '1px solid rgba(208,179,134,.28)', borderRadius: 10, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--qb-ivory)' }}>{choice.lema}</strong>
              <span>{choice.pergunta}</span>
              <small>Vacina: {choice.acao}</small>
            </span> : null;
          })()}
          {identifiedClue && <span style={{ overflowWrap: 'anywhere' }}><strong>Trecho que você destacou</strong> · {identifiedClue}</span>}
          {assessment && <div role="status" style={{ display: 'grid', gap: 4 }}>
            <strong>O Arquiteto · {assessment.code ? assessment.code + ' · ' + assessment.label : 'Avaliação inconclusiva'}</strong>
            <span style={{ overflowWrap: 'anywhere' }}>{assessment.reason}</span>
          </div>}
          {comparison?.code && identifiedMechanism && <div><Badge tone={aligned ? 'correct' : 'attention'}>{aligned ? 'Alinhado' : 'Divergente'} {reference ? (generatorReference ? 'com o gerador' : 'com o registro') : 'com O Arquiteto'}</Badge></div>}
          {!reference && trap && <small style={{ color: 'var(--text-muted)' }}>O registro antigo precisa de uma avaliação na taxonomia atual para permitir comparação.</small>}
          {!reference && !assessment && statement && <div>
            <Button size="sm" variant="secondary" icon="sparkles" onClick={evaluate} loading={pending} disabled={pending}>Comparar com O Arquiteto</Button>
          </div>}
          {error && <span role="alert">{error}</span>}
        </Section>
      {reflection && (
        <Section title="Justificativa do erro" icon="notebook-pen">
          <fieldset disabled={reflection.disabled} style={{ display: 'grid', gap: 10, margin: 0, padding: 0, border: 0, minWidth: 0 }}>
            <legend style={{ marginBottom: 8 }}>De onde veio o erro?</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(ERROR_ORIGINS).map(([id, label], index) => (
                <label key={id} className="qb-btn qb-btn--secondary qb-btn--sm"
                  style={{ gap: 8, minHeight: 42, whiteSpace: 'normal', cursor: 'pointer',
                    borderColor: reflection.origin === id ? 'var(--qb-gold)' : undefined,
                    background: reflection.origin === id ? 'var(--surface-hover)' : undefined }}>
                  <input type="radio" name={noteId + '-origin'} value={id} checked={reflection.origin === id}
                    ref={index === 0 ? reflection.originRef : undefined}
                    onChange={() => reflection.onChange({ errorOrigin: id })}
                    style={{ accentColor: 'var(--qb-gold)', scrollMarginBlock: '12px 116px' }} />
                  {label}
                </label>
              ))
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