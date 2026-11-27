// Ponteiros "onde parei" do Estúdio do Arquiteto. Guarda só identificadores
// (aba, tópico, tarefa, item), nunca respostas nem texto do estudante.
const prefix = 'qbasc-studio-ponto:v1:';
const FIELDS = ['tool', 'subjectId', 'topicId', 'nodeId', 'pilotTask', 'pilotItem'];
const clean = v => (typeof v === 'string' && v.length > 0 && v.length <= 120 ? v : null);

export function createStudioResume(getStorage = () => globalThis.localStorage) {
  const key = account => prefix + JSON.stringify([account]);
  function read(account) {
    if (!account) return {};
    try {
      const raw = JSON.parse(getStorage().getItem(key(account)));
      if (!raw || typeof raw !== 'object') return {};
      return Object.fromEntries(FIELDS.map(f => [f, clean(raw[f])]).filter(([, v]) => v));
    } catch { return {}; }
  }
  function write(account, patch) {
    if (!account) return;
    try {
      const next = { ...read(account) };
      for (const f of FIELDS) if (f in patch) { const v = clean(patch[f]); if (v) next[f] = v; else delete next[f]; }
      getStorage().setItem(key(account), JSON.stringify(next));
    } catch { /* armazenamento indisponível: segue sem lembrar */ }
  }
  return { read, write };
}

export const studioResume = createStudioResume();
