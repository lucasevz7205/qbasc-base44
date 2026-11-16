import test from 'node:test';
import assert from 'node:assert/strict';
import { contextualFlashcardFront } from '../src/lib/flashcard-standard.js';
import { FLASHCARD_RULES } from '../src/lib/flashcard-rules.js';

test('a frente usa a matéria e o tópico reais e aceita títulos com dois-pontos', () => {
  const matter = 'Ciência Política';
  const topic = 'Poderes: relações e controle';
  const front = 'Qual é a função típica do Legislativo?';
  const normalized = contextualFlashcardFront(front, matter, topic);
  assert.equal(normalized, 'Ciência Política · Poderes: relações e controle: ' + front);
  assert.equal(contextualFlashcardFront(normalized, matter, topic), normalized);
  assert.equal(contextualFlashcardFront(front, '', topic), front);
});

test('o padrão compartilhado conserva o requisito de fidelidade ao material', () => {
  assert.match(FLASHCARD_RULES, /Matéria · tópico:/);
  assert.match(FLASHCARD_RULES, /UM conceito por cartão/);
  assert.match(FLASHCARD_RULES, /use só o texto fornecido/);
});
