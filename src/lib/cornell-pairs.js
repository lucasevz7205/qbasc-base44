// Pares usam um documento separado, para manter legível o caderno original em qualquer versão do app.
export const cornellPairsTopicId = topicId => 'qbasc-cornell-pares:' + topicId;

export function readCornellPairs(notes) {
  if (!notes) return [];
  try {
    const rows = JSON.parse(notes);
    if (!Array.isArray(rows)) return [];
    return rows.filter(row => typeof row?.id === 'string' && typeof row.cue === 'string' && typeof row.note === 'string');
  } catch {
    return [];
  }
}

export function cornellPairTitle(pair, position) {
  const title = typeof pair?.title === 'string' ? pair.title.trim() : '';
  const cue = String(pair?.cue || '').split(/\r?\n/).map(text => text.trim()).find(Boolean) || '';
  return title || cue.replace(/^\d+[.)]\s+/, '').slice(0, 100) || 'Pista ' + (position + 1);
}
