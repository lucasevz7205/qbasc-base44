export function describePending({ remaining, requiredQuestions, requiredFlashcards }) {
  const missing = [
    requiredQuestions && (requiredQuestions === 1 ? '1 questão' : requiredQuestions + ' questões'),
    requiredFlashcards && (requiredFlashcards === 1 ? '1 flashcard' : requiredFlashcards + ' flashcards'),
  ].filter(Boolean);
  const flexible = Math.max(0, remaining - requiredQuestions - requiredFlashcards);
  if (flexible) missing.push(flexible === 1 ? '1 questão ou flashcard' : flexible + ' entre questões e flashcards');
  return 'Para avaliar: ' + missing.join(' + ');
}
