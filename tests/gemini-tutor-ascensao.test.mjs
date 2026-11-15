/* global Response, URL */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { invokeGeminiTutor, DEFAULT_TUTOR_GEMINI_MODEL } from "../src/lib/gemini-tutor.js";

test("Gemini: API externa recebe o prompt, modelo e chave somente no header", async () => {
  let seen;
  const result = await invokeGeminiTutor({
    apiKey: "test-secret-not-real",
    prompt: "Pergunta socrática",
    fetchImpl: async (url, opts) => {
      seen = { url, opts };
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "Qual é a regra geral?" }] } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  assert.equal(result.reply, "Qual é a regra geral?");
  assert.equal(result.provider, "gemini");
  assert.match(seen.url, /models\/gemini-3\.5-flash-lite:generateContent$/);
  assert.equal(seen.opts.headers["x-goog-api-key"], "test-secret-not-real");
  assert.ok(!seen.url.includes("test-secret-not-real"));
  assert.ok(!seen.opts.body.includes("test-secret-not-real"));
  assert.equal(JSON.parse(seen.opts.body).contents[0].parts[0].text, "Pergunta socrática");
  assert.equal(DEFAULT_TUTOR_GEMINI_MODEL, "gemini-3.5-flash-lite");
});

test("Gemini: sem chave, não chama qualquer serviço externo", async () => {
  let calls = 0;
  await assert.rejects(invokeGeminiTutor({
    apiKey: "",
    prompt: "teste",
    fetchImpl: async () => { calls++; },
  }), /Chave Gemini ausente/);
  assert.equal(calls, 0);
});

test("Gemini: modelo inválido é recusado sem acesso remoto", async () => {
  let calls = 0;
  await assert.rejects(invokeGeminiTutor({
    apiKey: "teste",
    prompt: "teste",
    model: "../unsafe",
    fetchImpl: async () => { calls++; },
  }), /Modelo Gemini inválido/);
  assert.equal(calls, 0);
});

test("Gemini: limite 429 é erro explícito, sem cobrança via fallback", async () => {
  let calls = 0;
  await assert.rejects(invokeGeminiTutor({
    apiKey: "teste",
    prompt: "teste",
    fetchImpl: async () => { calls++; return new Response("rate limit", { status: 429 }); },
  }), /Limite de uso/);
  assert.equal(calls, 1);
});

test("Gemini: recusa resposta vazia ou bloqueada sem fabricar tutor", async () => {
  await assert.rejects(invokeGeminiTutor({
    apiKey: "teste",
    prompt: "teste",
    fetchImpl: async () => new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
  }), /não retornou texto/);
});

test("Gemini: aborta requisição demorada", async () => {
  await assert.rejects(invokeGeminiTutor({
    apiKey: "teste",
    prompt: "teste",
    timeoutMs: 5,
    fetchImpl: async (_url, opts) => new Promise((_resolve, reject) => {
      opts.signal.addEventListener("abort", () => reject(new Error("AbortError")), { once: true });
    }),
  }), /Tempo limite/);
});

test("QBAsc mantém modos pedagógicos, acesso restrito e opção Gemini", () => {
  const source = readFileSync(new URL("../src/lib/server-fns.js", import.meta.url), "utf8");
  for (const mode of ["socratico", "feynman", "banca", "oral", "retencao", "armadilhas", "analogia"]) {
    assert.ok(source.includes('"' + mode + '"') || source.includes(mode + ':'), "Modo ausente: " + mode);
  }
  assert.match(source, /askArchitectTutor = createServerFn/);
  assert.match(source, /\.middleware\(\[requireUser\]\)/);
  assert.match(source, /context\.user\?\.role !== "admin"/);
  assert.match(source, /secrets\.get\("QB_TUTOR_PROVIDER"\) === "gemini"/);
  assert.match(source, /secrets\.get\("Arquiteto"\)/);
  assert.match(source, /secrets\.get\("ARQUITETO"\)/);
  assert.match(source, /return invokeGeminiTutor/);
  assert.match(source, /base44\.asServiceRole\.integrations\.Core\.InvokeLLM\(\{ prompt \}\)/);
});
test("Correção do flashcard usa Gemini sem alterar SRS nem registros", () => {
  const source = readFileSync(new URL("../src/lib/server-fns.js", import.meta.url), "utf8");
  const start = source.indexOf("export const correctFlashcardWithArchitect");
  const end = source.indexOf("const FeynmanInputSchema", start);
  const block = source.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.match(block, /\.middleware\(\[requireUser\]\)/);
  assert.match(block, /context\.user\?\.role !== "admin"/);
  assert.match(block, /invokeGeminiTutor/);
  assert.match(block, /secrets\.get\("Arquiteto"\)/);
  assert.match(block, /data\.front/);
  assert.match(block, /data\.back/);
  assert.match(block, /data\.basis/);
  assert.match(block, /data\.attempt/);
  assert.doesNotMatch(block, /Core\.InvokeLLM\(|\.create\(|\.update\(|save\(/);
});

test("Interface oferece corrigir pelo Arquiteto e mantém classificação humana", () => {
  const correction = readFileSync(new URL("../src/components/qb/flashcards/FlashcardCorrection.jsx", import.meta.url), "utf8");
  const card = readFileSync(new URL("../src/components/qb/flashcards/Flashcard.jsx", import.meta.url), "utf8");
  const session = readFileSync(new URL("../src/components/qb/screens/FlashcardSessionView.jsx", import.meta.url), "utf8");
  assert.match(correction, /Corrigir com O Arquiteto/);
  assert.match(correction, /correctFlashcardWithArchitect/);
  assert.match(correction, /attempt\.trim\(\)/);
  assert.match(correction, /role="alert"/);
  assert.match(card, /\{correction \|\| null\}/);
  assert.match(session, /<FlashcardCorrection card=\{card\}/);
  assert.match(session, /save\('cartoes_aval',card\.id/);
  assert.match(correction, /aria-expanded=\{expanded\}/);
  assert.match(session, /<EditorialCurator kind="flashcard"/);
});

test("Chat explicita provedor antes de gastar créditos", () => {
  const tutor = readFileSync(new URL("../src/components/qb/architect/SocraticChat.jsx", import.meta.url), "utf8");
  const service = readFileSync(new URL("../src/lib/server-fns.js", import.meta.url), "utf8");
  assert.match(tutor, /React\.useState\('gemini'\)/);
  assert.match(tutor, /Gemini · API externa/);
  assert.match(tutor, /Base44 · créditos/);
  assert.match(tutor, /provider,/);
  assert.match(service, /getArchitectProviderStatus/);
  assert.match(service, /geminiConfigured: Boolean/);
});

