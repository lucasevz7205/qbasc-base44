const outcomes = ['correct', 'wrong', 'blank'];
const empty = () => ({ correct: 0, wrong: 0, blank: 0 });
const mark = value => String(value ?? '').trim().toUpperCase();
const count = value => Math.max(0, Math.trunc(Number(value) || 0));
const list = value => Array.isArray(value) ? value : [];
const time = value => value ? Date.parse(value) : NaN;

function outcome(answer, key, recorded) {
  if (answer === 'B') return 'blank';
  if (answer !== 'C' && answer !== 'E') return null;
  if (typeof recorded === 'boolean') return recorded ? 'correct' : 'wrong';
  return key === 'C' || key === 'E' ? (answer === key ? 'correct' : 'wrong') : null;
}

export function dailyQuestionPerformance({ answers, questions, rounds, day }) {
  const days = Object.create(null);
  const attemptsByDay = Object.create(null);
  const roundsByDay = Object.create(null);
  const review = empty();
  const candidates = new Map();
  const stat = date => days[date] ??= { date, n: 0, ...empty() };
  const add = (date, result, qid, amount = 1) => {
    const row = stat(date);
    row[result] += amount;
    row.n += amount;
    if (qid) (attemptsByDay[date] ??= []).push({ qid, result });
  };

  for (const [qid, response] of Object.entries(answers)) {
    const history = list(response.hist);
    const last = history.at(-1);
    const current = mark(response.ultimaMarcada);
    const entries = [...history];
    if (current && response.atualizadoEm && (!last?.em || mark(last.m) !== current)) {
      entries.push({ m: current, em: response.atualizadoEm, gabarito: response.gabaritoUsado });
    }
    for (const entry of entries) {
      const date = day(entry?.em);
      const answer = mark(entry?.m);
      const result = outcome(answer, mark(entry?.gabarito || questions[qid]?.gabarito), entry?.ok);
      if (!date || !result) continue;
      const pool = candidates.get(qid) || [];
      pool.push({ answer, result, date, timestamp: time(entry.em), sessionId: entry.sessionId, matched: false });
      candidates.set(qid, pool);
      add(date, result, qid);
    }
  }

  const orderedRounds = [...rounds].sort((a, b) => time(a.fim ?? a.inicio) - time(b.fim ?? b.inicio));
  for (const round of orderedRounds) {
    if (/^simulado/i.test(round.modo || '')) continue;
    const date = day(round.fim ?? round.inicio);
    if (!date) continue;
    roundsByDay[date] = (roundsByDay[date] ?? 0) + 1;
    const totals = { correct: count(round.certos), wrong: count(round.errados), blank: count(round.brancos) };
    if (/revis|caderno|recuper/i.test(round.modo || '')) for (const key of outcomes) review[key] += totals[key];
    const remaining = { ...totals };
    const start = time(round.inicio);
    const end = time(round.fim);
    const inLegacyWindow = candidate => !candidate.sessionId &&
      (Number.isFinite(start) && Number.isFinite(end)
        ? candidate.timestamp >= start && candidate.timestamp <= end
        : candidate.date === date);
    const sessionId = round.id?.startsWith('qbasc-') ? round.id.slice('qbasc-'.length) : null;
    const items = list(round.itens);
    for (const item of items) {
      const qid = item.qid;
      const answer = mark(item.marcada);
      const result = outcome(answer, mark(item.gabarito || questions[qid]?.gabarito), item.ok);
      if (!result || !remaining[result]) continue;
      remaining[result]--;
      const pool = candidates.get(qid) || [];
      const matches = candidate => !candidate.matched && candidate.answer === answer && candidate.result === result;
      const recorded = time(item.em);
      const exact = Number.isFinite(recorded) ? pool.find(candidate => matches(candidate) && candidate.timestamp === recorded) : null;
      const sameSession = sessionId ? pool.find(candidate => matches(candidate) && candidate.sessionId === sessionId) : null;
      const legacy = pool.filter(candidate => matches(candidate) && inLegacyWindow(candidate))
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      const match = exact || sameSession || legacy;
      if (match) match.matched = true;
      else add(day(item.em) || date, result, qid);
    }
    // Some imported rounds contain totals only. Match attempts inside their
    // recorded interval, without consuming attempts from newer identified sessions.
    if (!items.length && Number.isFinite(start) && Number.isFinite(end)) {
      for (const pool of candidates.values()) {
        for (const candidate of pool) {
          if (candidate.matched || !inLegacyWindow(candidate) || !remaining[candidate.result]) continue;
          candidate.matched = true;
          remaining[candidate.result]--;
        }
      }
    }
    for (const key of outcomes) if (remaining[key]) add(date, key, null, remaining[key]);
  }

  return { days, attemptsByDay, roundsByDay, review };
}


export function groupResponsesByTopic(responses, questions, subjects) {
  const questionTopics = new Map(questions.map(q => [q.id, q.topicId]));
  const stats = new Map();
  for (const { qid, result } of responses) {
    const topicId = questionTopics.get(qid);
    if (!topicId || !outcomes.includes(result)) continue;
    const row = stats.get(topicId) || empty();
    row[result]++;
    stats.set(topicId, row);
  }
  return subjects.flatMap(subject => {
    const topics = subject.topics.flatMap(topic => {
      const attempts = stats.get(topic.id);
      return attempts ? [{ id: topic.id, num: topic.num, title: topic.title, ...attempts }] : [];
    });
    if (!topics.length) return [];
    const totals = topics.reduce((sum, topic) => {
      for (const key of outcomes) sum[key] += topic[key];
      return sum;
    }, empty());
    return [{ id: subject.id, name: subject.name, topics, ...totals }];
  });
}
