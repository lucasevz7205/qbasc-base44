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

function pathOf(node, nodes) {
  const path = [];
  let p = nodes.find((n) => n.id === node.parent);
  while (p) {
    path.unshift(p.label);
    p = nodes.find((n) => n.id === p.parent);
  }
  return [...path, node.label];
}

function buildRecord(item, { chosen, node }) {
  const statusLabel = item.statusConfronto === "refinada_gan" ? "Refinada pela GAN" : "Aprovada no teste cego";
  const trap = {
    name: `${item.mecanismo} — ${item.mecanismoNome} (${statusLabel} · Gerador: ${item.gabaritoGerador} × Discriminador Cego: ${item.gabaritoDiscriminador})`,
    description: [
      item.correcaoMinima && `Ponto decisivo / correção mínima: ${item.correcaoMinima}`,
      item.teseGerador && `Tese avaliada: ${item.teseGerador}`,
      item.criticaAdversaria && `Parecer do Discriminador Cego: ${item.criticaAdversaria}`,
    ].filter(Boolean).join(" · "),
  };
  const explanation = [
    item.comentario,
    item.criticaAdversaria ? `Auditoria Cega (Score GAN ${item.ganScore}%): ${item.criticaAdversaria}` : "",
  ].filter(Boolean).join("\n\n");
  const tags = [item.nodeTitle || node.label, `${item.mecanismo} · ${item.mecanismoNome}`, statusLabel, `Score GAN ${item.ganScore}%`].filter(Boolean);
  const id = `${item.id}-${String(node.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)}`;
  return {
    id,
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
    origem: "GAN · Mapa Mental · fila do Arquiteto",
    mapaNoId: item.mapaNoId || node.id,
    mecanismo: item.mecanismo,
    mecanismoNome: item.mecanismoNome,
    correcaoMinima: item.correcaoMinima,
    criticaAdversaria: item.criticaAdversaria,
    statusConfronto: item.statusConfronto,
    ganScore: item.ganScore,
    tags,
    trap,
  };
}

/**
 * Processa até maxNodes nós, um por vez. Só grava itens aprovados ou refinados pelo confronto.
 * Bloqueados não são gravados. Para após 2 erros seguidos para não gastar crédito à toa.
 * Não altera respostas, status, SRS nem itens existentes.
 */
export async function runGanQueue({ chosen, nodes, concepts, subjectName, pending, generate, save, shouldStop, onProgress, maxNodes = GAN_QUEUE_MAX_NODES_PER_RUN }) {
  const mapa = {
    id: chosen.id,
    title: chosen.title,
    nodes: nodes.slice(0, 100).map((n) => ({
      id: n.id,
      parent: n.parent || null,
      label: n.label,
      summary: concepts[n.id]?.summary || "",
      example: concepts[n.id]?.example || "",
    })),
  };
  const todo = pending.slice(0, maxNodes);
  const out = { processados: 0, aprovadas: 0, bloqueadas: 0, erros: 0, restantes: Math.max(0, pending.length - todo.length) };
  let errosSeguidos = 0;
  for (const node of todo) {
    if (shouldStop && shouldStop()) { out.restantes += todo.length - out.processados; break; }
    onProgress && onProgress({ atual: out.processados + 1, total: todo.length, no: node.label });
    try {
      const c = concepts[node.id] || {};
      const sourceParts = [
        c.summary && `Resumo do nó (${node.label}): ${c.summary}`,
        c.example && `Exemplo do nó: ${c.example}`,
        Array.isArray(c.sources) && c.sources.length
          ? `Fontes vinculadas: ${c.sources.map((s) => (typeof s === "object" ? s.label : s)).join("; ")}`
          : "",
      ].filter(Boolean);
      const res = await generate({
        data: {
          topicId: chosen.topicId || chosen.id,
          topicTitle: chosen.title,
          subjectName: subjectName || "Câmara dos Deputados",
          targetNodeId: node.id,
          targetNodeLabel: node.label,
          targetNodePath: pathOf(node, nodes),
          count: 4,
          mapa,
          sourceContext: sourceParts.join("\n\n").slice(0, 7500),
        },
      });
      const aprovadas = Array.isArray(res?.aprovadas) ? res.aprovadas : [];
      out.bloqueadas += Array.isArray(res?.bloqueadas) ? res.bloqueadas.length : 0;
      for (const item of aprovadas) {
        try {
          await save("questoes", ...(() => { const r = buildRecord(item, { chosen, node }); return [r.id, r]; })());
          out.aprovadas += 1;
        } catch {
          out.erros += 1;
        }
      }
      errosSeguidos = 0;
    } catch {
      out.erros += 1;
      errosSeguidos += 1;
    }
    out.processados += 1;
    if (errosSeguidos >= 2) { out.restantes += todo.length - out.processados; break; }
  }
  return out;
}
