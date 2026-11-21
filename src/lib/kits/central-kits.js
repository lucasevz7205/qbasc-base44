const KIT_PATH_RE = /\/data\/kits\/(?:([a-z]{2})\/)?([a-z]{2}-[0-9]+[a-z]?(?:-[0-9]+[a-z]?)*)\/(mapa|cartoes|itens)\.json$/i;

const globKitModules = typeof import.meta.glob === 'function'
  ? import.meta.glob('../../data/kits/**/{mapa,cartoes,itens}.json', { eager: true })
  : {};

function unwrapModule(mod) {
  return mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;
}

export function loadCentralKits(modules = globKitModules) {
  const byChapter = new Map();

  for (const [rawPath, mod] of Object.entries(modules || {})) {
    const normalizedPath = String(rawPath).replace(/\\/g, '/');
    const match = KIT_PATH_RE.exec(normalizedPath);
    if (!match) continue;

    const [, materiaDir, capRaw, kind] = match;
    const cap = capRaw.toLowerCase();
    const data = unwrapModule(mod);
    if (!data || typeof data !== 'object') continue;

    if (!byChapter.has(cap)) {
      byChapter.set(cap, { cap, materiaDir: materiaDir?.toLowerCase() || null, mapa: null, cartoes: null, itens: null });
    }
    byChapter.get(cap)[kind.toLowerCase()] = data;
  }

  const revisions = [];
  const questions = [];

  for (const cap of [...byChapter.keys()].sort()) {
    const entry = byChapter.get(cap);
    const mapa = entry.mapa && !Array.isArray(entry.mapa) ? entry.mapa : null;
    const cartoes = Array.isArray(entry.cartoes) ? entry.cartoes : [];
    const itens = Array.isArray(entry.itens) ? entry.itens : [];
    const topico = String(mapa?.topico || cap).trim().toLowerCase();
    const materia = mapa?.materia || entry.materiaDir || undefined;
    const capNome = mapa?.centro || cap;

    if (mapa || cartoes.length) {
      revisions.push({
        id: `${topico}.mapa`,
        topico,
        materia,
        mapa,
        cartoes,
      });
    }

    for (const item of itens) {
      if (!item || typeof item !== 'object' || !item.id) continue;
      questions.push({
        ...item,
        topico: item.topico ?? item.topicId ?? topico,
        cap: item.cap ?? cap,
        capNome: item.capNome ?? capNome,
        materia: item.materia ?? materia,
      });
    }
  }

  return { revisions, questions };
}
