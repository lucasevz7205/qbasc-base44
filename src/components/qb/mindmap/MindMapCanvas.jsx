import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { IconButton } from '@/components/qb/core/IconButton';
import { startDrag, moveDrag } from './pan-drag.js';
import { describePending } from '@/lib/mind-map-pending';

const MASTERY = {
  correct: ['circle-check', 'var(--state-correct)', 'Domínio demonstrado'],
  incorrect: ['circle-x', 'var(--state-incorrect)', 'Erros recentes'],
  'no-evidence': ['circle-dashed', 'var(--state-no-evidence)', 'Sem evidência'],
  insufficient: ['semicircle', 'var(--state-progress)', 'Dados insuficientes'],
  progress: ['loader-circle', 'var(--state-progress)', 'Em estudo'],
};

// Selo compacto: o detalhe da cota fica no title e no painel do conceito, não no nó.
function NodeRates({ performance }) {
  if (!performance) return null;
  if (performance.remaining) {
    const full = describePending(performance);
    return (
      <span className="qb-mm__badge" title={full} aria-label={full}>
        faltam {performance.remaining}
      </span>
    );
  }
  // Sem pendência: o nó fica só com título e ícone de estado; Q e FC vivem no painel do conceito.
  return null;
}

const BASE_RADII = [0, 300, 600, 900, 1200];

function buildTree(nodes) {
  const byId = {};
  const kids = {};
  nodes.forEach((n) => {
    byId[n.id] = n;
    kids[n.id] = [];
  });
  let root = null;
  nodes.forEach((n) => {
    if (n.parent && kids[n.parent]) kids[n.parent].push(n.id);
    else if (!n.parent) root = n.id;
  });
  return { byId, kids, root };
}

function computeInitialExpanded(nodes, tree, defaultExpanded, selectedId) {
  if (Array.isArray(defaultExpanded) && defaultExpanded.length) {
    return new Set(defaultExpanded);
  }
  const s = new Set();
  if (tree.root) s.add(tree.root);
  let cur = selectedId && tree.byId[selectedId] ? tree.byId[selectedId].parent : null;
  while (cur && tree.byId[cur]) {
    s.add(cur);
    cur = tree.byId[cur].parent;
  }
  return s;
}

function layout(tree, expanded, zoomSpread = 1) {
  const pos = {};
  if (!tree.root) return pos;

  const leaves = (id) =>
    expanded.has(id) && tree.kids[id]?.length
      ? tree.kids[id].reduce((s, k) => s + leaves(k), 0)
      : 1;

  // Count visible nodes per depth so dense rings expand their radius automatically
  const depthCounts = {};
  const countVisible = (id, depth) => {
    depthCounts[depth] = (depthCounts[depth] || 0) + 1;
    if (!expanded.has(id)) return;
    (tree.kids[id] || []).forEach((k) => countVisible(k, depth + 1));
  };
  countVisible(tree.root, 0);

  const ringRadius = (depth) => {
    if (depth === 0) return 0;
    const base = BASE_RADII[Math.min(depth, 4)] + Math.max(0, depth - 4) * 300;
    const count = depthCounts[depth] || 1;
    const minByCircumference = (count * 190) / (2 * Math.PI);
    return Math.max(base, minByCircumference) * zoomSpread;
  };

  const place = (id, depth, a0, a1, siblingIdx = 0, siblingCount = 1) => {
    const a = (a0 + a1) / 2;
    const baseR = ringRadius(depth);
    // Stagger adjacent siblings slightly when there are several to avoid horizontal label overlap
    const stagger = depth >= 1 && siblingCount >= 4 ? (siblingIdx % 2 === 0 ? -32 : 32) * zoomSpread : 0;
    const r = baseR + stagger;
    pos[id] = {
      x: r * Math.cos(a),
      y: r * Math.sin(a) * 0.86,
      depth,
    };
    if (!expanded.has(id)) return;
    const total = leaves(id);
    let cur = a0;
    const children = tree.kids[id] || [];
    children.forEach((k, idx) => {
      const span = ((a1 - a0) * leaves(k)) / total;
      place(k, depth + 1, cur, cur + span, idx, children.length);
      cur += span;
    });
  };

  place(tree.root, 0, -Math.PI / 2, Math.PI * 1.5, 0, 1);
  pos[tree.root] = { x: 0, y: 0, depth: 0 };
  return pos;
}

export default function MindMapCanvas({
  nodes = [],
  selectedId,
  onSelect,
  defaultExpanded,
  view: viewProp,
  onViewChange,
  focusPath = true,
  height = 560,
  maximized: maximizedProp,
  onToggleMaximize,
  style,
}) {
  const [localMaximized, setLocalMaximized] = React.useState(false);
  const isMaximized = maximizedProp !== undefined ? maximizedProp : localMaximized;
  const toggleMaximize = React.useCallback(() => {
    if (onToggleMaximize) {
      onToggleMaximize(!isMaximized);
    } else {
      setLocalMaximized((m) => !m);
    }
  }, [onToggleMaximize, isMaximized]);

  React.useEffect(() => {
    if (!isMaximized) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        toggleMaximize();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMaximized, toggleMaximize]);

  const tree = React.useMemo(() => buildTree(nodes), [nodes]);
  const [expanded, setExpanded] = React.useState(() =>
    computeInitialExpanded(nodes, tree, defaultExpanded, selectedId),
  );
  const [viewState, setViewState] = React.useState('map');
  const view = viewProp || viewState;
  const setView = (v) => {
    setViewState(v);
    onViewChange && onViewChange(v);
  };
  const [userZoom, setUserZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [box, setBox] = React.useState({ w: 860, h: height });
  const drag = React.useRef(null);
  const endDrag = () => {
    drag.current = null;
  };
  const wrapRef = React.useRef(null);
  const prevRootRef = React.useRef(tree.root);

  // Keep a single unified canvas space: when switching to another assunto/mapa, reset smoothly in place
  React.useEffect(() => {
    if (prevRootRef.current !== tree.root) {
      prevRootRef.current = tree.root;
      setExpanded(computeInitialExpanded(nodes, tree, defaultExpanded, selectedId));
      setUserZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [tree, nodes, defaultExpanded, selectedId]);

  // Ensure ancestors of selectedId are visible if navigated from outside
  React.useEffect(() => {
    if (!selectedId || !tree.byId[selectedId]) return;
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      if (tree.root && !next.has(tree.root)) {
        next.add(tree.root);
        changed = true;
      }
      let p = tree.byId[selectedId]?.parent;
      while (p && tree.byId[p]) {
        if (!next.has(p)) {
          next.add(p);
          changed = true;
        }
        p = tree.byId[p].parent;
      }
      return changed ? next : prev;
    });
  }, [selectedId, tree]);

  // Spacing between topics scales proportionally with zoom so zooming in also breathes out the layout
  const zoomSpread = React.useMemo(() => Math.pow(Math.max(0.5, userZoom), 0.35), [userZoom]);
  const pos = React.useMemo(() => layout(tree, expanded, zoomSpread), [tree, expanded, zoomSpread]);

  React.useEffect(() => {
    if (!wrapRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [view, isMaximized]);

  const pathSet = React.useMemo(() => {
    const s = new Set();
    let c = selectedId;
    while (c && tree.byId[c]) {
      s.add(c);
      c = tree.byId[c].parent;
    }
    return s;
  }, [selectedId, tree]);

  const isVisible = (id) => {
    let p = tree.byId[id] && tree.byId[id].parent;
    while (p) {
      if (!expanded.has(p)) return false;
      p = tree.byId[p].parent;
    }
    return true;
  };
  const visible = nodes.filter((n) => isVisible(n.id) && pos[n.id]);
  const bb = visible.reduce(
    (b, n) => {
      const p = pos[n.id];
      return {
        x0: Math.min(b.x0, p.x - 135),
        x1: Math.max(b.x1, p.x + 135),
        y0: Math.min(b.y0, p.y - 42),
        y1: Math.max(b.y1, p.y + 42),
      };
    },
    { x0: -180, x1: 180, y0: -120, y1: 120 },
  );

  const baseSpanX = (bb.x1 - bb.x0 || 1) / zoomSpread;
  const baseSpanY = (bb.y1 - bb.y0 || 1) / zoomSpread;
  const fit = Math.max(
    0.34,
    Math.min(
      1.05,
      (box.w - 88) / Math.max(baseSpanX, 360),
      (box.h - 120) / Math.max(baseSpanY, 280),
    ),
  );
  const zoom = fit * userZoom;
  const off = {
    x: (-(bb.x0 + bb.x1) / 2) * zoom,
    y: (-(bb.y0 + bb.y1) / 2) * zoom + 4,
  };

  const related = (id) =>
    !focusPath ||
    !selectedId ||
    pathSet.has(id) ||
    tree.byId[id]?.parent === selectedId ||
    (tree.byId[selectedId] && tree.byId[id]?.parent === tree.byId[selectedId].parent);

  const click = (n) => {
    if (tree.kids[n.id]?.length && (n.id === selectedId || !expanded.has(n.id))) {
      setExpanded((prev) => {
        const s = new Set(prev);
        if (s.has(n.id) && n.id === selectedId) {
          s.delete(n.id);
        } else {
          // If opening a top-level branch, collapse other top-level branches to prevent visual clutter
          if (n.parent === tree.root) {
            (tree.kids[tree.root] || []).forEach((sibId) => {
              if (sibId !== n.id) s.delete(sibId);
            });
          }
          s.add(n.id);
        }
        return s;
      });
    }
    onSelect && onSelect(n.id);
  };

  const allExpandableIds = React.useMemo(
    () => nodes.filter((n) => tree.kids[n.id]?.length).map((n) => n.id),
    [nodes, tree],
  );
  const isAllExpanded = allExpandableIds.length > 1 && allExpandableIds.every((id) => expanded.has(id));

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpanded(new Set(tree.root ? [tree.root] : []));
    } else {
      setExpanded(new Set(allExpandableIds));
    }
    setPan({ x: 0, y: 0 });
  };

  const centerOn = (id) => {
    const p = pos[id];
    if (p) setPan({ x: -p.x * zoom - off.x, y: -p.y * zoom - off.y });
  };

  const adjustZoom = React.useCallback((delta) => {
    setUserZoom((prev) => {
      const next = Math.max(0.45, Math.min(2.6, Math.round((prev + delta) * 100) / 100));
      const ratio = next / prev;
      setPan((p) => ({ x: p.x * ratio, y: p.y * ratio }));
      return next;
    });
  }, []);

  React.useEffect(() => {
    const canvas = wrapRef.current;
    if (view !== 'map' || !canvas) return;

    const onWheel = (event) => {
      event.preventDefault();
      if (event.deltaY !== 0) adjustZoom(event.deltaY < 0 ? 0.14 : -0.14);
    };

    // Cancel page scrolling while the wheel is used to zoom this canvas.
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [view, adjustZoom]);

  const toolbar = (
    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, alignItems: 'center', zIndex: 2 }}>
      {view === 'map' && allExpandableIds.length > 1 && (
        <button
          type="button"
          className="qb-tool"
          onClick={toggleExpandAll}
          aria-pressed={isAllExpanded}
          title={isAllExpanded ? 'Mostrar apenas ramos principais' : 'Expandir todos os subtópicos'}
        >
          <Icon name={isAllExpanded ? 'chevrons-up' : 'chevrons-down'} size={14} />
          {isAllExpanded ? 'Recolher subtópicos' : 'Expandir tudo'}
        </button>
      )}
      {isMaximized && (
        <button
          type="button"
          className="qb-tool qb-tool--accent"
          onClick={toggleMaximize}
          title="Sair da tela ampliada (Esc)"
        >
          <Icon name="x" size={14} />
          Fechar tela cheia
        </button>
      )}
      <div className="qb-seg" role="group" aria-label="Visualização">
        <button className="qb-seg__opt" aria-pressed={view === 'map'} onClick={() => setView('map')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="network" size={16} />
          Mapa
        </button>
        <button className="qb-seg__opt" aria-pressed={view === 'list'} onClick={() => setView('list')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="list" size={16} />
          Lista
        </button>
      </div>
    </div>
  );

  if (view === 'list') {
    const Row = ({ id, depth }) => {
      const n = tree.byId[id];
      const k = tree.kids[id];
      const open = expanded.has(id);
      const m = n.mastery && MASTERY[n.mastery];
      return (
        <li>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: depth * 22 }}>
            {k.length ? (
              <IconButton
                size="sm"
                icon={open ? 'chevron-down' : 'chevron-right'}
                label={open ? 'Recolher' : 'Expandir'}
                onClick={() =>
                  setExpanded((p) => {
                    const s = new Set(p);
                    open ? s.delete(id) : s.add(id);
                    return s;
                  })
                }
              />
            ) : (
              <span style={{ width: 36 }} />
            )}
            <button
              className="qb-navlink"
              aria-current={id === selectedId ? 'page' : undefined}
              onClick={() => onSelect && onSelect(id)}
              style={{ color: id === selectedId ? undefined : 'var(--text-primary)', fontWeight: depth < 2 ? 600 : 500 }}
            >
              {m && <Icon name={m[0]} size={15} color={m[1]} label={m[2]} />}
              {n.label}
              <NodeRates performance={n.performance} />
            </button>
          </div>
          {open && k.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {k.map((c) => (
                <Row key={c} id={c} depth={depth + 1} />
              ))}
            </ul>
          )}
        </li>
      );
    };
    return (
      <div className="qb-panel qb-panel--sunken" style={{ position: 'relative', height, overflow: 'auto', overscrollBehavior: 'contain', padding: '64px 16px 16px', ...style }}>
        {toolbar}
        <ul role="tree" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {tree.root && <Row id={tree.root} depth={0} />}
        </ul>
      </div>
    );
  }

  const gridStep = Math.max(18, Math.min(56, Math.round(32 * zoom)));

  return (
    <div
      ref={wrapRef}
      className="qb-panel qb-panel--sunken"
      style={{
        position: 'relative',
        height,
        overflow: 'hidden',
        overscrollBehavior: 'contain',
        padding: 0,
        touchAction: 'none',
        cursor: drag.current ? 'grabbing' : 'grab',
        backgroundImage:
          'radial-gradient(circle at 50% 50%,rgba(30,65,102,.55) 0%,rgba(16,28,45,0) 65%),radial-gradient(rgba(165,138,103,.16) 1px,transparent 1px)',
        backgroundSize: `100% 100%,${gridStep}px ${gridStep}px`,
        backgroundPosition: `0 0,${pan.x + off.x}px ${pan.y + off.y}px`,
        ...style,
      }}
      onPointerDown={(e) => {
        if (e.target.closest('button')) return;
        const d = startDrag(e, pan);
        if (!d) return;
        drag.current = d;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const r = moveDrag(drag.current, e);
        drag.current = r.drag;
        if (r.pan) setPan(r.pan);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onContextMenu={endDrag}
    >
      {toolbar}
      <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 2 }}>
        <span
          style={{
            padding: '3px 8px',
            borderRadius: 999,
            background: 'rgba(10,30,52,.85)',
            border: '1px solid var(--divider)',
            font: '500 11px/1.2 var(--font-mono)',
            color: 'var(--qb-gold)',
          }}
          title="Proporção de zoom"
        >
          {Math.round(userZoom * 100)}%
        </span>
        <IconButton variant="solid" size="sm" icon="zoom-in" label="Aproximar" onClick={() => adjustZoom(0.2)} />
        <IconButton variant="solid" size="sm" icon="zoom-out" label="Afastar" onClick={() => adjustZoom(-0.2)} />
        <IconButton
          variant="solid"
          size="sm"
          icon="maximize"
          pressed={isMaximized}
          label={isMaximized ? 'Restaurar tamanho da área de estudo (Esc)' : 'Ampliar área de estudo em tela cheia'}
          onClick={toggleMaximize}
        />
        <IconButton variant="solid" size="sm" icon="locate-fixed" label="Centralizar no nó selecionado" onClick={() => centerOn(selectedId || tree.root)} />
      </div>
      <div style={{ position: 'absolute', bottom: 14, left: 16, display: 'flex', gap: 14, flexWrap: 'wrap', zIndex: 2, font: '400 12px/1 var(--font-body)', color: 'var(--text-muted)' }}>
        {['correct', 'incorrect', 'progress', 'insufficient'].map((k) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name={MASTERY[k][0]} size={14} color={MASTERY[k][1]} />
            {MASTERY[k][2]}
          </span>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(${pan.x + off.x}px,${pan.y + off.y}px) scale(${zoom})`,
          transition: drag.current ? 'none' : 'transform var(--dur-slow) var(--ease-standard)',
        }}
      >
        <svg width="1" height="1" style={{ position: 'absolute', overflow: 'visible' }} aria-hidden="true">
          {visible
            .filter((n) => n.parent && pos[n.parent])
            .map((n) => {
              const a = pos[n.parent];
              const b = pos[n.id];
              const on = pathSet.has(n.id) && pathSet.has(n.parent);
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              return (
                <path
                  key={n.id}
                  d={`M${a.x},${a.y} Q${mx * 1.06},${my * 0.94} ${b.x},${b.y}`}
                  fill="none"
                  stroke={on ? 'var(--qb-gold-bright)' : 'rgba(165,138,103,.45)'}
                  strokeWidth={(on ? 2.2 : 1.35) / Math.max(0.65, Math.min(1.35, zoom))}
                  opacity={related(n.id) ? 1 : 0.35}
                />
              );
            })}
        </svg>
        {visible.map((n) => {
          const p = pos[n.id];
          const m = n.mastery && MASTERY[n.mastery];
          const hidden = !expanded.has(n.id) ? tree.kids[n.id].length : 0;
          const cls = [
            'qb-mm__node',
            p.depth === 0 && 'qb-mm__node--root',
            p.depth === 1 && 'qb-mm__node--l1',
            !related(n.id) && 'is-dim',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={n.id}
              className={cls}
              title={n.label}
              aria-selected={n.id === selectedId}
              aria-expanded={tree.kids[n.id].length ? expanded.has(n.id) : undefined}
              style={{
                left: p.x,
                top: p.y,
                width: 'max-content',
                maxWidth: p.depth === 0 ? 220 : 176,
                padding: p.depth === 0 ? '12px 18px' : '8px 12px',
              }}
              onClick={() => click(n)}
            >
              {m && <Icon name={m[0]} size={15} color={m[1]} label={m[2]} />}
              <span className="qb-mm__node-content">
                <span className="qb-mm__node-label">{n.label}</span>
                <NodeRates performance={n.performance} />
              </span>
              {hidden > 0 && (
                <span
                  style={{
                    font: '500 11px/1 var(--font-mono)',
                    flexShrink: 0,
                    color: 'var(--qb-gold)',
                    padding: '3px 6px',
                    borderRadius: 6,
                    background: 'rgba(208,179,134,.12)',
                  }}
                >
                  +{hidden}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export { MindMapCanvas };