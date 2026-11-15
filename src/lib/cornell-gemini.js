export function parseCornellGemini(reply) {
  const raw = String(reply || "").trim().replace(/^`{3}(?:json)?\s*/i, "").replace(/\s*`{3}$/, "");
  const from = raw.indexOf("{"), to = raw.lastIndexOf("}");
  if (from < 0 || to <= from) throw new Error("O Gemini não retornou pistas estruturadas. O caderno não foi alterado.");
  let data;
  try { data = JSON.parse(raw.slice(from, to + 1)); }
  catch { throw new Error("A resposta Gemini não contém JSON válido. Suas anotações não foram alteradas."); }
  if (!Array.isArray(data?.cues)) throw new Error("O Gemini não forneceu perguntas de evocação.");
  const cues = data.cues.filter(v => typeof v === "string").map(s => s.trim()).filter(Boolean).slice(0, 8);
  const summary = typeof data.summary === "string" ? data.summary.trim().slice(0, 1600) : "";
  if (cues.length < 2 || !summary) throw new Error("Resposta incompleta do Gemini; notas anteriores preservadas.");
  return { cues, summary };
}
