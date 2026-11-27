import React from 'react';
import { Icon } from '../core/Icon.jsx';
import '../navegador/navegador.css';

// Cor só marca estado, sempre com ícone e texto (padrão do Navegador).
const TONES = { correct: 'var(--state-correct)', incorrect: 'var(--state-incorrect)', gold: 'var(--qb-gold-bright)', neutral: 'var(--text-primary)' };
const STATE = { correct: ['correct', 'circle-check'], incorrect: ['incorrect', 'circle-x'], gold: ['attention', null] };

export function PerformanceMetricCard({ label, icon, value, unit, tone = 'neutral', formula, detail, breakdown, comparison, state = 'ok', stateText, warning, method, action, compact = false, style, children }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const d = comparison ? comparison.delta : 0;
  return (
    <section className={'nv-stat' + (STATE[tone] ? ` nv-tone-${STATE[tone][0]} nv-stat--tom` : '') + (compact ? ' nv-stat--compacto' : '')} aria-labelledby={id + 'l'} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 28 }}>
        {icon && <Icon name={icon} size={14} color="var(--text-muted)" />}
        <h3 id={id + 'l'} className="nv-overline" style={{ margin: 0, flex: 1, minWidth: 0 }}>{label}</h3>
        {method && <button type="button" className="qb-iconbtn" style={{ width: 28, height: 28, marginRight: -6 }} aria-expanded={open} aria-controls={id + 'm'} aria-label={'Como é calculado: ' + label} title="Como é calculado" onClick={() => setOpen(o => !o)}><Icon name="info" size={15} /></button>}
      </div>
      {state === 'ok' ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span className="nv-stat__valor" style={{ fontSize: compact ? 24 : 32 }}>{value}</span>
          {unit && <span className="nv-numero__unidade">{unit}</span>}
          {STATE[tone]?.[1] && <span className="nv-stat__estado" aria-hidden="true"><Icon name={STATE[tone][1]} size={compact ? 16 : 20} /></span>}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: compact ? 26 : 32, font: '500 14px/1.3 var(--font-body)', color: 'var(--text-secondary)' }}>
          <Icon name={state === 'pending' ? 'circle-help' : 'circle-dashed'} size={16} color="var(--state-no-evidence)" />{stateText || (state === 'pending' ? 'Métrica ainda não definida' : 'Sem atividades registradas')}
        </div>
      )}
      {state === 'ok' && comparison && (
        <span className={'nv-delta nv-tone-' + (d > 0 ? 'correct' : d < 0 ? 'incorrect' : 'no-evidence')} style={{ justifySelf: 'start' }}>
          <Icon name={d > 0 ? 'trending-up' : d < 0 ? 'trending-down' : 'minus'} size={14} strokeWidth={2.2} />{comparison.label}
        </span>
      )}
      {state === 'ok' && breakdown && breakdown.length > 0 && (
        <dl style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', margin: 0 }}>
          {breakdown.map(b => <div key={b.label} style={{ display: 'flex', gap: 5, alignItems: 'baseline' }}><dd style={{ margin: 0, font: '600 13px/1.2 var(--font-mono)', color: TONES[b.tone] || 'var(--text-primary)' }}>{b.value}</dd><dt style={{ font: '400 12px/1.2 var(--font-body)', color: 'var(--text-muted)' }}>{b.label}</dt></div>)}
        </dl>
      )}
      {state === 'ok' && detail && <span className="nv-numero__legenda">{detail}</span>}
      {formula && <span className="nv-numero__legenda">{formula}</span>}
      {warning && <span className="nv-selo nv-tone-attention" style={{ justifySelf: 'start' }}><Icon name="triangle-alert" size={14} />{warning}</span>}
      {method && open && <p id={id + 'm'} role="note" style={{ margin: 0, padding: '8px 10px', borderRadius: 10, background: 'var(--surface-sunken)', border: '1px solid var(--divider)', font: '400 12px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>{method}</p>}
      {action && <button type="button" className="qb-linkbtn" style={{ alignSelf: 'flex-start', fontSize: 13, marginTop: 'auto' }} onClick={action.onClick}>{action.label}</button>}
      {children}
    </section>
  );
}
