import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Coffee,
  Eye,
  Focus,
  Info,
  Layers,
  Loader2,
  LocateFixed,
  Network,
  Pause,
  Play,
  Scale,
  ShieldAlert,
  Sparkles,
  Timer,
  X,
} from "lucide-react";

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

function fmtSessionTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function StudySessionHeader({
  subject,
  topic,
  current = 0,
  total = 0,
  unit = "Questão",
  elapsed = 0,
  focusMode = false,
  onToggleFocus,
  onBack,
  paused = false,
  onTogglePause,
  style,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        minHeight: 64,
        padding: "10px 16px",
        borderRadius: 14,
        border: "var(--border-hairline)",
        background: "var(--surface)",
        flexWrap: "wrap",
        ...style,
      }}
    >
      {onBack ? (
        <button type="button" className="qb-iconbtn qb-iconbtn--sm" aria-label="Voltar" onClick={onBack}>
          <ArrowLeft size={16} />
        </button>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: "1 1 180px" }}>
        <span className="qb-overline" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {subject}
        </span>
        <span
          style={{
            font: "400 18px/1.25 var(--font-heading)",
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {topic}
        </span>
      </div>
      {total > 0 ? (
        <div style={{ flex: "1 1 160px", maxWidth: 300 }}>
          <ProgressBar value={current} max={total} label={`${unit} ${current} de ${total}`} />
        </div>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          role="timer"
          aria-label={`Tempo de sessão ${fmtSessionTime(elapsed)}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 36,
            padding: "0 12px",
            borderRadius: 10,
            background: "var(--surface-sunken)",
            border: "var(--border-hairline)",
            font: "500 14px/1 var(--font-mono)",
            color: paused ? "var(--text-muted)" : "var(--text-primary)",
          }}
        >
          <Timer size={15} style={{ color: "var(--qb-gold)" }} aria-hidden="true" />
          {fmtSessionTime(elapsed)}
        </span>
        {onTogglePause ? (
          <button
            type="button"
            className="qb-iconbtn qb-iconbtn--sm"
            aria-label={paused ? "Retomar" : "Pausar"}
            onClick={onTogglePause}
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
        ) : null}
        {onToggleFocus ? (
          <button
            type="button"
            className="qb-iconbtn qb-iconbtn--sm"
            aria-label="Modo foco"
            aria-pressed={focusMode}
            style={focusMode ? { borderColor: "var(--qb-gold)", color: "var(--qb-gold-bright)" } : undefined}
            onClick={onToggleFocus}
          >
            <Focus size={15} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

const ALERT_TONES = {
  fatigue: { icon: Coffee, color: "var(--qb-gold-bright)", bg: "rgba(242,199,110,.07)", border: "rgba(242,199,110,.45)", label: "Pausa sugerida" },
  attention: { icon: Eye, color: "var(--qb-moonlight)", bg: "rgba(200,217,234,.06)", border: "rgba(200,217,234,.35)", label: "Atenção" },
  trap: { icon: ShieldAlert, color: "var(--state-incorrect)", bg: "rgba(238,138,124,.07)", border: "rgba(238,138,124,.45)", label: "Pegadinha frequente" },
  info: { icon: Info, color: "var(--qb-gold)", bg: "rgba(208,179,134,.06)", border: "rgba(208,179,134,.4)", label: "Dica" },
};

export function CognitiveAlertBanner({ tone = "fatigue", title, children, actions, onDismiss, style }) {
  const t = ALERT_TONES[tone] || ALERT_TONES.info;
  const ToneIcon = t.icon;
  return (
    <div
      role={tone === "trap" ? "alert" : "status"}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "14px 12px 14px 16px",
        borderRadius: 14,
        background: t.bg,
        border: `1px solid ${t.border}`,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: t.color,
          border: `1px solid ${t.border}`,
          background: "rgba(10,30,52,.5)",
        }}
      >
        <ToneIcon size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4, paddingTop: 2 }}>
        <span style={{ font: "600 12px/1.2 var(--font-body)", letterSpacing: ".14em", textTransform: "uppercase", color: t.color }}>
          {t.label}
        </span>
        {title ? <span style={{ font: "600 15px/1.35 var(--font-body)", color: "var(--text-primary)" }}>{title}</span> : null}
        {children ? <div style={{ font: "400 14px/1.5 var(--font-body)", color: "var(--text-secondary)" }}>{children}</div> : null}
        {actions ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>{actions}</div> : null}
      </div>
      {onDismiss ? (
        <button type="button" className="qb-iconbtn qb-iconbtn--sm" aria-label="Dispensar aviso" onClick={onDismiss}>
          <X size={15} />
        </button>
      ) : null}
    </div>
  );
}

export function FeedbackDrawer({
  open = false,
  onClose,
  result,
  answerKey,
  explanation,
  legalBasis,
  trap,
  concept,
  onOpenConcept,
  onFlashcards,
}) {
  const [showTrap, setShowTrap] = React.useState(result === "incorrect");
  React.useEffect(() => {
    setShowTrap(result === "incorrect");
  }, [result, answerKey]);
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: "var(--z-drawer)", display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(8,10,15,.6)" }} />
      <aside
        role="dialog"
        aria-label="Correção da questão"
        style={{
          position: "relative",
          width: "min(460px, 100%)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          borderLeft: "1px solid rgba(208,179,134,.45)",
          boxShadow: "var(--shadow-drawer)",
          animation: "qb-rise var(--dur-slow) var(--ease-enter)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px 12px 24px",
            borderBottom: "1px solid var(--divider)",
          }}
        >
          <span className="qb-overline">Correção</span>
          {onClose ? (
            <button type="button" className="qb-iconbtn qb-iconbtn--sm" aria-label="Fechar correção" onClick={onClose}>
              <X size={16} />
            </button>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, padding: 24, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--qb-gold)",
                font: "600 26px/1 var(--font-display)",
                color: "var(--qb-gold)",
                flexShrink: 0,
              }}
            >
              {answerKey}
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
              <span style={{ font: "400 22px/1.2 var(--font-heading)", color: "var(--text-primary)" }}>
                Gabarito: {answerKey === "C" ? "Certo" : "Errado"}
              </span>
              {result ? (
                <Badge tone={result === "correct" ? "correct" : result === "incorrect" ? "incorrect" : "attention"}>
                  {result === "correct" ? "Você acertou" : result === "incorrect" ? "Você errou" : "Em branco"}
                </Badge>
              ) : null}
            </div>
          </div>

          {explanation ? (
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, font: "600 12px/1.2 var(--font-body)", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--qb-gold)" }}>
                <Scale size={15} /> Fundamento
              </h3>
              <p style={{ margin: 0, font: "400 16px/1.65 var(--font-body)", color: "var(--text-secondary)" }}>{explanation}</p>
              {legalBasis ? <span style={{ font: "500 13px/1.4 var(--font-mono)", color: "var(--text-muted)" }}>{legalBasis}</span> : null}
            </section>
          ) : null}

          {trap ? (
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, font: "600 12px/1.2 var(--font-body)", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--qb-gold)" }}>
                <ShieldAlert size={15} /> Mecanismo da pegadinha
              </h3>
              {showTrap ? (
                <div style={{ padding: 16, borderRadius: 12, background: "var(--surface-sunken)", border: "1px solid var(--divider)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ font: "600 15px/1.3 var(--font-body)", color: "var(--text-primary)" }}>{trap.name}</span>
                  {trap.description ? <span style={{ font: "400 15px/1.6 var(--font-body)", color: "var(--text-secondary)" }}>{trap.description}</span> : null}
                </div>
              ) : (
                <button type="button" className="qb-linkbtn" onClick={() => setShowTrap(true)}>
                  <ChevronDown size={16} /> Ver como o item tenta induzir ao erro
                </button>
              )}
            </section>
          ) : null}

          {concept ? (
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, font: "600 12px/1.2 var(--font-body)", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--qb-gold)" }}>
                <Network size={15} /> Conceito no mapa
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, font: "400 14px/1.4 var(--font-body)", color: "var(--text-muted)" }}>
                {(concept.path || []).map((p, i) => (
                  <React.Fragment key={i}>
                    {i > 0 ? <ChevronRight size={14} /> : null}
                    <span style={i === concept.path.length - 1 ? { color: "var(--text-primary)", fontWeight: 500 } : undefined}>{p}</span>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {onOpenConcept ? (
                  <Button variant="secondary" size="sm" icon={LocateFixed} onClick={onOpenConcept}>
                    Abrir nó exato
                  </Button>
                ) : null}
                {onFlashcards ? (
                  <Button variant="ghost" size="sm" icon={Layers} onClick={onFlashcards}>
                    Revisar flashcards
                  </Button>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export function WelcomeScreen({ onLogin, onEnterDemo }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", isolation: "isolate", display: "flex", alignItems: "center" }}>
      <div
        className="qb-img qb-scene-night"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, backgroundPosition: "65% 40%", zIndex: -2 }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -1,
          background:
            "linear-gradient(90deg, rgba(10,30,52,.97) 0%, rgba(10,30,52,.9) 34%, rgba(10,30,52,.45) 62%, rgba(10,30,52,.12) 100%), linear-gradient(180deg, rgba(10,30,52,0) 60%, rgba(10,30,52,.85) 100%)",
        }}
      />
      <main style={{ width: "100%", maxWidth: 1240, margin: "0 auto", padding: "clamp(24px,5vw,64px)" }}>
        <div style={{ maxWidth: 440, display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
            <img
              src="/assets/logo/mark-q-sword-transparent.png"
              alt="Emblema Quebrando a Banca"
              width={96}
              height={96}
              style={{ width: 96, height: 96, objectFit: "contain" }}
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(26px, 3.2vw, 34px)",
                letterSpacing: "0.06em",
                color: "var(--qb-gold)",
                textTransform: "uppercase",
                lineHeight: 1.1,
              }}
            >
              Quebrando a Banca
            </span>
          </div>

          <p style={{ margin: 0, font: "italic 500 22px/1.35 var(--font-heading)", color: "var(--qb-parchment)" }}>
            Conhecimento · Estratégia · Disciplina · Conquista
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Button type="button" size="lg" icon={ArrowRight} onClick={onLogin}>
              Entrar na minha conta Base44
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={onEnterDemo}>
              Explorar em modo demonstração
            </Button>
          </div>

          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Conecte-se à sua conta Base44 para carregar seu Controle de Estudo real ou explore localmente em demonstração.
          </p>
        </div>
      </main>
    </div>
  );
}
