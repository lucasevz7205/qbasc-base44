import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { clampLauncherPosition, defaultLauncherPosition, LAUNCHER_STORAGE_KEY } from '@/lib/architect-launcher-position';

function viewport() { return { width: window.innerWidth, height: window.innerHeight }; }
function launcherSize(node) { return { width: node?.offsetWidth || 190, height: node?.offsetHeight || 52 }; }

export default function ArchitectLauncher({ onOpen, hidden }) {
  const containerRef = React.useRef(null);
  const dragRef = React.useRef(null);
  const suppressToggleClick = React.useRef(false);
  const [position, setPosition] = React.useState(null);
  const [expanded, setExpanded] = React.useState(false);
  const controlsId = React.useId();

  React.useEffect(() => {
    let fromStorage = null;
    try {
      const saved = localStorage.getItem(LAUNCHER_STORAGE_KEY);
      if (saved) fromStorage = JSON.parse(saved);
    } catch { /* fallback para posição padrão à esquerda */ }
    const size = launcherSize(containerRef.current);
    const place = fromStorage ? clampLauncherPosition(fromStorage, viewport(), size) : defaultLauncherPosition(viewport(), size);
    setPosition(place);
    const onResize = () => {
      if (containerRef.current?.hidden) return;
      setPosition(current => {
        const next = clampLauncherPosition(current || place, viewport(), launcherSize(containerRef.current));
        return current?.x === next.x && current?.y === next.y ? current : next;
      });
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    if (containerRef.current) observer?.observe(containerRef.current);
    window.addEventListener('resize', onResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const persist = pos => {
    try { localStorage.setItem(LAUNCHER_STORAGE_KEY, JSON.stringify(pos)); }
    catch { /* mantém posição na sessão */ }
  };
  const move = next => {
    const clamped = clampLauncherPosition(next, viewport(), launcherSize(containerRef.current));
    setPosition(clamped);
    return clamped;
  };

  const startDrag = e => {
    if (dragRef.current || (e.button !== 0 && e.pointerType === 'mouse')) return;
    suppressToggleClick.current = false;
    const rect = containerRef.current.getBoundingClientRect();
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: rect.left, y: rect.top, last: null };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const duringDrag = e => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.last && Math.hypot(dx, dy) < 6) return;
    drag.last = move({ x: drag.x + dx, y: drag.y + dy });
  };
  const endDrag = e => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (e.type === 'pointerup') duringDrag(e);
    dragRef.current = null;
    suppressToggleClick.current = !!drag.last || e.type !== 'pointerup';
    if (drag.last) persist(drag.last);
  };
  const keyboardMove = e => {
    if (e.key === 'Home') {
      e.preventDefault();
      const next = defaultLauncherPosition(viewport(), launcherSize(containerRef.current));
      setPosition(next); persist(next); return;
    }
    const changes = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const dir = changes[e.key];
    if (!dir) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const step = e.shiftKey ? 48 : 18;
    const next = move({ x: rect.left + dir[0] * step, y: rect.top + dir[1] * step });
    persist(next);
  };

  return (
    <div ref={containerRef} hidden={hidden} className="qb-architect-launcher" data-expanded={expanded}
      style={{ position: 'fixed', left: position?.x ?? 16, top: position?.y ?? '55vh', zIndex: 60,
        display: hidden ? 'none' : 'flex', alignItems: 'stretch', isolation: 'isolate',
        borderRadius: 999, boxShadow: 'var(--shadow-raised)', border: '1px solid rgba(208,179,134,.6)',
        background: 'var(--qb-navy)', maxWidth: 'calc(100vw - 24px)' }}>
      <div id={controlsId} className="qb-architect-launcher__controls">
      <button type="button" className="qb-iconbtn"
        aria-label="Arrastar atalho do Arquiteto para outra posição"
        title="Arraste para mover. Use as setas do teclado; Home restaura a posição."
        onPointerDown={startDrag} onPointerMove={duringDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
        onKeyDown={keyboardMove}
        style={{ cursor: dragRef.current ? 'grabbing' : 'grab', touchAction: 'none', width: 42, minWidth: 42, minHeight: 48,
          borderRadius: '999px 0 0 999px', color: 'var(--qb-gold)' }}>
        <Icon name="grip-vertical" size={18} />
      </button>
      <button type="button" className="qb-btn qb-btn--primary"
        style={{ borderRadius: '0 999px 999px 0', minHeight: 48, boxShadow: 'none', padding: '0 15px 0 10px', whiteSpace: 'nowrap' }}
        onClick={onOpen}>
        <Icon name="sparkles" size={18} />O Arquiteto
      </button>
      </div>
      <button type="button" className="qb-iconbtn qb-architect-launcher__toggle"
        aria-expanded={expanded} aria-controls={controlsId}
        aria-label={expanded ? 'Recolher atalho do Arquiteto' : 'Expandir atalho do Arquiteto'}
        title="Toque para expandir ou recolher. Arraste para mover."
        onPointerDown={startDrag} onPointerMove={duringDrag} onPointerUp={endDrag}
        onPointerCancel={endDrag} onLostPointerCapture={endDrag} onKeyDown={keyboardMove}
        style={{ touchAction: 'none', cursor: 'grab' }}
        onClick={event => {
          if (event.detail !== 0 && suppressToggleClick.current) return;
          setExpanded(value => !value);
        }}>
        <Icon name={expanded ? 'chevron-left' : 'sparkles'} size={20} />
      </button>
    </div>
  );
}
export { ArchitectLauncher };
