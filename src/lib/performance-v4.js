export function calendarBuckets(days, group, addDays) {
  const buckets = new Map();
  for (const day of days) {
    const key = group === 'mes' ? day.date.slice(0, 7) : group === 'semana'
      ? addDays(day.date, -new Date(day.date + 'T12:00:00Z').getUTCDay()) : day.date;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(day);
  }
  return [...buckets.values()];
}

export function recurringTopicErrors(days, questionsById) {
  const groups = new Map();
  for (const { date, attempts } of days) {
    for (const attempt of attempts) {
      if (attempt.result !== 'wrong') continue;
      const topicId = questionsById.get(attempt.qid)?.topicId;
      if (!topicId) continue;
      if (!groups.has(topicId)) groups.set(topicId, { topicId, errors: 0, dates: new Set(), ids: new Set() });
      const group = groups.get(topicId);
      group.errors++;
      group.dates.add(date);
      group.ids.add(attempt.qid);
    }
  }
  return [...groups.values()].filter(group => group.errors >= 5 && group.dates.size >= 2)
    .sort((a, b) => b.errors - a.errors || a.topicId.localeCompare(b.topicId));
}

export function buildPerformanceNodes(groups, responses, data) {
  const questions = new Map(data.questions.map(q => [q.id, q]));
  const maps = new Map(data.mindMaps.map(map => [map.topicId, map]));
  const decks = new Set(data.flashcards.map(card => card.topicId));
  const counts = new Map();
  for (const { qid, result } of responses) {
    const q = questions.get(qid);
    if (!q?.node || !['correct', 'wrong', 'blank'].includes(result)) continue;
    const key = JSON.stringify([q.topicId, q.node]);
    if (!counts.has(key)) counts.set(key, { correct: 0, wrong: 0, blank: 0 });
    counts.get(key)[result]++;
  }
  return groups.map(group => ({ ...group, level: 'subject', subjectId: group.id,
    children: group.topics.map(topic => {
      const map = maps.get(topic.id);
      const binding = { subjectId: group.id, topicId: topic.id };
      const children = map?.nodes.flatMap(node => {
        if (node.id === map.id) return [];
        const row = counts.get(JSON.stringify([topic.id, node.id]));
        return row ? [{ ...row, ...binding, id: node.id, name: node.label, nodeId: node.id, level: 'topic', actions: ['mindmap'] }] : [];
      });
      return { ...topic, ...binding, level: 'group', name: topic.title || topic.num, code: topic.num,
        actions: ['edital', ...(map ? ['mindmap'] : []), ...(decks.has(topic.id) ? ['review'] : [])],
        ...(children?.length ? { children } : {}) };
    }),
  }));
}
