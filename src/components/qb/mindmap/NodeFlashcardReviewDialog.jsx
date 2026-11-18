import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Badge } from '@/components/qb/core/Badge';
import { Button } from '@/components/qb/core/Button';

export function NodeFlashcardReviewDialog({ cards, nodeLabel, open, onOpenChange, returnFocus, onApprove, onDiscard, onStudy }) {
  const [drafts, setDrafts] = React.useState({});
  const [saving, setSaving] = React.useState(null);
  const [error, setError] = React.useState(null);
  const lock = React.useRef(false);
  const title = React.useRef(null);
  const saved = cards.filter(card => card.status === 'saved').map(card => card.id);

  const change = (card, field, value) => {
    setDrafts(current => ({ ...current, [card.id]: { ...(current[card.id] || card), [field]: value } }));
  };

  const approve = async (id, draft) => {
    if (lock.current) return;
    lock.current = true;
    setSaving(id);
    setError(null);
    try {
      await onApprove(id, draft.front.trim(), draft.back.trim());
    } catch (err) {
      setError({ id, message: err?.message || 'Não foi possível salvar o flashcard.' });
    } finally {
      lock.current = false;
      setSaving(null);
    }
  };

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="qb-gan-review__overlay" />
      <Dialog.Content className="qb-panel qb-panel--ornate qb-gan-review"
        onOpenAutoFocus={event => { event.preventDefault(); title.current?.focus(); }}
        onCloseAutoFocus={event => {
          event.preventDefault();
          if (returnFocus.current?.isConnected) returnFocus.current.focus();
        }}
        onEscapeKeyDown={event => event.stopPropagation()}
        onPointerDownOutside={event => event.preventDefault()}>
        <header className="qb-gan-review__header">
          <div>
            <Dialog.Title ref={title} tabIndex={-1}>Revisão dos flashcards gerados</Dialog.Title>
            <Dialog.Description>{nodeLabel} · {cards.length} {cards.length === 1 ? 'flashcard' : 'flashcards'}</Dialog.Description>
          </div>
          <Dialog.Close asChild><Button variant="secondary" icon="x">Fechar</Button></Dialog.Close>
        </header>
        <div className="qb-gan-review__list">
          {cards.map(card => {
            const draft = drafts[card.id] || card;
            const locked = Boolean(card.status || saving);
            return <article className="qb-gan-review__item" key={card.id}>
              {card.status && <div className="qb-gan-review__badges">
                <Badge tone={card.status === 'saved' ? 'correct' : 'neutral'}>{card.status === 'saved' ? 'Gravado' : 'Descartado'}</Badge>
              </div>}
              <fieldset className="qb-gan-review__fields" disabled={locked}>
                <legend>Flashcard</legend>
                <label>Frente
                  <textarea rows={2} maxLength={600} value={draft.front} onChange={event => change(card, 'front', event.target.value)} />
                </label>
                <label>Verso
                  <textarea rows={3} maxLength={1200} value={draft.back} onChange={event => change(card, 'back', event.target.value)} />
                </label>
              </fieldset>
              {error?.id === card.id && <p role="alert">{error.message}</p>}
              {!card.status && <div className="qb-gan-review__badges">
                <Button size="sm" icon="check" loading={saving === card.id}
                  disabled={locked || draft.front.trim().length < 12 || !draft.back.trim()}
                  onClick={() => approve(card.id, draft)}>Aprovar e gravar</Button>
                <Button size="sm" variant="secondary" icon="x" disabled={locked} onClick={() => onDiscard(card.id)}>Descartar</Button>
              </div>}
            </article>;
          })}
        </div>
        <div className="qb-gan-review__header">
          <span>{saved.length} {saved.length === 1 ? 'flashcard gravado' : 'flashcards gravados'}</span>
          <Button variant="secondary" icon="layers" disabled={!saved.length || Boolean(saving)} onClick={() => onStudy(saved)}>Revisar gravados</Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
