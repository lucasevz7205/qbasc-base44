import React from 'react';
import { Button } from '@/components/qb/core/Button';

export function CornellPairs({ pairs, onChange, disabled }) {
  const [addedId, setAddedId] = React.useState(null);
  const add = () => {
    const id = crypto.randomUUID();
    setAddedId(id);
    onChange([...pairs, { id, cue: '', note: '' }]);
  };
  const edit = (id, patch) => onChange(pairs.map(pair => pair.id === id ? { ...pair, ...patch } : pair));
  return (
    <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
      {pairs.map((pair, index) => (
        <details key={pair.id} className="qb-train-fold qb-train-fold--nested" open={pair.id === addedId || undefined}>
          <summary>Pista {index + 1}</summary>
          <div className="qb-train-fold__body">
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="qb-overline">Pergunta {index + 1}</span>
              <textarea className="qb-textarea" rows={2} value={pair.cue} disabled={disabled}
                onChange={event => edit(pair.id, { cue: event.target.value })} placeholder="O que você quer lembrar?" />
            </label>
            <details className="qb-train-fold qb-train-fold--nested">
              <summary>Nota {index + 1}</summary>
              <div className="qb-train-fold__body">
                <label style={{ display: 'grid', gap: 6 }}>
                    <span className="qb-overline">Resposta da pista {index + 1}</span>
                    <textarea className="qb-textarea" rows={3} value={pair.note} disabled={disabled}
                      onChange={event => edit(pair.id, { note: event.target.value })} placeholder="Registre a resposta ou explicação." />
                  </label>
              </div>
            </details>
          </div>
        </details>
      ))}
      <div><Button variant="secondary" icon="plus" disabled={disabled} onClick={add}>Adicionar par</Button></div>
    </div>
  );
}
