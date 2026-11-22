/**
 * Registro operacional das chamadas Gemini do Arquiteto.
 *
 * Só campos de uma lista fechada são gravados: modelo, horário, duração,
 * status HTTP, tokens e códigos de erro. Chave, prompt, mensagem do aluno,
 * identificadores de usuário e respostas nunca entram no registro, mesmo que
 * o chamador os envie por engano.
 *
 * Cada entrada sai em uma linha JSON no console do servidor (logs do app na
 * Base44) e fica num buffer circular em memória, consultável pelo administrador.
 * O buffer vale por instância do servidor e se perde a cada reinício.
 */
const TEXT_FIELDS = {
  event: 32, requestedAt: 32, task: 40, mode: 20, preference: 10, tier: 10,
  reason: 40, model: 64, fallbackFrom: 64, outcome: 10, errorCode: 24,
};
const NUMBER_FIELDS = ["durationMs", "status", "inputTokens", "outputTokens", "attempt"];
const SAFE_TEXT = /^[A-Za-z0-9 .:_\-+]*$/;

export function sanitizeTelemetryEntry(entry = {}) {
  const clean = {};
  for (const [field, max] of Object.entries(TEXT_FIELDS)) {
    const value = entry[field];
    if (typeof value === "string" && value.length <= max && SAFE_TEXT.test(value)) clean[field] = value;
  }
  for (const field of NUMBER_FIELDS) {
    const value = entry[field];
    if (Number.isFinite(value)) clean[field] = Math.round(value);
    else if (value === null && field === "status") clean[field] = null;
  }
  return clean;
}

export function createGeminiTelemetry({ log = (line) => console.info(line), capacity = 200 } = {}) {
  const recent = [];
  const byModel = new Map();

  function record(entry) {
    const clean = sanitizeTelemetryEntry({ event: "qbasc.gemini.request", ...entry });
    recent.push(clean);
    if (recent.length > capacity) recent.shift();
    const key = clean.model || "(sem modelo)";
    const stats = byModel.get(key) || { requests: 0, ok: 0, errors: 0, errorsByCode: {}, statuses: {}, totalDurationMs: 0, inputTokens: 0, outputTokens: 0, lastAt: null };
    stats.requests += 1;
    if (clean.outcome === "ok") stats.ok += 1;
    else {
      stats.errors += 1;
      const code = clean.errorCode || "unknown";
      stats.errorsByCode[code] = (stats.errorsByCode[code] || 0) + 1;
    }
    const status = clean.status == null ? "sem_status" : String(clean.status);
    stats.statuses[status] = (stats.statuses[status] || 0) + 1;
    stats.totalDurationMs += clean.durationMs || 0;
    stats.inputTokens += clean.inputTokens || 0;
    stats.outputTokens += clean.outputTokens || 0;
    stats.lastAt = clean.requestedAt || stats.lastAt;
    byModel.set(key, stats);
    try { log(JSON.stringify(clean)); } catch { /* o log nunca interrompe a resposta */ }
    return clean;
  }

  function summary({ limit = 20 } = {}) {
    const models = {};
    for (const [model, stats] of byModel) {
      const { totalDurationMs, ...rest } = stats;
      models[model] = { ...rest, errorsByCode: { ...rest.errorsByCode }, statuses: { ...rest.statuses }, avgDurationMs: stats.requests ? Math.round(totalDurationMs / stats.requests) : 0 };
    }
    return { scope: "instancia-atual", models, recent: recent.slice(-limit).reverse() };
  }

  return { record, summary };
}

export const architectTelemetry = createGeminiTelemetry();
