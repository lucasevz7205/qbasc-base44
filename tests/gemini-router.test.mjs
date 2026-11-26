/* global Response, URL */
import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyArchitectTask,
  selectModelChain,
  listGeminiModels,
  invokeArchitectGemini,
  createModelAvailabilityCache,
  describeArchitectModels,
  resolveArchitectModels,
  supportsStructuredOutput,
  GEMINI_MODEL_CANDIDATES,
} from "../src/lib/gemini-router.js";
import { createGeminiTelemetry, sanitizeTelemetryEntry } from "../src/lib/gemini-telemetry.js";

const KEY = "AIza-test-secret-not-real";
const FLASH = "gemini-2.5-flash";
const LITE = "gemini-2.5-flash-lite";
const SECRET_PROMPT = "PROMPT-PRIVADO do estudante Fulano CPF 000";

function listing(ids, extra = []) {
  return {
    models: [
      ...ids.map(id => ({ name: `models/${id}`, displayName: id, supportedGenerationMethods: ["generateContent", "countTokens"] })),
      ...extra,
    ],
  };
}

/** Transporte simulado: models.list + generateContent com status por modelo. */
function transport({ available = [FLASH, LITE], statusByModel = {}, listStatus = 200, usage = { promptTokenCount: 40, candidatesTokenCount: 9 } } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    assert.equal(init.headers["x-goog-api-key"], KEY);
    assert.ok(!url.includes(KEY), "chave na URL");
    if (init.body) assert.ok(!init.body.includes(KEY), "chave no corpo");
    if (/\/models\?/.test(url)) {
      if (listStatus !== 200) return new Response("erro", { status: listStatus });
      return new Response(JSON.stringify(listing(available)));
    }
    const model = decodeURIComponent(/models\/([^:]+):generateContent$/.exec(url)[1]);
    const status = statusByModel[model] ?? 200;
    if (status !== 200) return new Response("erro remoto com conteúdo", { status, headers: status === 503 ? { "Retry-After": "60" } : {} });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: `resposta de ${model}` }] } }], usageMetadata: usage }));
  };
  const generated = () => calls.filter(c => c.url.includes(":generateContent")).map(c => decodeURIComponent(/models\/([^:]+):/.exec(c.url)[1]));
  return { fetchImpl, calls, generated };
}

function harness(options) {
  const lines = [];
  const telemetry = createGeminiTelemetry({ log: line => lines.push(line) });
  const t = transport(options);
  const call = (args = {}) => invokeArchitectGemini({
    apiKey: KEY, prompt: SECRET_PROMPT, fetchImpl: t.fetchImpl, telemetry,
    cache: createModelAvailabilityCache(), ...args,
  });
  return { ...t, telemetry, lines, call };
}

test("seleção automática: simples e analogias vão para Flash-Lite; Feynman, jurídico e complexas para Flash", () => {
  assert.equal(classifyArchitectTask({ mode: "analogia", userMessage: "Me explique com analogia" }).tier, "lite");
  assert.equal(classifyArchitectTask({ mode: "retencao", userMessage: "Quero testar" }).tier, "lite");
  assert.equal(classifyArchitectTask({ mode: "socratico", userMessage: "O que é medida provisória?" }).tier, "lite");
  assert.equal(classifyArchitectTask({ mode: "feynman", userMessage: "Corrija minha explicação" }).tier, "flash");
  assert.equal(classifyArchitectTask({ mode: "banca", userMessage: "Crie um item" }).tier, "flash");
  assert.equal(classifyArchitectTask({ mode: "armadilhas", userMessage: "x" }).tier, "flash");
  assert.equal(classifyArchitectTask({ mode: "socratico", userMessage: "Qual o quórum do art. 60, § 2º?" }).tier, "flash");
  assert.equal(classifyArchitectTask({ mode: "socratico", userMessage: "Qual a distinção entre revogação e anulação?" }).tier, "flash");
  assert.equal(classifyArchitectTask({ mode: "socratico", userMessage: "Isso é inconstitucional?" }).reason, "raciocinio-juridico");
  assert.equal(classifyArchitectTask({ mode: "socratico", userMessage: "a".repeat(400) }).tier, "flash");
  assert.equal(classifyArchitectTask({ task: "flashcard-correction" }).tier, "flash");
  assert.equal(classifyArchitectTask({ task: "cornell-assessment" }).tier, "flash");
  assert.equal(classifyArchitectTask({ task: "cornell-cues" }).tier, "lite");
});

test("preferência manual prevalece e só modelos autorizados e listados entram na cadeia", () => {
  const available = new Set([FLASH, LITE]);
  assert.deepEqual(selectModelChain({ preference: "flash", tier: "lite", available }).chain.map(c => c.model), [FLASH, LITE]);
  assert.deepEqual(selectModelChain({ preference: "lite", tier: "flash", available }).chain.map(c => c.model), [LITE, FLASH]);
  assert.deepEqual(selectModelChain({ preference: "auto", tier: "flash", available: new Set([LITE, "gemini-9-ultra"]) }).chain.map(c => c.model), [LITE]);
  const unknown = selectModelChain({ preference: "auto", tier: "flash", available: null });
  assert.equal(unknown.availabilityKnown, false);
  assert.deepEqual(unknown.chain.map(c => c.model), [FLASH]);
});

test("respostas estruturadas usam só modelos compatíveis com JSON e esquema", () => {
  assert.equal(supportsStructuredOutput(FLASH), true);
  assert.equal(supportsStructuredOutput(LITE), true);
  assert.equal(supportsStructuredOutput("gemini-2.0-flash-lite"), false);
  const models = { flash: FLASH, lite: "gemini-2.0-flash-lite" };
  const chain = selectModelChain({ preference: "lite", models, structured: true, available: new Set(Object.values(models)) }).chain;
  assert.deepEqual(chain.map(c => c.model), [FLASH]);
});

test("segredos só substituem modelos por identificadores válidos", () => {
  assert.deepEqual(resolveArchitectModels(() => undefined), GEMINI_MODEL_CANDIDATES);
  assert.deepEqual(resolveArchitectModels(n => ({ QB_GEMINI_FLASH_MODEL: "../x", QB_GEMINI_LITE_MODEL: "gemini-3.5-flash-lite" })[n]), { flash: FLASH, lite: "gemini-3.5-flash-lite" });
});

test("models.list é autenticado no header, pagina e filtra generateContent", async () => {
  const urls = [];
  const models = await listGeminiModels({
    apiKey: `  ${KEY}  `,
    fetchImpl: async (url, init) => {
      urls.push(url);
      assert.equal(init.headers["x-goog-api-key"], KEY);
      if (!url.includes("pageToken")) return new Response(JSON.stringify({ ...listing([FLASH]), nextPageToken: "p2" }));
      return new Response(JSON.stringify(listing([LITE], [{ name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] }, { name: "models/gemini-embedding-001", supportedGenerationMethods: ["embedContent"] }])));
    },
  });
  assert.equal(urls.length, 2);
  assert.ok(urls.every(u => !u.includes(KEY)));
  assert.deepEqual(models.filter(m => m.supportsGenerateContent).map(m => m.id), [FLASH, LITE]);
  assert.equal(models.find(m => m.id === "gemini-embedding-001").supportsGenerateContent, false);
});

test("Automático chama Flash-Lite para pergunta simples e Flash para Feynman, registrando tokens", async () => {
  const h = harness();
  const simple = await h.call({ mode: "socratico", userMessage: "O que é veto?" });
  assert.equal(simple.model, LITE);
  assert.equal(simple.routing.reason, "pergunta-simples");
  const feynman = await h.call({ mode: "feynman", userMessage: "Minha explicação" });
  assert.equal(feynman.model, FLASH);
  assert.deepEqual(h.generated(), [LITE, FLASH]);
  const summary = h.telemetry.summary();
  assert.equal(summary.models[LITE].ok, 1);
  assert.equal(summary.models[FLASH].inputTokens, 40);
  assert.equal(summary.models[FLASH].outputTokens, 9);
  const entry = summary.recent[0];
  for (const field of ["model", "requestedAt", "durationMs", "status", "inputTokens", "outputTokens"]) assert.ok(field in entry, field);
  assert.equal(entry.status, 200);
});

test("404 permite fallback só para outro modelo autorizado e disponível", async () => {
  const h = harness({ statusByModel: { [FLASH]: 404 } });
  const res = await h.call({ mode: "banca", userMessage: "Crie um item" });
  assert.equal(res.model, LITE);
  assert.equal(res.routing.fallbackFrom, FLASH);
  assert.deepEqual(h.generated(), [FLASH, LITE]);
  const errors = h.telemetry.summary().models[FLASH];
  assert.equal(errors.errors, 1);
  assert.deepEqual(errors.errorsByCode, { not_found: 1 });
  assert.equal(errors.statuses["404"], 1);
});

test("404 sem substituto listado, ou sem listagem confirmada, não troca de modelo", async () => {
  const onlyFlash = harness({ available: [FLASH], statusByModel: { [FLASH]: 404 } });
  await assert.rejects(onlyFlash.call({ mode: "banca", userMessage: "x" }), /não encontrado/);
  assert.deepEqual(onlyFlash.generated(), [FLASH]);

  const noListing = harness({ listStatus: 500, statusByModel: { [FLASH]: 404 } });
  await assert.rejects(noListing.call({ mode: "banca", userMessage: "x" }), /não encontrado/);
  assert.deepEqual(noListing.generated(), [FLASH]);
});

test("decisão com allowFallback:false não troca de modelo nem após 404", async () => {
  const h = harness({ statusByModel: { [FLASH]: 404 } });
  await assert.rejects(h.call({ mode: "banca", userMessage: "x", allowFallback: false }), /não encontrado/);
  assert.deepEqual(h.generated(), [FLASH]);
});

test("modelo principal ausente da listagem é substituído antes da chamada; nenhum disponível não chama a API", async () => {
  const h = harness({ available: [LITE] });
  const res = await h.call({ mode: "feynman", userMessage: "x" });
  assert.equal(res.model, LITE);
  assert.equal(res.routing.fallbackFrom, FLASH);
  assert.deepEqual(h.generated(), [LITE]);

  const none = harness({ available: ["gemini-1.0-pro"] });
  await assert.rejects(none.call({ mode: "socratico", userMessage: "oi" }), err => err.code === "no_model" && /Nenhum modelo autorizado/.test(err.message));
  assert.deepEqual(none.generated(), []);
});

test("429 informa o usuário sem trocar modelo, chave ou projeto", async () => {
  const h = harness({ statusByModel: { [LITE]: 429 } });
  await assert.rejects(h.call({ mode: "analogia", userMessage: "x" }), err => err.status === 429 && /Limite de uso/.test(err.message) && /Nenhuma outra chave/.test(err.message));
  assert.deepEqual(h.generated(), [LITE]);
  const keys = new Set(h.calls.map(c => c.init.headers["x-goog-api-key"]));
  assert.deepEqual([...keys], [KEY]);
  assert.equal(h.telemetry.summary().models[LITE].errorsByCode.quota, 1);
});

test("429 ou chave recusada na listagem interrompem antes de gerar", async () => {
  const quota = harness({ listStatus: 429 });
  await assert.rejects(quota.call({ mode: "socratico", userMessage: "oi" }), /Limite de uso/);
  assert.deepEqual(quota.generated(), []);
  const refused = harness({ listStatus: 403 });
  await assert.rejects(refused.call({ mode: "socratico", userMessage: "oi" }), /recusou/);
  assert.deepEqual(refused.generated(), []);
});

test("503 persistente é informado sem trocar de modelo", async () => {
  const h = harness({ statusByModel: { [FLASH]: 503 } });
  await assert.rejects(h.call({ mode: "oral", userMessage: "x" }), /503/);
  assert.ok(h.generated().every(model => model === FLASH));
  assert.equal(h.telemetry.summary().models[FLASH].errorsByCode.unavailable, 1);
});

test("limite de tempo aborta a chamada e é registrado", async () => {
  const lines = [];
  const telemetry = createGeminiTelemetry({ log: line => lines.push(line) });
  const fetchImpl = async (url, init) => {
    if (url.includes("/models?")) return new Response(JSON.stringify(listing([FLASH, LITE])));
    return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("AbortError")), { once: true }));
  };
  await assert.rejects(invokeArchitectGemini({
    apiKey: KEY, prompt: "x", mode: "analogia", fetchImpl, telemetry, timeoutMs: 10, cache: createModelAvailabilityCache(),
  }), /Tempo limite/);
  assert.equal(telemetry.summary().models[LITE].errorsByCode.timeout, 1);
});

test("chave, prompt e mensagem do estudante não aparecem em logs nem no retorno", async () => {
  const h = harness();
  const res = await h.call({ mode: "socratico", userMessage: SECRET_PROMPT });
  const everything = h.lines.join("\n") + JSON.stringify(h.telemetry.summary()) + JSON.stringify(res);
  assert.ok(!everything.includes(KEY));
  assert.ok(!h.lines.join("\n").includes("PROMPT-PRIVADO"));
  assert.ok(!JSON.stringify(h.telemetry.summary()).includes("Fulano"));
  const dirty = sanitizeTelemetryEntry({ model: FLASH, apiKey: KEY, prompt: SECRET_PROMPT, userId: "u1", email: "a@b.c", errorCode: "x y <script>" });
  assert.deepEqual(Object.keys(dirty), ["model"]);
});

test("sem chave não há chamada externa; painel lista disponibilidade sem expor a chave", async () => {
  let calls = 0;
  await assert.rejects(invokeArchitectGemini({ apiKey: "", prompt: "x", fetchImpl: async () => { calls++; } }), /Chave Gemini ausente/);
  assert.equal(calls, 0);
  const t = transport({ available: [LITE] });
  const status = await describeArchitectModels({ apiKey: KEY, models: GEMINI_MODEL_CANDIDATES, fetchImpl: t.fetchImpl, cache: createModelAvailabilityCache() });
  assert.equal(status.check, "ok");
  assert.deepEqual(status.models.map(m => [m.id, m.available]), [[FLASH, false], [LITE, true]]);
  assert.match(status.notice, /não confirma Free Tier/);
  assert.ok(!JSON.stringify(status).includes(KEY));
});

test("listagem fica em cache por chave e não é repetida a cada pergunta", async () => {
  const h = harness();
  const cache = createModelAvailabilityCache();
  await h.call({ cache, mode: "analogia", userMessage: "x" });
  await h.call({ cache, mode: "analogia", userMessage: "y" });
  assert.equal(h.calls.filter(c => c.url.includes("/models?")).length, 1);
});

test("o roteador não importa nem aciona a Base44", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../src/lib/gemini-router.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /InvokeLLM|getBase44|@base44|base44:runtime/);
});
