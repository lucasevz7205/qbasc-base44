/**
 * Adaptador de texto do Tutor Omni para a API Gemini.
 * Sem dependência do SDK Base44, sem efeitos no banco e sem segredo no cliente.
 * Só deve ser invocado a partir de funções autenticadas do servidor.
 */
export const DEFAULT_TUTOR_GEMINI_MODEL = "gemini-3.5-flash-lite";

export class GeminiUnavailableError extends Error {
  constructor() {
    super("O Gemini está temporariamente indisponível (HTTP 503). Tente novamente em alguns minutos.");
  }
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
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new Error("Gemini recusou a requisição. Verifique a chave, o modelo e as permissões do projeto.");
      }
      if (response.status === 503) throw new GeminiUnavailableError();
      if (response.status === 429) {
        throw new Error("Limite de uso do Gemini atingido. Tente novamente após conferir as cotas.");
      }
      throw new Error(`Falha na API Gemini (HTTP ${response.status}). A Base44 não será acionada como fallback.`);
    }
    const data = await response.json();
    const candidate = data?.candidates?.[0];
    if (expectsJson && candidate?.finishReason === "MAX_TOKENS") {
      throw new Error("O Gemini interrompeu a resposta antes de concluir. Tente novamente.");
    }
    const reply = (candidate?.content?.parts || [])
      .filter(part => !part?.thought && typeof part?.text === "string")
      .map(part => part.text)
      .join(expectsJson ? "" : "\n")
      .trim();
    if (!reply) {
      throw new Error("O Gemini não retornou texto. Nenhum fallback com créditos Base44 foi realizado.");
    }
    return { reply: expectsJson ? reply : reply.slice(0, 12000), provider: "gemini" };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Tempo limite do Gemini excedido. Nenhum fallback com créditos Base44 foi realizado.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}