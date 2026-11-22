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

export function advanceFlashcardSession(session, queue, rating, repeat) {
  const { idx } = session;
  const next = { ...session, flipped: false, ratings: [...session.ratings, rating] };
  // Errei na passada principal: o cartão sai do baralho e vai para a fila de errados.
  if (rating === 'errei' && !session.repescagem) {
    return { ...next, idx: idx + 1, errados: [...(session.errados || []), queue[idx]] };
  }
  if (!repeat) return { ...next, idx: idx + 1 };
  return { ...next, queue: [...queue.slice(0, idx), ...queue.slice(idx + 1), queue[idx]] };
}

// Quando o baralho acaba, os errados do dia viram a repescagem (na mesma sessão).
export function enterRepescagem(session, total) {
  if (session.repescagem || !session.errados?.length || session.idx < total) return session;
  return { ...session, queue: session.errados, idx: 0, errados: [], repescagem: true, flipped: false };
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
