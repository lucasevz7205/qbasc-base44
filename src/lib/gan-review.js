import { ganFailureLabel } from './gan-diagnostics.js';
import { mechanismDetail } from './cebraspe-v1-taxonomy.js';
import { questionQualityProblems } from './item-quality.js';

const text = value => typeof value === 'string' ? value.trim() : '';
const statementKey = value => text(value).normalize('NFC').replace(/\s+/g, ' ').toLowerCase();

export function ganReviewDraft(item) {
  return {
    statement: item.enunciado || '',
    key: item.gabarito || '',
    explanation: item.comentario || '',
    mecanismo: item.mecanismo || '',
    trechoDecisivo: item.trechoDecisivo || '',
    correcaoMinima: item.correcaoMinima || '',
  };
}

export function ganReviewQuality(draft, questionBank = [], currentId, { checkFalsification = false } = {}) {
  const statement = statementKey(draft.statement);
  const { problems, warnings } = questionQualityProblems(draft, { checkComment: false, checkFalsification });
  if (statement.length < 20) {
    problems.unshift({ code: 'enunciado_curto', message: 'Escreva um enunciado completo com pelo menos 20 caracteres.' });
  } else if (questionBank.some(row => row.id !== currentId && statementKey(row.statement) === statement)) {
    problems.unshift({ code: 'enunciado_repetido', message: 'Já existe uma questão no banco com este enunciado.' });
  }
  if (!['C', 'E'].includes(draft.key)) {
    problems.unshift({ code: 'gabarito_ausente', message: 'Escolha o gabarito Certo ou Errado.' });
  }
  return { problems, warnings };
}

export function canAutoApproveGan(item, targetNodeId, questionBank = []) {
  return item.statusConfronto === 'aprovada_gan'
    && item.mapaNoId === targetNodeId
    && item.blindKeyMatch === true
    && item.veredictoDiscriminador === 'APROVADA'
    && Number.isFinite(item.ganScore) && item.ganScore > 90 && item.ganScore <= 100
    && item.fundamentacaoCega?.verificacao === 'trecho_localizado'
    && !item.fundamentacaoCega.limitacao
    && !item.falhasDetectadas?.length
    && Boolean(text(item.comentario))
    && !ganReviewQuality(ganReviewDraft(item), questionBank, item.id, { checkFalsification: true }).problems.length;
}

export function approveGanReview(item, draft, questionBank = []) {
  const { problems } = ganReviewQuality(draft, questionBank, item.id);
  if (problems.length) throw new Error(problems[0].message);
  return {
    ...item,
    enunciado: text(draft.statement),
    gabarito: draft.key,
    comentario: text(draft.explanation),
    mecanismo: draft.mecanismo,
    mecanismoNome: mechanismDetail(draft.mecanismo).n,
    trechoDecisivo: text(draft.trechoDecisivo),
    correcaoMinima: text(draft.correcaoMinima),
    statusConfronto: 'aprovada_manual',
    aprovadaParaSessao: true,
    revisaoManual: {
      statusAnterior: item.statusConfronto,
      gabaritoProposto: item.gabarito || null,
      em: new Date().toISOString(),
    },
  };
}

export function ganReviewEntries(node, result, forReview) {
  const items = Array.isArray(result.questoes)
    ? result.questoes
    : [...(result.aprovadas || []), ...(result.bloqueadas || [])];
  const saved = new Map((result.registros || []).map(record => [record.id, record]));
  return items.map(item => ({
    item,
    node,
    reviewId: result.reviewId,
    record: saved.get(item.id),
    status: saved.has(item.id) ? 'saved' : forReview ? 'pending' : 'report',
  }));
}

/**
 * Personal runs replace unsaved slots. Administrative runs keep their existing
 * target of proposals submitted for review.
 */
export async function runGanRound(parts, generateNode, isDiscarded, { targetSaved = false } = {}) {
  const entries = [];
  const seenIds = new Set();
  const sourceUnavailable = new Set();
  const maxPasses = targetSaved ? 3 : 2;
  let queued = parts;
  let failure = '';
  let saveFailures = 0;

  for (let pass = 0; pass < maxPasses && queued.length; pass++) {
    const replacements = [];
    for (const { target, count } of queued) {
      if (isDiscarded()) return null;
      if (sourceUnavailable.has(target.id)) continue;

      let received = 0;
      try {
        const result = await generateNode(target, count);
        if (isDiscarded()) return null;
        if (result?.falha) {
          failure = ganFailureLabel(result.falha);
          if (targetSaved && result.falha.codigo === 'fonte-insuficiente') {
            sourceUnavailable.add(target.id);
          }
        } else {
          const candidates = ganReviewEntries(target, result || {}, true);
          const batchEntries = targetSaved ? candidates.filter(({ item }) => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
          }) : candidates.slice(0, count);
          received = targetSaved ? batchEntries.filter(entry => entry.status === 'saved').length : batchEntries.length;
          entries.push(...batchEntries);
          saveFailures += result?.falhasGravacao || 0;
        }
      } catch (err) {
        failure = err?.message || 'Falha na geração.';
      }
      if (received < count && !sourceUnavailable.has(target.id)) {
        replacements.push({ target, count: count - received });
      }
    }
    queued = replacements;
  }

  return { entries, failure, saveFailures };
}
