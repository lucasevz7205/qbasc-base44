import React from "react";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/qb/core/Icon";
import { Button } from "@/components/qb/core/Button";
import { ConfirmDialog } from "@/components/qb/feedback/ConfirmDialog";
import { useRealStudy } from "@/lib/qb-real-data";
import { proposeEditorialRevision } from "@/lib/server-fns";
import { compareEditorialVersions, makeEditorialEntry, makeDirectQuestionOverwrite } from "@/lib/editorial-overrides";
import { questionQualityProblems, itemFromDisplayedQuestion } from "@/lib/item-quality";
import { mechanismOptions } from "@/lib/question-feedback";

const ISSUES = [
  ["formulacao", "Má formulação"],
  ["gabarito", "Resposta / gabarito"],
  ["fundamentacao", "Fundamentação"],
  ["desatualizacao", "Possível desatualização"],
  ["outro", "Outra divergência"],
];

const GAP_LABELS = {
  mecanismo_ausente: "mecanismo ausente",
  mecanismo_incompativel: "mecanismo incompatível com o gabarito",
  correcao_minima_ausente: "correção mínima / vacina ausente",
  comentario_curto: "comentário curto",
  comentario_igual_referencia: "comentário igual à referência",
  comentario_repete_enunciado: "comentário repete o enunciado",
};

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
export default function EditorialCurator({ kind, item, topicLabel, subjectName, disabled = false }) {
  const requestProposal = useServerFn(proposeEditorialRevision);
  const { records, save, isAdmin, savePersonalQuestionRevision } = useRealStudy();
  const versions = (records.curadoria || [])
    .filter(x => x.kind === kind && x.targetId === item.id && ["aprovada", "sobrescrita"].includes(x.status))
    .sort(compareEditorialVersions);
  const previous = versions[0] || null;
  const [expanded, setExpanded] = React.useState(false);
  const [issue, setIssue] = React.useState("formulacao");
  const [note, setNote] = React.useState("");
  const [proposal, setProposal] = React.useState(null);
  const [approval, setApproval] = React.useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const isQuestion = kind === "question";
  const label = isQuestion ? "questão" : "flashcard";
  const displayedQuestion = isQuestion ? itemFromDisplayedQuestion(item) : null;
  const current = displayedQuestion
    ? { id: item.id, ...displayedQuestion, origin: item.origin, node: item.node }
    : { id: item.id, front: item.front, back: item.back, basis: item.basis, node: item.node };

  const propose = async () => {
    if (generating || saving || disabled) return;
    setGenerating(true); setError(""); setNotice(""); setProposal(null); setApproval(false);
    try {
      const result = await requestProposal({ data: { kind, issue, note: note.trim(), topicLabel: String(topicLabel || item.topicId || "Assunto").slice(0, 300), subjectName, content: isAdmin ? current : { id: item.id } } });
      setProposal(result);
    } catch (err) {
      setError(err?.message || "O Arquiteto não conseguiu produzir uma proposta verificável.");
    } finally { setGenerating(false); }
  };

  const change = (field, value) => setProposal(p => ({
    ...p, replacement: { ...p.replacement, [field]: value }
  }));

  // Portão de qualidade: item sem mecanismo, correção mínima ou comentário de verdade não é salvo.
  const quality = isQuestion && proposal ? questionQualityProblems({ ...proposal.replacement }) : { problems: [], warnings: [] };
  const itemGaps = displayedQuestion ? questionQualityProblems(displayedQuestion).problems : [];
  const blocked = quality.problems.length > 0;

  const overwriteOriginal = async () => {
    if (!isAdmin || !isQuestion || !proposal || !approval || saving || disabled || !item.raw || blocked) return;
    setConfirmOverwrite(false);
    setSaving(true); setError(""); setNotice("");
    try {
      // Respostas já registradas, SRS, rodadas e remissões ficam intactos.
      const { backup, updatedQuestion } = makeDirectQuestionOverwrite({
        question: item, proposal, previous, issue, note,
      });
      // Cópia de segurança obrigatória antes de gravar sobre o registro anterior.
      await save("curadoria", backup.id, backup);
      await save("questoes", item.id, updatedQuestion);
      setNotice("Questão anterior substituída no banco, com o mesmo ID. A cópia anterior ficou salva na curadoria; acertos e erros anteriores não foram alterados.");
      setProposal(null);
      setApproval(false);
    } catch (err) {
      setError("A substituição não foi concluída: " + (err?.message || "falha ao salvar") +
        ". A operação não altera respostas anteriores. Se a cópia de segurança tiver sido criada, ela permanece disponível.");
    } finally { setSaving(false); }
  };

  const approve = async () => {
    if (!proposal || !approval || saving || disabled || blocked) return;
    setSaving(true); setError(""); setNotice("");
    try {
      if (isAdmin) {
        const entry = makeEditorialEntry({ kind, content: current, proposal, previous, issue, note });
        await save("curadoria", entry.id, entry);
      } else {
        await savePersonalQuestionRevision({
          questionId: item.id, baseRevision: proposal.baseRevision ?? null, issue, note,
          proposal: { parecer: proposal.parecer, replacement: proposal.replacement },
        });
      }
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
        <Icon name="astrolabe" size={24} color="var(--qb-gold)" />
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ font: "600 15px/1.4 var(--font-body)" }}>O Arquiteto · Reformular {label}</strong>
          {itemGaps.length > 0 && <span style={{ display: "block", font: "400 12px/1.4 var(--font-body)", color: "var(--state-incorrect, #efa69d)" }}>
            Fora do padrão: {itemGaps.length === 1 ? "1 pendência" : itemGaps.length + " pendências"} ({itemGaps.map(p => GAP_LABELS[p.code] || p.code).join(", ")}). Peça uma reformulação.
          </span>}
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
            Nenhuma alteração é automática. Serviço: Base44 (créditos de integração).
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
                    <>
                      <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                        <span style={{ font: "600 13px/1.4 var(--font-body)", color: "var(--qb-gold)" }}>Mecanismo de falsificação</span>
                        <select className="qb-input" value={proposal.replacement.mecanismo || ""}
                          onChange={e => change("mecanismo", e.target.value)} style={{ minHeight: 44 }}>
                          <option value="">Escolha o mecanismo…</option>
                          {mechanismOptions(proposal.replacement.key).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </label>
                      {editable("Trecho decisivo (literal da fonte)", "trechoDecisivo", 2)}
                      {editable("Correção mínima (como o item seria falsificado, ou a versão correta)", "correcaoMinima", 2)}
                    </>
                  )}
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
              {isQuestion && (quality.problems.length > 0 || quality.warnings.length > 0) && (
                <ul role="status" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4, font: "400 13px/1.5 var(--font-body)" }}>
                  {quality.problems.map(p => <li key={p.code} style={{ color: "var(--state-incorrect, #efa69d)" }}>{p.message}</li>)}
                  {quality.warnings.map(p => <li key={p.code} style={{ color: "var(--text-secondary)" }}>{p.message}</li>)}
                </ul>
              )}
              <p style={{ margin: 0, font: "400 13px/1.5 var(--font-body)", color: "var(--text-secondary)" }}>
                Confirme a fonte antes de aceitar mudanças factuais ou de gabarito.
                O item reformulado conserva seu ID e remissões, mas deixa de ser a redação original da fonte.
              </p>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, font: "400 14px/1.5 var(--font-body)", color: "var(--text-primary)" }}>
                <input type="checkbox" checked={approval} onChange={e => setApproval(e.target.checked)}
                  style={{ marginTop: 4, accentColor: "var(--qb-gold)", minWidth: 18, minHeight: 18 }} />
                {isAdmin && isQuestion
                  ? "Revisei a proposta e a referência. Autorizo salvar a nova versão ou substituir o registro anterior após confirmar."
                  : "Revisei a proposta e a referência. Autorizo salvar a nova versão."}
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button icon="check" disabled={!approval || saving || generating || blocked} loading={saving} onClick={approve}>
                  Aprovar e salvar nova versão
                </Button>
                {isAdmin && isQuestion && (
                  <Button variant="secondary" icon="save" disabled={!approval || saving || generating || !item.raw || blocked}
                    onClick={() => setConfirmOverwrite(true)}>
                    Salvar em cima da anterior
                  </Button>
                )}
                <Button variant="secondary" icon="x" disabled={saving} onClick={() => { setProposal(null); setApproval(false); }}>
                  Descartar proposta
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmOverwrite}
        tone="attention"
        title="Substituir a questão já cadastrada?"
        description="O enunciado, gabarito, comentário e referência serão atualizados na mesma questão, mesmo que você já tenha acertado ou errado. Antes disso, será salva uma cópia da versão anterior. Respostas e históricos existentes não serão apagados nem recalculados."
        confirmLabel="Confirmar substituição"
        cancelLabel="Manter questão anterior"
        onCancel={() => setConfirmOverwrite(false)}
        onConfirm={overwriteOriginal}
      />
    </section>
  );
}
export { EditorialCurator };
