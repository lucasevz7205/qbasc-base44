export const FLASHCARD_RATINGS = [
  { id: 'errei', label: 'Errei', tone: 'incorrect' },
  { id: 'dificil', label: 'Difícil', tone: 'attention' },
  { id: 'bom', label: 'Bom', tone: 'correct' },
  { id: 'facil', label: 'Fácil', tone: 'gold' },
];

export const FLASHCARD_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'unseen-today', label: 'Não vistos hoje', hint: 'Cartões do baralho sem avaliação registrada hoje.' },
  { id: 'missed', label: 'Errados', hint: 'Cartões cuja última avaliação foi Errei ou Novamente.' },
];

export function filterFlashcardDeck(deck, reviews, filter, today, studyDate) {
  return deck.filter(card => {
    const review = reviews[card.id];
    const history = Array.isArray(review?.hist) ? review.hist : [];
    if (filter === 'unseen-today') {
      const seenToday = [review?.atualizadoEm, ...history.map(entry => entry?.em)]
        .some(date => studyDate(date) === today);
      return !seenToday;
    }
    if (filter === 'missed') {
      const latest = review?.ult || history.at(-1)?.v;
      return ['errei', 'n', 'novamente'].includes(String(latest || '').toLowerCase());
    }
    return true;
  });
}

export function extractFlashcardSuggestion(reply) {
  const plain = String(reply || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[*_`]/g, '').toLowerCase();
  const diagnosis = plain.match(/^[\s>#-]*diagnostico\s*:\s*(correta|parcial|incorreta|indeterminada)\b/m)?.[1];
  if (diagnosis === 'indeterminada') return null;

  const suggested = plain.match(/^[\s>#-]*avaliacao sugerida\s*:\s*(errei|dificil|bom|facil|sem sugestao)\b/m)?.[1];
  if (suggested) return suggested === 'sem sugestao' ? null : suggested;
  const fallback = { correta: 'bom', parcial: 'dificil', incorreta: 'errei' };
  return fallback[diagnosis] || null;
}
