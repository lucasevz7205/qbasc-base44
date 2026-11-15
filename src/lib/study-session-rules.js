import { REVIEW_INTERVALS, flashcardLevel, scheduleReview } from './spaced-review.js';

const QUESTION_ROUND_LIMIT = 20;
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

export function distinctRoundQuestions(questions) {
  const ids = new Set();
  const prompts = new Set();
  return questions.filter(question => {
    const statement = String(question.statement || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
    const key = statement && JSON.stringify([statement, question.key]);
    if (ids.has(question.id) || (key && prompts.has(key))) return false;
    ids.add(question.id);
    if (key) prompts.add(key);
    return true;
  });
}

export function questionTrainingProgress(bank, { subjectId, topicId } = {}) {
  const questions = pickQuestionRound(bank, { subjectId, topicId, filter: 'all' });
  const seen = new Set();
  let completed = 0;
  let errors = 0;
  let valid = 0;
  for (const q of questions) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    const response = q.response;
    if (!response) continue;
    const history = Array.isArray(response.hist) ? response.hist : [];
    const graded = history.filter(item => /^(C|E)$/i.test(item?.m) && typeof item.ok === 'boolean');
    let correct = Math.max(0, Number(response.acertos) || 0) || graded.filter(item => item.ok).length;
    let wrong = Math.max(0, Number(response.erros) || 0) || graded.filter(item => !item.ok).length;
    if (!correct && !wrong && /^(C|E)$/i.test(response.ultimaMarcada || '')) {
      const key = String(response.gabaritoUsado || q.raw?.gabarito || q.key || '').trim().toUpperCase();
      if (key === 'C' || key === 'E') {
        if (response.ultimaMarcada.toUpperCase() === key) correct = 1;
        else wrong = 1;
      }
    }
    if (correct + wrong) completed++;
    errors += wrong;
    valid += correct + wrong;
  }
  return { total: seen.size, completed, errors, valid };
}

export function questionRoundProgress(questions, index, answers, excludedIds) {
  const counted = questions.filter(q => answers[q.id]?.revealed || !excludedIds.has(q.id));
  const completed = counted.filter(q => answers[q.id]?.revealed).length;
  const current = questions[index];
  const position = current ? counted.indexOf(current) + 1 : counted.length;
  return { total: counted.length, completed, position };
}

export function nextQuestionIndex(questions, from, excludedIds, deletingId) {
  let index = from;
  while (index < questions.length && (questions[index].id === deletingId || excludedIds.has(questions[index].id))) {
    index++;
  }
  return index;
}

export function flashcardOptions(previousReview, today) {
  const current = flashcardLevel(previousReview);
  return Object.fromEntries(RATINGS.map(rating => {
    const repeat = rating === 'errei';
    const step = rating === 'facil' ? 2 : rating === 'bom' ? 1 : 0;
    const level = repeat ? 0 : Math.min(REVIEW_INTERVALS.length - 1, current + step);
    const { days, date } = scheduleReview(today, REVIEW_INTERVALS[level]);
    return [rating, { level, days, date, label: repeat ? 'Nesta sessão e amanhã' : days === 1 ? '1 dia' : days + ' dias', repeat }];
  }));
}
