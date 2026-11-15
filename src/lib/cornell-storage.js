import { base44 } from "@/api/base44Client";

/** Browser-safe Cornell persistence. All queries are scoped to the authenticated account and topic ID. */
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

/** Cloud wins on conflict; old local text stays recoverable and is never deleted. */
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

const matching = (rows, label) => {
  if (rows.length > 1) throw new Error("Há mais de um " + label + " para este usuário e assunto. Nada foi sobrescrito.");
  return rows[0] || null;
};

export async function getCornellNote(ownerId, topicId) {
  const rows = await base44.entities.CornellNote.filter({ owner_id: ownerId, topic_id: topicId }, "-updated_date", 5);
  return matching(rows, "caderno Cornell");
}

export async function saveCornellNote({ ownerId, topicId, topicLabel, draft, knownRevision }) {
  const record = cleanCornell(draft);
  const row = await getCornellNote(ownerId, topicId);
  const existingRevision = Number(row?.revision || 0);
  if (row && knownRevision !== existingRevision) {
    if (cornellSignature(record) === cornellSignature(row)) return row;
    throw new Error("Este caderno foi atualizado em outro dispositivo. Suas alterações locais continuam guardadas; use Recuperar para conciliá-las.");
  }
  if (row && cornellSignature(record) === cornellSignature(row)) return row;
  const payload = { owner_id: String(ownerId), topic_id: String(topicId), topic_label: String(topicLabel || topicId),
    ...record, revision: existingRevision + 1, updated_at: new Date().toISOString() };
  if (row) return base44.entities.CornellNote.update(row.id, payload);
  return base44.entities.CornellNote.create(payload);
}

export async function createCornellVersion({ ownerId, topicId, topicLabel, draft, revision }) {
  const payload = { owner_id: String(ownerId), topic_id: String(topicId), topic_label: String(topicLabel || topicId),
    ...cleanCornell(draft), revision: Number(revision || 1), saved_at: new Date().toISOString() };
  return base44.entities.CornellNoteVersion.create(payload);
}

export async function listCornellVersions(ownerId, topicId) {
  const rows = await base44.entities.CornellNoteVersion.filter({ owner_id: ownerId, topic_id: topicId }, "-created_date", 30);
  return rows.sort((a, b) => String(b.saved_at).localeCompare(String(a.saved_at))).slice(0, 15);
}

export function shouldCreateCornellVersion(lastTime, now = Date.now()) {
  return !lastTime || now - new Date(lastTime).getTime() >= CORNELL_HISTORY_INTERVAL_MS;
}
