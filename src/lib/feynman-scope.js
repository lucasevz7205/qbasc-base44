export const FEYNMAN_SCOPE_LIMITS = { subject: 200, topic: 300, node: 240, path: 12, summary: 1800 };

export function feynmanMapGroups(maps, topicId) {
  if (!topicId) return [];
  return maps.filter(map => map.topicId === topicId && map.nodes.length).map(map => {
    const byId = new Map(map.nodes.map(node => [node.id, node]));
    return {
      id: map.id,
      title: map.title,
      nodes: map.nodes.map(node => {
        const path = [node.label];
        const visited = new Set([node.id]);
        for (let parent = byId.get(node.parent); parent && !visited.has(parent.id); parent = byId.get(parent.parent)) {
          visited.add(parent.id);
          path.unshift(parent.label);
        }
        return { id: node.id, label: node.label, path };
      }),
    };
  });
}
