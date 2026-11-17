/**
 * Curadoria editorial versionada e não destrutiva para o QBAsc.
 * Os documentos originais (questoes, revisao, respostas, cartoes_aval) nunca são regravados.
 * Cada substituição visual é mantida em "curadoria", pela mesma ID estável.
 */
import { questionTrap } from "./question-feedback.js";
import { CEBRASPE_V1_TAXONOMY } from "./cebraspe-v1-taxonomy.js";

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
      // Questão sobrescrita diretamente prevalece sobre versões editoriais anteriores.
      if (!patch || Number(q.raw?.versaoCuradoriaDireta || 0) >= Number(patch.version || 0)) return q;
      const x = patch.replacement;
      if (typeof x.statement !== "string" || !x.statement.trim() || !["C", "E"].includes(x.key)) return q;
      const assessment = x.statement.trim() === q.statement.trim() && x.key === q.key ? {} : {
        trap: undefined, tags: q.tags?.filter(tag => !/^(?:F(?:10|[1-9])|V[1-4])(?:$|[\s·:–—-])/i.test(tag)),
      };
      const trapFields = x.mecanismo
        ? { trap: questionTrap({ mecanismo: x.mecanismo, trechoDecisivo: x.trechoDecisivo, correcaoMinima: x.correcaoMinima }, undefined, x.key) }
        : {};
      return { ...q, ...assessment, ...trapFields, statement: x.statement, key: x.key, explanation: x.explanation || "", basis: x.basis || q.basis, editorial: {
        version: patch.version, editedAt: patch.atualizadoEm, status: "reformulada",
        ...(x.mecanismo ? { trechoDecisivo: x.trechoDecisivo, correcaoMinima: x.correcaoMinima } : {}),
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

/**
 * Converte resposta do Gemini em proposta editável. Sem fallback inventado.
 */
export function parseEditorialSuggestion(reply, kind) {
  const text = String(reply || "").trim();
  const raw = text.replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/, "");
  const from = raw.indexOf("{"), to = raw.lastIndexOf("}");
  if (from < 0 || to <= from) throw new Error("A IA não retornou uma proposta JSON verificável.");
  let obj;
  try { obj = JSON.parse(raw.slice(from, to + 1)); }
  catch { throw new Error("A proposta da IA não está em JSON válido. Nenhum conteúdo foi alterado."); }
  const entry = obj.replacement || obj.reformulada || {};
  const proposal = {
    parecer: String(obj.parecer || "").trim().slice(0, 1500),
    needsHumanReview: obj.needsHumanReview !== false,
    replacement: kind === "question"
      ? {
          statement: String(entry.statement || entry.enunciado || "").trim().slice(0, 4000),
          key: String(entry.key || entry.gabarito || "").trim().toUpperCase().replace(/^CERTO$/, "C").replace(/^ERRADO$/, "E"),
          explanation: String(entry.explanation || entry.comentario || "").trim().slice(0, 6500),
          basis: String(entry.basis || entry.ref || "").trim().slice(0, 2000),
          mecanismo: String(entry.mecanismo || "").trim().toUpperCase().slice(0, 4),
          trechoDecisivo: String(entry.trechoDecisivo || "").trim().slice(0, 400),
          correcaoMinima: String(entry.correcaoMinima || "").trim().slice(0, 600),
        }
      : {
          front: String(entry.front || entry.q || "").trim().slice(0, 2600),
          back: String(entry.back || (Array.isArray(entry.a) ? entry.a.join("\n") : entry.a) || "").trim().slice(0, 6000),
          basis: String(entry.basis || entry.src || "").trim().slice(0, 2000),
        },
  };
  if (!proposal.parecer) throw new Error("A IA não forneceu um parecer verificável.");
  if (kind === "question" && (!proposal.replacement.statement || !["C", "E"].includes(proposal.replacement.key) || !proposal.replacement.explanation)) {
    throw new Error("A IA não forneceu enunciado, gabarito e explicação válidos.");
  }
  if (kind === "flashcard" && (!proposal.replacement.front || !proposal.replacement.back)) {
    throw new Error("A IA não forneceu frente e verso válidos.");
  }
  return proposal;
}

/**
 * Sobrescrita explícita de uma questão de banco (mesmo ID).
 * A cópia anterior é salva ANTES do registro original ser atualizado.
 * Respostas, rodadas e SRS nunca são modificados por este fluxo.
 */
export function makeDirectQuestionOverwrite({ question, proposal, previous, issue, note, now = new Date() }) {
  if (!question?.raw || question.raw.id !== question.id) {
    throw new Error("Esta questão não tem registro original editável no banco.");
  }
  const entry = makeEditorialEntry({ kind: "question", content: question, proposal, previous, issue, note, now });
  const raw = question.raw;
  const updatedQuestion = {
    ...raw,
    enunciado: entry.replacement.statement,
    gabarito: entry.replacement.key,
    comentario: entry.replacement.explanation,
    ref: entry.replacement.basis,
    ...(entry.replacement.mecanismo ? {
      // O app lê o mecanismo, o trecho e a correção mínima do registro da questão.
      mecanismo: entry.replacement.mecanismo,
      mecanismoNome: CEBRASPE_V1_TAXONOMY[entry.replacement.mecanismo]?.n || raw.mecanismoNome,
      trechoDecisivo: entry.replacement.trechoDecisivo,
      correcaoMinima: entry.replacement.correcaoMinima,
      // A cópia de segurança preserva os campos legados que têm precedência na leitura.
      ...(Object.hasOwn(raw, "evidencia") ? { evidencia: entry.replacement.trechoDecisivo } : {}),
      ...(raw.trap && typeof raw.trap === "object" ? {
        trap: { ...raw.trap, description: entry.replacement.correcaoMinima },
      } : {}),
    } : {}),
    reformuladaPeloArquiteto: true,
    versaoCuradoriaDireta: entry.version,
    curadoriaDiretaEm: entry.atualizadoEm,
    curadoriaDiretaId: entry.id,
  };
  return {
    backup: {
      ...entry,
      status: "sobrescrita",
      modoSalvamento: "sobre_original",
      rawAnterior: { ...raw },
      exibidaAnterior: {
        statement: question.statement,
        key: question.key,
        explanation: question.explanation,
        basis: question.basis,
      },
    },
    updatedQuestion,
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
    ...(String(raw.mecanismo || "").trim() ? {
      mecanismo: String(raw.mecanismo).trim().toUpperCase().slice(0, 4),
      trechoDecisivo: String(raw.trechoDecisivo || "").trim().slice(0, 400),
      correcaoMinima: String(raw.correcaoMinima || "").trim().slice(0, 600),
    } : {}),
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
