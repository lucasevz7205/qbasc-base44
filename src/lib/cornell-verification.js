import { cornellPairTitle, readCornellPairs } from './cornell-pairs.js';
import { cornellPlainText } from './cornell-rich.js';

export const CORNELL_VERIFICATION_LIMITS = { notebook: 40000, sourceText: 8000, sources: 3, mapNodes: 100 };

const line = value => cornellPlainText(value).trim();
const titleText = value => (typeof value === 'string' ? value.trim() : '');
const safeUrl = value => {
  try {
    const url = new URL(value);
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch { /* Uma referência pode ter apenas título. */ }
  return undefined;
};

export function cornellVerificationContext(data, topic) {
  if (!topic) return { map: [], references: [], mapLimited: false };
  const nodes = data.mindMaps.find(entry => entry.topicId === topic.id)?.nodes || [];
  const byId = new Map(nodes.map(node => [node.id, node]));
  const references = new Map();
  const addReference = (label, url) => {
    const title = titleText(label);
    const href = safeUrl(url);
    if (title && (!references.has(title) || (!references.get(title).url && href))) references.set(title, { title, url: href });
  };
  for (const material of topic.resources?.materials || []) {
    if (['fonte', 'livro', 'lei', 'norma', 'legislacao', 'legislação'].includes(material.tipo)) {
      addReference(material.titulo, material.url);
    }
  }
  for (const node of nodes) {
    for (const source of data.concepts[node.id]?.sources || []) addReference(source.label, source.url);
  }
  // Prioriza os ramos principais antes dos descendentes caso o mapa seja extenso.
  const depth = node => {
    let levels = 0;
    for (let parent = node.parent; parent && levels < nodes.length; parent = byId.get(parent)?.parent) levels++;
    return levels;
  };
  const branches = nodes.filter(node => node.parent && titleText(node.label)).sort((a, b) => depth(a) - depth(b));
  const map = branches.slice(0, CORNELL_VERIFICATION_LIMITS.mapNodes).map((node, index) => ({
    id: index + 1,
    label: node.label.trim().slice(0, 160),
    parent: (byId.get(node.parent)?.label || '').trim().slice(0, 100),
  }));
  return { map, references: [...references.values()], mapLimited: branches.length > map.length };
}

const STOP = new Set('acordo ainda antes aquela aquele aquilo assim cada como contra coisa coisas dessa dessas desse desses desta destas deste destes deve devem direito durante elas eles enquanto entre esta estao estas este estes fazer forma foram isto mais maior mesmo menor muito nenhum nesta neste nossa nosso onde outra outro para pela pelas pelo pelos pode podem pois porque qual quais quando quanto seja sobre somente tambem tenha tendo toda todas todo todos suas seus voce uma umas uns das dos que com sem seu sua ser nao sim por mas tem foi sao até'.split(' '));

function keywords(text) {
  const normalized = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  return [...new Set((normalized.match(/[\p{L}\p{N}]+/gu) || []).filter(word => word.length >= 3 && !STOP.has(word)))];
}

const compact = text => text.replace(/\s+/g, ' ').trim();
function passages(text) {
  return text.split(/\r?\n|(?<=[.!?…])\s+(?=\p{Lu})/u)
    .map(line => compact(line).replace(/^(?:[•–-]|\d+[.)])\s+/, ''))
    .filter(line => line.length >= 18);
}

function readNotebook(original, linked) {
  const pairs = readCornellPairs(linked?.notes).map((pair, index) => ({
    title: cornellPairTitle(pair, index),
    cue: line(pair.cue),
    note: line(pair.note),
  }));
  const notes = [
    line(original?.notes), line(original?.summary), ...pairs.map(pair => pair.note), line(linked?.summary),
  ];
  return { pairs, notes, cues: line(original?.cues) };
}

function findRelations({ pairs, notes, cues }) {
  const relations = pairs.filter(pair => (pair.cue || pair.title) && !pair.note).slice(0, 3)
    .map(pair => ({ label: pair.title, feedback: 'A pista ainda está sem nota. Escreva a resposta de memória e indique a relação com a ideia principal.' }));
  if (cues && !notes[0] && relations.length < 3) {
    relations.push({ label: 'Pistas das anotações originais', feedback: 'Transforme cada pista em uma resposta com a regra, um exemplo ou um contraste.' });
  }
  const seen = new Map();
  for (const note of notes.flatMap(passages)) {
    if (relations.length >= 3) break;
    const matches = new Map();
    for (const word of keywords(note)) {
      const earlier = seen.get(word);
      if (earlier && earlier !== note) matches.set(earlier, [...(matches.get(earlier) || []), word]);
      if (!earlier) seen.set(word, note);
    }
    const [earlier, shared] = [...matches].sort((a, b) => b[1].length - a[1].length)[0] || [];
    if (!shared || shared.length < 2) continue;
    relations.push({
      label: shared.slice(0, 3).join(' · '),
      excerpts: [earlier, note].map(text => text.length > 150 ? text.slice(0, 149) + '…' : text),
      feedback: 'Compare estes dois trechos. Escreva uma frase que diga se as ideias se explicam, se complementam ou se contrastam.',
    });
    shared.forEach(word => seen.delete(word));
  }
  if (!relations.length) relations.push({
    label: 'Ligação entre as ideias',
    feedback: 'Escolha duas ideias centrais do caderno e formule uma pergunta que exija explicar a ligação entre elas.',
  });
  return relations;
}

function findGaps(map, notes) {
  const byPassage = notes.flatMap(passages).map(passage => new Set(keywords(passage)));
  return map.filter(node => {
    const words = keywords(node.label);
    return words.length && !byPassage.some(wordsInNote =>
      words.filter(word => wordsInNote.has(word)).length >= Math.ceil(words.length * 0.75));
  }).slice(0, 5).map(node => ({
    label: node.label,
    parent: node.parent,
    question: 'Como você explicaria este ponto de memória e o relacionaria às suas notas?',
  }));
}

function checkSources(notes, sources) {
  const claims = [...new Set(notes.flatMap(passages))]
    .filter(passage => passage.length >= 25 && !passage.endsWith('?')).slice(0, 5);
  const documents = sources.map(source => ({
    text: compact(source.text),
    passages: [...new Set([...passages(compact(source.text)), ...passages(source.text)])]
      .map(quote => ({ quote, words: new Set(keywords(quote)) })),
  }));
  return claims.map(claim => {
    const literal = documents.findIndex(source => source.text.includes(claim));
    if (literal >= 0) return { claim, status: 'literal', quote: claim, sourceId: literal + 1 };

    const words = keywords(claim);
    let best = { claim, status: 'pending' };
    let bestScore = 0;
    documents.forEach((source, index) => {
      for (const { quote, words: referenceWords } of source.passages) {
        const matched = words.filter(word => referenceWords.has(word)).length;
        const score = matched / Math.max(words.length, referenceWords.size);
        if (matched >= 3 && score >= 0.35 && score > bestScore) {
          best = { claim, status: 'related', quote: quote.slice(0, 420), sourceId: index + 1 };
          bestScore = score;
        }
      }
    });
    return best;
  });
}

export function reviewCornellNotebook({ original, linked, map, sources }) {
  const notebook = readNotebook(original, linked);
  const { notes, cues, pairs } = notebook;
  if (!cues && !notes.some(Boolean) && !pairs.length) {
    throw new Error('Faça uma anotação no caderno antes de verificar.');
  }
  const length = [...notes, cues, ...pairs.flatMap(pair => [pair.title, pair.cue])].reduce((sum, text) => sum + text.length, 0);
  if (length > CORNELL_VERIFICATION_LIMITS.notebook) {
    throw new Error('O caderno excede o tamanho disponível para uma verificação.');
  }
  return {
    relations: findRelations(notebook),
    gaps: findGaps(map, notes),
    checks: checkSources(notes, sources),
  };
}
