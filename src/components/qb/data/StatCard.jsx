import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import '@/components/qb/navegador/navegador.css';

// Cor só marca estado, sempre acompanhada de ícone e texto (padrão do Navegador).
const TONES = {
  correct: { tone: 'correct', icon: 'circle-check' },
  incorrect: { tone: 'incorrect', icon: 'circle-x' },
  gold: { tone: 'attention', icon: null },
};

export default function StatCard({ label, value, unit, detail, icon, tone = 'neutral', trend, note, warning, onClick, compact = false, style }) {
  const t = TONES[tone];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} type={onClick ? 'button' : undefined}
      className={'nv-stat' + (t ? ` nv-tone-${t.tone} nv-stat--tom` : '') + (onClick ? ' nv-stat--ação' : '') + (compact ? ' nv-stat--compacto' : '')} style={style}>
      <span className="nv-overline nv-stat__rotulo">
        {icon && <Icon name={icon} size={14} />}{label}
        {note && <span title={note} aria-label={note} style={{ marginLeft: 'auto', display: 'inline-flex' }}><Icon name="info" size={14} /></span>}
      </span>
      <span className="nv-stat__valor">
        <span>{value}</span>
        {unit && <span className="nv-numero__unidade">{unit}</span>}
        {t?.icon && <span className="nv-stat__estado" aria-hidden="true"><Icon name={t.icon} size={compact ? 16 : 20} /></span>}
        {trend && <span className={'nv-delta nv-tone-' + (trend.delta > 0 ? 'correct' : trend.delta < 0 ? 'incorrect' : 'no-evidence')} style={{ marginLeft: 'auto' }}>
          <Icon name={trend.delta > 0 ? 'trending-up' : trend.delta < 0 ? 'trending-down' : 'minus'} size={14} strokeWidth={2.2} />{trend.label}</span>}
      </span>
      {detail && <span className="nv-numero__legenda">{detail}</span>}
      {warning && <span className="nv-selo nv-tone-attention" style={{ justifySelf: 'start' }}><Icon name="triangle-alert" size={14} />{warning}</span>}
    </Tag>
  );
}
export { StatCard };
