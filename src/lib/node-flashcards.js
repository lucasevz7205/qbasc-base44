import { stripFlashcardContext } from './flashcard-standard.js';
export function buildNodeFlashcardRecord({ cardId, topicId, targetNodeId, nodeLabel, subjectName, topicTitle, front, back }) {
  return {
    id: cardId,
    topico: topicId,
    cartoes: [{
      id: cardId, q: stripFlashcardContext(front, subjectName, [topicTitle, nodeLabel], topicId), a: back.trim(), mapaNoId: targetNodeId,
      src: 'O Arquiteto · Mapa mental · ' + nodeLabel,
    }],
  };
}
