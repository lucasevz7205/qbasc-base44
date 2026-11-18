export function buildNodeFlashcardRecord({ cardId, topicId, targetNodeId, nodeLabel, front, back }) {
  return {
    id: cardId,
    topico: topicId,
    cartoes: [{
      id: cardId, q: front.trim(), a: back.trim(), mapaNoId: targetNodeId,
      src: 'O Arquiteto · Mapa mental · ' + nodeLabel,
    }],
  };
}
