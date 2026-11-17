/**
 * Provedores do confronto GAN do Arquiteto.
 *  - Gerador: Gemini (segredo "Arquiteto"), pelo adaptador que o app já usa.
 *  - Discriminador cego: OpenAI/GPT (segredo "Discriminador" + modelo em "QB_DISCRIMINATOR_MODEL").
 * Famílias diferentes de propósito: os erros do gerador não se repetem no discriminador.
 * Sem fallback para InvokeLLM (créditos Base44): se faltar segredo, falha com mensagem clara.
 * Só deve ser chamado a partir de funções autenticadas do servidor.
 */
import { invokeGeminiTutor } from "./gemini-tutor.js";
import { GanStepError } from "./gan-diagnostics.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const GEMINI_RETRY_DELAYS_MS = [1000, 2000];
const GEMINI_MAX_RETRY_WAIT_MS = 8000;

function geminiRetryAfterMs(response) {
  const value = response.headers?.get('Retry-After')?.trim();
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(date - Date.now(), 0) : 0;
}

function waitForGeminiRetry(delayMs, signal) {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, delayMs);
    signal.addEventListener('abort', abort, { once: true });
  });
}

async function fetchGeminiWithRetry(fetchImpl, url, init) {
  let response = await fetchImpl(url, init);
  for (const backoffMs of GEMINI_RETRY_DELAYS_MS) {
    if (response.status !== 503) return response;
    const waitMs = Math.max(backoffMs, geminiRetryAfterMs(response));
    if (waitMs > GEMINI_MAX_RETRY_WAIT_MS) return response;
    await response.body?.cancel();
    await waitForGeminiRetry(waitMs, init.signal);
    init.signal.throwIfAborted();
    response = await fetchImpl(url, init);
  }
  return response;
}

function allowNull(schema) {
  const type = Array.isArray(schema.type) ? schema.type : [schema.type];
  return { ...schema, type: [...new Set([...type, "null"])] };
}

/**
 * O modo estrito da OpenAI exige: additionalProperties:false e todas as propriedades em "required".
 * Campo opcional vira "pode ser null". O schema original (usado antes com InvokeLLM) não muda.
 */
export function toStrictJsonSchema(schema) {
  if (!schema || typeof schema !== "object") return schema;
  const out = { ...schema };
  if (out.type === "object" && out.properties) {
    const required = new Set(out.required || []);
    const properties = {};
    for (const [key, value] of Object.entries(out.properties)) {
      const strict = toStrictJsonSchema(value);
      properties[key] = required.has(key) ? strict : allowNull(strict);
    }
    out.properties = properties;
    out.required = Object.keys(properties);
    out.additionalProperties = false;
  } else if (out.type === "array" && out.items) {
    out.items = toStrictJsonSchema(out.items);
  }
  return out;
}

export function validateGanDiscriminatorConfig({ apiKey, model }) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new GanStepError("chave-gpt-ausente", "Chave do Discriminador ausente. Crie o segredo Discriminador na Base44 com a chave da OpenAI.");
  }
  if (typeof model !== "string" || !/^gpt-[a-z0-9.-]{2,60}$/.test(model.trim())) {
    throw new GanStepError("modelo-gpt-invalido", "Modelo do Discriminador ausente ou inválido. Confira o segredo QB_DISCRIMINATOR_MODEL (ex.: gpt-6.1-terra, sem espaços).");
  }
}

export async function invokeOpenAIJson({
  apiKey,
  model,
  prompt,
  schema,
  schemaName = "resposta",
  fetchImpl = fetch,
  timeoutMs = 120000,
  maxOutputTokens = 6000,
}) {
  validateGanDiscriminatorConfig({ apiKey, model });
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 120000) {
    throw new GanStepError("contexto-gpt-invalido", "Contexto do Discriminador inválido ou excessivamente longo.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey.trim()}` },
      body: JSON.stringify({
        model: model.trim(),
        messages: [{ role: "user", content: prompt }],
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema: toStrictJsonSchema(schema) },
        },
        max_completion_tokens: maxOutputTokens,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json();
        const code = body?.error?.code || body?.error?.type;
        if (typeof code === "string" && /^[a-z][a-z0-9_]{0,63}$/i.test(code) && !code.includes(apiKey.trim())) {
          detail = code;
        }
      } catch { /* resposta sem JSON */ }
      if (response.status === 401) throw new GanStepError("gpt-http-401", "A OpenAI recusou a chave (401). Confira o segredo Discriminador.");
      if (response.status === 429) throw new GanStepError("gpt-http-429", "Limite de uso ou de gasto da OpenAI atingido (429). Confira o limite mensal e o saldo.");
      throw new GanStepError("gpt-http-" + response.status, `A OpenAI recusou a requisição (HTTP ${response.status}${detail ? ": " + detail : ""}).`);
    }
    const data = await response.json();
    const choice = data?.choices?.[0];
    if (choice?.message?.refusal) throw new GanStepError("gpt-recusou", "O Discriminador (OpenAI) recusou-se a avaliar este conteúdo.");
    if (choice?.finish_reason === "length") throw new GanStepError("gpt-resposta-incompleta", "O Discriminador interrompeu a resposta antes de concluir. Tente novamente.");
    const text = typeof choice?.message?.content === "string" ? choice.message.content.trim() : "";
    if (!text) throw new GanStepError("gpt-sem-texto", "O Discriminador (OpenAI) não retornou texto.");
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new GanStepError("gpt-json-invalido", "O Discriminador devolveu uma resposta que não é JSON válido. Tente novamente.");
    }
    return { parsed, usage: { entrada: data?.usage?.prompt_tokens ?? null, saida: data?.usage?.completion_tokens ?? null } };
  } catch (error) {
    if (controller.signal.aborted) throw new GanStepError("gpt-tempo-limite", "Tempo limite do Discriminador (OpenAI) excedido.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** Gerador do confronto: mesma assinatura usada antes com InvokeLLM ({ prompt, response_json_schema }). */
export async function callGanGenerator({ prompt, response_json_schema, apiKey, model, fetchImpl = fetch, timeoutMs = 90000 }) {
  const { reply } = await invokeGeminiTutor({
    apiKey,
    model,
    prompt,
    responseJsonSchema: response_json_schema,
    maxOutputTokens: 6000,
    timeoutMs,
    fetchImpl: (url, init) => fetchGeminiWithRetry(fetchImpl, url, init),
  });
  try {
    return JSON.parse(reply);
  } catch {
    throw new GanStepError("gemini-json-invalido", "O Gerador (Gemini) devolveu uma resposta que não é JSON válido. Tente novamente.");
  }
}

/** Discriminador cego: mesma assinatura usada antes com InvokeLLM. Devolve só o objeto já validado como JSON. */
export async function callGanDiscriminator({ prompt, response_json_schema, apiKey, model, fetchImpl }) {
  const { parsed } = await invokeOpenAIJson({
    apiKey,
    model,
    prompt,
    schema: response_json_schema,
    schemaName: "julgamento_cego",
    ...(fetchImpl ? { fetchImpl } : {}),
  });
  return parsed;
}
