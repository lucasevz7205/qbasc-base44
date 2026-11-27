// Cota de avaliação por nível do mapa mental.
// Níveis: Núcleo (raiz) > Tópico (filhos da raiz) > Ramo (nó com filhos, abaixo de tópico) > Subramo (folha).
// A cota é medida em respostas distintas na SUBÁRVORE do nó: uma resposta vale para todos os ancestrais,
// então o estudante não repete o detalhe só para fechar um nível acima.
// Densidade decrescente por subramo (L): ramo 2, tópico 1,2, núcleo 0,5, cada uma com piso e teto.

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const QUOTA_RULES = Object.freeze({
  nucleo: Object.freeze({ density: 0.5, min: 30, max: 40 }),
  topico: Object.freeze({ density: 1.2, min: 6, max: 15 }),
  ramo: Object.freeze({ density: 2, min: 4, max: 8 }),
  subramo: Object.freeze({ density: 1, min: 1, max: 1 }),
});

// Nenhum filho pode contribuir com mais que esta fração da cota (só vale com 3 ou mais filhos).
export const CHILD_SHARE_CAP = 0.4;
// Fração mínima de filhos com ao menos uma resposta para o nó poder ser validado.
export const MIN_CHILD_COVERAGE = 0.5;
// No Núcleo, pelo menos esta fração das respostas deve vir de questões C/E.
export const NUCLEO_MIN_QUESTION_SHARE = 0.5;

export function nodeQuota(kind, leaves) {
  const rule = QUOTA_RULES[kind] || QUOTA_RULES.subramo;
  const count = Math.max(1, Math.trunc(Number(leaves) || 1));
  return clamp(Math.ceil(rule.density * count), rule.min, rule.max);
}

// nodes: [{ id, parent }]. Devolve Map(id -> { kind, leaves, quota, children }).
export function classifyNodes(nodes, rootId) {
  const children = new Map(nodes.map(node => [node.id, []]));
  for (const node of nodes) children.get(node.parent)?.push(node.id);
  const info = new Map();
  const visiting = new Set();
  function visit(id, depth) {
    if (info.has(id) || visiting.has(id)) return info.get(id)?.leaves || 1;
    visiting.add(id);
    const kids = children.get(id) || [];
    const leaves = kids.length ? kids.reduce((sum, kid) => sum + visit(kid, depth + 1), 0) : 1;
    const kind = !kids.length && depth > 0 ? 'subramo' : depth === 0 ? 'nucleo' : depth === 1 ? 'topico' : 'ramo';
    info.set(id, { kind, leaves, quota: nodeQuota(kind, leaves), children: kids });
    visiting.delete(id);
    return leaves;
  }
  if (children.has(rootId)) visit(rootId, 0);
  return info;
}

// Quantas respostas de cada filho entram na cota (teto de 40% da cota por filho quando há 3+ filhos).
export function cappedChildContribution(evaluated, quota, childCount) {
  const count = Math.max(0, Math.trunc(Number(evaluated) || 0));
  return childCount >= 3 ? Math.min(count, Math.ceil(CHILD_SHARE_CAP * quota)) : count;
}

// Mínimo de questões exigido: 1 em ramo e tópico; metade da cota no Núcleo; nenhum no subramo (cartão ou questão).
export function requiredQuestionsFor(kind, quota) {
  if (kind === 'nucleo') return Math.ceil(NUCLEO_MIN_QUESTION_SHARE * quota);
  return kind === 'subramo' ? 0 : 1;
}
export function requiredFlashcardsFor(kind) {
  return kind === 'ramo' || kind === 'topico' ? 1 : 0;
}

export function enoughChildCoverage(children, coveredChildren) {
  return !children || children === 0 || coveredChildren / children >= MIN_CHILD_COVERAGE;
}

// Sorteio estratificado para avaliar um nó: itens da subárvore, 1 por filho antes de repetir,
// resto por peso (nº de subramos), prioridade para errados e não vistos, teto de 40% por filho (3+ filhos).
// items: [{ id, node, kind: 'questao'|'cartao', priority }] — priority menor = mais urgente (0 errado, 1 não visto, 2 visto).
export function drawNodeAssessment(nodes, nodeId, items, { random = Math.random, limit } = {}) {
  const ids = new Set(nodes.map(node => node.id));
  const mapRoot = nodes.find(node => !ids.has(node.parent))?.id;
  const info = classifyNodes(nodes, mapRoot);
  const root = info.get(nodeId);
  if (!root) return [];
  const quota = Math.min(root.quota, limit ?? root.quota);
  const owner = new Map(); // node -> filho direto de nodeId que o contém
  (function mark(id, branch) {
    owner.set(id, branch);
    for (const kid of info.get(id)?.children || []) mark(kid, branch);
  })(nodeId, nodeId);
  for (const kid of root.children) (function mark(id) { owner.set(id, kid); for (const k of info.get(id)?.children || []) mark(k); })(kid);
  const buckets = new Map();
  for (const item of items) {
    const branch = owner.get(item.node);
    if (!branch) continue;
    if (!buckets.has(branch)) buckets.set(branch, []);
    buckets.get(branch).push(item);
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2) || random() - 0.5);
  }
  const branches = [...buckets.keys()];
  const cap = root.children.length >= 3 ? Math.ceil(CHILD_SHARE_CAP * quota) : quota;
  const weight = id => info.get(id)?.leaves || 1;
  const taken = new Map(branches.map(id => [id, 0]));
  const picked = [];
  const take = id => {
    const list = buckets.get(id);
    const item = list[taken.get(id)];
    taken.set(id, taken.get(id) + 1);
    picked.push(item);
  };
  const available = id => taken.get(id) < buckets.get(id).length && taken.get(id) < cap;
  // 1ª passada: um por filho, do mais pesado ao mais leve, até a cota.
  for (const id of [...branches].sort((a, b) => weight(b) - weight(a))) {
    if (picked.length >= quota) break;
    if (available(id)) take(id);
  }
  // 2ª passada: o resto pelo menor (retirados / peso).
  while (picked.length < quota) {
    const open = branches.filter(available);
    if (!open.length) break;
    open.sort((a, b) => taken.get(a) / weight(a) - taken.get(b) / weight(b));
    take(open[0]);
  }
  return picked;
}

// Amostra de avaliação de um nó: divide a cota entre questões (metade, no mínimo o exigido pelo nível)
// e flashcards; se um dos lados não tem itens, o outro completa.
export function buildNodeAssessment(nodes, nodeId, { questions = [], flashcards = [], random = Math.random } = {}) {
  const ids = new Set(nodes.map(node => node.id));
  const mapRoot = nodes.find(node => !ids.has(node.parent))?.id;
  const shape = classifyNodes(nodes, mapRoot).get(nodeId);
  if (!shape) return { quota: 0, questionIds: [], cardIds: [] };
  const quota = shape.quota;
  const wantQuestions = Math.min(quota, Math.max(requiredQuestionsFor(shape.kind, quota), Math.ceil(quota / 2)));
  const asItems = (list, kind) => list.map(item => ({ id: item.id, node: item.node, kind, priority: item.priority }));
  let questionPick = drawNodeAssessment(nodes, nodeId, asItems(questions, 'questao'), { random, limit: wantQuestions });
  const cardPick = drawNodeAssessment(nodes, nodeId, asItems(flashcards, 'cartao'), { random, limit: quota - questionPick.length });
  if (questionPick.length + cardPick.length < quota) {
    const extra = drawNodeAssessment(nodes, nodeId, asItems(questions, 'questao').filter(item => !questionPick.some(p => p.id === item.id)), { random, limit: quota - questionPick.length - cardPick.length });
    questionPick = [...questionPick, ...extra];
  }
  return { quota, questionIds: questionPick.map(item => item.id), cardIds: cardPick.map(item => item.id) };
}
