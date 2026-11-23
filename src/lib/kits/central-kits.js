import { stripFlashcardContext } from '../flashcard-standard.js';
import { stripLeadingEmoji } from '../subject-icons.js';

const KIT_PATH_RE = /\/data\/kits\/(?:([a-z]{2,4})\/)?([a-z]{2,4}-[0-9]+[a-z]?(?:-[0-9]+[a-z]?)*)\/(mapa|cartoes|itens)\.json$/i;

// Vite transforma a chamada ao glob e fornece env. O Node direto não fornece env.
const globKitModules = import.meta.env
  ? import.meta.glob('../../data/kits/**/{mapa,cartoes,itens}.json', { eager: true })
  : {};

function unwrapModule(mod) {
  return mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;
}

function normalizeKitCard(card, { topico, materia, capNome }) {
  if (!card || typeof card !== 'object') return null;
  const frontField = typeof card.pergunta === 'string'
    ? 'pergunta'
    : typeof card.q === 'string'
      ? 'q'
      : typeof card.front === 'string'
        ? 'front'
        : null;
  if (!frontField) return card;
  const cleanFront = stripFlashcardContext(card[frontField], materia, [capNome, card.tema], topico);
  if (cleanFront === card[frontField]) return card;
  return { ...card, [frontField]: cleanFront };
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
    const rawMapa = entry.mapa && !Array.isArray(entry.mapa) ? entry.mapa : null;
    const mapa = rawMapa && typeof rawMapa.centro === 'string'
      ? { ...rawMapa, centro: stripLeadingEmoji(rawMapa.centro) }
      : rawMapa;
    const rawCartoes = Array.isArray(entry.cartoes) ? entry.cartoes : [];
    const itens = Array.isArray(entry.itens) ? entry.itens : [];
    const topico = String(mapa?.topico || cap).trim().toLowerCase();
    const materia = mapa?.materia || entry.materiaDir || undefined;
    const capNome = stripLeadingEmoji(mapa?.centro || '') || cap;
    const cartoes = rawCartoes
      .map(card => normalizeKitCard(card, { topico, materia, capNome }))
      .filter(Boolean);

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
