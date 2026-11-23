import test from 'node:test';
import assert from 'node:assert/strict';
import { contextualFlashcardFront, hasRedundantContextPrefix, normalizeFlashcardFront, stripFlashcardContext } from '../src/lib/flashcard-standard.js';
import { FLASHCARD_CARD_TYPES, FLASHCARD_RULE_SPECS, FLASHCARD_RULES } from '../src/lib/flashcard-rules.js';

test('a frente nunca adiciona prefixo duplicado de matéria e assunto (regra 1 sem contradição)', () => {
  const matter = 'Ciência Política';
  const topic = 'Poderes: relações e controle';
  const front = 'Qual é a função típica do Legislativo?';
  const prefixed = 'Ciência Política · Poderes: relações e controle: ' + front;

  assert.equal(contextualFlashcardFront(front, matter, topic), front);
  assert.equal(contextualFlashcardFront(prefixed, matter, topic), front);
  assert.equal(normalizeFlashcardFront(prefixed, matter, topic), front);
  assert.equal(hasRedundantContextPrefix(prefixed, matter, topic), true);
  assert.equal(hasRedundantContextPrefix(front, matter, topic), false);
});

test('o padrão compartilhado enumera integralmente as 16 regras e não torna lacunas obrigatórias', () => {
  assert.equal(FLASHCARD_RULE_SPECS.length, 16);
  assert.deepEqual(FLASHCARD_CARD_TYPES, ['factual', 'contraste', 'aplicacao', 'lacuna']);
  assert.match(FLASHCARD_RULES, /16\./);
  assert.match(FLASHCARD_RULES, /lacunas não é obrigatória/i);
  assert.match(FLASHCARD_RULES, /UM alvo de recuperação por cartão/);
  assert.match(FLASHCARD_RULES, /use exclusivamente o texto-fonte acessível/i);
});

test('a frente conserva a pergunta e seus dois-pontos nos formatos importados', () => {
  const question = 'Em “Escondi-me na mata”, o pronome está depois do verbo. Essa posição se chama próclise, ênclise ou mesóclise?';
  const clean = text => stripFlashcardContext(text, 'Língua Portuguesa', 'Colocação dos pronomes átonos', 'lp-5-8');
  assert.equal(clean('LP 5.8 · colocação pronominal: ' + question), question);
  assert.equal(clean('Língua Portuguesa · LP-5.8: LP 5.8 · colocação pronominal: ' + question), question);
  assert.equal(clean('Leia a frase: “Escondi-me na mata”. Onde está o pronome?'), 'Leia a frase: “Escondi-me na mata”. Onde está o pronome?');
  assert.equal(stripFlashcardContext('Ciência Política · Poderes: relações e controle: Quem fiscaliza?', 'Ciência Política', 'Poderes: relações e controle'), 'Quem fiscaliza?');
});
