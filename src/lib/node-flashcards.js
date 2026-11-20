import { stripFlashcardContext } from './flashcard-standard.js';

export async function saveGeneratedNodeFlashcards(cards, saveCard) {
  const results = [];
  for (const card of cards) {
    try {
      await saveCard(card.id, card.front, card.back);
      results.push({ ...card, status: 'saved' });
    } catch (error) {
      results.push({ ...card, saveError: error?.message || 'Não foi possível gravar este flashcard.' });
    }
  }
  return results;
}
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
