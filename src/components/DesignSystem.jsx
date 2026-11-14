import React from "react";
import { Loader2, Sparkles } from "lucide-react";

export function Panel({ children, variant = "default", className = "", style, ...rest }) {
  const variantClass =
    variant === "sunken"
      ? "qb-panel--sunken"
      : variant === "glass"
        ? "qb-panel--glass"
        : variant === "ornate"
          ? "qb-panel--ornate"
          : "";
  return (
    <div className={`qb-panel ${variantClass} ${className}`.trim()} style={style} {...rest}>
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  className = "",
  disabled,
  type = "button",
  ...rest
}) {
  const sizeClass = size === "sm" ? "qb-btn--sm" : size === "lg" ? "qb-btn--lg" : "";
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`qb-btn qb-btn--${variant} ${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {loading ? (
        <Loader2 size={16} className="qb-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon size={16} aria-hidden="true" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}

export function Badge({ children, tone = "neutral", icon: Icon, className = "" }) {
  return (
    <span className={`qb-badge qb-badge--${tone} ${className}`.trim()}>
      {Icon ? <Icon size={13} aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  );
}

export function ProgressBar({
  value = 0,
  max = 100,
  label,
  showPercent = true,
  height = 8,
  color = "var(--state-progress)",
}) {
  const safeMax = max > 0 ? max : 100;
  const pct = Math.max(0, Math.min(100, Math.round((value / safeMax) * 100)));

  return (
    <div>
      {(label || showPercent) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
            gap: 8,
          }}
        >
          {label ? <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span> : <span />}
          {showPercent ? (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--qb-gold)" }}>
              {pct}%
            </span>
          ) : null}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progresso"}
        style={{
          height,
          borderRadius: "var(--radius-pill)",
          background: "var(--state-progress-track)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "var(--radius-pill)",
            background: color,
            transition: "width var(--dur-slow) var(--ease-standard)",
          }}
        />
      </div>
    </div>
  );
}

/**
 * Cabeçalho principal da marca: exibe apenas "Quebrando a Banca" e o emblema Q+espada.
 */
export function BrandHeader({ navItems = [], activeNav, onSelectNav, rightSlot, isDemo = false }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: "var(--z-header)",
        minHeight: "var(--header-h)",
        background: "rgba(10, 30, 52, 0.92)",
        backdropFilter: "var(--blur-glass)",
        WebkitBackdropFilter: "var(--blur-glass)",
        borderBottom: "var(--border-hairline)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--content-max)",
          margin: "0 auto",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <img
            src="/assets/logo/mark-q-sword-transparent.png"
            alt="Emblema Quebrando a Banca"
            width={36}
            height={36}
            style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }}
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 16,
              letterSpacing: "0.05em",
              color: "var(--qb-gold)",
              textTransform: "uppercase",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            Quebrando a Banca
          </span>
          {isDemo ? <Badge tone="attention">Demo</Badge> : null}
        </div>

        <nav aria-label="Navegação principal" style={{ display: "flex", alignItems: "center", gap: 2, overflowX: "auto" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className="qb-navlink"
                style={{ padding: "0 10px", fontSize: 13 }}
                aria-current={activeNav === item.id ? "page" : undefined}
                onClick={() => onSelectNav?.(item.id)}
              >
                {Icon ? <Icon size={15} aria-hidden="true" /> : null}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{rightSlot}</div>
      </div>
    </header>
  );
}

export function HeroAscension({
  eyebrow = "A Ascensão · Jornada ARR",
  title,
  subtitle,
  progress = 0,
  primaryAction,
  secondaryAction,
  metrics = [],
}) {
  return (
    <section
      className="qb-panel qb-panel--ornate"
      style={{ position: "relative", overflow: "hidden", minHeight: 245, display: "flex", alignItems: "stretch" }}
    >
      <div
        aria-hidden="true"
        className="qb-img qb-scene-sunset"
        style={{ position: "absolute", inset: 0, opacity: 0.48, backgroundPosition: "center right" }}
      />
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: "var(--gradient-scene-protect)" }}
      />
      <div className="qb-hero-grid">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Sparkles size={14} style={{ color: "var(--qb-gold-bright)" }} aria-hidden="true" />
            <span className="qb-overline" style={{ color: "var(--qb-gold)" }}>
              {eyebrow}
            </span>
          </div>
          <h1
            style={{
              margin: "0 0 10px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(24px, 3vw, 34px)",
              lineHeight: 1.2,
              color: "var(--qb-ivory)",
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p style={{ margin: "0 0 18px", color: "var(--text-secondary)", maxWidth: "60ch", fontSize: 15 }}>
              {subtitle}
            </p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {primaryAction}
            {secondaryAction}
          </div>
        </div>

        <Panel variant="glass" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <ProgressBar value={progress} max={100} label="Cobertura do edital" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {metrics.map((m) => (
              <div
                key={m.label}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(16, 28, 45, 0.72)",
                  border: "var(--border-hairline)",
                }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: m.accent || "var(--qb-ivory)" }}>
                  {m.value}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

export function RadialNavigation({ items = [], activeId, onSelect }) {
  const positions = [
    { top: "10%", left: "50%" },
    { top: "36%", left: "87%" },
    { top: "82%", left: "73%" },
    { top: "82%", left: "27%" },
    { top: "36%", left: "13%" },
  ];

  return (
    <div>
      <div
        className="qb-radial-desktop"
        style={{ position: "relative", width: "100%", maxWidth: 460, height: 410, margin: "8px auto 0" }}
      >
        <div
          aria-hidden="true"
          className="qb-img qb-artifact-disc"
          style={{
            position: "absolute",
            top: "54%",
            left: "50%",
            width: 118,
            height: 118,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "1px solid rgba(208, 179, 134, 0.55)",
            boxShadow: "var(--glow-gold)",
          }}
        />
        {items.slice(0, 5).map((item, idx) => {
          const pos = positions[idx] || positions[0];
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className="qb-radial__node"
              style={{ top: pos.top, left: pos.left }}
              aria-current={activeId === item.id ? "true" : undefined}
              onClick={() => onSelect?.(item.id)}
            >
              <span className="qb-radial__orb">{Icon ? <Icon size={24} aria-hidden="true" /> : null}</span>
              <span className="qb-radial__label">{item.label}</span>
              {item.meta ? <span className="qb-radial__meta">{item.meta}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="qb-radial-mobile" style={{ display: "none", flexDirection: "column", gap: 10 }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" className="qb-radial__row" onClick={() => onSelect?.(item.id)}>
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--surface-sunken)",
                  border: "var(--border-hairline)",
                  color: "var(--qb-gold)",
                  flexShrink: 0,
                }}
              >
                {Icon ? <Icon size={18} aria-hidden="true" /> : null}
              </span>
              <span style={{ flex: 1 }}>
                <strong style={{ display: "block", fontSize: 15 }}>{item.label}</strong>
                {item.meta ? <small style={{ color: "var(--text-muted)", fontSize: 12 }}>{item.meta}</small> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const EMBLEMS = {
  soldado: "/assets/emblems/emblem-soldado.png",
  sabio: "/assets/emblems/emblem-sabio.png",
  estrategista: "/assets/emblems/emblem-estrategista.png",
  ascensao: "/assets/emblems/emblem-ascensao.png",
};

export function AchievementEmblem({ id = "soldado", title, subtitle, unlocked = true, size = 60 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: unlocked ? 1 : 0.45 }}>
      <img
        src={EMBLEMS[id] || EMBLEMS.soldado}
        alt={title || id}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "var(--radius-emblem)",
          objectFit: "cover",
          border: unlocked ? "1px solid rgba(242, 199, 110, 0.55)" : "var(--border-hairline)",
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--qb-ivory)" }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{subtitle}</div> : null}
      </div>
    </div>
  );
}
