function label(text) {
  return typeof text === 'string' ? text.trim().replace(/\s+/g, ' ') : '';
}

function normalized(text) {
  return label(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const GENERIC_SUBJECT_PREFIX_RE = /^(?:direito\s+(?:administrativo|constitucional|eleitoral|financeiro|tributario|penal|civil|processual)|ciencia\s+politica|lingua\s+(?:portuguesa|inglesa)|portugues|ingles|linguistica|processo\s+legislativo|regimento\s+(?:interno|comum)|administracao(?:\s+publica)?|reconhecimento\s+de\s+fala|ti\s+e\s+dados|tecnologia\s+da\s+informacao|jurisprudencia)\s*·\s*/iu;

// Remove cabeçalhos legados ("Matéria · Assunto:", "LP 5.8 · tópico:") sem consumir citações ou instruções da pergunta.
export function stripFlashcardContext(front, subject, topics, topicId = '') {
  if (typeof front !== 'string') return front;
  const titles = (Array.isArray(topics) ? topics : [topics]).map(normalized).filter(Boolean);
  const subjectKey = normalized(subject);
  const codeKey = text => normalized(text).replace(/[.\s_-]+/g, '-');
  const knownCode = codeKey(topicId);
  let question = front.trim();

  while (true) {
    const separator = question.match(/^([^:·\n]{1,120})\s*·\s*/u);
    const head = separator ? separator[1].trim() : '';
    const code = head.match(/^([\p{L}]{2,8})[ -]+\d+(?:[.-]\d+)*$/u);
    const namedSubject = Boolean(subjectKey && normalized(head) === subjectKey);
    const codedSubject = Boolean(code && (knownCode ? codeKey(head) === knownCode : code[1] === code[1].toUpperCase()));
    const knownMatter = Boolean(separator && GENERIC_SUBJECT_PREFIX_RE.test(separator[0].normalize('NFD').replace(/\p{M}/gu, '')));
    if (!namedSubject && !codedSubject && !knownMatter) break;

    const tail = question.slice(separator[0].length);
    const boundaries = [...tail.matchAll(/:/g)];
    // Prefira o título completo: há assuntos cujo nome contém dois-pontos.
    const exact = boundaries.filter(m => titles.includes(normalized(tail.slice(0, m.index)))).at(-1);
    const boundary = exact || boundaries[0];
    if (!boundary) break;

    const descriptor = tail.slice(0, boundary.index).trim();
    const rest = tail.slice(boundary.index + 1).trimStart();
    if (!rest || !descriptor || descriptor.length > 180 || /[?\n]/.test(descriptor)) break;
    question = rest;
  }

  return question;
}

export function hasRedundantContextPrefix(front, subject, topics, topicId = '') {
  if (typeof front !== 'string' || !front.trim()) return false;
  return stripFlashcardContext(front, subject, topics, topicId) !== front.trim();
}

export function normalizeFlashcardFront(front, subject, topics, topicId = '') {
  if (typeof front !== 'string') return '';
  return stripFlashcardContext(front, subject, topics, topicId).trim();
}

// Compatibilidade legada: a regra 1 proíbe prefixo "Matéria · Assunto:" na frente,
// pois matéria e assunto ficam nos metadados e são exibidos no cabeçalho do app.
export function contextualFlashcardFront(front, subject, topic, topicId = '') {
  return normalizeFlashcardFront(front, subject, topic, topicId);
}
