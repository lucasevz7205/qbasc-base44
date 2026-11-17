import test from "node:test";
import assert from "node:assert/strict";
import { itemFromDisplayedQuestion, questionQualityProblems, questionsNeedingCompletion, sentenceCount } from "../src/lib/item-quality.js";
import { applyEditorialOverlays, makeDirectQuestionOverwrite, makeEditorialEntry, parseEditorialSuggestion } from "../src/lib/editorial-overrides.js";

const good = {
  statement: "Medida provisória tem força de lei desde a edição e perde a eficácia se não convertida em 60 dias, prorrogáveis uma vez.",
  key: "C", mecanismo: "V1",
  explanation: "Item Certo: o art. 62, §3º, da CF fixa 60 dias de vigência, prorrogáveis por igual período. Parece errado porque o item não cita a prorrogação por extenso, mas incompleto não é errado.",
  basis: "CF art. 62, §3º",
  correcaoMinima: "Trocar '60 dias' por '30 dias' tornaria o item Errado (F4, detalhe alterado).",
  trechoDecisivo: "prorrogável, uma única vez, por igual período",
};

test("item completo passa no portão", () => {
  const r = questionQualityProblems(good);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.warnings, []);
});
test("item só com referência como comentário e sem mecanismo é barrado", () => {
  const r = questionQualityProblems({ statement: good.statement, key: "C", explanation: "CF art. 62, caput", basis: "CF art. 62, caput" });
  const codes = r.problems.map(p => p.code);
  for (const c of ["mecanismo_ausente", "correcao_minima_ausente", "comentario_curto", "comentario_igual_referencia"]) assert.ok(codes.includes(c), c);
});
test("mecanismo F em item Certo e V em item Errado são incompatíveis", () => {
  assert.ok(questionQualityProblems({ ...good, mecanismo: "F4" }).problems.some(p => p.code === "mecanismo_incompativel"));
  assert.ok(questionQualityProblems({ ...good, key: "E", mecanismo: "V1" }).problems.some(p => p.code === "mecanismo_incompativel"));
});
test("comentário que repete o enunciado é barrado", () => {
  const r = questionQualityProblems({ ...good, explanation: "Item Certo. " + good.statement + " Está correto." });
  assert.ok(r.problems.some(p => p.code === "comentario_repete_enunciado"));
});
test("sem trecho decisivo só avisa", () => {
  const r = questionQualityProblems({ ...good, trechoDecisivo: "" });
  assert.equal(r.problems.length, 0);
  assert.equal(r.warnings[0].code, "trecho_ausente");
});
test("sentenceCount ignora fragmentos curtos", () => {
  assert.equal(sentenceCount("Sim. Não. Art. 5."), 0);
  assert.equal(sentenceCount("A regra vale para todos os casos previstos. Há uma exceção expressa na lei."), 2);
});
test("lista itens antigos fora do padrão", () => {
  const legacy = { id: "Q1", statement: good.statement, key: "C", explanation: "CF art. 62", basis: "CF art. 62", raw: {}, trap: undefined };
  const ok = { id: "Q2", ...good, raw: { correcaoMinima: good.correcaoMinima, trechoDecisivo: good.trechoDecisivo }, trap: { code: "V1" } };
  const list = questionsNeedingCompletion([legacy, ok]);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "Q1");
});

const rawQuestion = Object.freeze({ id: "Q-7", enunciado: "Texto antigo.", gabarito: "C", comentario: "CF art. 62", ref: "CF art. 62", cap: "DC-1", origem: "inédito Claude" });
const displayed = Object.freeze({ id: "Q-7", statement: "Texto antigo.", key: "C", explanation: "CF art. 62", basis: "CF art. 62", origin: "inédito Claude", raw: rawQuestion });
const proposal = { parecer: "Completado.", replacement: { statement: good.statement, key: "C", explanation: good.explanation, basis: good.basis,
  mecanismo: "V1", trechoDecisivo: good.trechoDecisivo, correcaoMinima: good.correcaoMinima } };

test("parse da proposta traz mecanismo, trecho e correção mínima", () => {
  const json = JSON.stringify({ parecer: "ok", needsHumanReview: false, replacement: {
    statement: good.statement, key: "C", explanation: good.explanation, basis: good.basis,
    mecanismo: "v1", trechoDecisivo: good.trechoDecisivo, correcaoMinima: good.correcaoMinima } });
  const p = parseEditorialSuggestion(json, "question");
  assert.equal(p.replacement.mecanismo, "V1");
  assert.equal(p.replacement.correcaoMinima, good.correcaoMinima);
  assert.equal(p.replacement.trechoDecisivo, good.trechoDecisivo);
});
test("sobrescrever grava mecanismo e correção mínima no registro, com o mesmo id", () => {
  const { updatedQuestion, backup } = makeDirectQuestionOverwrite({ question: displayed, proposal, issue: "fundamentacao", now: new Date("2026-11-17T12:00:00Z") });
  assert.equal(updatedQuestion.id, "Q-7");
  assert.equal(updatedQuestion.mecanismo, "V1");
  assert.equal(updatedQuestion.mecanismoNome, "Paráfrase fiel");
  assert.equal(updatedQuestion.correcaoMinima, good.correcaoMinima);
  assert.equal(updatedQuestion.trechoDecisivo, good.trechoDecisivo);
  assert.equal(updatedQuestion.comentario, good.explanation);
  assert.deepEqual(backup.rawAnterior, rawQuestion);
  assert.equal(rawQuestion.comentario, "CF art. 62");
});
test("sem mecanismo na proposta, o registro mantém o que tinha", () => {
  const p = { parecer: "x", replacement: { statement: "Novo.", key: "C", explanation: "Novo comentário.", basis: "ref" } };
  const { updatedQuestion } = makeDirectQuestionOverwrite({ question: { ...displayed, raw: { ...rawQuestion, mecanismo: "V4" } }, proposal: p, issue: "formulacao" });
  assert.equal(updatedQuestion.mecanismo, "V4");
});
test("versão editorial aprovada exibe o mecanismo da proposta", () => {
  const entry = makeEditorialEntry({ kind: "question", content: displayed, proposal, issue: "fundamentacao" });
  const out = applyEditorialOverlays([displayed], [], [entry]);
  assert.equal(out.questions[0].trap.code, "V1");
  assert.equal(out.questions[0].trap.description, good.correcaoMinima);
  assert.equal(out.questions[0].trap.evidence, good.trechoDecisivo);
});

test("o diagnóstico considera a versão editorial atualmente exibida", () => {
  const entry = makeEditorialEntry({ kind: "question", content: displayed, proposal, issue: "fundamentacao" });
  const { questions } = applyEditorialOverlays([displayed], [], [entry]);
  assert.deepEqual(questionQualityProblems(itemFromDisplayedQuestion(questions[0])), { problems: [], warnings: [] });
});

test("a substituição atualiza os campos legados exibidos e guarda os originais no backup", () => {
  const raw = { ...rawQuestion, evidencia: "Trecho anterior", trap: { description: "Correção anterior" } };
  const { updatedQuestion, backup } = makeDirectQuestionOverwrite({
    question: { ...displayed, raw }, proposal, issue: "fundamentacao",
  });
  assert.equal(updatedQuestion.evidencia, good.trechoDecisivo);
  assert.equal(updatedQuestion.trap.description, good.correcaoMinima);
  assert.deepEqual(backup.rawAnterior, raw);
});
