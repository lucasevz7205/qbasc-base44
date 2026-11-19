export const conceptLabelKey = value => typeof value === 'string'
  ? value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
  : '';

export function indexConceptRemissions(mindMaps, revisions) {
  const topics = new Map();
  for (const map of mindMaps) {
    const topic = topics.get(map.topicId) || { ids: new Map(), labels: new Map(), questoes: new Map(), cartoes: new Map() };
    topics.set(map.topicId, topic);
    for (const node of map.nodes) {
      topic.ids.set(node.id, node);
      const key = conceptLabelKey(node.label);
      topic.labels.set(key, topic.labels.has(key) ? null : node.id);
    }
  }
  for (const doc of revisions) {
    if (doc.kind !== 'concept-remissions' || !Array.isArray(doc.links)) continue;
    const topic = topics.get(doc.topico);
    if (!topic) continue;
    for (const link of doc.links) {
      const node = topic.ids.get(link.nodeId);
      if (!node || conceptLabelKey(node.label) !== conceptLabelKey(link.label)) continue;
      for (const kind of ['questoes', 'cartoes']) {
        if (!Array.isArray(link[kind])) continue;
        for (const id of link[kind]) {
          const previous = topic[kind].get(id);
          topic[kind].set(id, previous === undefined || previous === node.id ? node.id : null);
        }
      }
    }
  }
  return topics;
}

export function conceptReviewItems(map, nodeId, questions, flashcards) {
  const children = new Map(map.nodes.map(node => [node.id, []]));
  if (!children.has(nodeId)) return { questionIds: [], cardIds: [], includesChildren: false };
  for (const node of map.nodes) children.get(node.parent)?.push(node.id);
  const scope = new Set([nodeId]);
  for (const id of scope) for (const child of children.get(id)) scope.add(child);
  let includesChildren = false;
  function selectedIds(items) {
    const direct = new Set(), nested = new Set();
    for (const item of items) {
      if (item.topicId !== map.topicId || !scope.has(item.node)) continue;
      (item.node === nodeId ? direct : nested).add(item.id);
    }
    includesChildren ||= nested.size > 0;
    return [...new Set([...direct, ...nested])];
  }
  const questionIds = selectedIds(questions.filter(q => q.statusConfronto !== 'divergencia_bloqueada'));
  const cardIds = selectedIds(flashcards);
  return { questionIds, cardIds, includesChildren };
}
