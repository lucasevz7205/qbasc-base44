import React from 'react';
import { Icon } from '@/components/qb/core/Icon';

const SYNC = { ok: ['cloud', 'Sincronizado', 'var(--state-correct)'], syncing: ['refresh-cw', 'Sincronizando…', 'var(--qb-gold-bright)'], offline: ['cloud-off', 'Offline', 'var(--state-incorrect)'] };

export default function GlobalToolbar({ sync = 'ok', onSync, background = 'dynamic', onBackground, density = 'wide', onDensity, theme = 'dark', onTheme, tools = [], onTool, collapsed = false, onCollapse, onArchitect, style }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const s = SYNC[sync] || SYNC.ok;
  return (
    <div role="toolbar" aria-label="Controles globais" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 6, ...style }}>
      {onArchitect && <button className="qb-tool qb-tool--accent" onClick={onArchitect}><Icon name="sparkles" size={14} />O Arquiteto</button>}
      <button className="qb-tool" onClick={onSync} aria-live="polite" title="Estado de sincronização"><Icon name={s[0]} size={14} color={s[2]} className={sync === 'syncing' ? 'qb-spin' : undefined} />{s[1]}</button>
      <span aria-hidden="true" style={{ width: 1, height: 18, background: 'var(--divider)', margin: '0 2px' }} />
      <button className="qb-tool" onClick={() => onBackground && onBackground(background === 'dynamic' ? 'static' : 'dynamic')} aria-pressed={background === 'dynamic'}><Icon name="image" size={14} />Fundo: {background === 'dynamic' ? 'cena' : 'estático'}</button>
      <button className="qb-tool" onClick={() => onDensity && onDensity(density === 'wide' ? 'compact' : 'wide')}><Icon name="layout-panel-top" size={14} />Topo: {density === 'wide' ? 'amplo' : 'compacto'}</button>
      <button className="qb-tool" onClick={() => onTheme && onTheme(theme === 'dark' ? 'contrast' : 'dark')}><Icon name="contrast" size={14} />Tema: {theme === 'dark' ? 'escuro' : 'alto contraste'}</button>
      {tools.length > 0 && (
        <div ref={ref} style={{ position: 'relative' }}>
          <button className="qb-tool" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}><Icon name="wrench" size={14} />Ferramentas<Icon name="chevron-down" size={14} /></button>
          {open && (
            <div role="menu" className="qb-menu" style={{ right: 0, top: 38 }}>
              {tools.map(t => <button key={t.id} role="menuitem" className="qb-menu__item" onClick={() => { setOpen(false); onTool && onTool(t.id); }}>{t.icon && <Icon name={t.icon} size={16} color="var(--qb-gold)" />}{t.label}</button>)}
            </div>
          )}
        </div>
      )}
      {onCollapse && <button className="qb-tool" onClick={onCollapse} aria-pressed={collapsed}><Icon name={collapsed ? 'chevrons-down' : 'chevrons-up'} size={14} />{collapsed ? 'Expandir' : 'Recolher'}</button>}
    </div>
  );
}
export { GlobalToolbar };