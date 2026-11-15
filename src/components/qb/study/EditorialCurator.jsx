import React from "react";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/qb/core/Icon";
import { Button } from "@/components/qb/core/Button";
import { useRealStudy } from "@/lib/qb-real-data";
import { proposeEditorialRevision } from "@/lib/server-fns";
import { makeEditorialEntry } from "@/lib/editorial-overrides";

const ISSUES = [
  ["formulacao", "Má formulação"],
  ["gabarito", "Resposta / gabarito"],
  ["fundamentacao", "Fundamentação"],
  ["desatualizacao", "Possível desatualização"],
  ["outro", "Outra divergência"],
];

const Field = ({ title, value, onChange, rows = 3, readOnly = false }) => (
  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
    <span style={{ font: "600 13px/1.4 var(--font-body)", color: "var(--qb-gold)" }}>{title}</span>
    <textarea
      className="qb-input" value={value || ""} rows={rows} readOnly={readOnly}
      maxLength={6500} onChange={onChange ? e => onChange(e.target.value) : undefined}
      style={{ width: "100%", resize: readOnly ? "none" : "vertical", font: "400 15px/1.55 var(--font-body)", minHeight: 64 }}
    />
  </label>
);

/**
 * Aprovação editorial orientada pelo Claude Design (Ascensão).
 * A IA só propõe. Apenas clique explícito e confirmação salvam uma nova versão.
 */
export default function EditorialCurator({ kind, item, topicLabel, disabled = false }) {
  const requestProposal = useServerFn(proposeEditorialRevision);
  const { records, save } = useRealStudy();
  const versions = (records.curadoria || [])
    .filter(x => x.kind === kind && x.targetId === item.id && x.status === "aprovada")
    .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
  const previous = versions[0] || null;
  const [expanded, setExpanded] = React.useState(false);
  const [issue, setIssue] = React.useState("formulacao");
  const [note, setNote] = React.useState("");
  const [proposal, setProposal] = React.useState(null);
  const [approval, setApproval] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const isQuestion = kind === "question";
  const label = isQuestion ? "questão" : "flashcard";
  const current = isQuestion
    ? { id: item.id, statement: item.statement, key: item.key, explanation: item.explanation, basis: item.basis, origin: item.origin, node: item.node }
    : { id: item.id, front: item.front, back: item.back, basis: item.basis, node: item.node };

  const propose = async () => {
    if (generating || saving || disabled) return;
    setGenerating(true); setError(""); setNotice(""); setProposal(null); setApproval(false);
    try {
      const result = await requestProposal({ data: { kind, issue, note: note.trim(), topicLabel: String(topicLabel || item.topicId || "Assunto"), content: current } });
      setProposal(result);
    } catch (err) {
      setError(err?.message || "O Arquiteto não conseguiu produzir uma proposta verificável.");
    } finally { setGenerating(false); }
  };

  const change = (field, value) => setProposal(p => ({
    ...p, replacement: { ...p.replacement, [field]: value }
  }));

  const approve = async () => {
    if (!proposal || !approval || saving || disabled) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const entry = makeEditorialEntry({ kind, content: current, proposal, previous, issue, note });
      await save("curadoria", entry.id, entry);
      setNotice("Nova versão editorial aprovada e salva. O conteúdo original e o histórico foram preservados.");
      setProposal(null);
      setApproval(false);
    } catch (err) {
      setError(err?.message || "Não foi possível salvar a versão. O conteúdo original foi preservado.");
    } finally { setSaving(false); }
  };

  const editable = (title, name, rows = 3) => (
    <Field title={title} rows={rows} value={proposal?.replacement?.[name] || ""}
      onChange={v => change(name, v)} />
  );

  return (
    <section data-qb-editorial="true" className="qb-panel qb-panel--sunken"
      style={{ border: "1px solid rgba(165,138,103,.42)", borderRadius: 16, padding: expanded ? "18px clamp(14px,2.8vw,24px)" : "8px 14px" }}>
      <button type="button" onClick={() => setExpanded(o => !o)} aria-expanded={expanded}
        aria-label={(expanded ? "Recolher" : "Expandir") + " curadoria da " + label}
        style={{ display: "flex", alignItems: "center", gap: 11, background: "transparent", border: 0,
          color: "var(--qb-ivory)", cursor: "pointer", width: "100%", textAlign: "left", padding: "9px 2px", minHeight: 44 }}>
        <Icon name="sparkles" size={18} color="var(--qb-gold)" />
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ font: "600 15px/1.4 var(--font-body)" }}>O Arquiteto · Reformular {label}</strong>
          {previous && <span style={{ display: "block", font: "400 12px/1.4 var(--font-body)", color: "var(--qb-gold)" }}>
            Versão editorial {previous.version} aplicada · original preservado
          </span>}
        </span>
        <Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} color="var(--qb-gold)" />
      </button>
      {expanded && (
        <div style={{ display: "grid", gap: 16, paddingTop: 12, borderTop: "1px solid var(--divider)" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", font: "400 14px/1.55 var(--font-body)" }}>
            Identifique a falha. O Arquiteto propõe uma correção; você confere e decide se aplica.
            Nenhuma alteração é automática. Serviço: Gemini (API externa).
          </p>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8 }}>
            <legend style={{ font: "600 13px/1.4 var(--font-body)", color: "var(--qb-gold)", marginBottom: 8 }}>O que precisa ser corrigido?</legend>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ISSUES.map(([id, title]) => (
                <button type="button" key={id} onClick={() => setIssue(id)} aria-pressed={issue === id}
                  className="qb-chip" style={issue === id ? { color: "var(--qb-gold-bright)", borderColor: "var(--qb-gold)" } : undefined}>
                  {title}
                </button>
              ))}
            </div>
          </fieldset>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ font: "600 13px/1.4 var(--font-body)", color: "var(--qb-gold)" }}>Observações (opcional)</span>
            <textarea className="qb-input" rows={2} maxLength={500} value={note}
              onChange={e => setNote(e.target.value)} placeholder="Qual trecho está ambíguo ou precisa de revisão?"
              style={{ width: "100%", resize: "vertical", font: "400 15px/1.5 var(--font-body)" }} />
          </label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Button icon="sparkles" loading={generating} disabled={generating || saving || disabled} onClick={propose}>
              {generating ? "Analisando…" : "Analisar e propor reformulação"}
            </Button>
            <small style={{ color: "var(--text-muted)", font: "400 12px/1.45 var(--font-body)" }}>
              Envia somente este item e suas observações ao Google.
            </small>
          </div>
          {error && <p role="alert" style={{ color: "var(--state-incorrect, #efa69d)", margin: 0 }}>{error}</p>}
          {notice && <p role="status" style={{ color: "var(--qb-gold)", margin: 0 }}>{notice}</p>}
          {proposal && (
            <div style={{ display: "grid", gap: 14, background: "var(--surface)", border: "1px solid rgba(208,179,134,.4)",
              borderRadius: 14, padding: "clamp(12px,2vw,20px)" }}>
              <strong style={{ font: "600 17px/1.4 var(--font-heading)", color: "var(--qb-ivory)" }}>
                Revisão proposta · ainda não aplicada
              </strong>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--text-secondary)", font: "400 14px/1.6 var(--font-body)" }}>
                {proposal.parecer}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(250px,100%),1fr))", gap: 14 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <span className="qb-overline">Texto atual</span>
                  <Field readOnly title={isQuestion ? "Enunciado atual" : "Frente atual"} value={isQuestion ? item.statement : item.front} />
                  <Field readOnly title={isQuestion ? "Comentário atual" : "Verso atual"} value={isQuestion ? item.explanation : item.back} />
                  {isQuestion && <span style={{ color: "var(--text-muted)", font: "500 12px/1.5 var(--font-mono)" }}>Gabarito atual: {item.key}</span>}
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <span className="qb-overline">Proposta editável</span>
                  {editable(isQuestion ? "Enunciado proposto" : "Frente proposta", isQuestion ? "statement" : "front")}
                  {editable(isQuestion ? "Comentário proposto" : "Verso proposto", isQuestion ? "explanation" : "back")}
                  {editable("Referência informada", "basis", 2)}
                  {isQuestion && (
                    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                      <legend style={{ color: "var(--qb-gold)", font: "600 13px/1.5 var(--font-body)" }}>Gabarito proposto</legend>
                      <div className="qb-seg" role="group" aria-label="Gabarito da proposta">
                        {["C", "E"].map(k => <button key={k} type="button" aria-pressed={proposal.replacement.key === k}
                          className="qb-seg__opt" onClick={() => change("key", k)}>{k === "C" ? "Certo" : "Errado"}</button>)}
                      </div>
                    </fieldset>
                  )}
                </div>
              </div>
              <p style={{ margin: 0, font: "400 13px/1.5 var(--font-body)", color: "var(--text-secondary)" }}>
                Confirme a fonte antes de aceitar mudanças factuais ou de gabarito.
                O item reformulado conserva seu ID e remissões, mas deixa de ser a redação original da fonte.
              </p>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, font: "400 14px/1.5 var(--font-body)", color: "var(--text-primary)" }}>
                <input type="checkbox" checked={approval} onChange={e => setApproval(e.target.checked)}
                  style={{ marginTop: 4, accentColor: "var(--qb-gold)", minWidth: 18, minHeight: 18 }} />
                Revisei a proposta e a referência, e autorizo criar uma nova versão editorial deste {label}.
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button icon="check" disabled={!approval || saving || generating} loading={saving} onClick={approve}>
                  Aprovar e salvar nova versão
                </Button>
                <Button variant="secondary" icon="x" disabled={saving} onClick={() => { setProposal(null); setApproval(false); }}>
                  Descartar proposta
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
export { EditorialCurator };
