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
