const text = value => typeof value === 'string' ? value.trim() : '';
const compact = value => text(value).normalize('NFC').replace(/\s+/g, ' ');
const words = value => new Set(compact(value).normalize('NFD').replace(/\p{M}/gu, '')
  .toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []);

function passages(body) {
  const paragraphs = text(body).split(/\n\s*\n|(?<=[.!?])\s+(?=\p{Lu})/u).map(compact).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length > 1600) {
      if (current) chunks.push(current);
      current = '';
    }
    if (paragraph.length > 1600) {
      for (let i = 0; i < paragraph.length; i += 1400) chunks.push(paragraph.slice(i, i + 1600));
    } else {
      current = [current, paragraph].filter(Boolean).join('\n');
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function ganSourcePassages(materials, { topicId, targetNodeLabel, targetNodePath = [] }) {
  const terms = words([targetNodeLabel, ...targetNodePath].join(' '));
  const candidates = [];
  for (const material of materials) {
    if (!Array.isArray(material.topicos) || !material.topicos.includes(topicId)) continue;
    // Mapas, respostas a questões e referências bibliográficas isoladas não são texto-fonte.
    const fields = [
      ['referenceText', 'texto'], ['textoExtraido', 'texto'], ['texto_extraido', 'texto'],
      ['texto', 'texto'], ['conteudo', 'material'], ['anotacoes', 'anotacoes'], ['resumo', 'resumo'],
    ];
    const seen = new Set();
    for (const [field, natureza] of fields) {
      const value = material[field];
      const body = Array.isArray(value) ? value.filter(v => typeof v === 'string').join('\n') : text(value);
      if (!body || seen.has(compact(body))) continue;
      seen.add(compact(body));
      for (const [index, passage] of passages(body).entries()) {
        const passageWords = words(passage);
        const score = [...terms].filter(word => passageWords.has(word)).length;
        candidates.push({
          id: `${material.id}:${field}:${index}`.slice(0, 220),
          titulo: text(material.titulo) || 'Material do assunto',
          natureza, texto: passage, score,
        });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const unique = new Set();
  return candidates.filter(source => {
    const key = compact(source.texto);
    if (unique.has(key)) return false;
    unique.add(key);
    return true;
  }).slice(0, 4).map(({ score: _score, ...source }) => source);
}

export const GAN_MAP_EXERCISE_PREFIX = 'Com base no mapa, julgue o item: ';

// Notes are evidence only for exercises explicitly relative to the map.
export function ganMapExercisePassages({ mapa, targetNodeId }) {
  const nodes = Array.isArray(mapa?.nodes) ? mapa.nodes : [];
  const selected = nodes.find(node => node.id === targetNodeId);
  if (!selected) return [];
  const scoped = [selected, ...nodes.filter(node => node.parent === selected.id && node.id !== selected.id)];
  const used = new Set();
  return scoped.flatMap((node, index) => {
    const body = compact(node.summary);
    if (body.length < 32 || used.has(body)) return [];
    used.add(body);
    return [{
      id: 'mapa:' + index,
      titulo: 'Notas do mapa · ' + node.label,
      natureza: 'mapa',
      texto: body.slice(0, 1500),
    }];
  }).slice(0, 4);
}

export function verifyGanEvidence(fundamento, sources) {
  const fonteId = text(fundamento?.fonteId).slice(0, 220);
  const trecho = text(fundamento?.trecho).slice(0, 1600);
  const explicacao = text(fundamento?.explicacao).slice(0, 1600);
  const limitacao = text(fundamento?.limitacao).slice(0, 600);
  const source = sources.find(entry => entry.id === fonteId);
  const verified = Boolean(source && trecho && compact(source.texto).includes(compact(trecho)));
  return {
    fonteId, trecho, explicacao, limitacao,
    titulo: source?.titulo || '',
    natureza: source?.natureza || '',
    verificacao: verified ? 'trecho_localizado' : sources.length ? 'trecho_nao_localizado' : 'sem_fonte',
  };
}
