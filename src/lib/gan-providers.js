// Cada papel do confronto usa uma chamada Gemini nova e sua própria instrução.
import { invokeGeminiTutor } from "./gemini-tutor.js";
import { GanStepError } from "./gan-diagnostics.js";

export async function callGanGemini({ prompt, schema, apiKey, model, fetchImpl, timeoutMs = null }) {
  const start = Date.now();
  try {
  const { reply } = await invokeGeminiTutor({
    apiKey,
    model,
    prompt,
    responseJsonSchema: schema,
    maxOutputTokens: 6000,
    timeoutMs,
    fetchImpl,
  });
  try {
    return JSON.parse(reply);
  } catch {
    throw new GanStepError("gemini-json-invalido", "O Gemini retornou JSON inválido nesta etapa. Tente novamente.");
  }
  } finally {
    console.info('[qbasc-gemini]', Object.keys(schema.properties || {}).join(','), Date.now() - start, 'ms');
  }
}
