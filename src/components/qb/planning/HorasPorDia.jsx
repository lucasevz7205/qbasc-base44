import React from 'react';

const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Horas de estudo disponíveis por dia da semana (domingo primeiro), 0 a 24 em passos de 0,5. */
export default function HorasPorDia({ hours = [0, 0, 0, 0, 0, 0, 0], onChange, label = 'Horas de estudo por dia' }) {
  const total = hours.reduce((a, b) => a + (Number(b) || 0), 0);
  return (
    <div role="group" aria-label={label} style={{ display: 'grid', gap: 8 }}>
      <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>{label}</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(48px, 1fr))', gap: 6 }}>
        {WD.map((d, i) => (
          <label key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, font: '500 12px/1 var(--font-body)', color: 'var(--text-muted)' }}>{d}
            <input type="number" min="0" max="24" step="0.5" className="qb-input" value={hours[i] ?? 0}
              onChange={e => { const h = hours.slice(); h[i] = Math.min(24, Math.max(0, Number(e.target.value) || 0)); onChange?.(h); }}
              style={{ textAlign: 'center', width: '100%', minWidth: 0 }} />
          </label>
        ))}
      </div>
      <span style={{ font: '400 13px/1.4 var(--font-body)', color: 'var(--text-secondary)' }}>Total semanal: <strong style={{ color: 'var(--text-primary)' }}>{total} h</strong></span>
    </div>
  );
}
export { HorasPorDia };
