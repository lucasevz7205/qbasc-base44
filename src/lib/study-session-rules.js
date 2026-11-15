const QUESTION_ROUND_LIMIT = 20;
const FLASHCARD_INTERVALS = [1, 3, 7, 15, 30];
const RATINGS = ['errei', 'dificil', 'bom', 'facil'];

export function pickQuestionRound(bank, { topicId, subjectId, nodeId } = {}) {
  return bank
    .filter(question =>
      (!topicId || question.topicId === topicId) &&
      (!subjectId || question.subjectId === subjectId) &&
      (!nodeId || question.node === nodeId),
    )
    .sort((a, b) => Number(Boolean(a.response)) - Number(Boolean(b.response)))
    .slice(0, QUESTION_ROUND_LIMIT);
}

export function flashcardOptions(previousLevel) {
  const lastLevel = FLASHCARD_INTERVALS.length - 1;
  const current = Math.min(lastLevel, Math.max(0, Math.trunc(Number(previousLevel) || 0)));
  return Object.fromEntries(RATINGS.map(rating => {
    const step = rating === 'facil' ? 2 : rating === 'bom' ? 1 : 0;
    const level = rating === 'errei' ? 0 : Math.min(lastLevel, current + step);
    const days = FLASHCARD_INTERVALS[level];
    return [rating, { level, days, label: days === 1 ? '1 dia' : days + ' dias' }];
  }));
}
