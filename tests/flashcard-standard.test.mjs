import test from 'node:test';
import assert from 'node:assert/strict';
import { contextualFlashcardFront, stripFlashcardContext } from '../src/lib/flashcard-standard.js';
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

test('a frente conserva a pergunta e seus dois-pontos nos formatos importados', () => {
  const question = 'Em “Escondi-me na mata”, o pronome está depois do verbo. Essa posição se chama próclise, ênclise ou mesóclise?';
  const clean = text => stripFlashcardContext(text, 'Língua Portuguesa', 'Colocação dos pronomes átonos', 'lp-5-8');
  assert.equal(clean('LP 5.8 · colocação pronominal: ' + question), question);
  assert.equal(clean('Língua Portuguesa · LP-5.8: LP 5.8 · colocação pronominal: ' + question), question);
  assert.equal(clean('Leia a frase: “Escondi-me na mata”. Onde está o pronome?'), 'Leia a frase: “Escondi-me na mata”. Onde está o pronome?');
  assert.equal(stripFlashcardContext('Ciência Política · Poderes: relações e controle: Quem fiscaliza?', 'Ciência Política', 'Poderes: relações e controle'), 'Quem fiscaliza?');
});
