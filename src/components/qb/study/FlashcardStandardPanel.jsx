import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/qb/core/Button';
import { Panel } from '@/components/qb/core/Panel';
import { useRealStudy } from '@/lib/qb-real-data';
import { reformulateFlashcardsToStandard } from '@/lib/flashcard-standard-batch';

const SIZE = 8;

// Administração: leva todos os cartões existentes ao padrão de 17/11/2026, sem mexer no progresso.
export default function FlashcardStandardPanel() {
  const { QB_DATA: D, refresh } = useRealStudy();
  const run = useServerFn(reformulateFlashcardsToStandard);
  const [busy, setBusy] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const [error, setError] = React.useState('');
  const stop = React.useRef(false);

  const cards = React.useMemo(() => [...(D.flashcards || [])]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map(card => {
      const subject = D.studySubjects?.find(s => s.topics.some(t => t.id === card.topicId));
      const topic = subject?.topics.find(t => t.id === card.topicId);
      const topics = [...new Set([topic?.title, [topic?.num, topic?.title].filter(Boolean).join(' · ')].filter(Boolean))];
      return {
        id: String(card.id), front: card.front, back: card.back, basis: card.basis || '',
        subject: subject?.name || '', topics,
        version: Number(card.editorial?.version || 0), original: card.editorial?.original,
      };
    }), [D.flashcards, D.studySubjects]);
  const chunks = React.useMemo(() => {
    const out = [];
    for (let i = 0; i < cards.length; i += SIZE) out.push(cards.slice(i, i + SIZE));
    return out;
  }, [cards]);

  const submit = async () => {
    if (busy) return;
    setBusy(true); setError(''); stop.current = false;
    try {
      const all = [];
      for (let i = 0; i < chunks.length; i += 2) {
        if (stop.current) break;
        const group = chunks.slice(i, i + 2);
        const replies = await Promise.allSettled(group.map(cardsOfChunk => run({ data: { cards: cardsOfChunk } })));
        let failure;
        replies.forEach(reply => {
          if (reply.status === 'fulfilled') all.push(...reply.value);
          else failure ||= reply.reason;
        });
        setResults([...all]);
        if (failure) throw failure;
      }
      await refresh();
    } catch (err) {
      setError(err?.message || 'Não foi possível concluir. O que já foi tratado ficou guardado.');
    } finally {
      setBusy(false);
    }
  };

  const updated = results.filter(r => r.status === 'updated').length;
  const kept = results.filter(r => r.status === 'kept').length;
  const review = results.filter(r => r.status === 'review');
  if (!cards.length) return null;
  return (
    <Panel style={{ display: 'grid', gap: 12 }}>
      <details>
        <summary style={{ cursor: 'pointer', font: 'var(--type-h3)' }}>Administração · padronizar todos os cartões</summary>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <p>
            {cards.length} cartões em {chunks.length} chamadas ao Gemini. Cada cartão recebe uma nova versão (sem prefixo, uma resposta, verso curto);
            o texto original e a nota, o nível e a próxima revisão ficam como estão. Propostas que mudem números ou exijam dividir o cartão vão para revisão.
            Pode ser interrompido e retomado: o que já foi tratado não é refeito.
          </p>
          <p role="status">{results.length} de {cards.length} verificados · {updated} reformulados · {kept} mantidos · {review.length} para revisão</p>
          {error && <p role="alert">{error}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button icon="sparkles" loading={busy} disabled={busy} onClick={submit}>{results.length ? 'Continuar padronização' : 'Padronizar todos os cartões'}</Button>
            {busy && <Button variant="secondary" onClick={() => { stop.current = true; }}>Parar após este grupo</Button>}
          </div>
          {!!review.length && <details>
            <summary>Cartões para revisão ({review.length})</summary>
            <ul>{review.map(item => <li key={item.id}>{item.id} · {item.reason}</li>)}</ul>
          </details>}
        </div>
      </details>
    </Panel>
  );
}
