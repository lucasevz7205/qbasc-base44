/**
 * Portão de qualidade dos itens C/E do QBAsc.
 * Um item no padrão mostra: mecanismo compatível com o gabarito, correção mínima
 * (como o item seria falsificado) e um comentário de verdade, não só a referência.
 * Funções puras: sem rede, sem banco.
 */
import { mechanismForKey } from "./cebraspe-v1-taxonomy.js";

const clean = value => typeof value === "string" ? value.trim() : "";
const firstNonEmpty = (...values) => values.map(clean).find(Boolean) || "";
const wordsOf = text => new Set(clean(text).normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 3));
const flat = text => clean(text).normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Frases completas (≥ 12 letras ou números), separadas por . ! ? ou … */
export function sentenceCount(text) {
  return clean(text).split(/(?<=[.!?…]['"”’)]?)\s+/)
    .filter(part => part.replace(/[^\p{L}\p{N}]/gu, "").length >= 12).length;
}

/** Fração das palavras (> 3 letras) do comentário que já estão no enunciado. */
export function overlapWithStatement(explanation, statement) {
  const own = wordsOf(explanation);
  if (!own.size) return 0;
  const other = wordsOf(statement);
  let shared = 0;
  for (const word of own) if (other.has(word)) shared += 1;
  return shared / own.size;
}

/**
 * Confere um item. `problems` bloqueiam o salvamento; `warnings` apenas avisam.
 * item: { statement, key, explanation, basis, mecanismo, correcaoMinima, trechoDecisivo }
 */
export function questionQualityProblems(item = {}, { checkComment = true, checkFalsification = true } = {}) {
  const problems = [];
  const warnings = [];
  const key = clean(item.key).toUpperCase();
  const code = clean(item.mecanismo).toUpperCase();
  if (!code) problems.push({ code: "mecanismo_ausente", message: "Falta o mecanismo de falsificação (F1–F10 para item Errado, V1–V4 para item Certo)." });
  else if (!mechanismForKey(code, key)) problems.push({ code: "mecanismo_incompativel", message: "O mecanismo " + code + " não combina com o gabarito " + (key || "?") + ": F só em item Errado, V só em item Certo." });
  if ((key !== "C" || checkFalsification) && clean(item.correcaoMinima).length < 15) {
    problems.push({ code: "correcao_minima_ausente", message: key === "C"
      ? "Falta mostrar como o item seria falsificado: a menor alteração que o tornaria Errado, com o código F."
      : "Falta a correção mínima: a versão correta do item, por extenso." });
  }
  if (checkComment) {
    const explanation = clean(item.explanation);
    const basis = clean(item.basis);
    if (sentenceCount(explanation) < 2 || explanation.length < 120) {
      problems.push({ code: "comentario_curto", message: "O comentário precisa de pelo menos duas frases: o veredito com a regra e o dispositivo, e por que o item parece errado (Certo) ou onde está o erro (Errado)." });
    }
    if (explanation && basis && (flat(explanation) === flat(basis) || flat(basis).includes(flat(explanation)))) {
      problems.push({ code: "comentario_igual_referencia", message: "O comentário é só a referência. Explique a regra, não apenas indique onde ela está." });
    }
    if (explanation && clean(item.statement) && overlapWithStatement(explanation, item.statement) >= 0.7) {
      problems.push({ code: "comentario_repete_enunciado", message: "O comentário repete o enunciado. Diga por que o julgamento é esse, com a regra que decide." });
    }
  }
  if (clean(item.trechoDecisivo).length < 8) {
    warnings.push({ code: "trecho_ausente", message: "Sem trecho decisivo literal. Se a fonte não está no registro, confira-o antes de aceitar." });
  }
  return { problems, warnings };
}

/** Converte a questão exibida pelo app (qb-real-model) no formato do portão. */
export function itemFromDisplayedQuestion(question = {}) {
  const raw = question.raw || {};
  return {
    statement: question.statement, key: question.key, explanation: question.explanation, basis: question.basis,
    mecanismo: question.trap && !question.trap.keyConflict && !question.trap.legacyConflict ? question.trap.code : "",
    correcaoMinima: firstNonEmpty(question.editorial?.correcaoMinima, raw.correcaoMinima, raw.trap?.description, raw.vacina),
    trechoDecisivo: firstNonEmpty(question.editorial?.trechoDecisivo, raw.trechoDecisivo, question.trap?.evidence, raw.evidencia),
  };
}

/** Questões do banco que ainda não atendem ao padrão (itens antigos). */
export function questionsNeedingCompletion(questions = []) {
  const found = [];
  for (const question of questions) {
    const { problems } = questionQualityProblems(itemFromDisplayedQuestion(question));
    if (problems.length) found.push({ id: question.id, problems: problems.map(p => p.code) });
  }
  return found;
}
