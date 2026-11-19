import test from "node:test";
import assert from "node:assert/strict";
import { ARCHITECT_CLAIM_RULES, isTutorContestation, tutorContestationDirective } from "../src/lib/tutor-claim-rules.js";

test("contestação: detecta discordância e pedido de revisão, sem disparar em pergunta neutra", () => {
  assert.equal(isTutorContestation("Isso está errado, o 'mas' não atrai o pronome."), true);
  assert.equal(isTutorContestation("Discordo: conjunção coordenativa não atrai pronome."), true);
  assert.equal(isTutorContestation("Você tem certeza disso?"), true);
  assert.equal(isTutorContestation("Não é assim que a regra funciona."), true);
  assert.equal(isTutorContestation("Qual a diferença entre próclise e ênclise?"), false);
  assert.equal(isTutorContestation("Quero testar minha retenção ativa."), false);
  assert.equal(isTutorContestation(""), false);
  assert.equal(isTutorContestation(undefined), false);
});

test("diretriz de reexame só aparece com histórico e contestação", () => {
  assert.equal(tutorContestationDirective("Isso está errado.", false), "");
  assert.equal(tutorContestationDirective("Qual a regra?", true), "");
  const directive = tutorContestationDirective("Isso está errado.", true);
  assert.match(directive, /Reexame obrigatório/);
  assert.match(directive, /estava certa ou errada/);
});

test("regras: exigem classificação em fonte, classificação e hipótese, e vetam 'pesquise você mesmo'", () => {
  assert.match(ARCHITECT_CLAIM_RULES, /"Na fonte"/);
  assert.match(ARCHITECT_CLAIM_RULES, /"Classificação do Arquiteto"/);
  assert.match(ARCHITECT_CLAIM_RULES, /"Hipótese"/);
  assert.match(ARCHITECT_CLAIM_RULES, /"pesquise você mesmo"/);
  assert.match(ARCHITECT_CLAIM_RULES, /Nunca mantenha uma posição só porque/);
  assert.match(ARCHITECT_CLAIM_RULES, /Não cite obras, autores/);
});
