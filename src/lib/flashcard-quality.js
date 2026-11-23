/**
 * Validador pedagógico determinístico de flashcards do QB Ascensão.
 * Funções puras: sem rede, sem banco, reutilizável no backend, frontend e lotes.
 *
 * Critérios verificados (além de contagens simples):
 * 1. Atomicidade (um alvo de recuperação; divisão de perguntas compostas e listas extensas)
 * 2. Autonomia (leitor frio; sem dependência implícita do mapa, PDF ou outro cartão)
 * 3. Univocidade (resposta identificável e conferível; sem comandos abertos)
 * 4. Fidelidade (suporte na fonte acessível; sem invenção ou contradição factual)
 * 5. Concisão (alertas para verso extenso sem amputar qualificações essenciais)
 * 6. Não redundância (detecção de duplicação literal e semântica no lote e no baralho)
 * 7. Contextualização (matéria/assunto nos metadados; sem prefixo duplicado na frente)
 * 8. Remissão (preservação de topicId e mapaNoId exato quando há vínculo)
 * 9. Vigência (referência normativa e data/versão de conferência quando aplicável)
 */
import { FLASHCARD_CARD_TYPES } from './flashcard-rules.js';
import { hasRedundantContextPrefix, stripFlashcardContext } from './flashcard-standard.js';

const STOP_WORDS = new Set([
  'para', 'como', 'qual', 'quais', 'sobre', 'pelo', 'pela', 'pelos', 'pelas',
  'entre', 'quando', 'onde', 'quem', 'isso', 'essa', 'esse', 'esta', 'este',
  'aqui', 'cada', 'todo', 'toda', 'todos', 'todas', 'pode', 'podem', 'deve',
  'devem', 'serao', 'seja', 'sejam', 'mais', 'menos', 'muito', 'muita', 'caso',
  'forma', 'modo', 'tipo', 'tipos', 'item', 'itens', 'regra', 'regras', 'texto',
  'artigo', 'inciso', 'paragrafo', 'alinea', 'seus', 'suas', 'deles', 'delas',
  'numa', 'numas', 'neste', 'nesta', 'nesse', 'nessa', 'apos', 'antes', 'durante',
  'porque', 'pois', 'assim', 'tambem', 'ainda', 'apenas', 'somente', 'quanto',
  'qualquer', 'outro', 'outra', 'outros', 'outras', 'mesmo', 'mesma', 'sendo',
  'sido', 'esta', 'estao', 'foram', 'eram', 'havia', 'houve', 'tera', 'terao',
]);

const clean = value => (typeof value === 'string' ? value.trim() : '');
const compact = value => clean(value).normalize('NFC').replace(/\s+/g, ' ');
const fold = value => compact(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function sentenceCount(text) {
  return clean(text)
    .split(/(?<=[.!?…]['"”’)]?)\s+/)
    .filter(part => part.replace(/[^\p{L}\p{N}]/gu, '').length >= 10).length;
}

function contentTokens(text) {
  const words = fold(text).match(/[a-z0-9]{4,}/g) || [];
  return new Set(words.filter(w => !STOP_WORDS.has(w)));
}

function jaccard(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let shared = 0;
  for (const token of setA) {
    if (setB.has(token)) shared += 1;
  }
  const union = setA.size + setB.size - shared;
  return union ? shared / union : 0;
}

function overlapRatio(smaller, larger) {
  if (!smaller.size || !larger.size) return 0;
  let shared = 0;
  for (const token of smaller) {
    if (larger.has(token)) shared += 1;
  }
  return shared / smaller.size;
}

function rawFrontOf(card = {}) {
  return clean(card.front ?? card.q ?? card.pergunta);
}

function rawBackOf(card = {}) {
  const val = card.back ?? card.a ?? card.resposta;
  if (Array.isArray(val)) return val.map(clean).filter(Boolean).join('\n');
  return clean(val);
}

export function inferCardType(card = {}) {
  const explicit = fold(card.cardType || card.tipo || '');
  if (FLASHCARD_CARD_TYPES.includes(explicit)) return explicit;
  const front = rawFrontOf(card);
  if (/_{3,}|\[\s*\.\.\.\s*\]|\(\s*\.\.\.\s*\)/.test(front)) return 'lacuna';
  if (/\b(diferen[cç]a|distin[cç][aã]o|contraste|distingue|em\s+rela[cç][aã]o\s+a|ao\s+contr[aá]rio\s+de|×|vs\.?)\b/iu.test(front)) {
    return 'contraste';
  }
  if (/\b(suponha|considere\s+que|em\s+um\s+caso|diante\s+da\s+situa[cç][aã]o|se\s+um|caso\s+um|na\s+hip[oó]tese\s+de|aplique|classifique\s+a\s+frase|na\s+frase)\b/iu.test(front)) {
    return 'aplicacao';
  }
  return 'factual';
}

function detectCompoundFront(front) {
  const qMarks = (front.match(/\?/g) || []).length;
  if (qMarks >= 2) {
    return 'A frente contém duas ou mais perguntas separadas; divida em cartões atômicos.';
  }
  const compoundJoiner = /\b(?:e\s+(?:tamb[eé]m\s+)?(?:qual|quais|como|quando|quem|onde|por\s+que|o\s+que|indique|diga|informe|cite)|al[eé]m\s+disso,?\s*(?:qual|quais|como|o\s+que|indique)|bem\s+como\s+(?:qual|quais|o\s+prazo|a\s+compet[eê]ncia|o\s+qu[oó]rum)|e\s+qual\s+[eé]\s+a\s+exce[cç][aã]o|e\s+qual\s+[eé]\s+o\s+prazo)\b/iu;
  if (compoundJoiner.test(front)) {
    return 'A frente cobra dois alvos de recuperação na mesma pergunta; separe em cartões distintos.';
  }
  return null;
}

const WORD_NUMBERS_OVER_THREE = /\b(?:quatro|cinco|seis|sete|oito|nove|dez)\b/iu;

function detectExtensiveList(front, back, cardType) {
  // Cartão de lacuna foca um único termo mesmo mostrando outros elementos da lista.
  if (cardType === 'lacuna') return null;

  const frontCountMatch = front.match(/\b(?:quais\s+s[aã]o\s+(?:os|as)\s+|cite\s+(?:os|as)\s+|liste\s+(?:os|as)\s+|enumere\s+(?:os|as)\s+|cada\s+uma\s+destas\s+)(\d+|quatro|cinco|seis|sete|oito|nove|dez)\b/iu);
  if (frontCountMatch) {
    const token = frontCountMatch[1];
    if (WORD_NUMBERS_OVER_THREE.test(token) || Number(token) > 3) {
      return `A frente pede uma lista extensa (${token} itens); decomponha em cartões menores ou lacunas sobrepostas.`;
    }
  }

  // Detecta listas numeradas ou em tópicos no verso com mais de 3 itens.
  const numberedItems = back.match(/(?:^|\n|\s)(?:\d+[.)]|[-•*]|[a-z]\))\s+\S/giu) || [];
  if (numberedItems.length > 3) {
    return `O verso contém uma lista extensa (${numberedItems.length} itens); divida em cartões independentes.`;
  }

  // Detecta listas em múltiplas linhas no verso (> 3 itens distintos).
  const lines = back.split(/\r?\n/).map(s => s.trim()).filter(s => s.length >= 6);
  if (lines.length > 3) {
    return `O verso lista ${lines.length} itens em linhas separadas; divida em cartões atômicos.`;
  }

  // Detecta enumerações por ponto e vírgula ou vírgula com > 3 itens quando a frente pede plural aberto.
  const asksList = /\b(quais\s+s[aã]o|liste|enumere|cite|indique\s+todos|requisitos|hip[oó]teses|princ[ií]pios|elementos|etapas|fases|modalidades|esp[eé]cies|tipos|caracter[ií]sticas)\b/iu.test(front);
  if (asksList) {
    const semiParts = back.split(';').map(s => s.trim()).filter(s => s.length >= 4);
    if (semiParts.length > 3) {
      return `O verso enumera ${semiParts.length} itens separados por ponto e vírgula; divida a lista em cartões atômicos.`;
    }
    const commaParts = back
      .replace(/\([^)]*\)/g, '')
      .split(/,\s*|\s+e\s+/i)
      .map(s => s.trim())
      .filter(s => s.length >= 3 && !/^(art\.?|lei|cf|ricd|rccn|decreto)/i.test(s));
    if (commaParts.length > 4) {
      return `O verso traz uma enumeração longa (${commaParts.length} elementos); divida em cartões de até 3 itens ou por critério.`;
    }
  }

  return null;
}

function detectContextDependency(front) {
  const patterns = [
    /\b(?:neste|deste|desse|nesse)\s+(?:n[oó]|ramo|mapa|trecho|texto|slide|quadro|esquema|bloco|item|cart[aã]o)\b/iu,
    /\b(?:no|do|ao|pelo)\s+(?:mapa\s+mental|n[oó]\s+(?:anterior|acima|abaixo|pai|filho|central|ao\s+lado)|ramo\s+(?:anterior|acima|abaixo)|texto\s+acima|trecho\s+acima|cart[aã]o\s+anterior|item\s+anterior|caso\s+da\s+aula|exemplo\s+da\s+aula)\b/iu,
    /\b(?:conforme|segundo|como)\s+(?:visto|citado|mencionado|mostrado|exposto|descrito|apresentado)\s+(?:acima|anteriormente|no\s+mapa|na\s+aula|no\s+pdf|no\s+texto|no\s+n[oó])\b/iu,
    /\b(?:o\s+que\s+a\s+banca\s+costuma\s+cobrar\s+aqui|qual\s+(?:[eé]\s+)?a\s+diferen[cç]a\s+entre\s+(?:eles|elas|os\s+dois|as\s+duas)\b)/iu,
    /^(?:quais\s+s[aã]o\s+(?:seus|suas)\s+|qual\s+[eé]\s+(?:o\s+seu|a\s+sua)\s+|como\s+(?:ele|ela|isso|este|esta)\s+)/iu,
  ];
  for (const re of patterns) {
    if (re.test(front)) {
      return 'A pergunta depende do contexto externo (mapa, PDF ou cartão anterior) e falha no teste do leitor frio.';
    }
  }
  return null;
}

function detectOpenOrAmbiguousPrompt(front, back) {
  if (/^(?:explique|comente|fale\s+sobre|discorra|aborde|discuta|resuma|descreva\s+livremente|d[eê]\s+sua\s+opini[aã]o)\b/iu.test(front)) {
    return 'Comando aberto ("explique/comente/fale sobre") sem alvo de recuperação unívoco.';
  }
  if (/^(?:o\s+que\s+voc[eê]\s+sabe\s+sobre|o\s+que\s+significa\s+tudo\s+isso)\b/iu.test(front)) {
    return 'Pergunta genérica sem critério objetivo de conferência.';
  }
  const foldedBack = fold(back);
  if (!foldedBack || foldedBack.length < 2) {
    return 'O verso está vazio ou não apresenta resposta verificável.';
  }
  if (/^(?:depende|varia|ver\s+aula|ver\s+mapa|consultar\s+lei|etc\.?)$/i.test(foldedBack)) {
    return 'O verso é vago e não oferece uma resposta conferível.';
  }
  return null;
}

function extractLegalRefs(text) {
  const refs = new Set();
  const normalized = fold(text);
  for (const m of normalized.matchAll(/\bart\.?\s*(\d+[a-z]?)\b/g)) refs.add('art:' + m[1]);
  for (const m of normalized.matchAll(/\blei\s+(?:n[.º°]?\s*)?(\d[\d.]*(?:\/\d{2,4})?)/g)) refs.add('lei:' + m[1].replace(/\./g, ''));
  for (const m of normalized.matchAll(/\bsumula\s+(?:vinculante\s+)?(?:n[.º°]?\s*)?(\d+)\b/g)) refs.add('sumula:' + m[1]);
  for (const m of normalized.matchAll(/\bec\s*(?:n[.º°]?\s*)?(\d+(?:\/\d{2,4})?)\b/g)) refs.add('ec:' + m[1]);
  return refs;
}

function extractQuantities(text) {
  const items = [];
  const normalized = fold(text);
  for (const m of normalized.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(dias?|meses?|m[eê]s|anos?|horas?|minutos?|%|por\s+cento)\b/g)) {
    const unit = m[2].startsWith('dia') ? 'dia'
      : m[2].startsWith('mes') ? 'mes'
      : m[2].startsWith('ano') ? 'ano'
      : m[2].startsWith('hora') ? 'hora'
      : m[2].startsWith('minuto') ? 'minuto'
      : 'pct';
    items.push({ value: m[1].replace(',', '.'), unit, raw: m[0] });
  }
  for (const m of normalized.matchAll(/\b(\d+\/\d+)\b/g)) {
    items.push({ value: m[1], unit: 'fracao', raw: m[0] });
  }
  return items;
}

const POLARITY_PAIRS = [
  [/\b(?:vedad[oa]|proibid[oa]|nao\s+pode|nao\s+admite|inadmissivel|nulo|nulidade)\b/i, /\b(?:permitid[oa]|autorizad[oa]|pode\s+ser|admissivel|valido)\b/i],
  [/\b(?:obrigatori[oa]|indispensavel|vinculad[oa])\b/i, /\b(?:facultativ[oa]|dispensavel|discricionari[oa])\b/i],
  [/\b(?:privativa)\b/i, /\b(?:exclusiva)\b/i],
];

function checkSourceFidelity(card, front, back, context = {}) {
  const issues = [];
  const sourcesList = Array.isArray(context.sources) ? context.sources : [];
  const joinedSources = [
    clean(context.sourceText),
    ...sourcesList.map(s => (typeof s === 'string' ? clean(s) : clean(s?.texto || s?.text))),
  ].filter(Boolean).join('\n');

  const hasSource = joinedSources.length >= 20;
  const requireSource = Boolean(context.requireSource);
  const excerpt = clean(card.sourceExcerpt || card.evidencia || card.evidence?.excerpt);

  if (requireSource && !hasSource) {
    issues.push({
      rule: 'fidelidade',
      code: 'fonte_insuficiente',
      severity: 'error',
      message: 'Não há fonte textual acessível suficiente para sustentar este flashcard.',
    });
    return {
      issues,
      evidence: { verified: false, sourceId: '', excerpt, limitation: 'Fonte textual insuficiente.' },
    };
  }

  if (!hasSource) {
    return {
      issues,
      evidence: { verified: false, sourceId: '', excerpt, limitation: '' },
    };
  }

  const foldedSource = fold(joinedSources);
  const foldedFront = fold(front);
  let excerptVerified = false;
  let matchedSourceId = clean(card.sourceId || card.evidence?.sourceId);

  if (excerpt) {
    const foldedExcerpt = fold(excerpt);
    excerptVerified = foldedExcerpt.length >= 8 && foldedSource.includes(foldedExcerpt);
    if (!excerptVerified) {
      issues.push({
        rule: 'fidelidade',
        code: 'trecho_nao_localizado',
        severity: 'error',
        message: 'O trecho de evidência indicado não foi localizado literalmente na fonte acessível.',
      });
    } else if (!matchedSourceId && sourcesList.length) {
      const found = sourcesList.find(s => fold(typeof s === 'string' ? s : s?.texto || s?.text).includes(foldedExcerpt));
      if (found && typeof found === 'object' && found.id) matchedSourceId = String(found.id);
    }
  }

  // Verifica referências legais no verso que não constam nem na fonte nem na frente.
  const sourceRefs = extractLegalRefs(joinedSources + ' ' + front);
  const backRefs = extractLegalRefs(back + ' ' + clean(card.basis || card.src));
  const inventedRefs = [...backRefs].filter(ref => !sourceRefs.has(ref));
  if (inventedRefs.length) {
    issues.push({
      rule: 'fidelidade',
      code: 'referencia_nao_sustentada',
      severity: 'error',
      message: `O verso cita referência(s) ausente(s) da fonte acessível (${inventedRefs.join(', ')}).`,
    });
  }

  // Verifica quantidades (prazos, quóruns, percentuais) incompatíveis ou ausentes da fonte.
  const sourceQtys = extractQuantities(joinedSources + ' ' + front);
  const backQtys = extractQuantities(back);
  for (const qty of backQtys) {
    const sameExact = sourceQtys.some(sq => sq.unit === qty.unit && sq.value === qty.value);
    if (sameExact) continue;
    const sameUnitDiffVal = sourceQtys.find(sq => sq.unit === qty.unit && sq.value !== qty.value);
    if (sameUnitDiffVal) {
      issues.push({
        rule: 'fidelidade',
        code: 'incompativel_com_fonte',
        severity: 'error',
        message: `Valor numérico/prazo no verso (“${qty.raw}”) diverge da fonte acessível (“${sameUnitDiffVal.raw}”).`,
      });
    } else if (!foldedSource.includes(qty.value)) {
      issues.push({
        rule: 'fidelidade',
        code: 'fato_sem_suporte_na_fonte',
        severity: 'error',
        message: `Dado numérico no verso (“${qty.raw}”) não aparece na fonte acessível.`,
      });
    }
  }

  // Verifica sobreposição lexical mínima entre o verso e a fonte (descontando termos já presentes na frente).
  const backTokens = contentTokens(back);
  const sourceTokens = contentTokens(joinedSources);
  const frontTokens = contentTokens(front);
  const novelBackTokens = new Set([...backTokens].filter(t => !frontTokens.has(t)));
  if (novelBackTokens.size >= 3) {
    const supportedRatio = overlapRatio(novelBackTokens, sourceTokens);
    if (supportedRatio < 0.25) {
      issues.push({
        rule: 'fidelidade',
        code: 'incompativel_com_fonte',
        severity: 'error',
        message: 'A resposta proposta não encontra sustentação textual suficiente na fonte acessível.',
      });
    }
  }

  // Detecta inversão polar direta quando frente e verso compartilham termos com a fonte, mas invertem vedação/permissão.
  const foldedBack = fold(back);
  if (overlapRatio(frontTokens, sourceTokens) >= 0.35 && backTokens.size >= 2) {
    for (const [negRe, posRe] of POLARITY_PAIRS) {
      const sourceHasNeg = negRe.test(foldedSource) && !posRe.test(foldedSource);
      const sourceHasPos = posRe.test(foldedSource) && !negRe.test(foldedSource);
      const backHasNeg = negRe.test(foldedBack) && !posRe.test(foldedBack);
      const backHasPos = posRe.test(foldedBack) && !negRe.test(foldedBack);
      if ((sourceHasNeg && backHasPos) || (sourceHasPos && backHasNeg)) {
        // Só dispara se não for cartão de contraste explicando ambos os polos.
        if (inferCardType(card) !== 'contraste' && !negRe.test(foldedFront) && !posRe.test(foldedFront)) {
          issues.push({
            rule: 'fidelidade',
            code: 'incompativel_com_fonte',
            severity: 'error',
            message: 'A polaridade jurídica/factual do verso (permitido/vedado, obrigatório/facultativo) contradiz a fonte acessível.',
          });
          break;
        }
      }
    }
  }

  return {
    issues,
    evidence: {
      verified: excerptVerified || (issues.length === 0 && hasSource),
      sourceId: matchedSourceId,
      excerpt,
      limitation: issues.length ? issues[0].message : '',
    },
  };
}

function checkRedundancy(front, back, retrievalTarget, peers = []) {
  const ownFront = contentTokens(front);
  const ownBack = contentTokens(back);
  const ownAll = new Set([...ownFront, ...ownBack]);
  const ownTarget = fold(retrievalTarget);
  const flatFront = fold(front);

  for (const peer of peers) {
    if (!peer) continue;
    const peerFrontText = clean(peer.front || peer.q);
    const peerBackText = clean(peer.back || peer.a);
    if (!peerFrontText) continue;

    if (fold(peerFrontText) === flatFront) {
      return {
        peerId: peer.id || '',
        message: `Frente duplicada com o cartão existente${peer.id ? ` (${peer.id})` : ''}.`,
      };
    }

    const peerTarget = fold(peer.retrievalTarget || peer.alvoRecuperacao || '');
    if (ownTarget && peerTarget && ownTarget.length >= 8 && ownTarget === peerTarget) {
      return {
        peerId: peer.id || '',
        message: `Mesmo alvo de recuperação já coberto por outro cartão${peer.id ? ` (${peer.id})` : ''}.`,
      };
    }

    const peerFront = contentTokens(peerFrontText);
    const peerBack = contentTokens(peerBackText);
    const peerAll = new Set([...peerFront, ...peerBack]);
    const frontSim = jaccard(ownFront, peerFront);
    const backSim = jaccard(ownBack, peerBack);
    const combinedSim = jaccard(ownAll, peerAll);

    if (combinedSim >= 0.62 || (frontSim >= 0.55 && backSim >= 0.5) || (backSim >= 0.72 && frontSim >= 0.35)) {
      return {
        peerId: peer.id || '',
        message: `Duplicação semântica detectada em relação a outro cartão${peer.id ? ` (${peer.id})` : ''}.`,
      };
    }
  }
  return null;
}

const NORMATIVE_CONTENT_RE = /\b(?:art\.?\s*\d+|lei\s+(?:n[.º°]?\s*)?\d+|cf\/?88|constitui[cç][aã]o|ricd|rccn|ec\s*\d+|decreto|resolu[cç][aã]o|s[uú]mula|qu[oó]rum|prazo\s+de\s+\d+)\b/iu;
const ESSENTIAL_QUALIFICATION_RE = /\b(?:salvo|exceto|ressalvad[oa]|desde\s+que|observad[oa]|em\s+regra|exce[cç][aã]o)\b/iu;

/**
 * Valida um único cartão candidato ou legado segundo as 9 dimensões pedagógicas.
 */
export function validateFlashcard(card = {}, context = {}) {
  const rawFront = rawFrontOf(card);
  const back = rawBackOf(card);
  const basis = clean(card.basis ?? card.src ?? card.fonte ?? card.ref ?? card.referenciaNormativa);
  const subject = clean(context.subjectName ?? context.subject ?? card.subject);
  const topics = context.topics ?? [context.topicTitle, context.topicLabel, card.tema].filter(Boolean);
  const topicId = clean(card.topicId ?? card.topico ?? context.topicId);
  const cardType = inferCardType(card);
  const retrievalTarget = clean(card.retrievalTarget ?? card.alvoRecuperacao);

  const reasons = [];
  let canSplit = false;

  // 7. Contextualização: prefixo duplicado de matéria/assunto
  const hasPrefix = hasRedundantContextPrefix(rawFront, subject, topics, topicId);
  const front = stripFlashcardContext(rawFront, subject, topics, topicId);
  if (hasPrefix) {
    reasons.push({
      rule: 'contextualizacao',
      code: 'prefixo_duplicado',
      severity: 'error',
      message: 'A frente repete o prefixo de matéria/assunto; matéria e tópico devem permanecer apenas nos metadados.',
    });
  }

  if (front.length < 12) {
    reasons.push({
      rule: 'univocidade',
      code: 'frente_curta',
      severity: 'error',
      message: 'A frente está curta demais para formar uma pergunta independente e clara.',
    });
  }

  // 1. Atomicidade: perguntas compostas e listas extensas
  const compoundMsg = detectCompoundFront(front);
  if (compoundMsg) {
    canSplit = true;
    reasons.push({ rule: 'atomicidade', code: 'pergunta_composta', severity: 'error', message: compoundMsg });
  }
  const listMsg = detectExtensiveList(front, back, cardType);
  if (listMsg) {
    canSplit = true;
    reasons.push({ rule: 'atomicidade', code: 'lista_extensa', severity: 'error', message: listMsg });
  }

  // 2. Autonomia: leitor frio
  const depMsg = detectContextDependency(front);
  if (depMsg) {
    reasons.push({ rule: 'autonomia', code: 'dependente_de_contexto', severity: 'error', message: depMsg });
  }

  // 3. Univocidade: comando aberto ou verso não verificável
  const openMsg = detectOpenOrAmbiguousPrompt(front, back);
  if (openMsg) {
    reasons.push({ rule: 'univocidade', code: 'resposta_nao_univoca', severity: 'error', message: openMsg });
  }

  // 4. Fidelidade: fonte textual acessível
  const fidelity = checkSourceFidelity(card, front, back, context);
  reasons.push(...fidelity.issues);

  // 5. Concisão: alertas sem amputar qualificações essenciais
  const backSentences = sentenceCount(back);
  const hasQualification = ESSENTIAL_QUALIFICATION_RE.test(back);
  if (back.length > 1200) {
    reasons.push({
      rule: 'concisao',
      code: 'verso_excessivo',
      severity: 'error',
      message: `Verso excessivamente longo (${back.length} caracteres); reduza para uma resposta objetiva ou divida o cartão.`,
    });
    canSplit = true;
  } else if (back.length > 650 || backSentences > 5) {
    reasons.push({
      rule: 'concisao',
      code: 'verso_extenso',
      severity: 'warning',
      message: `Verso extenso (${back.length} caracteres, ${backSentences} frases); recomenda-se enxugar sem remover exceções essenciais.`,
    });
  } else if ((back.length > 380 || backSentences > 3) && !hasQualification) {
    reasons.push({
      rule: 'concisao',
      code: 'verso_alerta_tamanho',
      severity: 'warning',
      message: `Verso acima da recomendação concisa (${backSentences} frases, ${back.length} caracteres).`,
    });
  }

  // 6. Não redundância: contra baralho existente e pares já validados
  const existingPeers = [
    ...(Array.isArray(context.existingCards) ? context.existingCards : []),
    ...(Array.isArray(context.batchPeers) ? context.batchPeers : []),
  ].filter(peer => !card.id || peer?.id !== card.id);
  const duplicate = checkRedundancy(front, back, retrievalTarget, existingPeers);
  if (duplicate) {
    reasons.push({
      rule: 'nao_redundancia',
      code: 'duplicacao_semantica',
      severity: 'error',
      message: duplicate.message,
    });
  }

  // 8. Remissão: topicId e mapaNoId
  const cardNodeId = clean(card.mapaNoId ?? card.no ?? card.node);
  const expectedTopicId = clean(context.topicId);
  if (expectedTopicId && topicId && fold(topicId) !== fold(expectedTopicId)) {
    reasons.push({
      rule: 'remissao',
      code: 'remissao_topico_invalido',
      severity: 'error',
      message: `O topicId do cartão (“${topicId}”) não corresponde ao tópico esperado (“${expectedTopicId}”).`,
    });
  }

  const validNodeIds = context.validNodeIds instanceof Set
    ? context.validNodeIds
    : Array.isArray(context.validNodeIds)
      ? new Set(context.validNodeIds)
      : Array.isArray(context.mapa?.nodes)
        ? new Set(context.mapa.nodes.map(n => n.id))
        : null;

  const expectedNodeId = clean(context.targetNodeId);
  if (expectedNodeId && cardNodeId && cardNodeId !== expectedNodeId) {
    reasons.push({
      rule: 'remissao',
      code: 'remissao_no_invalido',
      severity: 'error',
      message: `A remissão de nó (“${cardNodeId}”) diverge do nó selecionado (“${expectedNodeId}”).`,
    });
  } else if (validNodeIds && cardNodeId && !validNodeIds.has(cardNodeId)) {
    reasons.push({
      rule: 'remissao',
      code: 'remissao_no_invalido',
      severity: 'error',
      message: `O nó referenciado (“${cardNodeId}”) não existe no mapa mental deste tópico.`,
    });
  } else if (expectedNodeId && !cardNodeId && context.requireNodeLink) {
    reasons.push({
      rule: 'remissao',
      code: 'remissao_no_ausente',
      severity: 'error',
      message: `Falta registrar o identificador exato do nó do mapa (“${expectedNodeId}”).`,
    });
  }

  // 9. Vigência e referência normativa
  const isNormative = NORMATIVE_CONTENT_RE.test(front + ' ' + back);
  const normativeRef = clean(card.normativeRef ?? card.referenciaNormativa ?? basis);
  const vigencia = clean(card.vigencia ?? card.dataConferencia);
  if (isNormative && !normativeRef && !NORMATIVE_CONTENT_RE.test(basis)) {
    reasons.push({
      rule: 'vigencia',
      code: 'referencia_normativa_ausente',
      severity: 'warning',
      message: 'Conteúdo normativo sem referência registrada nos metadados (dispositivo/fonte e vigência quando disponível).',
    });
  }

  // Classificação final: approved | needs_review | rejected
  const errors = reasons.filter(r => r.severity === 'error');
  const warnings = reasons.filter(r => r.severity === 'warning');
  const hardRejectCodes = new Set([
    'fonte_insuficiente',
    'incompativel_com_fonte',
    'referencia_nao_sustentada',
    'fato_sem_suporte_na_fonte',
    'duplicacao_semantica',
    'remissao_no_invalido',
    'remissao_topico_invalido',
    'frente_curta',
    'verso_excessivo',
  ]);
  const hasHardReject = errors.some(e => hardRejectCodes.has(e.code)) || errors.length >= 2;
  const status = hasHardReject
    ? 'rejected'
    : errors.length > 0 || warnings.length > 0
      ? 'needs_review'
      : 'approved';

  return {
    status,
    reasons,
    rulesViolated: [...new Set(reasons.map(r => r.rule))],
    errorCodes: [...new Set(errors.map(r => r.code))],
    warningCodes: [...new Set(warnings.map(r => r.code))],
    cardType,
    retrievalTarget,
    normalizedFront: front,
    hasRedundantPrefix: hasPrefix,
    canSplit,
    normative: { isNormative, reference: normativeRef, vigencia },
    evidence: fidelity.evidence,
  };
}

/**
 * Valida um lote de cartões, incluindo checagem de não redundância entre irmãos do lote.
 */
export function validateFlashcardBatch(cards = [], context = {}) {
  const acceptedPeers = [];
  const results = [];

  for (const card of Array.isArray(cards) ? cards : []) {
    const validation = validateFlashcard(card, { ...context, batchPeers: acceptedPeers });
    results.push({ card, validation });
    acceptedPeers.push({
      id: card?.id || `batch-${results.length}`,
      front: validation.normalizedFront,
      back: rawBackOf(card),
      retrievalTarget: validation.retrievalTarget,
    });
  }

  const summary = {
    total: results.length,
    approved: results.filter(r => r.validation.status === 'approved').length,
    needs_review: results.filter(r => r.validation.status === 'needs_review').length,
    rejected: results.filter(r => r.validation.status === 'rejected').length,
  };

  return { results, summary };
}

/**
 * Diagnóstico de cartões legados sem alterar nenhum registro.
 */
export function diagnoseLegacyFlashcards(cards = [], context = {}) {
  const { results, summary } = validateFlashcardBatch(cards, { ...context, requireSource: false });
  const byRule = {};
  const byCode = {};
  let splittable = 0;
  let withPrefix = 0;

  for (const { validation } of results) {
    if (validation.canSplit) splittable += 1;
    if (validation.hasRedundantPrefix) withPrefix += 1;
    for (const rule of validation.rulesViolated) {
      byRule[rule] = (byRule[rule] || 0) + 1;
    }
    for (const reason of validation.reasons) {
      byCode[reason.code] = (byCode[reason.code] || 0) + 1;
    }
  }

  return {
    summary: { ...summary, splittable, withPrefix },
    byRule,
    byCode,
    items: results.map(({ card, validation }) => ({
      id: card?.id || '',
      topicId: card?.topicId || card?.topico || '',
      mapaNoId: card?.mapaNoId || card?.node || '',
      status: validation.status,
      canSplit: validation.canSplit,
      hasRedundantPrefix: validation.hasRedundantPrefix,
      rulesViolated: validation.rulesViolated,
      codes: validation.reasons.map(r => r.code),
      reasons: validation.reasons,
    })),
  };
}
