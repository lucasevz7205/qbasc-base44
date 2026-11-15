import { mechanismForKey } from './cebraspe-v1-taxonomy.js';

function latestAnswer(response, fallbackKey) {
  const hist = Array.isArray(response?.hist) ? response.hist : [];
  const last = hist.filter(h => h && (h.m === 'C' || h.m === 'E')).at(-1);
  const marked = last?.m || response?.ultimaMarcada;
  if (!['C', 'E'].includes(marked)) return null;
  const correct = typeof last?.ok === 'boolean' ? last.ok :
    marked === (response?.gabaritoUsado || fallbackKey);
  return { correct, confidence: Number(last?.c ?? response?.conf ?? 0) || 0,
    historicalErrors: hist.filter(h => h?.ok === false).length };
}

/** Apenas desempenho do usuário, nunca "frequência de incidência da banca". */
export function mechanismPractice(questions, subjectId = '') {
  const byCode = new Map();
  const seen = new Set();
  for (const q of Array.isArray(questions) ? questions : []) {
    if (!q?.id || seen.has(q.id) || (subjectId && q.subjectId !== subjectId)) continue;
    seen.add(q.id);
    const code = q.trap?.legacyConflict ? '' : q.trap?.code;
    if (!mechanismForKey(code, q.key)) continue;
    if (!byCode.has(code)) byCode.set(code, {
      code, questionIds: [], answered: 0, correct: 0, wrong: 0,
      highConfidenceErrors: 0, repeatedErrors: 0, errorsInHistory: 0,
    });
    const stat = byCode.get(code);
    stat.questionIds.push(q.id);
    const result = latestAnswer(q.response, q.raw?.gabarito || q.key);
    if (result) {
      stat.answered += 1;
      stat.correct += Number(result.correct);
      stat.wrong += Number(!result.correct);
      stat.highConfidenceErrors += Number(!result.correct && result.confidence === 3);
      stat.errorsInHistory += result.historicalErrors;
      stat.repeatedErrors += Number(result.historicalErrors >= 2);
    }
  }
  return byCode;
}
