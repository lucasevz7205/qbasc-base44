/**
 * Mapeamento oficial dos ícones do Design System por matéria e limpeza de emojis legados em títulos.
 */

export const SUBJECT_ICONS = Object.freeze({
  lp: 'feather',
  li: 'globe',
  da: 'building-2',
  adm: 'building-2',
  dc: 'landmark',
  ti: 'database',
  lg: 'languages',
  rf: 'audio-lines',
  pl: 'scroll-text',
  cp: 'vote',
  jur: 'scale',
});

export function subjectIconName(subjectId, fallback = 'book-open') {
  const key = String(subjectId || '').trim().toLowerCase();
  return SUBJECT_ICONS[key] || fallback;
}

const LEADING_EMOJI_RE = /^(?:(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E|\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}))*\s*)+/u;

/**
 * Remove emojis pictográficos no início de títulos de mapa (centro) ou capítulo (capNome),
 * para que a interface exiba sempre o ícone oficial da matéria pelo Design System.
 */
export function stripLeadingEmoji(text) {
  if (typeof text !== 'string') return '';
  return text.trimStart().replace(LEADING_EMOJI_RE, '').trim();
}
