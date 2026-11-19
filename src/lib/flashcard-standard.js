function label(text) {
  return typeof text === 'string' ? text.trim().replace(/\s+/g, ' ') : '';
}

function normalized(text) {
  return label(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Remove cabeçalhos legados sem consumir citações ou instruções da pergunta.
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
    const namedSubject = !!subjectKey && normalized(head) === subjectKey;
    const codedSubject = code && (knownCode ? codeKey(head) === knownCode : code[1] === code[1].toUpperCase());
    if (!namedSubject && !codedSubject) break;
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

export function contextualFlashcardFront(front, subject, topic) {
  if (typeof front !== 'string' || !front.trim()) return '';
  const question = front.trim();
  const matter = label(subject);
  const focus = label(topic);
  if (!matter || !focus) return question;
  const context = matter + ' · ' + focus;
  const prefix = context + ':';
  // O próprio título do tópico pode conter dois-pontos.
  const length = Array.from(prefix).length;
  const start = Array.from(question).slice(0, length).join('');
  if (normalized(start) === normalized(prefix)) return prefix + ' ' + question.slice(start.length).trimStart();

  const boundary = question.indexOf(':');
  const existing = boundary >= 0 ? question.slice(0, boundary) : '';
  if (existing.includes('·') && normalized(existing.split('·')[0]) === normalized(matter)) return question;

  return prefix + ' ' + question;
}
