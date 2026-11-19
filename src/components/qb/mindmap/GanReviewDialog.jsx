import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Badge } from '@/components/qb/core/Badge';
import { Button } from '@/components/qb/core/Button';
import { mechanismOptionList } from '@/lib/cebraspe-v1-taxonomy';
import { ganReviewDraft, ganReviewQuality } from '@/lib/gan-review';

const verdicts = {
  APROVADA: 'Aprovar',
  REFINAR: 'Refinar',
  REJEITADA: 'Rejeitar',
};

const keyLabel = value => ({ C: 'Certo', E: 'Errado' })[value] || 'Sem gabarito';

function Recommendation({ item }) {
  const issues = [...new Set([...(item.motivosConfronto || []), ...(item.falhasDetectadas || [])])];
  return (
    <div className="qb-gan-review__evidence">
      <p><strong>Gerador:</strong> {item.provedorGerador === 'gpt' ? 'GPT' : 'Gemini'} · {keyLabel(item.gabaritoGerador)}</p>
      <p><strong>Julgamento cego:</strong> {item.provedorDiscriminador === 'gemini' ? 'Gemini' : 'GPT'} · {keyLabel(item.gabaritoDiscriminador)}</p>
      <p><strong>Recomendação:</strong> {verdicts[item.veredictoDiscriminador] || 'Sem recomendação'}</p>
      {item.criticaAdversaria && <p><strong>Parecer:</strong> {item.criticaAdversaria}</p>}
      {item.fundamentacaoCega && (
        <section className="qb-gan-review__evidence" aria-label="Fonte do julgamento cego">
          <Badge tone={item.fundamentacaoCega.verificacao === 'trecho_localizado' ? 'correct' : 'attention'}>
            {item.fundamentacaoCega.verificacao === 'trecho_localizado' ? 'Trecho localizado no acervo' : 'Fonte pendente de conferência'}
          </Badge>
          {item.fundamentacaoCega.titulo && <p><strong>Material:</strong> {item.fundamentacaoCega.titulo}</p>}
          {item.fundamentacaoCega.natureza && <p><strong>Tipo de texto:</strong> {item.fundamentacaoCega.natureza}</p>}
          {item.fundamentacaoCega.trecho && <blockquote style={{ margin: 0, paddingInlineStart: 'var(--space-3)', borderInlineStart: '2px solid var(--qb-bronze)', whiteSpace: 'pre-wrap' }}>{item.fundamentacaoCega.trecho}</blockquote>}
          {item.fundamentacaoCega.explicacao && <p><strong>Regra que decide o julgamento:</strong> {item.fundamentacaoCega.explicacao}</p>}
          {item.fundamentacaoCega.limitacao && <p>{item.fundamentacaoCega.limitacao}</p>}
          <small>A correspondência do trecho é conferida no texto disponível. A vigência e a fidelidade ao documento original dependem da fonte cadastrada.</small>
        </section>
      )}
      {issues.length > 0 && <ul>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
      {item.enunciadoOriginal && <p><strong>Enunciado antes do refinamento:</strong> {item.enunciadoOriginal}</p>}
    </div>
  );
}

function ReviewFields({ draft, onChange, quality, busy }) {
  return (
    <fieldset className="qb-gan-review__fields" disabled={busy}>
      <legend>Ajustar proposta</legend>
      <label>Enunciado
        <textarea rows={3} maxLength={1600} value={draft.statement} onChange={e => onChange('statement', e.target.value)} />
      </label>
      <div className="qb-gan-review__pair">
        <label>Gabarito final
          <select value={draft.key} onChange={e => {
            onChange('key', e.target.value);
            onChange('mecanismo', '');
          }}>
            <option value="">Selecione</option>
            <option value="C">Certo</option>
            <option value="E">Errado</option>
          </select>
        </label>
        <label>Mecanismo
          <select value={draft.mecanismo} onChange={e => onChange('mecanismo', e.target.value)}>
            <option value="">Selecione</option>
            {mechanismOptionList(draft.key).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      <label>Trecho decisivo da fonte
        <textarea rows={2} maxLength={400} value={draft.trechoDecisivo} onChange={e => onChange('trechoDecisivo', e.target.value)} />
      </label>
      <label>{draft.key === 'C' ? 'Como o item poderia ficar errado (opcional)' : 'Correção mínima'}
        <textarea rows={2} maxLength={600} value={draft.correcaoMinima} onChange={e => onChange('correcaoMinima', e.target.value)} />
      </label>
      <label>Comentário e fundamentação (opcional)
        <textarea rows={4} maxLength={2400} value={draft.explanation} onChange={e => onChange('explanation', e.target.value)} />
      </label>
      {quality.problems.length > 0 && (
        <div className="qb-gan-review__problems">
          <strong>Ajustes necessários para gravar</strong>
          <ul>{quality.problems.map(problem => <li key={problem.code}>{problem.message}</li>)}</ul>
        </div>
      )}
      {quality.warnings.length > 0 && <ul>{quality.warnings.map(warning => <li key={warning.code}>{warning.message}</li>)}</ul>}
    </fieldset>
  );
}

export function GanReviewDialog({ review, open, onOpenChange, returnFocus, fallbackFocus, questionBank, onApprove, onDiscard, onTrain }) {
  const titleRef = React.useRef(null);
  const lock = React.useRef(false);
  const [drafts, setDrafts] = React.useState({});
  const [savingId, setSavingId] = React.useState(null);
  const [error, setError] = React.useState(null);
  const saved = review.entries.filter(entry => entry.status === 'saved').length;
  const pending = review.entries.filter(entry => entry.status === 'pending').length;
  const discarded = review.entries.filter(entry => entry.status === 'discarded').length;
  const blocked = review.entries.filter(({ item }) => item.statusConfronto === 'divergencia_bloqueada').length;

  async function approve(entry, draft) {
    if (lock.current) return;
    lock.current = true;
    setSavingId(entry.item.id);
    setError(null);
    try {
      await onApprove(entry, draft);
    } catch (err) {
      setError({ id: entry.item.id, message: err?.message || 'Não foi possível gravar a questão.' });
    } finally {
      lock.current = false;
      setSavingId(null);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="qb-gan-review__overlay" />
        <Dialog.Content className="qb-panel qb-panel--ornate qb-gan-review"
          onOpenAutoFocus={event => { event.preventDefault(); titleRef.current?.focus(); }}
          onCloseAutoFocus={event => {
            event.preventDefault();
            const target = returnFocus.current;
            if (target?.isConnected && !target.disabled) target.focus();
            else fallbackFocus.current?.focus();
          }}
          onEscapeKeyDown={event => event.stopPropagation()}
          onPointerDownOutside={event => event.preventDefault()}
        >
          <header className="qb-gan-review__header">
            <div>
              <Dialog.Title ref={titleRef} tabIndex={-1}>Revisão das questões GAN</Dialog.Title>
              <Dialog.Description>{review.anchor.label} · {review.entries.length} questões geradas</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="secondary" icon="x">Fechar</Button></Dialog.Close>
          </header>
          <div className="qb-gan-review__list">
            {review.entries.filter(entry => !(entry.status === "saved" && entry.item.statusConfronto === "aprovada_gan")).map(entry => {
              const { item, node, record, status } = entry;
              const draft = drafts[item.id] || ganReviewDraft(item);
              const quality = status === 'pending' ? ganReviewQuality(draft, questionBank, item.id) : null;
              const machineBlocked = item.statusConfronto === 'divergencia_bloqueada';
              const machineRefined = item.statusConfronto === 'refinada_gan';
              return (
                <article className="qb-gan-review__item" key={item.id}>
                  <div className="qb-gan-review__badges">
                    <Badge tone={machineBlocked ? 'incorrect' : machineRefined ? 'attention' : 'correct'}>
                      {machineBlocked ? 'Bloqueada pelo confronto' : machineRefined ? 'Proposta refinada' : 'Passou no confronto'}
                    </Badge>
                    <Badge tone="gold">{Number.isFinite(item.ganScore) ? `Escore de realismo ${item.ganScore}/100` : 'Sem escore'}</Badge>
                    {status === 'saved' && <Badge tone="correct">Gravada</Badge>}
                    {status === 'discarded' && <Badge>Descartada</Badge>}
                  </div>
                  {node.id !== review.anchor.id && <p className="qb-overline">{node.label}</p>}
                  <p className="qb-gan-review__statement">{record?.enunciado || draft.statement || 'Enunciado ausente.'}</p>
                  <p className="qb-gan-review__recommendation">Recomendação da IA · {verdicts[item.veredictoDiscriminador] || 'Sem recomendação'}</p>
                  <details className="qb-gan-review__details">
                    <summary>{status === 'pending' ? 'Parecer, fundamento e ajustes' : 'Parecer e fundamento'}</summary>
                    <Recommendation item={item} />
                    {status === 'pending' ? (
                      <ReviewFields draft={draft} busy={Boolean(savingId)} quality={quality}
                        onChange={(key, value) => setDrafts(current => ({
                          ...current, [item.id]: { ...(current[item.id] || draft), [key]: value },
                        }))} />
                    ) : (
                      <div className="qb-gan-review__evidence">
                        {draft.trechoDecisivo && <p><strong>Trecho decisivo:</strong> {draft.trechoDecisivo}</p>}
                        {draft.explanation && <p><strong>Comentário:</strong> {draft.explanation}</p>}
                        {draft.correcaoMinima && <p><strong>Correção mínima:</strong> {draft.correcaoMinima}</p>}
                      </div>
                    )}
                  </details>
                  {status === 'pending' && (
                    <div className="qb-gan-review__actions">
                      <Button icon="check" loading={savingId === item.id} disabled={Boolean(savingId) || quality.problems.length > 0}
                        onClick={() => approve(entry, draft)}>Aprovar e gravar</Button>
                      <Button variant="secondary" disabled={Boolean(savingId)} onClick={() => onDiscard(entry)}>Descartar</Button>
                      {quality.problems.length > 0 && <small>Abra os detalhes para corrigir o item.</small>}
                    </div>
                  )}
                  {error?.id === item.id && status === 'pending' && <p role="alert" className="qb-gan-review__problems">{error.message}</p>}
                </article>
              );
            })}
          </div>
          <footer className="qb-gan-review__footer">
            <div role="status">
              {saved} gravadas · {blocked} bloqueadas pelo confronto
              {review.manual && ` · ${pending} por decidir · ${discarded} descartadas`}
            </div>
            {saved > 0 && <Button variant="secondary" icon="target" disabled={Boolean(savingId) || pending > 0} onClick={onTrain}>Treinar gravadas</Button>}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
