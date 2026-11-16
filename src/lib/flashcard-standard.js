function label(text) {
  return typeof text === 'string' ? text.trim().replace(/\s+/g, ' ') : '';
}

function normalized(text) {
  return label(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
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
