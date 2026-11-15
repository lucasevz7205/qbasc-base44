const asText = (v, max = 12000) => String(v == null ? "" : v).trim().slice(0, max);

export const CEBRASPE_MECHANISMS = {
  F1: "Restrição ou generalização indevida",
  F2: "Troca de sujeito, órgão ou competência",
  F3: "Troca de conceito ou espécie normativa",
  F4: "Alteração de prazo, quórum ou número",
  F5: "Inversão entre regra geral e exceção",
  F6: "Troca de natureza privativa/comum ou vinculada/discricionária",
  F7: "Requisito ou etapa procedimental inexistente",
  F8: "Efeito jurídico ou alcance temporal trocado",
  F9: "Relação lógica invertida (cumulativo × alternativo)",
  F10: "Entendimento jurisprudencial ou regimental invertido",
  V1: "Paráfrase fiel com equivalência técnica",
  V2: "Aplicação em situação hipotética",
  V3: "Integração de sub-ramos conexos do mapa",
  V4: "Exceção legítima ou ressalva expressa",
};

export const CEBRASPE_METHODOLOGY_RULES = [
  "METODOLOGIA CEBRASPE (CERTO/ERRADO) — REGRAS DE ELABORAÇÃO:",
  "1. Cada item deve ser uma proposição afirmativa única, objetiva, impessoal e de alta densidade técnica (padrão Câmara dos Deputados · Analista Legislativo).",
  "2. PROIBIDO usar palavras absolutas artificiais ('sempre', 'nunca', 'jamais', 'exclusivamente' sem respaldo literal) que entreguem o gabarito por heurística superficial.",
  "3. Para itens ERRADOS (gabarito 'E'), aplique cirurgicamente um mecanismo F1 a F10:",
  "   - F1: Restrição/generalização indevida · F2: Troca de órgão/competência · F3: Troca de conceito/espécie · F4: Alteração de prazo/quórum · F5: Inversão regra/exceção · F6: Troca privativa/comum ou vinculada/discricionária · F7: Requisito inexistente · F8: Efeito jurídico trocado · F9: Conjunção/requisito cumulativo×alternativo · F10: Jurisprudência/regimento invertido.",
  "4. Para itens CERTOS (gabarito 'C'), aplique um mecanismo V1 a V4:",
  "   - V1: Paráfrase fiel sem cópia mecânica · V2: Situação prática aplicando a regra · V3: Conexão entre dois nós do mapa · V4: Exceção constitucional/regimental verdadeira.",
  "5. Equilibre o lote entre itens 'C' e 'E' e ancore cada item estritamente no nó selecionado (ou seus sub-ramos imediatos) e no conteúdo-fonte fornecido.",
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
    const discVerdict = asText(disc?.veredicto || "APROVADA", 30).toUpperCase();
    const falhasDetectadas = Array.isArray(disc?.falhasDetectadas)
      ? disc.falhasDetectadas.map((f) => asText(f, 300)).filter(Boolean)
      : [];
    const discCritique = asText(
      disc?.criticaAdversaria ||
        disc?.parecer ||
        "Item auditado em revisão cega pelo Discriminador GAN.",
      1200,
    );
    const rawScore = Number(disc?.scoreRealismo ?? disc?.score ?? 85);
    const ganScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 85;

    const validKeys = ["C", "E"];
    const blindKeyMatch = validKeys.includes(genKey) && genKey === discKey;

    let finalStatement = genStatement;
    let finalKey = validKeys.includes(genKey) ? genKey : "C";
    let finalCommentary = genCommentary;
    let statusConfronto = "aprovada_gan";

    const refined = disc?.itemRefinado && typeof disc.itemRefinado === "object" ? disc.itemRefinado : null;
    const refinedStatement = asText(refined?.enunciado, 1600);
    const refinedKey = asText(refined?.gabarito, 10).toUpperCase();
    const hasValidRefined = refined && refinedStatement.length >= 25 && validKeys.includes(refinedKey);

    if (!blindKeyMatch || discVerdict === "REFINAR" || discVerdict === "REJEITADA" || ganScore < 65) {
      if (hasValidRefined && discVerdict !== "REJEITADA") {
        finalStatement = refinedStatement;
        finalKey = refinedKey;
        finalCommentary = asText(refined.comentario || genCommentary, 2400);
        statusConfronto = "refinada_gan";
      } else if (!blindKeyMatch || discVerdict === "REJEITADA" || ganScore < 65) {
        statusConfronto = "divergencia_bloqueada";
      }
    }

    if (finalStatement.length < 20 || seenStatements.has(finalStatement.toLowerCase())) {
      return;
    }
    seenStatements.add(finalStatement.toLowerCase());

    let mecanismo = genMechanism;
    if (finalKey === "E") {
      if (!/^F([1-9]|10)$/.test(mecanismo)) mecanismo = "F3";
    } else if (!/^V[1-4]$/.test(mecanismo)) {
      mecanismo = "V1";
    }

    const mecanismoNome = CEBRASPE_MECHANISMS[mecanismo] || "Mecanismo CEBRASPE";

    questoes.push({
      id: `gan-${Date.now()}-${idx + 1}`,
      code: `GAN-${String(idx + 1).padStart(2, "0")}`,
      mapaNoId,
      nodeTitle,
      tema: asText(rawQ?.tema, 200) || nodeTitle,
      enunciado: finalStatement,
      gabarito: finalKey,
      mecanismo,
      mecanismoNome,
      trechoDecisivo,
      correcaoMinima,
      teseGerador: genThesis,
      comentario: finalCommentary,
      gabaritoGerador: validKeys.includes(genKey) ? genKey : finalKey,
      gabaritoDiscriminador: validKeys.includes(discKey) ? discKey : "?",
      blindKeyMatch,
      veredictoDiscriminador: discVerdict,
      falhasDetectadas,
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

  const totalScore = questoes.reduce((acc, q) => acc + q.ganScore, 0);
  const resumoConfronto = {
    totalGeradas: questoes.length,
    aprovadasDireto: questoes.filter((q) => q.statusConfronto === "aprovada_gan").length,
    refinadasGan: questoes.filter((q) => q.statusConfronto === "refinada_gan").length,
    bloqueadasDivergencia: bloqueadas.length,
    mediaScoreGan: Math.round(totalScore / questoes.length),
  };

  return {
    questoes,
    aprovadas,
    bloqueadas,
    resumoConfronto,
  };
}