/**
 * Motor puro de reformulação e divisão não destrutiva de flashcards legados.
 *
 * Regras de preservação obrigatória:
 * - Nunca apagar cartões originais, avaliações (cartoes_aval), intervalos, mapas, questões ou progresso.
 * - Mudança apenas redacional (mesmo alvo de recuperação): cria nova versão imutável em `curadoria`
 *   com o mesmo targetId (preservando o histórico de aprendizagem do cartão).
 * - Mudança no conhecimento avaliado ou divisão de cartão composto: cria novo(s) identificador(es)
 *   com vínculo `derivedFrom: originalCard.id`, impedindo herança indevida do histórico SRS.
 * - Nenhuma substituição em lote deve ocorrer sem relatório diagnóstico prévio e backup verificável.
 */
import { makeEditorialEntry } from './editorial-overrides.js';
import { stripFlashcardContext } from './flashcard-standard.js';
import { validateFlashcard, validateFlashcardBatch } from './flashcard-quality.js';

const clean = value => (typeof value === 'string' ? value.trim() : '');

function fnv1aHex(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Gera manifesto de backup verificável e reversível antes de qualquer lote de reformulação.
 */
export function buildReformulationBackupManifest({ runId, cards = [], diagnostic = null, now = new Date() }) {
  const snapshot = cards.map(card => ({
    id: String(card.id || ''),
    topicId: String(card.topicId || card.topico || ''),
    mapaNoId: String(card.mapaNoId || card.node || ''),
    front: clean(card.front ?? card.q),
    back: clean(card.back ?? card.a),
    basis: clean(card.basis ?? card.src),
    version: Number(card.version || card.editorial?.version || 0),
  }));
  const serialized = JSON.stringify(snapshot);
  return {
    runId,
    createdAt: now.toISOString(),
    cardCount: snapshot.length,
    checksum: `fnv1a-${fnv1aHex(serialized)}-${serialized.length}`,
    diagnosticSummary: diagnostic?.summary || null,
    rollbackInstruction: `Para reverter o lote ${runId}, remova apenas os documentos criados com source="${runId}" em "curadoria" e "revisao"; os cartões originais e o histórico em "cartoes_aval" permanecem intactos.`,
    snapshot,
  };
}

/**
 * Constrói novo registro de cartão derivado (com novo ID e vínculo derivedFrom),
 * garantindo que o cartão novo NÃO herde o histórico de revisões do cartão original.
 */
export function buildDerivedFlashcardRecord({
  originalCard,
  front,
  back,
  basis = '',
  cardType = '',
  vigencia = '',
  splitIndex = 1,
  splitTotal = 1,
  reason = '',
  runId = '',
  idFactory = () => `${originalCard.id}__d${splitIndex}_${fnv1aHex(front + '|' + back)}`,
}) {
  const newId = idFactory();
  if (newId === originalCard.id) {
    throw new Error('Cartão derivado deve possuir um identificador novo, distinto do cartão original.');
  }
  const topicId = clean(originalCard.topicId || originalCard.topico);
  const mapaNoId = clean(originalCard.mapaNoId || originalCard.node);
  return {
    id: newId,
    topico: topicId,
    derivedFrom: originalCard.id,
    ...(runId ? { source: runId } : {}),
    cartoes: [{
      id: newId,
      q: clean(front),
      a: clean(back),
      ...(mapaNoId ? { mapaNoId } : {}),
      ...(cardType ? { tipo: cardType } : {}),
      ...(basis ? { ref: basis } : {}),
      ...(vigencia ? { vigencia } : {}),
      derivedFrom: originalCard.id,
      splitPart: splitTotal > 1 ? `${splitIndex}/${splitTotal}` : undefined,
      derivationReason: clean(reason).slice(0, 300),
      src: basis || clean(originalCard.basis || originalCard.src) || 'O Arquiteto · Reformulação derivada',
    }],
  };
}

/**
 * Avalia uma proposta de reformulação/divisão de um cartão legado e produz o plano seguro:
 * - 'keep': manter sem alterações
 * - 'editorial_version': mesma ideia/alvo -> nova versão em curadoria (preserva avaliações)
 * - 'split' / 'derived_new_card': divide ou muda alvo -> novo(s) ID(s) com derivedFrom (não herda avaliações)
 * - 'review': bloqueado pelo validador pedagógico -> exige decisão humana
 */
export function planFlashcardReformulation({
  card,
  proposal,
  previous,
  subject = '',
  topics = [],
  topicId = '',
  existingCards = [],
  runId = '',
  originLabel = 'Curadoria em lote · O Arquiteto',
  now = new Date(),
}) {
  const decision = clean(proposal?.decision).toLowerCase();
  const reason = clean(proposal?.reason).slice(0, 240);
  const cleanOriginalFront = stripFlashcardContext(card.front, subject, topics, topicId || card.topicId);

  if (decision === 'keep') {
    return { action: 'keep', id: card.id, reason: reason || 'Cartão adequado ao padrão.' };
  }
  if (decision === 'review' || !['reformulate', 'split', 'new_target'].includes(decision)) {
    return { action: 'review', id: card.id, reason: reason || 'Requer conferência humana.' };
  }

  // Caso 1: divisão de cartão composto ou mudança do conhecimento avaliado -> novos IDs com derivedFrom
  if (decision === 'split' || decision === 'new_target' || proposal?.knowledgeChanged === true) {
    const rawChildren = decision === 'split'
      ? (Array.isArray(proposal.splitCards) ? proposal.splitCards : [])
      : [{ front: proposal.front, back: proposal.back, basis: proposal.basis, cardType: proposal.cardType, vigencia: proposal.vigencia }];

    if (decision === 'split' && rawChildren.length < 2) {
      return { action: 'review', id: card.id, reason: 'A divisão exige pelo menos dois cartões independentes.' };
    }
    if (!rawChildren.length) {
      return { action: 'review', id: card.id, reason: 'Proposta derivada sem cartões válidos.' };
    }

    const sanitized = rawChildren.map((child, idx) => ({
      id: `${card.id}__split_${idx + 1}`,
      front: stripFlashcardContext(clean(child.front), subject, topics, topicId || card.topicId),
      back: clean(child.back),
      basis: clean(child.basis || card.basis),
      cardType: clean(child.cardType),
      vigencia: clean(child.vigencia),
      topicId: topicId || card.topicId || card.topico || '',
      mapaNoId: card.mapaNoId || card.node || '',
    }));

    const batchCheck = validateFlashcardBatch(sanitized, {
      topicId: topicId || card.topicId || card.topico || '',
      subjectName: subject,
      topics,
      existingCards: existingCards.filter(c => c.id !== card.id),
      requireSource: false,
    });

    const invalid = batchCheck.results.find(r => r.validation.reasons.some(item => item.severity === 'error'));
    if (invalid) {
      return {
        action: 'review',
        id: card.id,
        reason: `Cartão derivado bloqueado na validação: ${invalid.validation.reasons.filter(r => r.severity === 'error').map(r => r.message).join(' ')}`,
      };
    }

    const derivedRecords = sanitized.map((child, idx) => buildDerivedFlashcardRecord({
      originalCard: { ...card, topicId: child.topicId, mapaNoId: child.mapaNoId },
      front: child.front,
      back: child.back,
      basis: child.basis,
      cardType: batchCheck.results[idx].validation.cardType,
      vigencia: child.vigencia,
      splitIndex: idx + 1,
      splitTotal: sanitized.length,
      reason,
      runId,
    }));

    return {
      action: decision === 'split' ? 'split' : 'derived_new_card',
      id: card.id,
      reason: reason || (decision === 'split' ? `Dividido em ${derivedRecords.length} cartões atômicos com derivedFrom.` : 'Novo cartão criado com derivedFrom por alteração do conhecimento avaliado.'),
      derivedRecords,
      preservesOriginalAndHistory: true,
    };
  }

  // Caso 2: reformulação estritamente redacional (mesmo alvo de recuperação) -> nova versão em curadoria
  const newFront = stripFlashcardContext(clean(proposal.front), subject, topics, topicId || card.topicId);
  const newBack = clean(proposal.back);
  const newBasis = clean(proposal.basis || card.basis);

  if (newFront === cleanOriginalFront && newBack === clean(card.back) && newBasis === clean(card.basis)) {
    return { action: 'keep', id: card.id, reason: 'Sem alteração necessária.' };
  }

  const validation = validateFlashcard(
    {
      id: card.id,
      front: newFront,
      back: newBack,
      basis: newBasis,
      topicId: topicId || card.topicId || card.topico || '',
      mapaNoId: card.mapaNoId || card.node || '',
    },
    {
      topicId: topicId || card.topicId || card.topico || '',
      subjectName: subject,
      topics,
      existingCards: existingCards.filter(c => c.id !== card.id),
      requireSource: false,
    },
  );

  const blockingErrors = validation.reasons.filter(r => r.severity === 'error');
  if (blockingErrors.length > 0) {
    return {
      action: 'review',
      id: card.id,
      reason: `A proposta requer conferência: ${blockingErrors.map(e => e.message).join(' ')}`,
      validation,
    };
  }

  let entry;
  try {
    entry = makeEditorialEntry({
      kind: 'flashcard',
      content: { id: card.id, front: card.front, back: card.back, basis: card.basis },
      previous,
      issue: 'formulacao',
      proposal: { parecer: proposal.reason, replacement: { front: newFront, back: newBack, basis: newBasis } },
      note: 'Reformulação redacional preservando o alvo de recuperação e o histórico de avaliações.',
      now,
    });
  } catch (err) {
    return { action: 'review', id: card.id, reason: err?.message || 'A nova versão excedeu os limites de gravação.' };
  }

  entry.origem = originLabel;
  return {
    action: 'editorial_version',
    id: card.id,
    reason,
    entry,
    validation,
    preservesOriginalAndHistory: true,
  };
}
