const QUESTION_ROUND_LIMIT = 20;
const FLASHCARD_INTERVALS = [1, 3, 7, 15, 30];
const RATINGS = ['errei', 'dificil', 'bom', 'facil'];

export const QUESTION_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'wrong', label: 'Erradas' },
  { id: 'unseen', label: 'Inéditas' },
];

function lastAnswerOutcome(question) {
  const response = question.response;
  if (!response) return 'unseen';
  const history = Array.isArray(response.hist) ? response.hist : [];
  const last = history.at(-1);
  const key = value => String(value ?? '').trim().toUpperCase();
  const marked = key(response.ultimaMarcada || last?.m);
  if (!marked && !history.length && !(Number(response.tentativas) > 0)) return 'unseen';
  if (marked !== 'C' && marked !== 'E') return 'answered';
  const recordedKey = key(response.gabaritoUsado);
  if (recordedKey === 'C' || recordedKey === 'E') return marked === recordedKey ? 'answered' : 'wrong';
  if (last && key(last.m) === marked && typeof last.ok === 'boolean') return last.ok ? 'answered' : 'wrong';
  const originalKey = key(question.raw?.gabarito || question.key);
  return (originalKey === 'C' || originalKey === 'E') && marked !== originalKey ? 'wrong' : 'answered';
}

export function pickQuestionRound(bank, { topicId, subjectId, nodeId, filter, questionIds } = {}) {
  const selected = questionIds ? new Set(questionIds) : null;
  const matching = bank.filter(question =>
    (!selected || selected.has(question.id)) &&
    question.statusConfronto !== 'divergencia_bloqueada' &&
    (!topicId || question.topicId === topicId) &&
    (!subjectId || question.subjectId === subjectId) &&
    (!nodeId || question.node === nodeId),
  );
  if (filter === 'all') return matching;
  if (filter === 'wrong' || filter === 'unseen') {
    return matching.filter(question => lastAnswerOutcome(question) === filter);
  }
  return matching.sort((a, b) => Number(Boolean(a.response)) - Number(Boolean(b.response))).slice(0, QUESTION_ROUND_LIMIT);
}

export function flashcardOptions(previousLevel) {
  const lastLevel = FLASHCARD_INTERVALS.length - 1;
  const current = Math.min(lastLevel, Math.max(0, Math.trunc(Number(previousLevel) || 0)));
  return Object.fromEntries(RATINGS.map(rating => {
    const step = rating === 'facil' ? 2 : rating === 'bom' ? 1 : 0;
    if (rating === 'errei') return [rating, { level: 0, days: 0, label: 'Nesta sessão', repeat: true }];
    const level = Math.min(lastLevel, current + step);
    const days = FLASHCARD_INTERVALS[level];
    return [rating, { level, days, label: days === 1 ? '1 dia' : days + ' dias' }];
  }));
}
