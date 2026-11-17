import assert from 'node:assert/strict';
import test from 'node:test';
import { toStrictJsonSchema, invokeOpenAIJson, callGanGenerator, callGanDiscriminator } from '../src/lib/gan-providers.js';
import { withGanDiagnostics } from '../src/lib/gan-diagnostics.js';
import { normalizeGanConfrontation } from '../src/lib/mindmap-gan.js';
import { CEBRASPE_V1_TAXONOMY, mechanismForKey } from '../src/lib/cebraspe-v1-taxonomy.js';

const SCHEMA = {
  type: 'object',
  properties: {
    julgamentos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number' },
          gabaritoDiscriminador: { type: 'string' },
          falhasDetectadas: { type: 'array', items: { type: 'string' } },
          itemRefinado: { type: 'object', properties: { enunciado: { type: 'string' }, gabarito: { type: 'string' } } },
        },
        required: ['index', 'gabaritoDiscriminador', 'falhasDetectadas'],
      },
    },
  },
  required: ['julgamentos'],
};

const okResponse = (body, status = 200) => ({ ok: status < 300, status, json: async () => body });
const openaiOk = (content, extra = {}) => okResponse({
  choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) }, finish_reason: 'stop', ...extra }],
  usage: { prompt_tokens: 120, completion_tokens: 45 },
});

test('toStrictJsonSchema: tudo obrigatório, opcional vira nullable, sem mutar o original', () => {
  const before = JSON.stringify(SCHEMA);
  const strict = toStrictJsonSchema(SCHEMA);
  assert.equal(JSON.stringify(SCHEMA), before);
  assert.equal(strict.additionalProperties, false);
  const item = strict.properties.julgamentos.items;
  assert.equal(item.additionalProperties, false);
  assert.deepEqual(item.required.sort(), ['falhasDetectadas', 'gabaritoDiscriminador', 'index', 'itemRefinado']);
  assert.deepEqual(item.properties.itemRefinado.type, ['object', 'null']);
  assert.equal(item.properties.itemRefinado.additionalProperties, false);
  assert.deepEqual(item.properties.itemRefinado.required.sort(), ['enunciado', 'gabarito']);
  assert.equal(item.properties.index.type, 'number');
});

test('invokeOpenAIJson: monta a requisição esperada e devolve JSON e uso', async () => {
  let seen;
  const fetchImpl = async (url, init) => { seen = { url, init, body: JSON.parse(init.body) }; return openaiOk({ julgamentos: [] }); };
  const out = await invokeOpenAIJson({ apiKey: 'sk-teste', model: 'gpt-6.1-terra', prompt: 'olá', schema: SCHEMA, schemaName: 'julgamento_cego', fetchImpl });
  assert.equal(seen.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(seen.init.headers.Authorization, 'Bearer sk-teste');
  assert.equal(seen.body.model, 'gpt-6.1-terra');
  assert.equal(seen.body.response_format.type, 'json_schema');
  assert.equal(seen.body.response_format.json_schema.strict, true);
  assert.equal(seen.body.response_format.json_schema.name, 'julgamento_cego');
  assert.equal('temperature' in seen.body, false);
  assert.equal(seen.body.max_completion_tokens, 6000);
  assert.deepEqual(out.parsed, { julgamentos: [] });
  assert.deepEqual(out.usage, { entrada: 120, saida: 45 });
});

test('invokeOpenAIJson: segredo ausente, modelo ausente e modelo com espaço falham sem chamar a API', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return openaiOk({}); };
  await assert.rejects(invokeOpenAIJson({ apiKey: '', model: 'gpt-6.1-terra', prompt: 'x', schema: SCHEMA, fetchImpl }), /Discriminador ausente/);
  await assert.rejects(invokeOpenAIJson({ apiKey: 'sk-a', model: undefined, prompt: 'x', schema: SCHEMA, fetchImpl }), /QB_DISCRIMINATOR_MODEL/);
  await assert.rejects(invokeOpenAIJson({ apiKey: 'sk-a', model: 'gpt-6.1 terra', prompt: 'x', schema: SCHEMA, fetchImpl }), /QB_DISCRIMINATOR_MODEL/);
  assert.equal(calls, 0);
});

test('invokeOpenAIJson: erros HTTP não vazam a chave e mostram o código útil', async () => {
  const key = 'sk-segredo-123';
  const run = status => invokeOpenAIJson({
    apiKey: key, model: 'gpt-6.1-terra', prompt: 'x', schema: SCHEMA,
    fetchImpl: async () => okResponse({ error: { code: 'model_not_found', message: 'Conteúdo da requisição: ' + key } }, status),
  });
  await assert.rejects(run(401), err => /chave \(401\)/.test(err.message) && !err.message.includes(key));
  await assert.rejects(run(429), /429/);
  await assert.rejects(run(400), err => /HTTP 400: model_not_found/.test(err.message) && !err.message.includes(key) && !err.message.includes('Conteúdo da requisição'));
});

test('invokeOpenAIJson: recusa, corte por tamanho e JSON inválido viram erro claro', async () => {
  const base = { apiKey: 'sk-a', model: 'gpt-6.1-terra', prompt: 'x', schema: SCHEMA };
  await assert.rejects(invokeOpenAIJson({ ...base, fetchImpl: async () => okResponse({ choices: [{ message: { refusal: 'não' }, finish_reason: 'stop' }] }) }), /recusou-se/);
  await assert.rejects(invokeOpenAIJson({ ...base, fetchImpl: async () => openaiOk('{"a":', { finish_reason: 'length' }) }), /interrompeu/);
  await assert.rejects(invokeOpenAIJson({ ...base, fetchImpl: async () => openaiOk('isto não é json') }), /não é JSON válido/);
});

test('callGanGenerator: Gemini devolve JSON, que é lido com a mesma forma de antes', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url, body: JSON.parse(init.body), key: init.headers['x-goog-api-key'] };
    return okResponse({ candidates: [{ content: { parts: [{ text: '{"questoes":[{"enunciado":"Item"}]}' }] }, finishReason: 'STOP' }] });
  };
  const res = await callGanGenerator({ prompt: 'gere', response_json_schema: SCHEMA, apiKey: 'g-key', model: 'gemini-3.5-flash-lite', fetchImpl });
  assert.deepEqual(res, { questoes: [{ enunciado: 'Item' }] });
  assert.match(seen.url, /generativelanguage\.googleapis\.com/);
  assert.equal(seen.key, 'g-key');
  assert.equal(seen.body.generationConfig.responseMimeType, 'application/json');
  assert.equal(seen.body.generationConfig.maxOutputTokens, 6000);
  await assert.rejects(callGanGenerator({ prompt: 'x', response_json_schema: SCHEMA, apiKey: '', model: 'gemini-3.5-flash-lite', fetchImpl }), /Chave Gemini ausente/);
});

const generatorInput = { prompt: 'gere', response_json_schema: SCHEMA, apiKey: 'g-key', model: 'gemini-3.5-flash-lite' };

test('gerador repete HTTP 503 até duas vezes e devolve o JSON recuperado', async () => {
  const attempts = [];
  const result = await callGanGenerator({
    ...generatorInput,
    fetchImpl: async (url, init) => {
      attempts.push({ url, body: init.body, signal: init.signal });
      if (attempts.length < 3) return okResponse({}, 503);
      return okResponse({ candidates: [{ content: { parts: [{ text: '{"questoes":[]}' }] } }] });
    },
  });
  assert.deepEqual(result, { questoes: [] });
  assert.equal(attempts.length, 3);
  assert.deepEqual(attempts[1], attempts[0]);
  assert.deepEqual(attempts[2], attempts[0]);
});

test('gerador preserva o diagnóstico de HTTP 503 após esgotar as retentativas', async () => {
  let calls = 0;
  const result = await withGanDiagnostics(stage => {
    stage('gemini');
    return callGanGenerator({
      ...generatorInput,
      fetchImpl: async () => { calls += 1; return okResponse({}, 503); },
    });
  });
  assert.equal(calls, 3);
  assert.equal(result.falha.etapa, 'gemini');
  assert.equal(result.falha.codigo, 'gemini-http-503');
  assert.match(result.falha.mensagem, /temporariamente indisponível/);
});

test('gerador adia a retentativa quando o Gemini pede uma espera longa', async () => {
  let calls = 0;
  await assert.rejects(callGanGenerator({
    ...generatorInput,
    fetchImpl: async () => {
      calls += 1;
      return {
        ...okResponse({}, 503),
        headers: { get: name => name === 'Retry-After' ? '30' : null },
      };
    },
  }), /HTTP 503/);
  assert.equal(calls, 1);
});

test('gerador respeita o tempo limite durante a espera e não repete HTTP 429', async () => {
  let calls = 0;
  await assert.rejects(callGanGenerator({
    ...generatorInput,
    timeoutMs: 20,
    fetchImpl: async () => { calls += 1; return okResponse({}, 503); },
  }), /Tempo limite do Gemini/);
  assert.equal(calls, 1);
  await assert.rejects(callGanGenerator({
    ...generatorInput,
    fetchImpl: async () => { calls += 1; return okResponse({}, 429); },
  }), /Limite de uso do Gemini/);
  assert.equal(calls, 2);
});

test('callGanDiscriminator + normalizeGanConfrontation: itemRefinado null não quebra e o confronto cego funciona', async () => {
  const mechanism = Object.keys(CEBRASPE_V1_TAXONOMY).find(code => mechanismForKey(code, 'E'));
  assert.ok(mechanism, 'taxonomia deve ter um mecanismo compatível com E');
  const gen = [{ mapaNoId: 'n1', tema: 'Tema', enunciado: 'Assertiva longa o bastante para passar na validação do confronto.', gabarito: 'E', mecanismo: mechanism, trechoDecisivo: 'trecho', comentario: 'comentário', correcaoMinima: 'correção', teseGerador: 'tese' }];
  const fetchImpl = async () => openaiOk({ julgamentos: [{ index: 0, gabaritoDiscriminador: 'E', falhasDetectadas: [], itemRefinado: null }] });
  const disc = await callGanDiscriminator({ prompt: 'julgue', response_json_schema: SCHEMA, apiKey: 'sk-a', model: 'gpt-6.1-terra', fetchImpl });
  const result = normalizeGanConfrontation(gen, disc.julgamentos, { nodes: [{ id: 'n1', label: 'Nó' }] }, { targetNodeId: 'n1', targetNodeLabel: 'Nó' });
  assert.equal(result.questoes.length, 1);
  assert.equal(result.questoes[0].blindKeyMatch, true);
  assert.equal(result.questoes[0].gabaritoDiscriminador, 'E');
  assert.equal(result.questoes[0].statusConfronto, 'aprovada_gan');
});

test('discriminador com gabarito diferente do gerador bloqueia o item', async () => {
  const mechanism = Object.keys(CEBRASPE_V1_TAXONOMY).find(code => mechanismForKey(code, 'E'));
  const gen = [{ mapaNoId: 'n1', tema: 'Tema', enunciado: 'Outra assertiva longa o bastante para passar na validação.', gabarito: 'E', mecanismo: mechanism, trechoDecisivo: 't', comentario: 'c', correcaoMinima: 'x', teseGerador: 't' }];
  const fetchImpl = async () => openaiOk({ julgamentos: [{ index: 0, gabaritoDiscriminador: 'C', falhasDetectadas: ['ambígua'], itemRefinado: null }] });
  const disc = await callGanDiscriminator({ prompt: 'julgue', response_json_schema: SCHEMA, apiKey: 'sk-a', model: 'gpt-6.1-terra', fetchImpl });
  const result = normalizeGanConfrontation(gen, disc.julgamentos, { nodes: [{ id: 'n1', label: 'Nó' }] }, { targetNodeId: 'n1' });
  assert.equal(result.aprovadas.length, 0);
  assert.equal(result.bloqueadas[0].statusConfronto, 'divergencia_bloqueada');
});

test('refinamento sem nova redação não aprova a questão original', () => {
  const result = normalizeGanConfrontation(
    [{ mapaNoId:'n1', enunciado:'Uma assertiva longa para testar um refinamento faltante.', gabarito:'E', mecanismo:'F1' }],
    [{ index:0, gabaritoDiscriminador:'E', veredicto:'REFINAR', scoreRealismo:90, itemRefinado:null }],
    { nodes:[{id:'n1',label:'Nó do teste'}] },
  );
  assert.equal(result.aprovadas.length, 0);
  assert.equal(result.bloqueadas[0].statusConfronto, 'divergencia_bloqueada');
});
