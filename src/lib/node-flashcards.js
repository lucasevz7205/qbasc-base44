import { stripFlashcardContext } from './flashcard-standard.js';
import { validateFlashcard } from './flashcard-quality.js';

/**
 * Portão de gravação de flashcards candidatos.
 * Bloqueia qualquer candidato sem aprovação humana explícita ou que viole regras bloqueantes.
 */
export function canPersistFlashcardCandidate(card, context = {}) {
  if (!card || typeof card !== 'object') {
    return { allowed: false, reason: 'Candidato inválido.', validation: null };
  }
  if (card.approvedByUser !== true) {
    return {
      allowed: false,
      reason: 'Aprovação humana obrigatória antes de gravar no baralho definitivo.',
      validation: card.validation || null,
    };
  }
  const validation = validateFlashcard(card, {
    ...context,
    requireSource: Boolean(context.requireSource),
  });
  const blockingErrors = validation.reasons.filter(r => r.severity === 'error');
  if (blockingErrors.length > 0) {
    return {
      allowed: false,
      reason: blockingErrors.map(e => e.message).join(' '),
      validation,
    };
  }
  if (card.validation?.blindReview?.executed && !card.validation.blindReview.sourceSufficient && !card.humanOverrideConfirmed) {
    return {
      allowed: false,
      reason: 'A revisão independente apontou fonte insuficiente; edite ou confirme a fonte antes de gravar.',
      validation,
    };
  }
  return { allowed: true, reason: '', validation };
}

/**
 * Grava somente cartões explicitamente aprovados pelo estudante.
 * Candidatos não aprovados ou reprovados no portão pedagógico NUNCA são persistidos automaticamente.
 */
export async function saveGeneratedNodeFlashcards(cards, saveCard, context = {}) {
  const results = [];
  for (const card of Array.isArray(cards) ? cards : []) {
    const gate = canPersistFlashcardCandidate(card, context);
    if (!gate.allowed) {
      results.push({
        ...card,
        status: card?.status === 'discarded' ? 'discarded' : 'pending',
        blockedReason: gate.reason,
      });
      continue;
    }
    try {
      await saveCard(card.id, gate.validation.normalizedFront, card.back.trim(), card);
      results.push({ ...card, front: gate.validation.normalizedFront, status: 'saved', blockedReason: undefined });
    } catch (error) {
      results.push({ ...card, status: 'pending', saveError: error?.message || 'Não foi possível gravar este flashcard.' });
    }
  }
  return results;
}

export function buildNodeFlashcardRecord({
  cardId,
  topicId,
  targetNodeId,
  nodeLabel,
  subjectName,
  topicTitle,
  front,
  back,
  basis = '',
  cardType = '',
  vigencia = '',
  evidence = null,
  derivedFrom = '',
}) {
  const cleanFront = stripFlashcardContext(front, subjectName, [topicTitle, nodeLabel], topicId);
  return {
    id: cardId,
    topico: topicId,
    cartoes: [{
      id: cardId,
      q: cleanFront,
      a: String(back || '').trim(),
      mapaNoId: targetNodeId,
      ...(cardType ? { tipo: cardType } : {}),
      ...(basis ? { ref: basis } : {}),
      ...(vigencia ? { vigencia } : {}),
      ...(derivedFrom ? { derivedFrom } : {}),
      ...(evidence ? { evidenciaRevisao: evidence } : {}),
      src: basis || ('O Arquiteto · Mapa mental · ' + nodeLabel),
    }],
  };
}
