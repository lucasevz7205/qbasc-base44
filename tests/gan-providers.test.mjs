import assert from 'node:assert/strict';
import test from 'node:test';
import { callGanGemini } from '../src/lib/gan-providers.js';
import { assertGanJudgments, ganFailureLabel, withGanDiagnostics } from '../src/lib/gan-diagnostics.js';
import { normalizeGanConfrontation } from '../src/lib/mindmap-gan.js';

const draftSchema = { type: 'object', properties: { questoes: { type: 'array', items: { type: 'object' } } } };
const reviewSchema = { type: 'object', properties: { julgamentos: { type: 'array', items: { type: 'object' } } } };
const settings = { apiKey: 'chave-gemini-de-teste', model: 'gemini-3.5-flash-lite' };
const ok = (payload, finishReason = 'STOP') => ({
  status: 200, ok: true, json: async () => ({
    candidates: [{ content: { parts: [{ text: typeof payload === 'string' ? payload : JSON.stringify(payload) }] }, finishReason }],
  }),
});
const httpError = status => ({ status, ok: false });

test('os dois papéis do GAN usam a mesma chave Gemini em chamadas separadas, com esquemas próprios', async () => {
  const calls = [];
  const draft = { questoes: [{ enunciado: 'Uma assertiva de teste.', gabarito: 'E', comentario: 'Parecer exclusivo do gerador.' }] };
  const judgment = { julgamentos: [{ index: 0, gabaritoDiscriminador: 'E', veredicto: 'APROVADA', scoreRealismo: 88 }] };
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return ok(calls.length === 1 ? draft : judgment);
  };
  const gen = await callGanGemini({ ...settings, prompt: 'Elabore uma questão.', schema: draftSchema, fetchImpl });
  const blindPrompt = 'Julgue: ' + gen.questoes[0].enunciado;
  const disc = await callGanGemini({ ...settings, prompt: blindPrompt, schema: reviewSchema, fetchImpl });
  assert.deepEqual(gen, draft);
  assert.deepEqual(disc, judgment);
  assert.equal(calls.length, 2);
  assert.notEqual(calls[0].init.signal, calls[1].init.signal);
  for (const [i, call] of calls.entries()) {
    assert.match(call.url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\//);
    assert.equal(call.init.headers['x-goog-api-key'], settings.apiKey);
    assert.equal(call.init.headers.Authorization, undefined);
    assert.equal(call.body.generationConfig.responseMimeType, 'application/json');
    assert.equal(call.body.generationConfig.maxOutputTokens, 6000);
    assert.deepEqual(call.body.generationConfig.responseJsonSchema, i === 0 ? draftSchema : reviewSchema);
  }
  assert.deepEqual(calls[1].body.contents, [{ role: 'user', parts: [{ text: blindPrompt }] }]);
  assert.doesNotMatch(calls[1].init.body, /Parecer exclusivo do gerador|Elabore uma questão/);
});

test('ausência de chave Gemini ou modelo inválido falha antes da requisição', async () => {
  const input = { ...settings, prompt: 'julgue', schema: reviewSchema, fetchImpl: async () => assert.fail('chamada externa inesperada') };
  await assert.rejects(callGanGemini({ ...input, apiKey: '' }), /Chave Gemini ausente/);
  await assert.rejects(callGanGemini({ ...input, model: 'nome-inválido' }), /Modelo Gemini inválido/);
});

test('retentativas 503 recuperam a resposta do Gemini no mesmo papel', async () => {
  const attempts = [];
  const res = await callGanGemini({
    ...settings, prompt: 'gere', schema: draftSchema,
    fetchImpl: async (url, init) => {
      attempts.push({ url, body: init.body, signal: init.signal });
      return attempts.length < 3 ? httpError(503) : ok({ questoes: [] });
    },
  });
  assert.deepEqual(res, { questoes: [] });
  assert.equal(attempts.length, 3);
  assert.deepEqual(attempts[1], attempts[0]);
  assert.deepEqual(attempts[2], attempts[0]);
});

test('503 persistente identifica a etapa cega e mantém a quantidade de tentativas limitada', async () => {
  let calls = 0;
  const result = await withGanDiagnostics(stage => {
    stage('gemini-discriminador');
    return callGanGemini({
      ...settings, prompt: 'julgue', schema: reviewSchema,
      fetchImpl: async () => { calls += 1; return httpError(503); },
    });
  });
  assert.equal(calls, 3);
  assert.equal(result.falha.etapa, 'gemini-discriminador');
  assert.equal(result.falha.codigo, 'gemini-http-503');
  assert.match(ganFailureLabel(result.falha), /Julgamento cego Gemini.*indisponível/);
});

test('Gemini adia a retentativa quando o servidor pede uma espera longa', async () => {
  let calls = 0;
  await assert.rejects(callGanGemini({
    ...settings, prompt: 'gere', schema: draftSchema,
    fetchImpl: async () => {
      calls += 1;
      return { ...httpError(503), headers: { get: name => name === 'Retry-After' ? '30' : null } };
    },
  }), /HTTP 503/);
  assert.equal(calls, 1);
});

test('espera abortável e erros de autenticação e quota não acionam outro serviço', async () => {
  let calls = 0;
  const run = (status, extra = {}) => callGanGemini({
    ...settings, prompt: 'gere', schema: draftSchema,
    fetchImpl: async url => {
      assert.match(url, /^https:\/\/generativelanguage\.googleapis\.com\//);
      calls += 1;
      return httpError(status);
    },
    ...extra,
  });
  await assert.rejects(run(503, { timeoutMs: 20 }), /Tempo limite/);
  await assert.rejects(run(403), /recusou a requisição/);
  await assert.rejects(run(429), /Limite de uso/);
  assert.equal(calls, 3);

  const result = await withGanDiagnostics(stage => {
    stage('gemini-discriminador');
    return run(429);
  });
  assert.equal(result.falha.codigo, 'gemini-limite');
  assert.match(ganFailureLabel(result.falha), /Julgamento cego Gemini.*429/);
});

test('JSON inválido, resposta truncada e julgamento incompleto têm diagnósticos distintos', async () => {
  const call = (payload, finishReason) => callGanGemini({
    ...settings, prompt: 'julgue', schema: reviewSchema, fetchImpl: async () => ok(payload, finishReason),
  });
  await assert.rejects(call('isto não é json'), error => error.codigo === 'gemini-json-invalido');
  await assert.rejects(call('{"julgamentos":', 'MAX_TOKENS'), /interrompeu/);
  assert.throws(() => assertGanJudgments([{ index: 0 }, { index: 0 }], 2), error => error.codigo === 'julgamentos-incompletos');
});

const question = { mapaNoId: 'n1', enunciado: 'Assertiva longa o bastante para testar a validação do confronto.', gabarito: 'E', mecanismo: 'F3' };
const judge = { index: 0, gabaritoDiscriminador: 'E', veredicto: 'APROVADA', scoreRealismo: 84, falhasDetectadas: [] };
const map = { nodes: [{ id: 'n1', label: 'Nó' }] };

test('julgamento cego aceita item sem refinamento e bloqueia gabarito divergente', () => {
  const accepted = normalizeGanConfrontation([question], [judge], map);
  assert.equal(accepted.aprovadas[0].blindKeyMatch, true);
  assert.equal(accepted.aprovadas[0].statusConfronto, 'aprovada_gan');
  const diverged = normalizeGanConfrontation([question], [{ ...judge, gabaritoDiscriminador: 'C' }], map);
  assert.equal(diverged.aprovadas.length, 0);
  assert.equal(diverged.bloqueadas[0].statusConfronto, 'divergencia_bloqueada');
});

test('refinamento sem nova redação não aprova a questão original', () => {
  const result = normalizeGanConfrontation([question], [{ ...judge, veredicto: 'REFINAR', itemRefinado: null }], map);
  assert.equal(result.aprovadas.length, 0);
  assert.equal(result.bloqueadas[0].statusConfronto, 'divergencia_bloqueada');
});
