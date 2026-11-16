import React from 'react';
import { Badge } from '@/components/qb/core/Badge';
import { Button } from '@/components/qb/core/Button';
import { ERROR_ORIGINS } from '@/lib/question-feedback';

export function ErrorReflection({ saved, busy, error, anchor, onSave }) {
  const fieldId = React.useId();
  const [origin, setOrigin] = React.useState('');
  const [text, setText] = React.useState('');
  const resultRef = React.useRef(null);
  React.useEffect(() => {
    if (saved) resultRef.current?.focus({ preventScroll: true });
  }, [saved]);

  const label = originId => ERROR_ORIGINS[originId] || originId;
  return (
    <div ref={anchor} tabIndex={-1} aria-label="Justificativa do erro" style={{ scrollMarginBlock: '12px 116px' }}>
      {saved ? (
        <div ref={resultRef} tabIndex={-1} role="status" style={{ display: 'grid', gap: 8, overflowWrap: 'anywhere' }}>
          <div><Badge tone="correct" icon="check">Justificativa salva</Badge></div>
          <span><strong>Origem do erro</strong> · {label(saved.origem)}</span>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{saved.texto}</p>
        </div>
      ) : (
        <fieldset disabled={busy} style={{ display: 'grid', gap: 10, margin: 0, padding: 0, border: 0, minWidth: 0 }}>
          <legend style={{ marginBottom: 8 }}>De onde veio o erro?</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(ERROR_ORIGINS).map(([id, description]) => (
              <label key={id} className="qb-btn qb-btn--secondary qb-btn--sm"
                style={{ gap: 8, minHeight: 44, whiteSpace: 'normal', cursor: 'pointer',
                  borderColor: origin === id ? 'var(--qb-gold)' : undefined,
                  background: origin === id ? 'var(--surface-hover)' : undefined }}>
                <input type="radio" name={fieldId + '-origem'} value={id} checked={origin === id} onChange={() => setOrigin(id)}
                  style={{ accentColor: 'var(--qb-gold)' }} />
                {description}
              </label>
            ))}
          </div>
          <label htmlFor={fieldId}>Por que você errou e qual é a regra correta?</label>
          <textarea id={fieldId} className="qb-input" rows={3} maxLength={2000} value={text} onChange={event => setText(event.target.value)}
            style={{ minHeight: 84, resize: 'vertical', scrollMarginBlock: '12px 116px' }} />
          {error && <p role="alert" style={{ margin: 0 }}>{error}</p>}
          <div>
            <Button icon="check" loading={busy} disabled={!origin || !text.trim()} onClick={() => onSave({ origin, text })}>Salvar justificativa</Button>
          </div>
          <small style={{ color: 'var(--text-muted)' }}>Salve a justificativa para avançar.</small>
        </fieldset>
      )}
    </div>
  );
}
