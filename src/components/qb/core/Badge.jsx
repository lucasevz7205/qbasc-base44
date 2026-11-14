import React from 'react';
import { Icon } from '@/components/qb/core/Icon';

const STATE_ICONS = {
  correct: 'circle-check',
  incorrect: 'circle-x',
  'no-evidence': 'circle-dashed',
  attention: 'triangle-alert',
};

export default function Badge({ tone = 'neutral', icon, children, className = '', style }) {
  const glyph = icon === null ? null : icon || STATE_ICONS[tone];
  return (
    <span className={`qb-badge qb-badge--${tone} ${className}`} style={style}>
      {glyph && <Icon name={glyph} size={14} strokeWidth={2} />}
      {children}
    </span>
  );
}
export { Badge };