import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { clampLauncherPosition, defaultLauncherPosition, LAUNCHER_STORAGE_KEY } from '@/lib/architect-launcher-position';

function viewport() { return { width: window.innerWidth, height: window.innerHeight }; }
function launcherSize(node) { return { width: node?.offsetWidth || 190, height: node?.offsetHeight || 52 }; }

export default function ArchitectLauncher({ onOpen, hidden }) {
  const containerRef = React.useRef(null);
  const dragRef = React.useRef(null);
  const [position, setPosition] = React.useState(null);

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
      setPosition(current => clampLauncherPosition(current || place, viewport(), launcherSize(containerRef.current)));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: rect.left, y: rect.top };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const duringDrag = e => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    move({ x: drag.x + e.clientX - drag.startX, y: drag.y + e.clientY - drag.startY });
  };
  const endDrag = e => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const next = move({ x: drag.x + e.clientX - drag.startX, y: drag.y + e.clientY - drag.startY });
    dragRef.current = null;
    persist(next);
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
    <div ref={containerRef} hidden={hidden}
      style={{ position: 'fixed', left: position?.x ?? 16, top: position?.y ?? '55vh', zIndex: 60,
        display: hidden ? 'none' : 'flex', alignItems: 'stretch', isolation: 'isolate',
        borderRadius: 999, boxShadow: 'var(--shadow-raised)', border: '1px solid rgba(208,179,134,.6)',
        background: 'var(--qb-navy)', maxWidth: 'calc(100vw - 24px)' }}>
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
  );
}
export { ArchitectLauncher };
