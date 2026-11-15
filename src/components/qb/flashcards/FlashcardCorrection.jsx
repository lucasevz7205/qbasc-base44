import React from "react";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/qb/core/Icon";
import { Button } from "@/components/qb/core/Button";
import { correctFlashcardWithArchitect } from "@/lib/server-fns";
import { ChatMarkdown } from "@/components/qb/tutor/ChatMarkdown";
import { extractFlashcardSuggestion, FLASHCARD_RATINGS } from "@/lib/flashcard-review";

/**
 * Extensão visual do Flashcard da Ascensão:
 * resposta livre -> correção fundamentada -> autoavaliação SRS humana.
 * Nenhuma escrita em registros nem chamada automática da IA.
 */
export default function FlashcardCorrection({ card, topicLabel, onSuggestion }) {
  const correct = useServerFn(correctFlashcardWithArchitect);
  const [expanded, setExpanded] = React.useState(false);
  const [attempt, setAttempt] = React.useState("");
  const [feedback, setFeedback] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [editedSinceFeedback, setEditedSinceFeedback] = React.useState(false);
  const active = React.useRef(false);
  React.useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const suggestion = editedSinceFeedback ? null : extractFlashcardSuggestion(feedback);
  const suggestionLabel = FLASHCARD_RATINGS.find(x => x.id === suggestion)?.label;

  const submit = async event => {
    event.preventDefault();
    if (pending || attempt.trim().length < 8) return;
    setError("");
    setFeedback("");
    onSuggestion?.(null);
    setPending(true);
    try {
      const result = await correct({
        data: {
          cardId: String(card.id),
          topicLabel: String(topicLabel || card.topicId || "Flashcards"),
          front: String(card.front || ""),
          back: String(card.back || ""),
          basis: String(card.basis || ""),
          nodeId: String(card.node || ""),
          attempt: attempt.trim(),
        },
      });
      if (!active.current) return;
      const reply = String(result?.reply || "A IA não retornou uma análise.");
      setFeedback(reply);
      setEditedSinceFeedback(false);
      onSuggestion?.(extractFlashcardSuggestion(reply));
    } catch (err) {
      if (!active.current) return;
      setError(err?.message || "A correção não ficou disponível. Confira a chave Gemini no QBAsc.");
    } finally {
      if (active.current) setPending(false);
    }
  };

  return (
    <section aria-label="Correção com O Arquiteto" className="qb-panel qb-panel--sunken"
      style={{ padding: expanded ? "clamp(16px,2.5vw,24px)" : "8px 14px", display: "grid", gap: 12,
        border: "1px solid rgba(208,179,134,.36)", borderRadius: "var(--radius-lg,16px)" }}>
      <button type="button" aria-expanded={expanded} aria-label={expanded ? "Recolher correção ativa" : "Expandir correção ativa"}
        onClick={() => setExpanded(v => !v)}
        style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", width: "100%", minHeight: 44,
          textAlign: "left", border: 0, color: "var(--text-primary)", background: "transparent", cursor: "pointer", padding: "8px 2px" }}>
        <Icon name="sparkles" size={20} color="var(--qb-gold)" />
        <div style={{ flex: 1, minWidth: 160 }}>
          <h2 style={{ margin: 0, font: "var(--type-h3)", color: "var(--text-primary)" }}>O Arquiteto · Correção ativa</h2>
          <p style={{ margin: "5px 0 0", font: "400 13px/1.5 var(--font-body)", color: "var(--text-muted)" }}>
            Responda de memória. O tutor compara com o verso e a fonte deste cartão.
          </p>
        </div>
        <Icon name={expanded ? "chevron-up" : "chevron-down"} size={19} color="var(--qb-gold)" />
      </button>
      {expanded && <>
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <label htmlFor="qb-flash-attempt" style={{ font: "600 14px/1.5 var(--font-body)", color: "var(--text-secondary)" }}>
          Sua resposta, antes de consultar o verso
        </label>
        <textarea
          id="qb-flash-attempt"
          className="qb-input"
          rows={3}
          value={attempt}
          maxLength={3000}
          placeholder="Escreva a regra ou explique o conceito com suas palavras…"
          onChange={e => { setAttempt(e.target.value); if (feedback) { setEditedSinceFeedback(true); onSuggestion?.(null); } }}
          disabled={pending}
          style={{ width: "100%", resize: "vertical", minHeight: 96, lineHeight: 1.6, fontFamily: "var(--font-body)" }}
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)", font: "400 12px/1.5 var(--font-body)" }}>
            Ao corrigir, sua resposta e o conteúdo do cartão são enviados à API Gemini.
          </span>
          <Button type="submit" icon="sparkles" loading={pending} disabled={pending || attempt.trim().length < 8}>
            {pending ? "Corrigindo…" : "Corrigir com O Arquiteto"}
          </Button>
        </div>
      </form>
      {error && <p role="alert" style={{ margin: 0, color: "var(--state-incorrect, #f2a699)", font: "400 14px/1.5 var(--font-body)" }}>{error}</p>}
      {feedback && (
        <div role="status" aria-live="polite" style={{ display: "grid", gap: 8, padding: 16,
          background: "var(--surface)", borderRadius: 12, border: "1px solid rgba(208,179,134,.3)" }}>
          <strong style={{ color: "var(--qb-gold)", font: "600 15px/1.4 var(--font-body)" }}>
            Análise do Arquiteto{editedSinceFeedback ? " (referente à resposta anterior)" : ""}
          </strong>
          {suggestionLabel && <span style={{ color: "var(--qb-gold)" }}>Avaliação sugerida: <strong>{suggestionLabel}</strong></span>}
          <div className="qb-chat-format" style={{ color: "var(--text-secondary)", font: "400 15px/1.65 var(--font-body)" }}>
            <ChatMarkdown text={feedback} />
          </div>
          <small style={{ color: "var(--text-muted)", font: "400 12px/1.5 var(--font-body)" }}>
            A correção não altera automaticamente o gabarito nem sua avaliação de revisão espaçada.
          </small>
        </div>
      )}
      </>}
    </section>
  );
}
export { FlashcardCorrection };