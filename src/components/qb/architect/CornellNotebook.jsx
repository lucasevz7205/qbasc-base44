import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/qb/core/Button';
import { generateCornellCues } from '@/lib/server-fns';

export default function CornellNotebook({ topicLabel = 'o tópico', style }) {
  const generateCuesFn = useServerFn(generateCornellCues);
  const storageKey = 'qb-cornell::' + topicLabel;
  const [notes, setNotes] = React.useState('');
  const [cues, setCues] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [hide, setHide] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved) {
        setNotes(saved.notes || '');
        setCues(saved.cues || '');
        setSummary(saved.summary || '');
      } else {
        setNotes('');
        setCues('');
        setSummary('');
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ notes, cues, summary }));
    } catch {
      // ignore
    }
  }, [storageKey, notes, cues, summary]);

  const suggest = async () => {
    const clean = notes.trim();
    if (clean.length < 20 || busy) return;
    setBusy(true);
    try {
      const res = await generateCuesFn({
        data: {
          topicLabel,
          notes: clean,
        },
      });
      if (Array.isArray(res?.cues) && res.cues.length) {
        setCues(res.cues.map(c => (c.startsWith('•') ? c : '• ' + c)).join('\n'));
      }
      if (res?.summary && !summary.trim()) {
        setSummary(res.summary);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ font: '400 14px/1.4 var(--font-body)', color: 'var(--text-muted)', flex: 1 }}>
          Caderno de <strong style={{ color: 'var(--text-primary)' }}>{topicLabel}</strong>
        </span>
        <Button size="sm" variant="secondary" icon="sparkles" loading={busy} disabled={notes.trim().length < 20 || busy} onClick={suggest}>
          Sugerir pistas e síntese com IA
        </Button>
        <Button size="sm" variant="ghost" icon={hide ? 'eye' : 'eye-off'} onClick={() => setHide(h => !h)}>
          {hide ? 'Mostrar notas' : 'Esconder notas para evocar'}
        </Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Pistas / perguntas</span>
          <textarea
            className="qb-textarea"
            style={{ minHeight: 220 }}
            value={cues}
            onChange={e => setCues(e.target.value)}
            placeholder="Perguntas de evocação ativa que suas notas respondem"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Notas</span>
          {hide ? (
            <div className="qb-textarea" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Notas ocultas — responda às pistas de memória.
            </div>
          ) : (
            <textarea
              className="qb-textarea"
              style={{ minHeight: 220 }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anotações durante a leitura ou aula (mínimo de 20 caracteres para gerar pistas com IA)…"
            />
          )}
        </label>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Síntese</span>
        <textarea
          className="qb-textarea"
          style={{ minHeight: 90 }}
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="Resuma em 2–3 frases, com suas palavras"
        />
      </label>
    </div>
  );
}
export { CornellNotebook };