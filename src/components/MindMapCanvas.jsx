import React from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CircleX,
  Layers,
  List,
  LoaderCircle,
  LocateFixed,
  Maximize,
  Network,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Badge, Button, Panel } from "./DesignSystem";

const MASTERY = {
  correct: [CircleCheck, "var(--state-correct)", "Domínio demonstrado"],
  incorrect: [CircleX, "var(--state-incorrect)", "Erros recentes"],
  "no-evidence": [CircleDashed, "var(--state-no-evidence)", "Sem evidência"],
  progress: [LoaderCircle, "var(--state-progress)", "Em estudo"],
};

const RADII = [0, 175, 330, 470];

export function mindMapToCanvasNodes(mindMap) {
  if (!mindMap) return [];
  const nodes = [
    {
      id: "root",
      parent: null,
      label: mindMap.title || "Mapa Mental",
      summary: mindMap.explanation || "",
      mastery: "progress",
      path: [mindMap.title || "Mapa Mental"],
    },
  ];

  function walk(list, parentId, parentPath, depth) {
    if (!Array.isArray(list)) return;
    list.forEach((item, idx) => {
      const id = item.id || `${parentId}-${idx}`;
      const label = item.label || item.t || item.titulo || `Nó ${idx + 1}`;
      const path = [...parentPath, label];
      nodes.push({
        id,
        parent: parentId,
        label,
        summary: item.x || item.explicacao || "",
        mastery: item.mastery || (depth === 1 ? "progress" : "no-evidence"),
        path,
      });
      const kids =
        item.children || item.ramos || item.microtopicos || item.folhas || item.nos || [];
      walk(kids, id, path, depth + 1);
    });
  }

  walk(mindMap.branches, "root", [mindMap.title || "Mapa Mental"], 1);
  return nodes;
}

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

function layoutTree(tree, expanded) {
  const pos = {};
  const leaves = (id) =>
    expanded.has(id) && tree.kids[id].length
      ? tree.kids[id].reduce((s, k) => s + leaves(k), 0)
      : 1;

  const place = (id, depth, a0, a1) => {
    const a = (a0 + a1) / 2;
    const r = RADII[Math.min(depth, 3)] + Math.max(0, depth - 3) * 140;
    pos[id] = { x: r * Math.cos(a), y: r * Math.sin(a) * 0.74, depth };
    if (!expanded.has(id)) return;
    const total = leaves(id);
    let cur = a0;
    tree.kids[id].forEach((k) => {
      const span = ((a1 - a0) * leaves(k)) / total;
      place(k, depth + 1, cur, cur + span);
      cur += span;
    });
  };

  if (tree.root) {
    place(tree.root, 0, -Math.PI / 2, Math.PI * 1.5);
    pos[tree.root] = { x: 0, y: 0, depth: 0 };
  }
  return pos;
}

export function MindMapCanvas({ nodes = [], selectedId, onSelect, height = 540 }) {
  const tree = React.useMemo(() => buildTree(nodes), [nodes]);
  const [expanded, setExpanded] = React.useState(
    () =>
      new Set(
        nodes
          .filter((n) => !n.parent || !nodes.find((p) => p.id === n.parent)?.parent)
          .map((n) => n.id)
      )
  );

  React.useEffect(() => {
    setExpanded(
      new Set(
        nodes
          .filter((n) => !n.parent || !nodes.find((p) => p.id === n.parent)?.parent)
          .map((n) => n.id)
      )
    );
  }, [nodes]);

  const [view, setView] = React.useState("map");
  const [userZoom, setUserZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [box, setBox] = React.useState({ w: 800, h: height });
  const drag = React.useRef(null);
  const wrapRef = React.useRef(null);

  const pos = React.useMemo(() => layoutTree(tree, expanded), [tree, expanded]);

  React.useEffect(() => {
    if (!wrapRef.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) =>
      setBox({ w: e.contentRect.width, h: e.contentRect.height })
    );
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [view]);

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
        x0: Math.min(b.x0, p.x - 100),
        x1: Math.max(b.x1, p.x + 100),
        y0: Math.min(b.y0, p.y - 26),
        y1: Math.max(b.y1, p.y + 26),
      };
    },
    { x0: 0, x1: 0, y0: 0, y1: 0 }
  );

  const fit = Math.max(
    0.65,
    Math.min(
      1.15,
      (box.w - 32) / Math.max(200, bb.x1 - bb.x0),
      (box.h - 110) / Math.max(120, bb.y1 - bb.y0)
    )
  );
  const zoom = fit * userZoom;
  const off = {
    x: (-(bb.x0 + bb.x1) / 2) * zoom,
    y: (-(bb.y0 + bb.y1) / 2) * zoom + 4,
  };

  const related = (id) =>
    !selectedId ||
    pathSet.has(id) ||
    tree.byId[id].parent === selectedId ||
    (tree.byId[selectedId] && tree.byId[id].parent === tree.byId[selectedId].parent);

  const clickNode = (n) => {
    if (tree.kids[n.id].length && (n.id === selectedId || !expanded.has(n.id))) {
      setExpanded((prev) => {
        const s = new Set(prev);
        if (s.has(n.id) && n.id === selectedId) s.delete(n.id);
        else s.add(n.id);
        return s;
      });
    }
    onSelect?.(n.id);
  };

  const centerOn = (id) => {
    const p = pos[id];
    if (p) setPan({ x: -p.x * zoom - off.x, y: -p.y * zoom - off.y });
  };

  const reset = () => {
    setUserZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const toolbar = (
    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6, zIndex: 2 }}>
      <div className="qb-seg" role="group" aria-label="Visualização do mapa">
        <button
          type="button"
          className="qb-seg__opt"
          aria-pressed={view === "map"}
          onClick={() => setView("map")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Network size={15} />
          Mapa
        </button>
        <button
          type="button"
          className="qb-seg__opt"
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <List size={15} />
          Lista
        </button>
      </div>
    </div>
  );

  if (view === "list") {
    const Row = ({ id, depth }) => {
      const n = tree.byId[id];
      const k = tree.kids[id];
      const open = expanded.has(id);
      const m = n.mastery && MASTERY[n.mastery];
      const MIcon = m ? m[0] : null;
      return (
        <li>
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: depth * 22 }}>
            {k.length ? (
              <button
                type="button"
                className="qb-iconbtn qb-iconbtn--sm"
                aria-label={open ? "Recolher" : "Expandir"}
                onClick={() =>
                  setExpanded((p) => {
                    const s = new Set(p);
                    if (open) s.delete(id);
                    else s.add(id);
                    return s;
                  })
                }
              >
                {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
            ) : (
              <span style={{ width: 36 }} />
            )}
            <button
              type="button"
              className="qb-navlink"
              aria-current={id === selectedId ? "page" : undefined}
              onClick={() => onSelect?.(id)}
              style={{
                color: id === selectedId ? undefined : "var(--text-primary)",
                fontWeight: depth < 2 ? 600 : 500,
              }}
            >
              {MIcon ? <MIcon size={15} style={{ color: m[1] }} /> : null}
              {n.label}
            </button>
          </div>
          {open && k.length > 0 ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {k.map((c) => (
                <Row key={c} id={c} depth={depth + 1} />
              ))}
            </ul>
          ) : null}
        </li>
      );
    };

    return (
      <div
        className="qb-panel qb-panel--sunken"
        style={{ position: "relative", height, overflow: "auto", padding: "64px 16px 16px" }}
      >
        {toolbar}
        <ul role="tree" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {tree.root ? <Row id={tree.root} depth={0} /> : null}
        </ul>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="qb-panel qb-panel--sunken"
      style={{
        position: "relative",
        height,
        overflow: "hidden",
        padding: 0,
        touchAction: "none",
        cursor: drag.current ? "grabbing" : "grab",
        backgroundImage:
          "radial-gradient(circle at 50% 50%, rgba(30, 65, 102, 0.55) 0%, rgba(16, 28, 45, 0) 65%), radial-gradient(rgba(165, 138, 103, 0.14) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 28px 28px",
      }}
      onPointerDown={(e) => {
        if (e.target.closest("button")) return;
        drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current) setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
    >
      {toolbar}

      <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", flexDirection: "column", gap: 6, zIndex: 2 }}>
        <button type="button" className="qb-iconbtn qb-iconbtn--solid qb-iconbtn--sm" aria-label="Aproximar" onClick={() => setUserZoom((z) => Math.min(2.2, z + 0.2))}>
          <ZoomIn size={16} />
        </button>
        <button type="button" className="qb-iconbtn qb-iconbtn--solid qb-iconbtn--sm" aria-label="Afastar" onClick={() => setUserZoom((z) => Math.max(0.5, z - 0.2))}>
          <ZoomOut size={16} />
        </button>
        <button type="button" className="qb-iconbtn qb-iconbtn--solid qb-iconbtn--sm" aria-label="Enquadrar mapa" onClick={reset}>
          <Maximize size={16} />
        </button>
        <button type="button" className="qb-iconbtn qb-iconbtn--solid qb-iconbtn--sm" aria-label="Centralizar no nó" onClick={() => centerOn(selectedId || tree.root)}>
          <LocateFixed size={16} />
        </button>
      </div>

      <div style={{ position: "absolute", bottom: 14, left: 16, display: "flex", gap: 14, flexWrap: "wrap", zIndex: 2, font: "400 12px/1 var(--font-body)", color: "var(--text-muted)" }}>
        {["correct", "incorrect", "no-evidence"].map((k) => {
          const MIcon = MASTERY[k][0];
          return (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <MIcon size={14} style={{ color: MASTERY[k][1] }} />
              {MASTERY[k][2]}
            </span>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(${pan.x + off.x}px, ${pan.y + off.y}px) scale(${zoom})`,
          transition: drag.current ? "none" : "transform var(--dur-slow) var(--ease-standard)",
        }}
      >
        <svg width="1" height="1" style={{ position: "absolute", overflow: "visible" }} aria-hidden="true">
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
                  d={`M${a.x},${a.y} Q${mx * 1.05},${my * 0.95} ${b.x},${b.y}`}
                  fill="none"
                  stroke={on ? "var(--qb-gold-bright)" : "rgba(165, 138, 103, 0.45)"}
                  strokeWidth={on ? 2 : 1.25}
                  opacity={related(n.id) ? 1 : 0.35}
                />
              );
            })}
        </svg>

        {visible.map((n) => {
          const p = pos[n.id];
          const m = n.mastery && MASTERY[n.mastery];
          const MIcon = m ? m[0] : null;
          const hidden = !expanded.has(n.id) ? tree.kids[n.id].length : 0;
          const cls = [
            "qb-mm__node",
            p.depth === 0 && "qb-mm__node--root",
            p.depth === 1 && "qb-mm__node--l1",
            !related(n.id) && "is-dim",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={n.id}
              type="button"
              className={cls}
              aria-selected={n.id === selectedId}
              aria-expanded={tree.kids[n.id].length ? expanded.has(n.id) : undefined}
              style={{ left: p.x, top: p.y, width: "max-content" }}
              onClick={() => clickNode(n)}
            >
              {MIcon ? <MIcon size={15} style={{ color: m[1], flexShrink: 0 }} /> : null}
              <span style={{ whiteSpace: n.label.length > 24 ? "normal" : "nowrap" }}>{n.label}</span>
              {hidden > 0 ? (
                <span
                  style={{
                    font: "500 11px/1 var(--font-mono)",
                    color: "var(--qb-gold)",
                    padding: "3px 6px",
                    borderRadius: 6,
                    background: "rgba(208, 179, 134, 0.12)",
                  }}
                >
                  +{hidden}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ConceptPanel({ node, returnTo, onReturn, onReview }) {
  if (!node) return null;
  const m = node.mastery && MASTERY[node.mastery];
  return (
    <Panel variant="ornate" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      {returnTo && onReturn ? (
        <div>
          <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={onReturn}>
            Voltar à {returnTo}
          </Button>
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-muted)" }}>
        {(node.path || []).map((p, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <ChevronRight size={13} /> : null}
            <span>{p}</span>
          </React.Fragment>
        ))}
      </div>
      <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--text-primary)" }}>
        {node.label}
      </h3>
      {m ? (
        <div>
          <Badge tone={node.mastery === "progress" ? "attention" : node.mastery}>{m[2]}</Badge>
        </div>
      ) : null}
      <div>
        <div className="qb-overline" style={{ color: "var(--qb-gold)", marginBottom: 6 }}>
          Decodificação / Resumo
        </div>
        <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.65 }}>
          {node.summary || "Selecione um nó do mapa para visualizar a explicação detalhada."}
        </p>
      </div>
      {onReview ? (
        <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "var(--border-hairline)" }}>
          <Button variant="ghost" size="sm" icon={Layers} onClick={onReview}>
            Revisar flashcards relacionados
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
