export const REVIEW_INTERVALS = [1, 3, 7, 15, 30];
export const DAILY_REVIEW_LIMIT = 50;
export const LEGACY_EXAM_DATE = '2027-01-17';

const dateFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' });
const dateKey = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const history = response => Array.isArray(response?.hist) ? response.hist : [];

export function reviewDay(value) {
  if (dateKey(value)) return value;
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? dateFormatter.format(date) : null;
}

export function moveReviewDay(day, days) {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function scheduleReview(day, interval, examDate = LEGACY_EXAM_DATE) {
  if (!dateKey(examDate)) return { days: interval, date: moveReviewDay(day, interval) };
  const lastWeek = moveReviewDay(examDate, -7);
  const daysTo = date => Math.round((Date.parse(date + 'T12:00:00Z') - Date.parse(day + 'T12:00:00Z')) / 86400000);
  const days = day >= lastWeek ? 1 : Math.min(interval, Math.max(1, Math.floor(daysTo(examDate) * 0.2)), daysTo(lastWeek));
  return { days, date: moveReviewDay(day, days) };
}

export function questionReviewDate(response, examDate = LEGACY_EXAM_DATE) {
  if (!response || !(Number(response.tentativas) > 0 || history(response).length || response.ultimaMarcada)) return null;
  const base = reviewDay(response.atualizadoEm) || reviewDay(history(response).at(-1)?.em);
  const saved = reviewDay(response.proxRevisao);
  if (!base) return saved;
  if (response.noCaderno) return saved || scheduleReview(base, 1, examDate).date;
  // Legacy records outside the error notebook use at least one 3/7-day step.
  const floor = scheduleReview(base, Number(response.conf) === 3 ? 7 : 3, examDate).date;
  return saved && saved > floor ? saved : floor;
}

export function flashcardLevel(review) {
  if (review?.nivel != null && Number.isFinite(Number(review.nivel))) {
    return Math.max(0, Math.min(REVIEW_INTERVALS.length - 1, Math.trunc(Number(review.nivel))));
  }
  return Math.max(0, REVIEW_INTERVALS.findLastIndex(days => days <= Number(review?.intervalo)));
}

export function flashcardWasRated(review) {
  return Boolean(review?.ult || reviewDay(review?.prox) || history(review).length);
}

export function flashcardIsDue(review, today) {
  if (!flashcardWasRated(review)) return false;
  const next = reviewDay(review.prox);
  return !next || next <= today;
}

function interleave(rows) {
  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row.group) || [];
    group.push(row.id);
    groups.set(row.group, group);
  }
  const order = [];
  for (let index = 0; order.length < rows.length; index++) {
    for (const group of groups.values()) if (index < group.length) order.push(group[index]);
  }
  return order;
}

export function scheduledReviewQueues({ questions, flashcards, reviews, rounds = [], today, subjectId, topicId, cardTopicIds, examDate }) {
  const reviewedQuestions = new Set();
  for (const round of rounds) {
    if (!/^revisao(?:-|$)/i.test(round.modo || '') || reviewDay(round.inicio ?? round.fim) !== today) continue;
    for (const item of round.itens || []) if (item.qid) reviewedQuestions.add(item.qid);
  }

  const questionRows = [];
  for (const question of questions) {
    const response = question.response;
    if (history(response).some(item => item.rev && reviewDay(item.em) === today)) reviewedQuestions.add(question.id);
    if (question.raw?.foraNivel || (topicId && question.topicId !== topicId) || (subjectId && question.subjectId !== subjectId)) continue;
    const date = questionReviewDate(response, examDate);
    if (date && date <= today) questionRows.push({ id: question.id, date, group: question.raw?.cap || question.topicId, priority: response.noCaderno ? 0 : 1 });
  }

  let reviewedCards = 0;
  for (const review of Object.values(reviews)) {
    reviewedCards += history(review).filter(item => item.rev && reviewDay(item.em) === today).length;
  }
  const cardRows = [];
  for (const card of flashcards) {
    if ((topicId && card.topicId !== topicId) || (cardTopicIds && !cardTopicIds.has(card.topicId))) continue;
    const review = reviews[card.id];
    if (flashcardIsDue(review, today)) cardRows.push({ id: card.id, date: reviewDay(review.prox) || '', group: card.topicId, priority: flashcardLevel(review) });
  }

  const pick = (rows, alreadyDone) => {
    rows.sort((a, b) => a.priority - b.priority || a.date.localeCompare(b.date));
    const eligible = rows.slice(0, Math.max(0, DAILY_REVIEW_LIMIT - alreadyDone));
    return { ids: interleave(eligible), due: rows.length, postponed: rows.length - eligible.length };
  };
  return { questions: pick(questionRows, reviewedQuestions.size), flashcards: pick(cardRows, reviewedCards) };
}
