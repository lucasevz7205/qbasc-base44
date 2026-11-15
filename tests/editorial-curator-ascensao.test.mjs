/* global URL */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyEditorialOverlays, makeEditorialEntry, parseEditorialSuggestion } from "../src/lib/editorial-overrides.js";

const q = Object.freeze({ id: "Q01", key: "E", statement: "Texto original", explanation: "Comentário inicial", basis: "Fonte original", node: "DC::N1", topicId: "DC-1", origin: "banco existente" });
const c = Object.freeze({ id: "CARD01", front: "Pergunta original", back: "Verso original", basis: "Fonte", node: "DC::N1", topicId: "DC-1" });
const pq = { parecer: "Problema de clareza", replacement: { statement: "Enunciado revisado", key: "E", explanation: "Comentário revisado", basis: "Fonte original" } };
const pc = { parecer: "Simplificação", replacement: { front: "Pergunta revisada", back: "Resposta revisada", basis: "Fonte" } };

test("overlay vazio preserva todos os IDs e objetos", () => {
  const result = applyEditorialOverlays([q], [c], []);
  assert.deepEqual(result.questions, [q]);
  assert.deepEqual(result.cards, [c]);
});
test("revisão aprovada cria novo documento versionado, mantendo origem", () => {
  const e1 = makeEditorialEntry({ kind: "question", content: q, proposal: pq, issue: "formulacao", now: new Date("2026-11-15T12:00:00.000Z") });
  assert.equal(e1.id, "question:Q01:v1");
  assert.deepEqual(e1.original, { statement: q.statement, key: q.key, explanation: q.explanation, basis: q.basis, origin: q.origin });
  const result = applyEditorialOverlays([q], [c], [e1]);
  assert.equal(result.questions[0].id, "Q01");
  assert.equal(result.questions[0].node, "DC::N1");
  assert.equal(result.questions[0].topicId, "DC-1");
  assert.equal(result.questions[0].statement, "Enunciado revisado");
  assert.equal(q.statement, "Texto original");
  assert.equal(result.questions[0].raw, undefined);
});
test("nova versão imutável preserva original, ID, histórico de versões e vínculos", () => {
  const e1 = makeEditorialEntry({ kind: "flashcard", content: c, proposal: pc, issue: "formulacao" });
  const revised = applyEditorialOverlays([], [c], [e1]).cards[0];
  const e2 = makeEditorialEntry({
    kind: "flashcard", content: revised, previous: e1,
    proposal: { parecer: "Conceito mais preciso", replacement: { ...pc.replacement, back: "Verso refinado" } },
    issue: "fundamentacao",
  });
  assert.equal(e2.id, "flashcard:CARD01:v2");
  assert.equal(e1.id, "flashcard:CARD01:v1");
  assert.equal(e2.original.front, "Pergunta original");
  const result = applyEditorialOverlays([], [c], [e2, e1]);
  assert.equal(result.cards[0].back, "Verso refinado");
  assert.equal(result.cards[0].node, "DC::N1");
  assert.equal(c.back, "Verso original");
});
test("somente documentos aprovados e válidos são aplicados", () => {
  const e = makeEditorialEntry({ kind: "question", content: q, proposal: pq, issue: "formulacao" });
  const invalid = [{ ...e, status: "pendente" }, { ...e, id: "other" }];
  assert.equal(applyEditorialOverlays([q], [c], invalid).questions[0].statement, q.statement);
});
test("resposta malformada não gera proposta simulada", () => {
  assert.throws(() => parseEditorialSuggestion("sem JSON", "question"), /JSON/);
  assert.throws(() => parseEditorialSuggestion('{"parecer":"x","replacement":{"key":"C"}}', "question"), /gabarito/);
  const response = parseEditorialSuggestion('\\`\\`\\`json\n{"parecer":"clareza","replacement":{"front":"Pergunta revista","back":"Resposta revista"}}\n\\`\\`\\`'.replaceAll('\\',''), "flashcard");
  assert.equal(response.replacement.front, "Pergunta revista");
  assert.equal(response.needsHumanReview, true);
});
test("não aplica propostas sem resposta verificável", () => {
  assert.throws(() => makeEditorialEntry({ kind: "flashcard", content: c, proposal: { replacement: { front: "", back: "" } } }), /incompleta/);
  assert.throws(() => makeEditorialEntry({ kind: "question", content: q, proposal: { replacement: { statement: "X", key: "?" } } }), /incompleta/);
});
test("questões, flashcards e tutor usam componentes da Ascensão", () => {
  const editor = readFileSync(new URL("../src/components/qb/study/EditorialCurator.jsx", import.meta.url), "utf8");
  const qs = readFileSync(new URL("../src/components/qb/screens/QuestionSessionView.jsx", import.meta.url), "utf8");
  const fc = readFileSync(new URL("../src/components/qb/screens/FlashcardSessionView.jsx", import.meta.url), "utf8");
  const tutor = readFileSync(new URL("../src/components/qb/architect/SocraticChat.jsx", import.meta.url), "utf8");
  assert.match(editor, /aria-expanded=\{expanded\}/);
  assert.match(editor, /Aprovar e salvar nova versão/);
  assert.match(editor, /save\("curadoria", entry.id, entry\)/);
  assert.match(qs, /<EditorialCurator key=\{q.id\} kind="question"/);
  assert.match(fc, /<EditorialCurator kind="flashcard"/);
  assert.match(tutor, /<StudyTopicPicker/);
  assert.doesNotMatch(tutor, /<SelectField/);
});
test("curadoria não altera coleções originais nem cálculo do histórico", () => {
  const store = readFileSync(new URL("../src/lib/qb-real-data.jsx", import.meta.url), "utf8");
  const model = readFileSync(new URL("../src/lib/qb-real-model.js", import.meta.url), "utf8");
  const qs = readFileSync(new URL("../src/components/qb/screens/QuestionSessionView.jsx", import.meta.url), "utf8");
  assert.match(store, /'pontos','curadoria'/);
  assert.match(model, /applyEditorialOverlays\(questionBank, uniqueCards, source\('curadoria'\)\)/);
  assert.match(model, /r.gabaritoUsado \|\| q.gabarito/);
  assert.match(qs, /record.gabaritoUsado = q.key/);
  assert.match(qs, /keyAtAnswer/);
});
test("curadoria só consulta Gemini sob autorização e não faz fallback pago", () => {
  const service = readFileSync(new URL("../src/lib/server-fns.js", import.meta.url), "utf8");
  const start = service.indexOf("export const proposeEditorialRevision");
  const end = service.indexOf("const FlashcardCorrectionSchema", start);
  const fn = service.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.match(fn, /\.middleware\(\[requireUser\]\)/);
  assert.match(fn, /context.user\?\.role !== "admin"/);
  assert.match(fn, /invokeGeminiTutor/);
  assert.match(fn, /parseEditorialSuggestion/);
  assert.doesNotMatch(fn, /Core\.InvokeLLM|\.create\(|\.update\(|save\(/);
});
