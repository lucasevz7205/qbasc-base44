import React from 'react';
import { Icon } from '@/components/qb/core/Icon';

export default function MainNav({ items = [], activeId, activeQuick, onNavigate, compact = false, collapsed = false, onExpand, leading, trailing, label = 'Navegação principal', style }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuId = React.useId();
  const toggleRef = React.useRef(null);
  const current = items.find(item => item.id === activeId);
  const navigate = (id, quick) => {
    const inMobileMenu = toggleRef.current?.getClientRects().length > 0;
    setMenuOpen(false);
    if (inMobileMenu) toggleRef.current.focus({ preventScroll: true });
    onNavigate?.(id, quick);
  };
  if (collapsed) {
    const cur = items.find(i => i.id === activeId);
    return (
      <nav aria-label={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 6px 14px', borderRadius: 999, border: '1px solid rgba(208,179,134,.5)', background: 'rgba(10,30,52,.9)', ...style }}>
        {leading}
        <span style={{ font: '600 15px/1 var(--font-heading)', color: 'var(--qb-gold-bright)' }}>{cur ? cur.label : ''}</span>
        <span style={{ flex: 1 }} />
        <button className="qb-tool" onClick={onExpand} aria-label="Expandir navegação"><Icon name="chevrons-down" size={14} />Menu</button>
      </nav>
    );
  }
  return (
    <nav aria-label={label} className={'qb-mainnav' + (compact ? ' qb-mainnav--compact' : '')} style={style}
      onKeyDown={event => {
        if (event.key !== 'Escape' || !menuOpen || !toggleRef.current?.getClientRects().length) return;
        event.preventDefault();
        setMenuOpen(false);
        toggleRef.current.focus();
      }}>
      {leading && <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px 0 6px' }}>{leading}</div>}
      <button type="button" className="qb-tool qb-mainnav__toggle" ref={toggleRef} aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen(open => !open)}>
        <span>{current ? 'Seções · ' + current.label : 'Seções'}</span><Icon name={menuOpen ? 'chevron-up' : 'chevron-down'} size={18} />
      </button>
      <div id={menuId} className="qb-mainnav__items" data-open={menuOpen}>
        {items.map(it => (
          <div key={it.id} className="qb-mainnav__item" aria-current={it.id === activeId ? 'page' : undefined} role="presentation" style={{ padding: 0 }}>
            <button type="button" onClick={() => navigate(it.id)} aria-current={it.id === activeId ? 'page' : undefined} title={it.label}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: '100%', padding: '0 10px', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer', borderRadius: 999 }}>
              {it.icon && <Icon name={it.icon} size={compact ? 16 : 18} />}
              <span className="qb-mainnav__label">{it.label}</span>
              {it.count ? <span className="qb-mainnav__count" aria-label={it.count + ' pendentes'}>{it.count}</span> : null}
            </button>
            {it.quick && <button className="qb-mainnav__quick" aria-current={it.id === activeId && activeQuick === it.quick.id ? 'true' : undefined} type="button" onClick={() => navigate(it.id, it.quick.id)}>{it.quick.label}</button>}
          </div>
        ))}
      </div>
      {trailing && <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px 0 10px' }}>{trailing}</div>}
    </nav>
  );
}
export { MainNav };