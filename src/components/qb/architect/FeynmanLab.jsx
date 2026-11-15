import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Icon } from '@/components/qb/core/Icon';
import { Button } from '@/components/qb/core/Button';
import { Badge } from '@/components/qb/core/Badge';
import { evaluateFeynmanExplanation } from '@/lib/server-fns';

export default function FeynmanLab({ topicLabel = 'o tópico', style }) {
  const evaluateFn = useServerFn(evaluateFeynmanExplanation);
  const [text, setText] = React.useState('');
  const [fb, setFb] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const evaluate = async () => {
    const clean = text.trim();
    if (clean.length < 20 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await evaluateFn({
        data: {
          topicLabel,
          explanation: clean,
        },
      });
      setFb(res);
    } catch (err) {
      setError(err?.message || 'Não foi possível avaliar sua explicação agora.');
    } finally {
      setBusy(false);
    }
  };

  const Item = ({ ok, children }) => (
    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start', font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
      <Icon name={ok ? 'circle-check' : 'triangle-alert'} size={16} color={ok ? 'var(--state-correct)' : 'var(--state-attention)'} style={{ marginTop: 2 }} />
      <span>{children}</span>
    </li>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, ...style }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>1 · Explique com suas palavras</span>
        <p style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-muted)' }}>
          Explique <strong style={{ color: 'var(--text-primary)' }}>{topicLabel}</strong> como se fosse para alguém sem formação jurídica. Use um exemplo concreto.
        </p>
        <textarea
          className="qb-textarea"
          style={{ minHeight: 200 }}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Comece pela ideia central, evite jargões sem explicação e inclua um exemplo prático…"
          aria-label="Sua explicação"
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon="sparkles" loading={busy} disabled={text.trim().length < 20 || busy} onClick={evaluate}>
            Avaliar com IA
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => { setText(''); setFb(null); setError(null); }}>
            Recomeçar
          </Button>
        </div>
      </section>
      <section className="qb-panel qb-panel--sunken" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }} aria-live="polite">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>2 · Diagnóstico Feynman (IA)</span>
          {fb && typeof fb.clarityScore === 'number' && (
            <Badge tone={fb.clarityScore >= 80 ? 'correct' : fb.clarityScore >= 60 ? 'gold' : 'attention'}>
              Clareza: {Math.round(fb.clarityScore)}/100
            </Badge>
          )}
        </div>
        {error && (
          <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--state-incorrect)', font: '400 13px/1.4 var(--font-body)' }}>
            <Icon name="circle-x" size={16} />
            <span>{error}</span>
          </div>
        )}
        {!fb && !error ? (
          <p style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-muted)' }}>
            Escreva pelo menos 20 caracteres e clique em <strong>Avaliar com IA</strong>. O Arquiteto analisará clareza, jargões, exemplos e eventuais lacunas conceituais sobre {topicLabel}.
          </p>
        ) : fb ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Item ok={fb.isAdequateLength}>
                <strong>{fb.words} palavras:</strong> {fb.lengthFeedback}
              </Item>
              <Item ok={!fb.jargonDetected?.length}>
                {fb.jargonDetected?.length
                  ? `Jargão detectado (${fb.jargonDetected.join(', ')}): ${fb.jargonFeedback}`
                  : fb.jargonFeedback || 'Linguagem acessível e sem jargão excessivo.'}
              </Item>
              <Item ok={fb.sentenceClarityOk}>{fb.sentenceFeedback}</Item>
              <Item ok={fb.hasConcreteExample}>{fb.exampleFeedback}</Item>
            </ul>
            {Array.isArray(fb.gaps) && fb.gaps.length > 0 && (
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="qb-overline" style={{ color: 'var(--state-attention)' }}>Pontos técnicos para reforçar</span>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, font: '400 13px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
                  {fb.gaps.map((g, idx) => (
                    <li key={idx}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
            {fb.nextStep && (
              <p style={{ font: '400 13px/1.5 var(--font-body)', color: 'var(--qb-gold)', marginTop: 2 }}>
                <strong>Próximo passo:</strong> {fb.nextStep}
              </p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
export { FeynmanLab };