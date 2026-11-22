/**
 * Adaptador de texto do Tutor Omni para a API Gemini.
 * Sem dependência do SDK Base44, sem efeitos no banco e sem segredo no cliente.
 * Só deve ser invocado a partir de funções autenticadas do servidor.
 */
export const DEFAULT_TUTOR_GEMINI_MODEL = "gemini-3.5-flash-lite";

/**
 * Erro da API Gemini com status HTTP e código estável, usados pelo roteador
 * de modelos e pelo monitoramento. A mensagem nunca repete o payload remoto.
 */
export class GeminiHttpError extends Error {
  constructor(message, { status = null, code = "http" } = {}) {
    super(message);
    this.name = "GeminiHttpError";
    this.status = status;
    this.code = code;
  }
}

export class GeminiUnavailableError extends GeminiHttpError {
  constructor() {
    super("O Gemini está temporariamente indisponível (HTTP 503). Tente novamente em alguns minutos.", { status: 503, code: "unavailable" });
    this.name = "GeminiUnavailableError";
  }
}

export class GeminiModelNotFoundError extends GeminiHttpError {
  constructor(model) {
    super(`Modelo Gemini "${model}" não encontrado para esta chave (HTTP 404). A Base44 não será acionada como fallback.`, { status: 404, code: "not_found" });
    this.name = "GeminiModelNotFoundError";
    this.model = model;
  }
}

export class GeminiQuotaError extends GeminiHttpError {
  constructor(model) {
    super(
      `Limite de uso do Gemini atingido${model ? ` no modelo ${model}` : ""} (HTTP 429). Tente novamente após conferir as cotas. Nenhuma outra chave, projeto ou crédito Base44 foi usado.`,
      { status: 429, code: "quota" },
    );
    this.name = "GeminiQuotaError";
  }
}

export class GeminiTimeoutError extends GeminiHttpError {
  constructor() {
    super("Tempo limite do Gemini excedido. Nenhum fallback com créditos Base44 foi realizado.", { status: null, code: "timeout" });
    this.name = "GeminiTimeoutError";
  }
}

function usageFrom(data) {
  const usage = data?.usageMetadata;
  if (!usage || typeof usage !== "object") return null;
  const count = value => (Number.isFinite(value) ? value : null);
  return { inputTokens: count(usage.promptTokenCount), outputTokens: count(usage.candidatesTokenCount) };
}

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

export async function invokeGeminiTutor({
  apiKey,
  prompt,
  model = DEFAULT_TUTOR_GEMINI_MODEL,
  fetchImpl = fetch,
  timeoutMs = 30000,
  jsonReply = false,
  responseJsonSchema,
  maxOutputTokens = 1800,
}) {
  const expectsJson = jsonReply || Boolean(responseJsonSchema);
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("Chave Gemini ausente. Confira o segredo Arquiteto (ou ARQUITETO/GEMINI_API_KEY) na Base44.");
  }
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 100000) {
    throw new Error("Contexto do tutor inválido ou excessivamente longo.");
  }
  if (!/^gemini-[a-z0-9.-]{3,60}$/.test(model)) {
    throw new Error("Modelo Gemini inválido. Verifique QB_GEMINI_MODEL.");
  }
  const controller = new AbortController();
  const timeout = timeoutMs == null ? undefined : setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchGeminiWithRetry(
      fetchImpl,
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey.trim(),
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens,
            ...(expectsJson ? { responseMimeType: "application/json" } : {}),
            ...(responseJsonSchema ? { responseJsonSchema } : {}),
          },
        }),
        signal: controller.signal,
      }
    );
    // Não repassar payload de erro da API: pode conter conteúdo de solicitação.
    if (!response.ok) {
      try { await response.body?.cancel(); } catch { /* corpo já consumido ou indisponível */ }
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new GeminiHttpError("Gemini recusou a requisição. Verifique a chave, o modelo e as permissões do projeto.", { status: response.status, code: "refused" });
      }
      if (response.status === 404) throw new GeminiModelNotFoundError(model);
      if (response.status === 503) throw new GeminiUnavailableError();
      if (response.status === 429) throw new GeminiQuotaError(model);
      throw new GeminiHttpError(`Falha na API Gemini (HTTP ${response.status}). A Base44 não será acionada como fallback.`, { status: response.status, code: "http" });
    }
    const data = await response.json();
    const usage = usageFrom(data);
    const candidate = data?.candidates?.[0];
    if (expectsJson && candidate?.finishReason === "MAX_TOKENS") {
      throw new GeminiHttpError("O Gemini interrompeu a resposta antes de concluir. Tente novamente.", { status: 200, code: "truncated" });
    }
    const reply = (candidate?.content?.parts || [])
      .filter(part => !part?.thought && typeof part?.text === "string")
      .map(part => part.text)
      .join(expectsJson ? "" : "\n")
      .trim();
    if (!reply) {
      throw new GeminiHttpError("O Gemini não retornou texto. Nenhum fallback com créditos Base44 foi realizado.", { status: 200, code: "empty" });
    }
    return { reply: expectsJson ? reply : reply.slice(0, 12000), provider: "gemini", model, usage };
  } catch (error) {
    if (controller.signal.aborted) throw new GeminiTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}