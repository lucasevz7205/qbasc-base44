/* global Response */
import test from "node:test";
import assert from "node:assert/strict";
import process from "node:process";
import { Buffer } from "node:buffer";
import { build } from "esbuild";

// Servidor real (server-fns) com runtime simulado: confere autenticação,
// roteamento e a ausência de fallback pago para a Base44.
const stubs = {
  "@tanstack/react-start": `export const createServerFn = () => {
    let schema, guarded;
    return {
      middleware(value) { guarded = Boolean(value.length); return this; },
      validator(value) { schema = value; return this; },
      handler(fn) { return async ({ context, data }) => {
        if (guarded && !context.user) throw new Error('Sessão obrigatória');
        return fn({ context, data: schema ? schema.parse(data) : data });
      }; },
    };
  };`,
  "@/lib/auth-middleware": "export const requireUser = Symbol('requireUser');",
  "@/lib/study-accounts": "export const prepareNexoTopicSources=async()=>globalThis.nexoTestSources||[]; export const requireArchitectAccess=async()=>null; export const prepareGanSourcePassages=async()=>[]; export const saveAutoApprovedMapGan=async()=>{}; export const preparePersonalMapGan=async()=>{}; export const preparePersonalQuestionEditorial=async()=>{};",
  "base44:runtime": "export const secrets={get(name){return globalThis.routerTestSecrets[name];}};",
};

const { outputFiles } = await build({
  bundle: true, write: false, platform: "node", format: "esm",
  stdin: { contents: "export { askArchitectTutor, getArchitectProviderStatus, getArchitectModelTelemetry, correctFlashcardWithArchitect, generateNexoAssociation } from './src/lib/server-fns.js';", resolveDir: process.cwd() },
  plugins: [{ name: "router-test-runtime", setup(builder) {
    builder.onResolve({ filter: /.*/ }, ({ path }) => Object.hasOwn(stubs, path) ? { path, namespace: "stub" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "stub" }, ({ path }) => ({ contents: stubs[path], loader: "js" }));
  } }],
});
const { askArchitectTutor, getArchitectProviderStatus, getArchitectModelTelemetry, correctFlashcardWithArchitect, generateNexoAssociation } =
  await import("data:text/javascript;base64," + Buffer.from(outputFiles[0].contents).toString("base64"));

// Uma chave por cenário: o cache de models.list é indexado pela impressão digital da chave.
let KEY = "";
const useKey = name => { KEY = "server-key-not-real-" + name; globalThis.routerTestSecrets = { Arquiteto: KEY, QB_TUTOR_PROVIDER: "gemini" }; };

function admin(invokeLLM) {
  return { user: { id: "admin", role: "admin" }, getBase44: () => ({ asServiceRole: { integrations: { Core: { InvokeLLM: invokeLLM } } } }) };
}

function mockGemini(t, { status = {}, available = ["gemini-2.5-flash", "gemini-2.5-flash-lite"] } = {}) {
  const generated = [];
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(init.headers["x-goog-api-key"], KEY);
    if (url.includes("/models?")) {
      return new Response(JSON.stringify({ models: available.map(id => ({ name: "models/" + id, supportedGenerationMethods: ["generateContent"] })) }));
    }
    const model = /models\/([^:]+):generateContent/.exec(url)[1];
    generated.push(model);
    if (status[model]) return new Response("erro", { status: status[model], headers: { "Retry-After": "60" } });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Resposta de " + model } ] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 } }));
  });
  return { generated, fetchMock };
}

test("Arquiteto exige sessão e respeita a escolha manual de modelo", async t => {
  useKey("manual");
  const { generated } = mockGemini(t);
  const base44 = t.mock.fn(async () => "não deveria");
  await assert.rejects(askArchitectTutor({ context: {}, data: { mode: "socratico", topicLabel: "T", userMessage: "oi" } }), /Sessão obrigatória/);
  const auto = await askArchitectTutor({ context: admin(base44), data: { mode: "analogia", topicLabel: "T", userMessage: "Explique", provider: "gemini" } });
  assert.equal(auto.model, "gemini-2.5-flash-lite");
  const forced = await askArchitectTutor({ context: admin(base44), data: { mode: "analogia", topicLabel: "T", userMessage: "Explique", provider: "gemini", modelPreference: "flash" } });
  assert.equal(forced.model, "gemini-2.5-flash");
  assert.deepEqual(generated, ["gemini-2.5-flash-lite", "gemini-2.5-flash"]);
  assert.equal(base44.mock.callCount(), 0);
  await assert.rejects(askArchitectTutor({ context: admin(base44), data: { mode: "socratico", topicLabel: "T", userMessage: "oi", provider: "gemini", modelPreference: "pro" } }));
});

test("429, 503 e 404 sem substituto nunca acionam créditos Base44", async t => {
  const base44 = t.mock.fn(async () => "Resposta paga");
  for (const status of [429, 503]) {
    useKey("s" + status);
    t.mock.restoreAll();
    mockGemini(t, { status: { "gemini-2.5-flash": status } });
    await assert.rejects(askArchitectTutor({ context: admin(base44), data: { mode: "banca", topicLabel: "T", userMessage: "Crie", provider: "gemini" } }), new RegExp(String(status)));
  }
  useKey("404");
  t.mock.restoreAll();
  mockGemini(t, { status: { "gemini-2.5-flash": 404 }, available: ["gemini-2.5-flash"] });
  await assert.rejects(correctFlashcardWithArchitect({ context: admin(base44), data: { cardId: "c1", topicLabel: "T", front: "F", back: "B", attempt: "minha tentativa longa" } }), /não encontrado/);
  assert.equal(base44.mock.callCount(), 0);
});

test("status do administrador traz disponibilidade sem a chave; registros são só do administrador", async t => {
  useKey("status");
  mockGemini(t, { available: ["gemini-2.5-flash-lite"] });
  const status = await getArchitectProviderStatus({ context: admin(() => {}) });
  assert.equal(status.geminiConfigured, true);
  assert.equal(status.model, "auto");
  assert.deepEqual(status.routing.models.map(m => [m.tier, m.available]), [["flash", false], ["lite", true]]);
  assert.ok(!JSON.stringify(status).includes(KEY));
  await assert.rejects(getArchitectModelTelemetry({ context: { user: { id: "u", role: "user" } } }), /administradora/);
  const summary = await getArchitectModelTelemetry({ context: admin(() => {}) });
  assert.equal(summary.scope, "instancia-atual");
  assert.ok(!JSON.stringify(summary).includes(KEY));
});

test("NEXO server checks current source before calling semantic provider and returns grounded recommendation", async t => {
  const {sourceVersion}=await import("../src/lib/nexo/generation.js");
  const source={subjectId:"ti",topicId:"ti-4",nodeId:"node-1",title:"Conceito de teste",reference:"Fonte de teste",lines:["O conteúdo descreve uma relação funcional."]};
  globalThis.nexoTestSources=[source];
  const decision={kind:"recommendation",column:-1,pairs:[],reason:"Representação funcional adequada.",modality:"architecture",evidence:source.lines[0],objective:"Compreender a relação funcional."};
  const provider=t.mock.fn(async ()=>decision);
  const data={subjectId:source.subjectId,topicId:source.topicId,nodeId:source.nodeId,sourceVersion:await sourceVersion(source),provider:"base44"};
  await assert.rejects(generateNexoAssociation({context:{},data}),/Sessão obrigatória/);
  await assert.rejects(generateNexoAssociation({context:{user:{role:"user"}},data}),/restrita/);
  const stale=await generateNexoAssociation({context:admin(provider),data:{...data,sourceVersion:"sha256:"+"0".repeat(64)}});
  assert.equal(stale.status,"blocked");assert.equal(provider.mock.callCount(),0);
  const result=await generateNexoAssociation({context:admin(provider),data});
  assert.equal(result.status,"recommended");assert.equal(result.plan.kind,"architecture");assert.equal(result.provider,"base44");assert.equal(provider.mock.callCount(),1);
  globalThis.nexoTestSources=[];
});
