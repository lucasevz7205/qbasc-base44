/**
 * Provedores do confronto GAN do Arquiteto.
 *  - Gerador: Gemini (segredo "Arquiteto"), pelo adaptador que o app já usa.
 *  - Discriminador cego: OpenAI/GPT (segredo "Discriminador" + modelo em "QB_DISCRIMINATOR_MODEL").
 * Se o Gemini estiver indisponível (HTTP 503), o GPT gera em uma chamada separada do julgamento.
 * Nesse caso a revisão segue sendo cega, embora ambos os papéis usem o mesmo modelo.
 * Sem fallback para InvokeLLM (créditos Base44): se faltar segredo, falha com mensagem clara.
 * Só deve ser chamado a partir de funções autenticadas do servidor.
 */
import { GeminiUnavailableError, invokeGeminiTutor } from "./gemini-tutor.js";
import { GanStepError } from "./gan-diagnostics.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

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
    if (choice?.message?.refusal) throw new GanStepError("gpt-recusou", "O GPT recusou-se a avaliar este conteúdo.");
    if (choice?.finish_reason === "length") throw new GanStepError("gpt-resposta-incompleta", "O GPT interrompeu a resposta antes de concluir. Tente novamente.");
    const text = typeof choice?.message?.content === "string" ? choice.message.content.trim() : "";
    if (!text) throw new GanStepError("gpt-sem-texto", "O GPT não retornou texto.");
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new GanStepError("gpt-json-invalido", "O GPT devolveu uma resposta que não é JSON válido. Tente novamente.");
    }
    return { parsed, usage: { entrada: data?.usage?.prompt_tokens ?? null, saida: data?.usage?.completion_tokens ?? null } };
  } catch (error) {
    if (controller.signal.aborted) throw new GanStepError("gpt-tempo-limite", "Tempo limite do GPT excedido.");
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
    fetchImpl,
  });
  try {
    return JSON.parse(reply);
  } catch {
    throw new GanStepError("gemini-json-invalido", "O Gerador (Gemini) devolveu uma resposta que não é JSON válido. Tente novamente.");
  }
}

export async function callGanGeneratorWithFallback({ prompt, response_json_schema, gemini, openai, onOpenAIFallback }) {
  try {
    const draft = await callGanGenerator({ ...gemini, prompt, response_json_schema });
    return { draft, provedorGerador: "gemini" };
  } catch (error) {
    if (!(error instanceof GeminiUnavailableError)) throw error;
    onOpenAIFallback();
    const { parsed } = await invokeOpenAIJson({
      ...openai,
      prompt,
      schema: response_json_schema,
      schemaName: "questoes_gan",
    });
    return { draft: parsed, provedorGerador: "gpt" };
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
