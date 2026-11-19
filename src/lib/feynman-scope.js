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

export const FEYNMAN_AUDIENCES = {
  child: { label: 'Criança de 10 anos', listener: 'uma criança curiosa de 10 anos', guide: 'Use palavras do dia a dia e uma comparação que a criança consiga imaginar.' },
  peer: { label: 'Colega iniciante', listener: 'um colega de estudo iniciante', guide: 'Apresente a ideia passo a passo e explique cada termo técnico na primeira vez que aparecer.' },
  exam: { label: 'Banca Cebraspe', listener: 'uma banca avaliadora Cebraspe', guide: 'Enuncie a regra com precisão e aplique-a a um caso. Indique a exceção quando for relevante.' },
};
