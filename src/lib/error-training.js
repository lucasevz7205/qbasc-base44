import { questionErrorCount } from './error-notebook.js';
import { distinctRoundQuestions } from './study-session-rules.js';

export const ERROR_TRAINING_LIMIT = 20;

/** Somente questões com erro histórico; escopo explícito sem ampliação silenciosa. */
export function errorTrainingPool(bank = [], { subjectId, topicId } = {}) {
  return distinctRoundQuestions((Array.isArray(bank) ? bank : []).filter(q =>
    q?.id && q.statusConfronto !== 'divergencia_bloqueada' && !q.raw?.foraNivel &&
    (!subjectId || q.subjectId === subjectId) &&
    (!topicId || q.topicId === topicId) &&
    questionErrorCount(q) > 0,
  ), { omitConflicts: true });
}

/** Priorização estável: fora da última rodada, mais erros, correção mais antiga. */
export function pickErrorTrainingRound(bank = [], { subjectId, topicId, rounds = [], limit = ERROR_TRAINING_LIMIT } = {}) {
  const last = (Array.isArray(rounds) ? rounds : [])
    .filter(r => r?.modo === 'treino-erros-qbasc')
    .sort((a, b) => String(b.fim || b.inicio || '').localeCompare(String(a.fim || a.inicio || '')))[0];
  const recentIds = new Set((last?.itens || []).map(item => item.qid));
  const size = Math.min(ERROR_TRAINING_LIMIT, Math.max(0, Math.floor(Number(limit) || 0)));
  return errorTrainingPool(bank, { subjectId, topicId })
    .sort((a, b) =>
      Number(recentIds.has(a.id)) - Number(recentIds.has(b.id)) ||
      questionErrorCount(b) - questionErrorCount(a) ||
      String(a.response?.atualizadoEm || '').localeCompare(String(b.response?.atualizadoEm || '')) ||
      String(a.id).localeCompare(String(b.id)),
    )
    .slice(0, size).map(q => q.id);
}
