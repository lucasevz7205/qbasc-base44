/**
 * Roteador de modelos Gemini do Arquiteto (somente servidor).
 *
 * - Automático escolhe Flash-Lite para tarefas simples e Flash para raciocínio,
 *   correção e saídas estruturadas complexas.
 * - A disponibilidade vem de models.list autenticado. Estar na lista apenas
 *   indica que a chave enxerga o modelo com generateContent; não comprova
 *   elegibilidade ao Free Tier, cota ou nível de faturamento.
 * - Fallback só para 404 e só para outro modelo autorizado e confirmado na
 *   listagem. 429 e 503 são informados ao usuário sem troca de modelo, chave,
 *   projeto ou provedor. Créditos Base44 nunca são usados como fallback.
 */
import {
  invokeGeminiTutor,
  GeminiHttpError,
  GeminiModelNotFoundError,
  GeminiQuotaError,
  GeminiTimeoutError,
} from "./gemini-tutor.js";
import { architectTelemetry } from "./gemini-telemetry.js";

export const GEMINI_MODEL_CANDIDATES = Object.freeze({ flash: "gemini-2.5-flash", lite: "gemini-2.5-flash-lite" });
export const MODEL_PREFERENCES = Object.freeze(["auto", "flash", "lite"]);
export const MODEL_TIER_LABELS = Object.freeze({ flash: "Flash", lite: "Flash-Lite" });
export const FREE_TIER_NOTICE =
  "A listagem de modelos mostra o que a chave enxerga; não confirma Free Tier, cotas nem faturamento. Confira-os no Google AI Studio.";

const MODEL_ID = /^gemini-[a-z0-9.-]{3,60}$/;
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
const MODELS_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_MODEL_PAGES = 5;

/** Modelos autorizados: candidatos iniciais ou substitutos explícitos nos segredos. */
export function resolveArchitectModels(getSecret = () => undefined) {
  const pick = (name, fallback) => {
    const value = getSecret(name)?.trim();
    return value && MODEL_ID.test(value) ? value : fallback;
  };
  return {
    flash: pick("QB_GEMINI_FLASH_MODEL", GEMINI_MODEL_CANDIDATES.flash),
    lite: pick("QB_GEMINI_LITE_MODEL", GEMINI_MODEL_CANDIDATES.lite),
  };
}

/** Modelos com saída JSON por responseJsonSchema (família 2.5 em diante). */
export function supportsStructuredOutput(model) {
  const match = /^gemini-(\d+)(?:\.(\d+))?-/.exec(model || "");
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2] || 0);
  return major > 2 || (major === 2 && minor >= 5);
}

const LITE_MODES = new Set(["analogia", "retencao"]);
const FLASH_MODES = new Set(["feynman", "banca", "armadilhas", "oral"]);
const TASK_TIERS = {
  "flashcard-correction": { tier: "flash", reason: "task:correcao" },
  "cornell-assessment": { tier: "flash", reason: "task:parecer-estruturado" },
  "cornell-cues": { tier: "lite", reason: "task:pistas-simples" },
};
// Só a fronteira inicial: \b do JavaScript não reconhece letras acentuadas.
const LEGAL_REASONING = /§|\bart\.?\s*\d|\b(?:artigo|par[aá]grafo|inciso|al[ií]nea|s[uú]mula|stf|stj|tcu|jurisprud|constitucional|inconstitucional|compet[eê]ncia|qu[oó]rum|prazo|julgue|gabarito|fundament|exce[cç][aã]o|diferen[cç]a|distin[gç]|compar|corrij|corrig|avali|analis|por que|est[aá] (?:certo|correto|errado)|certo ou errado)/i;
const SIMPLE_MESSAGE_MAX = 240;

/**
 * Classifica a tarefa em "lite" ou "flash". Recebe só metadados e a mensagem
 * atual; o motivo devolvido é um código fixo, seguro para o monitoramento.
 */
export function classifyArchitectTask({ task = "tutor", mode, userMessage = "", historyLength = 0 } = {}) {
  if (TASK_TIERS[task]) return { ...TASK_TIERS[task] };
  if (LITE_MODES.has(mode)) return { tier: "lite", reason: `mode:${mode}` };
  if (FLASH_MODES.has(mode)) return { tier: "flash", reason: `mode:${mode}` };
  const text = String(userMessage || "");
  if (LEGAL_REASONING.test(text)) return { tier: "flash", reason: "raciocinio-juridico" };
  if (text.length > SIMPLE_MESSAGE_MAX || (text.match(/\?/g) || []).length > 2) return { tier: "flash", reason: "pergunta-complexa" };
  if (historyLength >= 8) return { tier: "flash", reason: "conversa-longa" };
  return { tier: "lite", reason: "pergunta-simples" };
}

/**
 * Ordem de tentativa. Sem listagem confirmada, só o modelo principal é tentado
 * (não há como provar que o substituto está disponível).
 */
export function selectModelChain({ preference = "auto", tier = "lite", models = GEMINI_MODEL_CANDIDATES, available = null, structured = false } = {}) {
  const primaryTier = preference === "flash" || preference === "lite" ? preference : tier;
  const order = primaryTier === "flash" ? ["flash", "lite"] : ["lite", "flash"];
  const seen = new Set();
  let chain = order
    .map(t => ({ tier: t, model: models[t] }))
    .filter(item => MODEL_ID.test(item.model || "") && !seen.has(item.model) && seen.add(item.model));
  if (structured) chain = chain.filter(item => supportsStructuredOutput(item.model));
  if (!available) return { primaryTier, chain: chain.slice(0, 1), availabilityKnown: false };
  return { primaryTier, chain: chain.filter(item => available.has(item.model)), availabilityKnown: true };
}

/** models.list autenticado pelo header; a chave nunca vai para URL, corpo ou retorno. */
export async function listGeminiModels({ apiKey, fetchImpl = fetch, timeoutMs = 8000 }) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("Chave Gemini ausente. Confira o segredo Arquiteto (ou ARQUITETO/GEMINI_API_KEY) na Base44.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const models = [];
  try {
    let pageToken = "";
    for (let page = 0; page < MAX_MODEL_PAGES; page += 1) {
      const url = `${GEMINI_API}/models?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
      const response = await fetchImpl(url, { method: "GET", headers: { "x-goog-api-key": apiKey.trim() }, signal: controller.signal });
      if (!response.ok) {
        try { await response.body?.cancel(); } catch { /* sem corpo */ }
        if (response.status === 401 || response.status === 403 || response.status === 400) {
          throw new GeminiHttpError("Gemini recusou a listagem de modelos. Verifique a chave e as permissões do projeto.", { status: response.status, code: "refused" });
        }
        if (response.status === 429) throw new GeminiQuotaError();
        throw new GeminiHttpError(`Falha ao listar modelos Gemini (HTTP ${response.status}).`, { status: response.status, code: "list_failed" });
      }
      const data = await response.json();
      for (const item of data?.models || []) {
        const id = String(item?.name || "").replace(/^models\//, "");
        if (!MODEL_ID.test(id)) continue;
        const methods = Array.isArray(item.supportedGenerationMethods) ? item.supportedGenerationMethods : [];
        models.push({
          id,
          displayName: typeof item.displayName === "string" ? item.displayName.slice(0, 80) : id,
          supportsGenerateContent: methods.includes("generateContent"),
          inputTokenLimit: Number.isFinite(item.inputTokenLimit) ? item.inputTokenLimit : null,
          outputTokenLimit: Number.isFinite(item.outputTokenLimit) ? item.outputTokenLimit : null,
        });
      }
      pageToken = typeof data?.nextPageToken === "string" ? data.nextPageToken : "";
      if (!pageToken) break;
    }
    return models;
  } catch (error) {
    if (controller.signal.aborted) throw new GeminiTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function keyFingerprint(apiKey) {
  const bytes = new TextEncoder().encode(apiKey.trim());
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest).slice(0, 8), b => b.toString(16).padStart(2, "0")).join("");
}

/** Cache por instância, indexado por impressão digital da chave (nunca pela chave). */
export function createModelAvailabilityCache({ ttlMs = MODELS_CACHE_TTL_MS, now = Date.now } = {}) {
  const entries = new Map();
  return {
    async get({ apiKey, fetchImpl = fetch }) {
      const id = await keyFingerprint(apiKey);
      const cached = entries.get(id);
      if (cached && now() - cached.at < ttlMs) return cached.value;
      const models = await listGeminiModels({ apiKey, fetchImpl });
      const value = {
        checkedAt: new Date(now()).toISOString(),
        models,
        generateContent: new Set(models.filter(m => m.supportsGenerateContent).map(m => m.id)),
      };
      entries.set(id, { at: now(), value });
      return value;
    },
    async forget(apiKey, model) {
      const cached = entries.get(await keyFingerprint(apiKey));
      cached?.value.generateContent.delete(model);
    },
  };
}

export const architectModelCache = createModelAvailabilityCache();

/** Estado dos modelos autorizados para o painel do administrador. */
export async function describeArchitectModels({ apiKey, models, fetchImpl = fetch, cache = architectModelCache }) {
  const base = Object.entries(models).map(([tier, id]) => ({ tier, label: MODEL_TIER_LABELS[tier], id, available: null }));
  if (!apiKey) return { check: "no-key", checkedAt: null, models: base, notice: FREE_TIER_NOTICE };
  try {
    const availability = await cache.get({ apiKey, fetchImpl });
    return {
      check: "ok",
      checkedAt: availability.checkedAt,
      models: base.map(item => ({ ...item, available: availability.generateContent.has(item.id) })),
      notice: FREE_TIER_NOTICE,
    };
  } catch (error) {
    return { check: "error", checkedAt: null, errorCode: error?.code || "unknown", models: base, notice: FREE_TIER_NOTICE };
  }
}

/**
 * Chamada do Arquiteto com roteamento. Retorna a resposta, o modelo usado e o
 * motivo da escolha. Nunca chama a Base44.
 */
export async function invokeArchitectGemini({
  apiKey,
  prompt,
  task = "tutor",
  mode,
  userMessage,
  historyLength = 0,
  preference = "auto",
  models = GEMINI_MODEL_CANDIDATES,
  fetchImpl = fetch,
  timeoutMs = 30000,
  jsonReply = false,
  responseJsonSchema,
  maxOutputTokens,
  cache = architectModelCache,
  telemetry = architectTelemetry,
  now = Date.now,
}) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("Chave Gemini ausente. Confira o segredo Arquiteto (ou ARQUITETO/GEMINI_API_KEY) na Base44.");
  }
  const safePreference = MODEL_PREFERENCES.includes(preference) ? preference : "auto";
  const structured = Boolean(jsonReply || responseJsonSchema || task === "cornell-cues");
  const { tier, reason } = classifyArchitectTask({ task, mode, userMessage, historyLength });
  const base = { task, mode: typeof mode === "string" ? mode : undefined, preference: safePreference, reason };

  let available = null;
  const listStarted = now();
  try {
    available = (await cache.get({ apiKey, fetchImpl })).generateContent;
  } catch (error) {
    telemetry.record({ ...base, event: "qbasc.gemini.models_list", requestedAt: new Date(listStarted).toISOString(), durationMs: now() - listStarted, status: error?.status ?? null, outcome: "error", errorCode: error?.code || "unknown" });
    // Chave recusada ou cota esgotada: informar já, sem tentar outro caminho.
    if (error?.code === "refused" || error?.code === "quota") throw error;
  }

  const { primaryTier, chain, availabilityKnown } = selectModelChain({ preference: safePreference, tier, models, available, structured });
  if (!chain.length) {
    throw new GeminiHttpError(
      `Nenhum modelo autorizado (${Object.values(models).join(", ")}) está disponível com generateContent${structured ? " e saída JSON" : ""} para esta chave. Nenhum fallback com créditos Base44 foi realizado.`,
      { status: null, code: "no_model" },
    );
  }

  const started = now();
  const deadline = timeoutMs == null ? null : started + timeoutMs;
  let fallbackFrom = chain[0].tier !== primaryTier ? models[primaryTier] : undefined;
  for (let index = 0; index < chain.length; index += 1) {
    const { model, tier: usedTier } = chain[index];
    const remaining = deadline == null ? null : deadline - now();
    if (remaining != null && remaining <= 0) throw new GeminiTimeoutError();
    const attemptStart = now();
    const entry = { ...base, tier: usedTier, model, fallbackFrom, attempt: index + 1, requestedAt: new Date(attemptStart).toISOString() };
    try {
      const result = await invokeGeminiTutor({ apiKey, prompt, model, fetchImpl, timeoutMs: remaining, jsonReply, responseJsonSchema, ...(maxOutputTokens ? { maxOutputTokens } : {}) });
      telemetry.record({ ...entry, durationMs: now() - attemptStart, status: 200, outcome: "ok", inputTokens: result.usage?.inputTokens, outputTokens: result.usage?.outputTokens });
      return {
        reply: result.reply,
        provider: "gemini",
        model,
        tier: usedTier,
        routing: { preference: safePreference, selectedTier: primaryTier, reason, availabilityKnown, ...(fallbackFrom ? { fallbackFrom } : {}) },
      };
    } catch (error) {
      telemetry.record({ ...entry, durationMs: now() - attemptStart, status: error?.status ?? null, outcome: "error", errorCode: error?.code || "unknown" });
      const canFallback = error instanceof GeminiModelNotFoundError && availabilityKnown && index < chain.length - 1;
      if (!canFallback) throw error;
      await cache.forget?.(apiKey, model);
      fallbackFrom = model;
    }
  }
  throw new GeminiHttpError("Nenhum modelo Gemini respondeu. Nenhum fallback com créditos Base44 foi realizado.", { code: "no_model" });
}
