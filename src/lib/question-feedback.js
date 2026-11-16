import { mechanismDetail, mechanismForKey, mechanismOptionList } from './cebraspe-v1-taxonomy.js';

export const ERROR_ORIGINS = {
  recuperacao: 'Não lembrei',
  interferencia: 'Confundi com outra regra',
  leitura: 'Li rápido demais',
  compreensao: 'Não entendi o conceito',
};

const clean = value => typeof value === 'string' ? value.trim() : '';
const simple = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ');

export function mechanismOptions(answer) {
  return mechanismOptionList(answer);
}

export function indexQuestionMechanisms(analysis, traps) {
  const byId = rows => {
    const result = new Map();
    for (const [id, row] of rows) {
      if (!id || !mechanismDetail(clean(row.mecanismo).toUpperCase())) continue;
      if (!result.has(id)) result.set(id, []);
      result.get(id).push(row);
    }
    return result;
  };
  return {
    analysis: byId((analysis || []).filter(row => row && !row.anulado).map(row => [clean(row.item), row])),
    traps: byId((traps || []).flatMap(row => Array.isArray(row?.qids) ? row.qids.map(id => [clean(id), row]) : [])),
  };
}

export function resolveQuestionTrap(question, key, links) {
  if (clean(question.mecanismo) || clean(question.mecanismoNome) || clean(question.trap?.name)) {
    return questionTrap(question, undefined, key);
  }
  const agreed = rows => {
    const compatible = (rows || []).filter(row => mechanismForKey(clean(row.mecanismo).toUpperCase(), key) &&
      (!row.gabarito || clean(row.gabarito).toUpperCase() === key));
    return new Set(compatible.map(row => clean(row.mecanismo).toUpperCase())).size === 1 ? compatible[0] : null;
  };
  const analysis = agreed(links.analysis.get(question.id));
  if (analysis) return questionTrap(question, { ...analysis, source: 'Análise de questões' }, key);
  const trap = agreed(links.traps.get(question.id));
  if (!trap) return undefined;
  return questionTrap(question, {
    mecanismo: trap.mecanismo,
    source: 'Acervo de pegadinhas',
    linkedRule: trap.regra,
    linkedSignal: trap.sinal,
  }, key);
}

/** Contrato da V1. Registros antigos com o mesmo código mas outro significado
 * permanecem sinalizados como legados para conferência, nunca reclassificados. */
export function questionTrap(question = {}, legacy, key) {
  const code = clean(question.mecanismo || legacy?.mecanismo).toUpperCase();
  const entry = mechanismDetail(code);
  const named = clean(question.mecanismoNome);
  const hasConflict = !!(entry && named && simple(named) !== simple(entry.n) &&
    !simple(named).includes(simple(entry.n)) && !simple(entry.n).includes(simple(named)));
  const suppliedName = named || clean(question.trap?.name);
  if (!entry && !suppliedName) return undefined;
  if (hasConflict) {
    return {
      name: code + ' · ' + named + ' (classificação de versão anterior)',
      code: undefined, legacyCode: code, legacyConflict: true,
      description: clean(question.trap?.description) || clean(question.correcaoMinima),
      evidence: clean(question.evidencia) || clean(question.trechoDecisivo) || clean(legacy?.evidencia),
      vaccine: 'Classificação antiga incompatível com o catálogo QB V1. Confira a fundamentação e identifique novamente; nenhum rótulo foi convertido automaticamente.',
    };
  }
  if (entry && key && !mechanismForKey(code, key)) return { name: code + ' · ' + entry.n, keyConflict: true };
  if (!entry) return {
    name: suppliedName, code: undefined, description: clean(question.trap?.description),
    evidence: clean(question.evidencia), vaccine: clean(question.vacina),
  };
  return {
    name: code + ' · ' + entry.n, code,
    description: clean(question.trap?.description) || clean(question.correcaoMinima) || entry.o,
    vaccine: clean(question.vacina) || clean(legacy?.vacina) || entry.v,
    evidence: clean(question.evidencia) || clean(question.trechoDecisivo) || clean(legacy?.evidencia),
    source: legacy?.source,
    linkedRule: clean(legacy?.linkedRule),
    linkedSignal: clean(legacy?.linkedSignal),
    keyQuestion: entry.pergunta,
    shortRule: entry.lema,
    signs: entry.s,
    practicalAction: entry.acao,
    strategy: entry.strategy,
  };
}

export function recordErrorReflection(response, { text, origin, marked, attemptAt }) {
  const note = clean(text);
  if (!response || !attemptAt || !note || !Object.hasOwn(ERROR_ORIGINS, origin)) return response;
  const previous = Array.isArray(response.justificativas) ? response.justificativas : [];
  if (previous.some(entry => entry?.tentativaEm === attemptAt)) return response;
  return {
    ...response,
    ...(response.atualizadoEm === attemptAt ? { origem: origin } : {}),
    nota: clean(response.nota) ? response.nota : note,
    justificativas: [...previous, { em: new Date().toISOString(), texto: note, origem: origin, marcada: marked, tentativaEm: attemptAt }],
  };
}
