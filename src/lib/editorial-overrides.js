/**
 * Curadoria editorial versionada e não destrutiva para o QBAsc.
 * Os documentos originais (questoes, revisao, respostas, cartoes_aval) nunca são regravados.
 * Cada substituição visual é mantida em "curadoria", pela mesma ID estável.
 */
export function editorialId(kind, id) {
  if (!["question", "flashcard"].includes(kind) || !id) throw new Error("Identificador editorial inválido.");
  return kind + ":" + String(id);
}

export function applyEditorialOverlays(questions, cards, entries) {
  const overrides = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || entry.status !== "aprovada" || !["question", "flashcard"].includes(entry.kind)) continue;
    if (!entry.targetId || !entry.replacement || !String(entry.id || "").startsWith(editorialId(entry.kind, entry.targetId) + ":v")) continue;
    const key = editorialId(entry.kind, entry.targetId);
    const previous = overrides.get(key);
    if (!previous || Number(entry.version || 0) > Number(previous.version || 0)) overrides.set(key, entry);
  }
  return {
    questions: questions.map(q => {
      const patch = overrides.get(editorialId("question", q.id));
      if (!patch) return q;
      const x = patch.replacement;
      if (typeof x.statement !== "string" || !x.statement.trim() || !["C", "E"].includes(x.key)) return q;
      return { ...q, statement: x.statement, key: x.key, explanation: x.explanation || "", basis: x.basis || q.basis, editorial: {
        version: patch.version, editedAt: patch.atualizadoEm, status: "reformulada",
        original: patch.original, note: patch.parecer || "",
      }};
    }),
    cards: cards.map(card => {
      const patch = overrides.get(editorialId("flashcard", card.id));
      if (!patch) return card;
      const x = patch.replacement;
      if (typeof x.front !== "string" || !x.front.trim() || typeof x.back !== "string" || !x.back.trim()) return card;
      return { ...card, front: x.front, back: x.back, basis: x.basis || card.basis, editorial: {
        version: patch.version, editedAt: patch.atualizadoEm, status: "reformulado",
        original: patch.original, note: patch.parecer || "",
      }};
    }),
  };
}

export function makeEditorialEntry({ kind, content, proposal, previous, issue, note, now = new Date() }) {
  const targetId = String(content?.id || "");
  const baseId = editorialId(kind, targetId);
  const version = Math.min(9999, Number(previous?.version || 0) + 1);
  const id = baseId + ":v" + version;
  const original = previous?.original || (kind === "question"
    ? { statement: content.statement, key: content.key, explanation: content.explanation, basis: content.basis, origin: content.origin }
    : { front: content.front, back: content.back, basis: content.basis });
  const raw = proposal?.replacement || {};
  const replacement = kind === "question" ? {
    statement: String(raw.statement || "").trim(),
    key: String(raw.key || "").trim().toUpperCase(),
    explanation: String(raw.explanation || "").trim(),
    basis: String(raw.basis || content.basis || "").trim(),
  } : {
    front: String(raw.front || "").trim(),
    back: String(raw.back || "").trim(),
    basis: String(raw.basis || content.basis || "").trim(),
  };
  if (kind === "question" && (!replacement.statement || !["C", "E"].includes(replacement.key) || !replacement.explanation)) {
    throw new Error("Reformulação incompleta: enunciado, gabarito e comentário obrigatórios.");
  }
  if (kind === "flashcard" && (!replacement.front || !replacement.back)) {
    throw new Error("Reformulação incompleta: frente e verso obrigatórios.");
  }
  if (replacement.statement?.length > 4000 || replacement.explanation?.length > 6500 ||
      replacement.front?.length > 2600 || replacement.back?.length > 6000) {
    throw new Error("Reformulação excedeu os limites seguros de tamanho.");
  }
  return {
    id, kind, targetId, status: "aprovada",
    version,
    atualizadoEm: now.toISOString(),
    issue, observacao: String(note || "").slice(0, 500),
    parecer: String(proposal.parecer || "").slice(0, 1300),
    original, replacement,
    // Documentos de versões anteriores permanecem imutáveis na coleção curadoria.
    origem: "Curadoria aprovada pelo estudante · O Arquiteto/Gemini",
  };
}
