import { ganStorageFailure, ganTransportFailure } from './gan-diagnostics.js';

// Fila do Arquiteto: gera, pelo confronto GAN que já existe (generateMindMapGanQuestions),
// as questões dos nós de mapa que ainda não têm cobertura. Nada é apresentado como prova real.
export const GAN_QUEUE_MIN_QUESTIONS = 2;
export const GAN_QUEUE_MAX_NODES_PER_RUN = 5;
const MIN_SUMMARY_CHARS = 40;

export function findNodesWithoutQuestions({ nodes = [], concepts = {}, questionBank = [], rootId, min = GAN_QUEUE_MIN_QUESTIONS }) {
  const hasChild = new Set(nodes.map((n) => n.parent).filter(Boolean));
  const count = new Map();
  for (const q of questionBank) {
    const key = q.node || q.mapaNoId;
    if (key) count.set(key, (count.get(key) || 0) + 1);
  }
  return nodes.filter(
    (n) =>
      n.id !== rootId &&
      !hasChild.has(n.id) &&
      String(concepts[n.id]?.summary || "").trim().length >= MIN_SUMMARY_CHARS &&
      (count.get(n.id) || 0) < min,
  );
}

export function buildGanSource({ chosen, nodes, concepts, node, subjectName, count = 4 }) {
  const byId = new Map(nodes.map(entry => [entry.id, entry]));
  const lineage = new Set([node.id]);
  const path = [node.label];
  for (let parent = byId.get(node.parent); parent && !lineage.has(parent.id); parent = byId.get(parent.parent)) {
    lineage.add(parent.id);
    path.unshift(parent.label);
  }
  const concept = concepts[node.id] || {};
  const sources = (Array.isArray(concept.sources) ? concept.sources : [])
    .map(source => typeof source === 'object' ? source?.label : source).filter(Boolean);
  const context = [
    concept.summary && `Resumo do nó (${node.label}): ${concept.summary}`,
    concept.example && `Exemplo do nó: ${concept.example}`,
    sources.length && `Fontes vinculadas: ${sources.join('; ')}`,
  ].filter(Boolean);
  const scopedNodes = [node, ...nodes.filter(n => n.id !== node.id && (lineage.has(n.id) || n.parent === node.id))];
  return {
    topicId: chosen.topicId,
    topicTitle: chosen.title.slice(0, 300),
    subjectName: (subjectName || chosen.subjectName || 'Matéria').slice(0, 200),
    targetNodeId: node.id,
    targetNodeLabel: node.label.slice(0, 240),
    targetNodePath: path.slice(-12).map(label => label.slice(0, 240)),
    count,
    mapa: {
      id: chosen.id,
      title: chosen.title.slice(0, 300),
      nodes: scopedNodes.slice(0, 100).map(n => ({
        id: n.id, parent: n.parent || null, label: n.label.slice(0, 240),
        summary: (concepts[n.id]?.summary || '').slice(0, 1500),
        example: (concepts[n.id]?.example || '').slice(0, 1000),
      })),
    },
    sourceContext: context.join('\n\n').slice(0, 7500),
  };
}

export function isApprovedGanQuestion(item) {
  return item?.statusConfronto === 'aprovada_gan' || item?.statusConfronto === 'refinada_gan';
}

export function buildGanQuestionRecord(item, { chosen, node, queue = false }) {
  const statusLabel = item.revisaoManual ? "Aprovada em revisão manual"
    : item.statusConfronto === "refinada_gan" ? "Refinada pela GAN" : "Aprovada no teste cego";
  const scoreLabel = Number.isFinite(item.ganScore) ? `Score GAN ${item.ganScore}%` : "";
  const judgments = item.gabaritoGerador && item.gabaritoDiscriminador
    ? ` · Gerador: ${item.gabaritoGerador} × Discriminador Cego: ${item.gabaritoDiscriminador}` : '';
  const trap = {
    name: `${item.mecanismo} — ${item.mecanismoNome} (${statusLabel}${judgments})`,
    description: [
      item.correcaoMinima && `Ponto decisivo / correção mínima: ${item.correcaoMinima}`,
      item.teseGerador && `Tese avaliada: ${item.teseGerador}`,
      item.criticaAdversaria && `Parecer do Discriminador Cego: ${item.criticaAdversaria}`,
    ].filter(Boolean).join(" · "),
  };
  const explanation = [
    item.comentario,
    item.criticaAdversaria ? `Auditoria cega${scoreLabel ? " · " + scoreLabel : ""}: ${item.criticaAdversaria}` : "",
  ].filter(Boolean).join("\n\n");
  const tags = [
    item.nodeTitle || node.label,
    `${item.mecanismo} · ${item.mecanismoNome}`,
    statusLabel,
    scoreLabel,
    item.provedorDiscriminador === 'gemini' && 'Geração e revisão pelo Gemini',
    item.provedorGerador === 'gpt' && 'Geração e revisão pelo GPT',
  ].filter(Boolean);
  return {
    id: item.id,
    code: item.code,
    ano: "GAN · CEBRASPE",
    cap: chosen.topicId,
    capNome: chosen.title,
    topico: chosen.topicId,
    tema: item.tema || node.label,
    enunciado: item.enunciado,
    gabarito: item.gabarito,
    comentario: explanation,
    ref: item.trechoDecisivo ? `Trecho decisivo: ${item.trechoDecisivo}` : `Conceito: ${item.nodeTitle || node.label}`,
    origem: queue ? 'GAN · Mapa Mental · fila do Arquiteto' : 'GAN · Mapa Mental',
    mapaNoId: item.mapaNoId || node.id,
    mecanismo: item.mecanismo,
    mecanismoNome: item.mecanismoNome,
    correcaoMinima: item.correcaoMinima,
    trechoDecisivo: item.trechoDecisivo,
    ...(item.revisaoManual ? { revisaoManual: item.revisaoManual, gabaritoGerador: item.gabaritoGerador,
      gabaritoDiscriminador: item.gabaritoDiscriminador, veredictoDiscriminador: item.veredictoDiscriminador } : {}),
    criticaAdversaria: item.criticaAdversaria,
    ...(item.fundamentacaoCega ? { fundamentacaoCega: item.fundamentacaoCega } : {}),
    statusConfronto: item.statusConfronto,
    ganScore: item.ganScore,
    ...(item.provedorGerador ? { provedorGerador: item.provedorGerador } : {}),
    ...(item.provedorDiscriminador ? { provedorDiscriminador: item.provedorDiscriminador } : {}),
    tags,
    trap,
  };
}

/**
 * Processa até maxNodes nós, um por vez. Quando há revisão administrativa, entrega todos os candidatos.
 * No fluxo automático, só contabiliza itens aprovados ou refinados cuja gravação foi confirmada.
 * Não altera respostas, status, SRS nem itens existentes.
 */
export async function runGanQueue({ chosen, pending, generate, save, onReview, shouldStop, onProgress, maxNodes = GAN_QUEUE_MAX_NODES_PER_RUN }) {
  const todo = pending.slice(0, maxNodes);
  const out = { processados: 0, aprovadas: 0, bloqueadas: 0, erros: 0, restantes: Math.max(0, pending.length - todo.length) };
  let errosSeguidos = 0;
  for (const node of todo) {
    if (shouldStop && shouldStop()) { out.restantes += todo.length - out.processados; break; }
    onProgress && onProgress({ atual: out.processados + 1, total: todo.length, no: node.label });
    const falha = await processGanNode({ node, chosen, generate, save, onReview, out });
    if (falha) {
      (out.falhas ??= []).push({ no: node.label, ...falha });
      out.erros += 1;
      out.restantes += 1;
      errosSeguidos += 1;
    } else {
      errosSeguidos = 0;
    }
    out.processados += 1;
    if (['gemini-http-503', 'gemini-limite'].includes(falha?.codigo) || errosSeguidos >= 2) {
      out.restantes += todo.length - out.processados;
      break;
    }
  }
  return out;
}

async function processGanNode({ node, chosen, generate, save, onReview, out }) {
  let res;
  try {
    res = await generate(node);
  } catch {
    return ganTransportFailure;
  }
  if (res?.falha) return res.falha;
  if (!Array.isArray(res?.aprovadas) || !Array.isArray(res?.bloqueadas)) return ganTransportFailure;

  const aprovadas = res.aprovadas.filter(isApprovedGanQuestion);
  out.bloqueadas += res.bloqueadas.length;
  if (onReview) {
    const count = Array.isArray(res.questoes) ? res.questoes.length : aprovadas.length + res.bloqueadas.length;
    if (!count) return ganTransportFailure;
    onReview(node, res);
    const saved = res.registros?.length || 0;
    out.aprovadas += saved;
    out.geradas = (out.geradas || 0) + count;
    out.paraRevisao = (out.paraRevisao || 0) + count - saved;
    out.falhasGravacao = (out.falhasGravacao || 0) + (res.falhasGravacao || 0);
    return null;
  }
  const persisted = new Set(Array.isArray(res.registros) ? res.registros.map(r => r?.id) : []);
  let failed = false;
  for (const item of aprovadas) {
    try {
      if (save) {
        const record = buildGanQuestionRecord(item, { chosen, node, queue: true });
        await save('questoes', record.id, record);
      } else if (!persisted.has(item.id)) {
        failed = true;
        continue;
      }
      out.aprovadas += 1;
    } catch {
      failed = true;
    }
  }
  return failed ? ganStorageFailure : null;
}

export function centralGanRound(nodes, root, questions) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const candidates = nodes.filter(n => n.id !== root);
  const branches = new Map(), counts = new Map(), planned = new Map();
  for (const n of candidates) {
    let branch = n;
    while (branch.parent !== root && byId.has(branch.parent)) branch = byId.get(branch.parent);
    branches.set(n.id, branch.id);
  }
  const totals = new Map();
  function increment(id) {
    counts.set(id, (counts.get(id) || 0) + 1);
    const branch = branches.get(id);
    totals.set(branch, (totals.get(branch) || 0) + 1);
  }
  for (const q of questions) {
    const id = q.node || q.mapaNoId;
    if (branches.has(id)) increment(id);
  }
  for (let i = 0; i < 20; i++) {
    candidates.sort((a,b) => (totals.get(branches.get(a.id)) || 0) - (totals.get(branches.get(b.id)) || 0)
      || (counts.get(a.id) || 0) - (counts.get(b.id) || 0));
    const target = candidates[0] || byId.get(root);
    planned.set(target, (planned.get(target) || 0) + 1);
    increment(target.id);
  }
  return [...planned].flatMap(([target,total]) => Array.from({length: Math.ceil(total / 4)}, (_,i) => ({target,count:Math.min(4,total-i*4)})));
}
