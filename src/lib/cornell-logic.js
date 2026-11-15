export const CORNELL_DRAFT_PREFIX = "qb-cornell-v2::";
export const LEGACY_CORNELL_PREFIX = "qb-cornell::";
export const CORNELL_HISTORY_INTERVAL_MS = 15 * 60 * 1000;

export const emptyCornell = () => ({ notes: "", cues: "", summary: "" });
export const cleanCornell = source => ({
  notes: typeof source?.notes === "string" ? source.notes : "",
  cues: typeof source?.cues === "string" ? source.cues : "",
  summary: typeof source?.summary === "string" ? source.summary : "",
});
export const cornellSignature = data => JSON.stringify(cleanCornell(data));
export const hasCornellContent = data => Object.values(cleanCornell(data)).some(s => s.trim().length > 0);
export function cornellDraftKey(ownerId, topicId) {
  if (!ownerId || !topicId) throw new Error("Conta ou tópico ausente.");
  return CORNELL_DRAFT_PREFIX + encodeURIComponent(String(ownerId)) + "::" + encodeURIComponent(String(topicId));
}
/** Cópia do servidor prevalece; cópia local divergente continua recuperável. */
export function reconcileCornell(remote, browserDraft, legacyDraft) {
  const cloud = remote ? cleanCornell(remote) : null;
  const browser = hasCornellContent(browserDraft) ? cleanCornell(browserDraft) : null;
  const legacy = hasCornellContent(legacyDraft) ? cleanCornell(legacyDraft) : null;
  if (cloud) {
    const recovery = [browser, legacy].find(local => cornellSignature(local) !== cornellSignature(cloud));
    return { data: cloud, recovery: recovery || null, importFromBrowser: false, source: "cloud" };
  }
  const local = browser || legacy || emptyCornell();
  return { data: local, recovery: null, importFromBrowser: !!(browser || legacy), source: browser ? "browser" : legacy ? "legacy" : "new" };
}
export function shouldCreateCornellVersion(lastTime, now = Date.now()) {
  return !lastTime || now - new Date(lastTime).getTime() >= CORNELL_HISTORY_INTERVAL_MS;
}
