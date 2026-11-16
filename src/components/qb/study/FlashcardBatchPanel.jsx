import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/qb/core/Button';
import { Panel } from '@/components/qb/core/Panel';
import { getFlashcardBatchStatus, runFlashcardBatch } from '@/lib/flashcard-batch';

export default function FlashcardBatchPanel() {
  const getStatus = useServerFn(getFlashcardBatchStatus);
  const run = useServerFn(runFlashcardBatch);
  const [batches, setBatches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { getStatus().then(setBatches).catch(error => setError(error.message)); }, [getStatus]);

  const pending = batches.filter(batch => !batch.results);
  const results = batches.flatMap(batch => batch.results || []);
  const count = batches.reduce((sum, batch) => sum + batch.size, 0);
  const review = results.filter(item => item.status === 'review');

  const submit = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      // Even when another group fails, retain confirmed results for the next attempt.
      for (let i = 0; i < pending.length; i += 3) {
        const group = pending.slice(i, i + 3);
        const replies = await Promise.allSettled(group.map(({ id }) => run({ data: { id } })));
        const succeeded = new Map();
        let failure;
        replies.forEach((reply, index) => {
          if (reply.status === 'fulfilled') succeeded.set(group[index].id, reply.value);
          else failure ||= reply.reason;
        });
        setBatches(current => current.map(batch => succeeded.has(batch.id) ? { ...batch, results: succeeded.get(batch.id) } : batch));
        if (failure) throw failure;
      }
    } catch (error) {
      setError(error?.message || 'Não foi possível concluir o lote. Os resultados confirmados foram guardados.');
    } finally {
      setBusy(false);
    }
  };

  if (!count && !error) return null;
  return <Panel style={{ display: 'grid', gap: 12 }}>
    <h2 style={{ font: 'var(--type-h2)' }}>Reformulação de flashcards em lote</h2>
    <p>O Gemini recebe a frente, o verso e a referência dos cartões sinalizados. Sugestões que exigem divisão ou conferência ficam pendentes de revisão.</p>
    <p role="status">{results.length} de {count} verificados · {results.filter(item => item.status === 'updated').length} reformulados · {review.length} para revisão</p>
    {error && <p role="alert">{error}</p>}
    {!!pending.length && <div><Button icon="sparkles" loading={busy} disabled={busy} onClick={submit}>{results.length ? 'Continuar reformulação' : 'Reformular cartões sinalizados'}</Button></div>}
    {!!review.length && <details>
      <summary>Cartões para revisão</summary>
      <ul>{review.map(item => <li key={item.id}>{item.id} · {item.reason}</li>)}</ul>
    </details>}
  </Panel>;
}
