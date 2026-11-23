import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Badge } from '@/components/qb/core/Badge';
import { Button } from '@/components/qb/core/Button';
import { validateFlashcard } from '@/lib/flashcard-quality';

const STATUS_BADGE = {
  approved: { tone: 'correct', label: 'Aprovado na triagem' },
  needs_review: { tone: 'attention', label: 'Requer revisão' },
  rejected: { tone: 'incorrect', label: 'Bloqueado na validação' },
};

export function NodeFlashcardReviewDialog({
  cards,
  nodeLabel,
  topicId = '',
  subjectName = '',
  topicTitle = '',
  targetNodeId = '',
  open,
  onOpenChange,
  returnFocus,
  onApprove,
  onDiscard,
  onStudy,
}) {
  const [drafts, setDrafts] = React.useState({});
  const [saving, setSaving] = React.useState(null);
  const [error, setError] = React.useState(null);
  const lock = React.useRef(false);
  const title = React.useRef(null);
  const saved = cards.filter(card => card.status === 'saved').map(card => card.id);

  const change = (card, field, value) => {
    setDrafts(current => ({ ...current, [card.id]: { ...(current[card.id] || card), [field]: value } }));
  };

  const approve = async (card, draft) => {
    if (lock.current) return;
    lock.current = true;
    setSaving(card.id);
    setError(null);
    try {
      await onApprove(card.id, draft.front.trim(), draft.back.trim(), {
        ...card,
        front: draft.front.trim(),
        back: draft.back.trim(),
        basis: (draft.basis ?? card.basis ?? '').trim(),
        approvedByUser: true,
      });
    } catch (err) {
      setError({ id: card.id, message: err?.message || 'Não foi possível salvar o flashcard.' });
    } finally {
      lock.current = false;
      setSaving(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="qb-gan-review__overlay" />
        <Dialog.Content
          className="qb-panel qb-panel--ornate qb-gan-review"
          onOpenAutoFocus={event => { event.preventDefault(); title.current?.focus(); }}
          onCloseAutoFocus={event => {
            event.preventDefault();
            if (returnFocus?.current?.isConnected) returnFocus.current.focus();
          }}
          onEscapeKeyDown={event => event.stopPropagation()}
          onPointerDownOutside={event => event.preventDefault()}
        >
          <header className="qb-gan-review__header">
            <div>
              <Dialog.Title ref={title} tabIndex={-1}>Revisão dos flashcards gerados</Dialog.Title>
              <Dialog.Description>
                {nodeLabel} · {cards.length} {cards.length === 1 ? 'candidato' : 'candidatos'} · Nenhum cartão é gravado sem sua aprovação.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="secondary" icon="x">Fechar</Button></Dialog.Close>
          </header>

          <div className="qb-gan-review__list">
            {cards.map(card => {
              const draft = drafts[card.id] || card;
              const isEdited = Boolean(drafts[card.id]);
              const liveValidation = validateFlashcard(
                { ...card, front: draft.front, back: draft.back, basis: draft.basis ?? card.basis },
                { topicId, subjectName, topicTitle, targetNodeId, requireNodeLink: Boolean(targetNodeId) },
              );
              const initialValidation = card.validation || liveValidation;
              const blockingErrors = liveValidation.reasons.filter(r => r.severity === 'error');
              const effectiveStatus = isEdited ? liveValidation.status : initialValidation.status;
              const badgeMeta = STATUS_BADGE[effectiveStatus] || STATUS_BADGE.needs_review;
              const blind = card.validation?.blindReview;
              const evidence = card.validation?.evidence;
              const locked = Boolean(card.status === 'saved' || card.status === 'discarded' || saving);

              return (
                <article className="qb-gan-review__item" key={card.id}>
                  <div className="qb-gan-review__badges">
                    {card.status === 'saved' || card.status === 'discarded' ? (
                      <Badge tone={card.status === 'saved' ? 'correct' : 'neutral'}>
                        {card.status === 'saved' ? 'Gravado' : 'Descartado'}
                      </Badge>
                    ) : (
                      <Badge tone={badgeMeta.tone}>{badgeMeta.label}</Badge>
                    )}
                    <Badge tone="neutral">{liveValidation.cardType}</Badge>
                    {card.canSplit && <Badge tone="attention">Sugerido dividir</Badge>}
                    {card.generatorProvider && <Badge tone="neutral">Provedor: {card.generatorProvider}</Badge>}
                  </div>

                  {!!(isEdited ? liveValidation.reasons : initialValidation.reasons)?.length && (
                    <ul style={{ margin: '6px 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)' }}>
                      {(isEdited ? liveValidation.reasons : initialValidation.reasons).map((reason, idx) => (
                        <li key={`${reason.code}-${idx}`}>
                          <strong>[{reason.rule}]</strong> {reason.message}
                        </li>
                      ))}
                    </ul>
                  )}

                  {blind?.executed && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 8px', borderRadius: 6, background: 'var(--surface-sunken)' }}>
                      <div>
                        <strong>Revisão independente cega:</strong>{' '}
                        {blind.agreed ? 'resposta recuperada compatível (triagem; requer aprovação humana)' : 'divergência ou pendência detectada'}
                      </div>
                      {blind.recoveredAnswer && (
                        <div><strong>Resposta recuperada:</strong> {blind.recoveredAnswer}</div>
                      )}
                      {evidence?.reviewerExcerpt && (
                        <div><strong>Evidência na fonte:</strong> “{evidence.reviewerExcerpt}”</div>
                      )}
                      {blind.limitation && (
                        <div><strong>Limitação:</strong> {blind.limitation}</div>
                      )}
                    </div>
                  )}

                  <fieldset className="qb-gan-review__fields" disabled={locked}>
                    <legend>Flashcard</legend>
                    <label>
                      Frente
                      <textarea rows={2} maxLength={600} value={draft.front} onChange={event => change(card, 'front', event.target.value)} />
                    </label>
                    <label>
                      Verso
                      <textarea rows={3} maxLength={1200} value={draft.back} onChange={event => change(card, 'back', event.target.value)} />
                    </label>
                  </fieldset>

                  {!locked && (error?.id === card.id || card.saveError || card.blockedReason) && (
                    <p role="alert">{error?.id === card.id ? error.message : (card.saveError || card.blockedReason)}</p>
                  )}

                  {!(card.status === 'saved' || card.status === 'discarded') && (
                    <div className="qb-gan-review__badges">
                      <Button
                        size="sm"
                        icon="check"
                        loading={saving === card.id}
                        disabled={locked || blockingErrors.length > 0 || draft.front.trim().length < 12 || !draft.back.trim()}
                        onClick={() => approve(card, draft)}
                      >
                        Aprovar e gravar
                      </Button>
                      <Button size="sm" variant="secondary" icon="x" disabled={locked} onClick={() => onDiscard(card.id)}>
                        Descartar
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="qb-gan-review__header">
            <span>{saved.length} {saved.length === 1 ? 'flashcard gravado' : 'flashcards gravados'}</span>
            <Button variant="secondary" icon="layers" disabled={!saved.length || Boolean(saving)} onClick={() => onStudy(saved)}>
              Revisar gravados
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
