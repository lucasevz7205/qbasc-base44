import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import '@/components/qb/navegador/navegador.css';

/**
 * Cabeçalho de página. Com `emblema` (nome de ícone) vira a faixa de topo do padrão do Navegador:
 * emblema, sobretítulo em Cinzel, título serifado, meta e ações à direita.
 * Sem `emblema`, mantém o cabeçalho simples de antes.
 */
export default function PageHeader({ overline, title, description, actions, children, style, emblema }) {
  if (emblema) {
    return (
      <header className="nv-faixa" style={style}>
        <span className="nv-emblema" aria-hidden="true"><Icon name={emblema} size={26} /></span>
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          {overline && <span className="nv-selo-marca">{overline}</span>}
          <h1 className="nv-title" style={{ fontSize: 24 }}>{title}</h1>
          {description && <p className="nv-note" style={{ maxWidth: '68ch' }}>{description}</p>}
          {children}
        </div>
        {actions && <div className="nv-faixa__acoes">{actions}</div>}
      </header>
    );
  }
  return (
    <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, ...style }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: '1 1 320px' }}>
        {overline && <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>{overline}</span>}
        <h1 style={{ font: 'var(--type-h1)', color: 'var(--text-primary)' }}>{title}</h1>
        {description && <p style={{ font: '400 15px/1.5 var(--font-body)', color: 'var(--text-secondary)', maxWidth: '68ch' }}>{description}</p>}
        {children}
      </div>
      {actions && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </header>
  );
}
export { PageHeader };
