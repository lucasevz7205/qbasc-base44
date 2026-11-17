const asText = (v, max = 12000) => String(v == null ? "" : v).trim().slice(0, max);

import { CEBRASPE_V1_TAXONOMY, CEBRASPE_V1_GENERATION_RULES, mechanismForKey } from './cebraspe-v1-taxonomy.js';

export const CEBRASPE_MECHANISMS = Object.freeze(Object.fromEntries(
  Object.entries(CEBRASPE_V1_TAXONOMY).map(([code, data]) => [code, data.n])
));

export const CEBRASPE_METHODOLOGY_RULES = [
  "METODOLOGIA CEBRASPE (CERTO/ERRADO) — TAXONOMIA QB V1:",
  "Cada item apresenta uma única regra, verificável nos dados; evite palavras restritivas artificiais que entreguem a resposta por heurística.",
  "Equilibre itens C/E somente quando houver fonte suficiente, e associe ao nó exato do mapa.",
  CEBRASPE_V1_GENERATION_RULES,
].join("\n");

export function enumerateMapNodes(map = {}) {
  const rawNodes = Array.isArray(map?.nodes) ? map.nodes : [];
  const ids = new Set();
  const byId = new Map();

  for (const n of rawNodes) {
    if (!n || !n.id) continue;
    const id = asText(n.id, 160);
    if (!id || ids.has(id)) continue;
    ids.add(id);
    byId.set(id, {
      id,
      parent: n.parent ? asText(n.parent, 160) : null,
      label: asText(n.label || n.t || n.title, 220) || id,
      summary: asText(n.summary || n.x || "", 1500),
      example: asText(n.example || n.ex || "", 1000),
    });
  }

  return { nodes: Array.from(byId.values()), ids, byId };
}

export function normalizeGanConfrontation(generatorItems, discriminatorItems, map, options = {}) {
  const { nodes, ids, byId } = enumerateMapNodes(map);
  const preferredTargetId = asText(options.targetNodeId, 160);
  const fallbackNodeId =
    (preferredTargetId && ids.has(preferredTargetId) ? preferredTargetId : null) ||
    nodes[0]?.id ||
    "root";

  const genList = Array.isArray(generatorItems) ? generatorItems : [];
  if (!genList.length) {
    throw new Error("O Agente Gerador não produziu questões válidas a partir do nó selecionado.");
  }

  const discList = Array.isArray(discriminatorItems) ? discriminatorItems : [];
  const discByIndex = new Map();
  discList.forEach((d, idx) => {
    const key = Number.isInteger(Number(d?.index)) ? Number(d.index) : idx;
    discByIndex.set(key, d);
  });

  const seenStatements = new Set();
  const questoes = [];

  genList.slice(0, 8).forEach((rawQ, idx) => {
    const disc = discByIndex.get(idx) || discList[idx] || {};
    const requestedNodeId = asText(rawQ?.mapaNoId, 160);
    const mapaNoId = ids.has(requestedNodeId) ? requestedNodeId : fallbackNodeId;
    const nodeObj = byId.get(mapaNoId);
    const nodeTitle = nodeObj?.label || asText(options.targetNodeLabel, 200) || "Conceito do Mapa";

    const genStatement = asText(rawQ?.enunciado, 1600);
    const genKey = asText(rawQ?.gabarito, 10).toUpperCase();
    const genCommentary = asText(rawQ?.comentario || rawQ?.justificativa, 2400);
    const genMechanism = asText(rawQ?.mecanismo, 12).toUpperCase();
    const genThesis = asText(rawQ?.teseGerador || rawQ?.comentario, 800);
    const trechoDecisivo = asText(rawQ?.trechoDecisivo, 400);
    const correcaoMinima = asText(rawQ?.correcaoMinima, 600);

    const discKey = asText(disc?.gabaritoDiscriminador || disc?.gabaritoCalculado, 16).toUpperCase();
    const discVerdict = asText(disc?.veredicto, 30).toUpperCase();
    const falhasDetectadas = Array.isArray(disc?.falhasDetectadas)
      ? disc.falhasDetectadas.map((f) => asText(f, 300)).filter(Boolean)
      : [];
    const discCritique = asText(
      disc?.criticaAdversaria ||
        disc?.parecer,
      1200,
    );
    const rawScore = disc?.scoreRealismo ?? disc?.score;
    const ganScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : null;
    const motivosConfronto = [];

    const validKeys = ["C", "E"];
    const blindKeyMatch = validKeys.includes(genKey) && genKey === discKey;

    let finalStatement = genStatement;
    let finalKey = validKeys.includes(genKey) ? genKey : "";
    let finalCommentary = genCommentary;
    let statusConfronto = "aprovada_gan";

    const refined = disc?.itemRefinado && typeof disc.itemRefinado === "object" ? disc.itemRefinado : null;
    const refinedStatement = asText(refined?.enunciado, 1600);
    const refinedKey = asText(refined?.gabarito, 10).toUpperCase();
    const hasValidRefined = refined && refinedStatement.length >= 25 && validKeys.includes(refinedKey);

    if (!blindKeyMatch) motivosConfronto.push("Os gabaritos do gerador e do julgamento cego divergem ou estão incompletos.");
    if (discVerdict === "REJEITADA") motivosConfronto.push("O julgamento cego recomendou rejeitar o item.");
    if (ganScore === null) motivosConfronto.push("O julgamento cego não retornou um escore válido.");
    else if (ganScore < 65) motivosConfronto.push("Escore de realismo abaixo do mínimo de 65.");
    if (!["APROVADA", "REFINAR", "REJEITADA"].includes(discVerdict)) motivosConfronto.push("O veredicto da IA está ausente ou é inválido.");
    if (discVerdict === "REFINAR" && !hasValidRefined) motivosConfronto.push("A IA sugeriu refinar o item, mas não entregou uma versão utilizável.");

    if (motivosConfronto.length || discVerdict === "REFINAR") {
      if (hasValidRefined && ["APROVADA", "REFINAR"].includes(discVerdict) && ganScore !== null) {
        finalStatement = refinedStatement;
        finalKey = refinedKey;
        finalCommentary = asText(refined.comentario || genCommentary, 2400);
        statusConfronto = "refinada_gan";
      } else {
        statusConfronto = "divergencia_bloqueada";
      }
    }

    const statementKey = finalStatement.normalize("NFC").replace(/\s+/g, " ").toLowerCase();
    if (statementKey.length < 20) {
      statusConfronto = "divergencia_bloqueada";
      motivosConfronto.push("O enunciado está ausente ou incompleto.");
    } else if (seenStatements.has(statementKey)) {
      statusConfronto = "divergencia_bloqueada";
      motivosConfronto.push("Enunciado repetido neste lote.");
    }
    if (statementKey) seenStatements.add(statementKey);

    // Taxonomia V1: não inventar um código quando o gerador divergir do gabarito.
    const mecanismo = mechanismForKey(genMechanism, finalKey) ? genMechanism : "";
    if (!mecanismo) {
      statusConfronto = "divergencia_bloqueada";
      motivosConfronto.push("Mecanismo F/V incompatível com o gabarito segundo a taxonomia QB V1.");
    }
    const mecanismoNome = CEBRASPE_MECHANISMS[mecanismo] || "Não classificado";

    questoes.push({
      id: `gan-${Date.now()}-${idx + 1}`,
      code: `GAN-${String(idx + 1).padStart(2, "0")}`,
      mapaNoId,
      nodeTitle,
      tema: asText(rawQ?.tema, 200) || nodeTitle,
      enunciado: finalStatement,
      ...(finalStatement !== genStatement ? { enunciadoOriginal: genStatement } : {}),
      gabarito: finalKey,
      mecanismo,
      mecanismoNome,
      trechoDecisivo,
      correcaoMinima,
      teseGerador: genThesis,
      comentario: finalCommentary,
      gabaritoGerador: validKeys.includes(genKey) ? genKey : "?",
      gabaritoDiscriminador: validKeys.includes(discKey) ? discKey : "?",
      blindKeyMatch,
      veredictoDiscriminador: discVerdict,
      falhasDetectadas,
      motivosConfronto,
      criticaAdversaria: discCritique,
      ganScore,
      statusConfronto,
      aprovadaParaSessao: statusConfronto === "aprovada_gan" || statusConfronto === "refinada_gan",
    });
  });

  if (!questoes.length) {
    throw new Error("Nenhuma questão superou a normalização do confronto GAN.");
  }

  const aprovadas = questoes.filter((q) => q.aprovadaParaSessao);
  const bloqueadas = questoes.filter((q) => !q.aprovadaParaSessao);

  const scores = questoes.map(q => q.ganScore).filter(Number.isFinite);
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const resumoConfronto = {
    totalGeradas: questoes.length,
    aprovadasDireto: questoes.filter((q) => q.statusConfronto === "aprovada_gan").length,
    refinadasGan: questoes.filter((q) => q.statusConfronto === "refinada_gan").length,
    bloqueadasDivergencia: bloqueadas.length,
    mediaScoreGan: scores.length ? Math.round(totalScore / scores.length) : null,
  };

  return {
    questoes,
    aprovadas,
    bloqueadas,
    resumoConfronto,
  };
}