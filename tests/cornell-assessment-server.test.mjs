import test from 'node:test';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { prepareCornellAssessment, CORNELL_ASSESSMENT_CRITERIA } from '../src/lib/cornell-assessment.js';

import assert from 'node:assert/strict';
import { build } from 'esbuild';

const stubs = {
 '@tanstack/react-start': 'export const createServerFn = () => { let schema; let guarded = false; return { middleware(m){ guarded = Boolean(m.length); return this; }, validator(s){ schema=s;return this; }, handler(f){ return input=>{if(guarded&&!input.context?.user) throw new Error("Sessão obrigatória");return f({...input,data:schema?schema.parse(input.data):input.data});}; } }; };',
 '@/lib/auth-middleware': 'export const requireUser=Symbol("requireUser");',
 '@/lib/study-accounts': 'export const requireArchitectAccess=async()=>null; export const prepareNexoTopicSources=async()=>[]; export const prepareGanSourcePassages=async()=>globalThis.qaSources; export const saveAutoApprovedMapGan=async()=>{throw new Error("Gravação GAN fora do escopo deste teste");}; export const preparePersonalMapGan=(...args)=>globalThis.preparePersonalFixture(...args); export const preparePersonalQuestionEditorial=async()=>{throw new Error("Curadoria fora do escopo deste teste");};',
 'base44:runtime': 'export const secrets={get(name){return globalThis.testGanSecrets[name];}};',
};
const bundle = await build({
 bundle:true, write:false, platform:'node', format:'esm',
 stdin:{ contents:'export { assessCornellNotebook } from "./src/lib/server-fns.js";', sourcefile:'gan-provider-smoke.js', resolveDir:process.cwd() },
 plugins:[{name:'mock-provider-transport',setup(b){
   b.onResolve({filter:/.*/},a=>Object.hasOwn(stubs,a.path)?{path:a.path,namespace:'stubs'}:undefined);
   b.onLoad({filter:/.*/,namespace:'stubs'},a=>({contents:stubs[a.path],loader:'js'}));
 }}],
});
const { assessCornellNotebook }=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));

const note = 'O controle hierárquico decorre da subordinação administrativa.';
const request = prepareCornellAssessment({
  original: { notes: note, summary: 'A subordinação permite controle.' }, linked: {},
  sources: [{ title: 'Fonte local', text: note }], map: [{ label: 'Controle', parent: 'Administração' }], topicLabel: 'Controle administrativo',
});
const response = {
  comentario: 'A relação foi explicitada.',
  criterios: CORNELL_ASSESSMENT_CRITERIA.map(item => ({ id: item.id, pontos: 2, justificativa: 'Boa explicação.', evidenciaCaderno: note, fonteId: 'original-1', trechoFonte: note })),
  acertos: [], lacunas: [], orientacao: 'Explique a relação com um contraste.', pergunta: 'Como a subordinação permite controle? Dê um contraste.',
  avaliacaoResposta: { resultado: 'nao_testada', comentario: '', evidencia: '', proximaAcao: '' },
};
const admin = { user: { id: 'admin', role: 'admin' }, getBase44() { throw new Error('Não deve ler ou escrever o banco neste parecer.'); } };
let count = 0;
let mode = 'success';
globalThis.testGanSecrets = { Arquiteto: 'fake-key-only-for-test', QB_GEMINI_MODEL: 'gemini-3.5-flash-lite' };
globalThis.fetch = async (url, init) => {
  count++;
  assert.match(url, /^https:\/\/generativelanguage.googleapis.com\//);
  const body = JSON.parse(init.body);
  const prompt = body.contents[0].parts[0].text;
  assert.match(prompt, /Fonte local/);
  assert.match(prompt, /O controle hierárquico decorre/);
  assert.equal(init.headers['x-goog-api-key'], 'fake-key-only-for-test');
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(body.generationConfig.responseJsonSchema.properties.criterios.items.properties.id.enum, ['precisao', 'relacoes', 'cobertura', 'sintese']);
  if (mode === '503') return { status: 503, ok: false, headers: { get: () => '60' } };
  return { status: 200, ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: mode === 'invalid' ? 'fora do esquema' : JSON.stringify(response) }] } }] }) };
};

test('parecer exige autenticação e permissão Cornell antes de gastar API', async () => {
  const previous = count;
  await assert.rejects(async () => assessCornellNotebook({ data: request, context: {} }), /Sessão obrigatória/);
  await assert.rejects(async () => assessCornellNotebook({ data: request, context: { user: { id: 'aluno', role: 'user' } } }), /administradora/);
  assert.equal(count, previous);
});

test('o servidor rejeita conteúdo excessivo e tentativa sem confiança antes da API', async () => {
  const previous = count;
  await assert.rejects(async () => assessCornellNotebook({ data: { ...request, notebook: { ...request.notebook, notes: 'x'.repeat(40001) } }, context: admin }));
  await assert.rejects(async () => assessCornellNotebook({ data: { ...request, tentativa: { pergunta: response.pergunta, resposta: 'Uma explicação sem confiança.' } }, context: admin }));
  assert.equal(count, previous);
});

test('o parecer estruturado usa só Gemini, calcula a nota e não altera dados', async () => {
  const saved = JSON.stringify(request);
  const result = await assessCornellNotebook({ data: request, context: admin });
  assert.equal(result.provider, 'gemini');
  assert.equal(result.nota, 8);
  assert.equal(result.avaliacaoResposta.resultado, 'nao_testada');
  assert.equal(JSON.stringify(request), saved);
});

test('a tentativa produz comentário com evidência da resposta e mantém o teste original', async () => {
  const tentativa = { pergunta: response.pergunta, resposta: 'A subordinação permite ao superior controlar o subordinado.', confianca: 3 };
  response.avaliacaoResposta = { resultado: 'parcial', comentario: 'Faltou o contraste solicitado.', evidencia: tentativa.resposta, proximaAcao: 'Distinga subordinação de vinculação.' };
  const result = await assessCornellNotebook({ data: { ...request, tentativa }, context: admin });
  assert.equal(result.avaliacaoResposta.resultado, 'parcial');
  assert.equal(result.avaliacaoResposta.evidencia, tentativa.resposta);
  assert.equal(result.pergunta, tentativa.pergunta);
});

test('503 e saída inválida não viram parecer nem acionam créditos Base44', async () => {
  mode = '503';
  await assert.rejects(async () => assessCornellNotebook({ data: request, context: admin }), /503/);
  mode = 'invalid';
  await assert.rejects(async () => assessCornellNotebook({ data: request, context: admin }), /estruturado/);
  mode = 'success';
});
