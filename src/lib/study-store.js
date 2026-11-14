import { base44 } from "../api/base44Client.js";

export const SRS_INTERVALS = [1, 3, 7, 15, 30];
export const RETENTION_DAYS = 7;

export function todayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(dayStr, days) {
  const [y, m, d] = String(dayStr).split("-").map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + (days || 0));
  return dt.toISOString().slice(0, 10);
}

export function diffDays(startDay, endDay) {
  const [y1, m1, d1] = String(startDay).split("-").map(Number);
  const [y2, m2, d2] = String(endDay).split("-").map(Number);
  const a = Date.UTC(y1 || 2026, (m1 || 1) - 1, d1 || 1);
  const b = Date.UTC(y2 || 2026, (m2 || 1) - 1, d2 || 1);
  return Math.round((b - a) / 86400000);
}

async function fetchAll(entity, filter, order = "created_date") {
  const pageSize = 500;
  const rows = [];
  for (let skip = 0; skip < 50000; skip += pageSize) {
    const page = await entity.filter(filter, order, pageSize, skip);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
  return rows;
}

export async function listClaudeCollection(collection) {
  const rows = await fetchAll(base44.entities.ClaudeDocument, { collection });
  const hasParts = rows.some((row) => {
    try {
      return Boolean(JSON.parse(row.payload_json)?._claudeParts);
    } catch {
      return false;
    }
  });

  if (!hasParts) {
    return rows.map((row) => ({ ...JSON.parse(row.payload_json), id: row.legacy_id }));
  }

  const fragments = await fetchAll(
    base44.entities.ClaudeDocumentPart,
    { collection },
    "part"
  );
  const byId = new Map();
  for (const part of fragments) {
    if (!byId.has(part.legacy_id)) byId.set(part.legacy_id, []);
    byId.get(part.legacy_id).push(part);
  }

  return rows.map((row) => {
    const value = JSON.parse(row.payload_json);
    if (!value._claudeParts) return { ...value, id: row.legacy_id };
    const pieces = (byId.get(row.legacy_id) || [])
      .sort((a, b) => a.part - b.part)
      .slice(0, value._claudeParts);
    const fullJson = pieces.map((p) => p.payload_chunk).join("");
    return { ...JSON.parse(fullJson), id: row.legacy_id };
  });
}

export async function loadStudyDataFromBase44() {
  const [edital, questoes, respostas, revisao, diario, pegadinhas] = await Promise.all([
    listClaudeCollection("edital"),
    listClaudeCollection("questoes"),
    listClaudeCollection("respostas"),
    listClaudeCollection("revisao"),
    listClaudeCollection("diario"),
    listClaudeCollection("pegadinhas"),
  ]);
  return { edital, questoes, respostas, revisao, diario, pegadinhas };
}

export function buildAnswerRecord({
  question,
  prev = {},
  marked,
  confidence = null,
  now = new Date(),
}) {
  const L = marked === "C" || marked === "E" ? marked : "B";
  const isBlank = L === "B";
  const acertou = !isBlank && L === question.gabarito;
  const conf = isBlank ? null : confidence || null;
  const nowIso = now.toISOString();
  const d = todayKey(now);

  const r = {
    ...prev,
    qid: question.id,
    cap: question.cap || prev.cap || "",
    ordem: question.ordem || prev.ordem || 0,
    ultimaMarcada: L,
    atualizadoEm: nowIso,
    tentativas: (prev.tentativas || 0) + 1,
    conf,
  };

  const prevHist = Array.isArray(prev.hist) ? prev.hist.slice(-7) : [];
  prevHist.push({ m: L, ok: acertou, em: nowIso, c: conf });
  r.hist = prevHist;
  r.primeiraEm =
    prev.primeiraEm ||
    (Array.isArray(prev.hist) && prev.hist[0] && prev.hist[0].em) ||
    nowIso;

  if (
    acertou &&
    conf !== 1 &&
    !prev.retidoEm &&
    diffDays(String(r.primeiraEm).slice(0, 10), d) >= RETENTION_DAYS
  ) {
    r.retidoEm = nowIso;
  }

  const nPrev = prev.tentativas
    ? Math.min(Math.max(Number(prev.nivel) || 0, 0), SRS_INTERVALS.length - 1)
    : 0;

  if (acertou && conf === 1) {
    r.acertos = (prev.acertos || 0) + 1;
    if (!prev.noCaderno) {
      r.noCaderno = true;
      r.entrouEm = nowIso;
      r.motivo = "chute";
      r.acertosSeguidos = 0;
    }
    r.nivel = 0;
  } else if (acertou) {
    r.acertos = (prev.acertos || 0) + 1;
    r.acertosSeguidos = (prev.acertosSeguidos || 0) + 1;
    if (prev.noCaderno && r.acertosSeguidos >= 2) {
      r.noCaderno = false;
      r.saiuEm = nowIso;
      r.motivoSaida = "dois acertos seguidos";
    }
    r.nivel =
      conf === 3
        ? Math.min(Math.max(nPrev + 1, 2), SRS_INTERVALS.length - 1)
        : Math.max(nPrev, 1);
    if (r.noCaderno) r.nivel = Math.min(r.nivel, 1);
  } else {
    if (isBlank) r.brancos = (prev.brancos || 0) + 1;
    else r.erros = (prev.erros || 0) + 1;
    r.acertosSeguidos = 0;
    if (!prev.noCaderno) r.entrouEm = nowIso;
    r.noCaderno = true;
    r.motivo =
      isBlank && !(prev.noCaderno && prev.motivo === "erro") ? "branco" : "erro";
    r.nivel = 0;
  }

  r.proxRevisao = addDays(d, SRS_INTERVALS[r.nivel]);
  r.calib =
    isBlank || !conf
      ? null
      : !acertou && conf === 3
        ? "excesso"
        : acertou && conf === 1
          ? "sub"
          : "ok";

  return { record: r, acertou, isBlank };
}

export async function saveAnswerToBase44({
  question,
  prev = {},
  marked,
  confidence = null,
  isDemo = false,
}) {
  const result = buildAnswerRecord({ question, prev, marked, confidence });
  if (isDemo) {
    return { ...result, persisted: false };
  }

  const payload = JSON.stringify(result.record);
  const existing = await base44.entities.ClaudeDocument.filter({
    collection: "respostas",
    legacy_id: question.id,
  });

  if (existing.length > 0) {
    await base44.entities.ClaudeDocument.update(existing[0].id, {
      payload_json: payload,
      source: "quebrando-a-banca-v2",
    });
  } else {
    await base44.entities.ClaudeDocument.create({
      collection: "respostas",
      legacy_id: question.id,
      payload_json: payload,
      source: "quebrando-a-banca-v2",
    });
  }

  return { ...result, persisted: true };
}

export function extractFlashcardsFromRevisao(revisao = []) {
  const cards = [];
  for (const doc of revisao) {
    const id = String(doc.id || "");
    const list = Array.isArray(doc.cartoes)
      ? doc.cartoes
      : Array.isArray(doc.cards)
        ? doc.cards
        : id.endsWith(".cartoes") && Array.isArray(doc.itens)
          ? doc.itens
          : null;
    if (!list) continue;
    for (let i = 0; i < list.length; i += 1) {
      const c = list[i];
      if (!c) continue;
      cards.push({
        id: c.id || `${id}::${i}`,
        topicId: doc.topico || id.replace(/\.cartoes$/, ""),
        front: c.frente || c.front || c.pergunta || "",
        back: c.verso || c.back || c.resposta || "",
        reference: c.ref || c.fonte || doc.materia || "",
      });
    }
  }
  return cards.filter((c) => c.front && c.back);
}

export function extractMindMapsFromRevisao(revisao = []) {
  const maps = [];
  for (const doc of revisao) {
    const id = String(doc.id || "");
    const root = doc.mapa || doc.root || (doc.ramos || doc.nos || doc.children ? doc : null);
    if (!root || id.endsWith(".cartoes")) continue;
    const title = doc.titulo || root.titulo || root.label || root.t || id.replace(/\.mapa$/, "");
    const branches = Array.isArray(root.ramos)
      ? root.ramos
      : Array.isArray(root.children)
        ? root.children
        : Array.isArray(root.nos)
          ? root.nos
          : [];
    if (!branches.length && !root.x && !root.explicacao) continue;
    maps.push({
      id,
      title,
      materia: doc.materia || "",
      explanation: root.x || root.explicacao || "",
      branches,
    });
  }
  return maps;
}

export function computeDashboardMetrics(
  { edital = [], questoes = [], respostas = [], revisao = [], diario = [], pegadinhas = [] },
  today = todayKey()
) {
  const respMap = new Map(respostas.map((r) => [r.qid || r.id, r]));
  const regularQuestions = questoes.filter(
    (q) => !String(q.cap || "").startsWith("SIM-")
  );

  let answeredCount = 0;
  let correctCount = 0;
  let dueReviews = 0;
  let notebookCount = 0;
  let retainedCount = 0;
  let pendingRetentionCount = 0;
  let certTotal = 0;
  let certCorrect = 0;

  const retainedItems = [];
  const notebookItems = [];

  for (const q of regularQuestions) {
    const r = respMap.get(q.id);
    if (!r || !r.tentativas) continue;
    answeredCount += 1;

    const isLatestCorrect = r.ultimaMarcada && r.ultimaMarcada === q.gabarito;
    const isCleanCorrect =
      (r.erros || 0) === 0 && (r.brancos || 0) === 0 && (r.acertos || 0) > 0;
    if (isCleanCorrect || isLatestCorrect) correctCount += 1;

    if (r.proxRevisao && r.proxRevisao <= today) dueReviews += 1;
    if (r.noCaderno) {
      notebookCount += 1;
      notebookItems.push({ question: q, response: r });
    }
    if (r.retidoEm) {
      retainedCount += 1;
      retainedItems.push({ question: q, response: r });
    } else if (isLatestCorrect && r.conf !== 1) {
      pendingRetentionCount += 1;
    }
    if (r.conf === 3) {
      certTotal += 1;
      if (isLatestCorrect) certCorrect += 1;
    }
  }

  const totalEdital = edital.length;
  const doneEdital = edital.filter((t) =>
    ["dominado", "concluido", "revisado"].includes(String(t.status || "").toLowerCase())
  ).length;
  const editalCoveragePercent = totalEdital ? Math.round((doneEdital / totalEdital) * 100) : 0;
  const accuracyPercent = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const retentionPercent = answeredCount ? Math.round((retainedCount / answeredCount) * 100) : 0;
  const calibrationPercent = certTotal ? Math.round((certCorrect / certTotal) * 100) : null;

  const materiaMap = new Map();
  for (const t of edital) {
    const mat = t.materia || "Geral";
    if (!materiaMap.has(mat)) {
      materiaMap.set(mat, { materia: mat, total: 0, done: 0, topics: [] });
    }
    const entry = materiaMap.get(mat);
    entry.total += 1;
    if (["dominado", "concluido", "revisado"].includes(String(t.status || "").toLowerCase())) {
      entry.done += 1;
    }
    entry.topics.push(t);
  }

  const sortedDiario = [...diario].sort((a, b) =>
    String(b.data || b.id || "").localeCompare(String(a.data || a.id || ""))
  );

  return {
    totalQuestions: regularQuestions.length,
    answeredCount,
    accuracyPercent,
    dueReviews,
    notebookCount,
    retainedCount,
    pendingRetentionCount,
    retentionPercent,
    calibrationPercent,
    certTotal,
    certCorrect,
    totalEdital,
    doneEdital,
    editalCoveragePercent,
    materias: Array.from(materiaMap.values()),
    retainedItems,
    notebookItems,
    flashcards: extractFlashcardsFromRevisao(revisao),
    mindMaps: extractMindMapsFromRevisao(revisao),
    pegadinhasCount: pegadinhas.length,
    latestDiary: sortedDiario[0] || null,
  };
}

export const DEMO_STUDY_DATA = {
  edital: [
    { id: "pl-1", materia: "Processo Legislativo", titulo: "Espécies normativas (CF/88 art. 59)", status: "dominado" },
    { id: "pl-2", materia: "Processo Legislativo", titulo: "Medidas provisórias (CF/88 art. 62)", status: "revisado" },
    { id: "da-1", materia: "Direito Administrativo", titulo: "Atos administrativos e atributos", status: "em_andamento" },
    { id: "da-2", materia: "Direito Administrativo", titulo: "Licitações (Lei 14.133/2021)", status: "pendente" },
    { id: "lp-1", materia: "Língua Portuguesa", titulo: "Coesão e reescrita de períodos", status: "dominado" },
  ],
  questoes: [
    {
      id: "demo-q1",
      cap: "pl-1",
      origem: "Demonstração · CF/88",
      enunciado: "Emenda à Constituição pode ser proposta por iniciativa popular.",
      gabarito: "E",
      comentario: "Errado. O art. 60 da CF/88 não prevê iniciativa popular para PEC (prevista no art. 61, § 2º, apenas para leis complementares e ordinárias).",
      mecanismo: "F3",
      fonte: "CF/88, art. 60 e art. 61, § 2º",
      vacina: "Iniciativa popular vale para lei ordinária e complementar, nunca para PEC.",
    },
    {
      id: "demo-q2",
      cap: "pl-2",
      origem: "Demonstração · CF/88",
      enunciado: "Medida provisória perde eficácia se não convertida em lei em 60 dias, prorrogáveis uma vez por igual período.",
      gabarito: "C",
      comentario: "Correto. Nos termos do art. 62, §§ 3º e 7º, da CF/88, o prazo é de 60 dias, prorrogável uma vez por igual período.",
      mecanismo: "V1",
      fonte: "CF/88, art. 62, §§ 3º e 7º",
    },
    {
      id: "demo-q3",
      cap: "da-1",
      origem: "Demonstração · Doutrina",
      enunciado: "A presunção de legitimidade dos atos administrativos é relativa (juris tantum).",
      gabarito: "C",
      comentario: "Correto. Admite prova em contrário pelo administrado.",
      mecanismo: "V1",
      fonte: "Direito Administrativo · Atributos do Ato",
    },
  ],
  respostas: [
    {
      qid: "demo-q1",
      tentativas: 2,
      acertos: 2,
      erros: 0,
      brancos: 0,
      ultimaMarcada: "E",
      conf: 3,
      nivel: 3,
      proxRevisao: "2026-11-10",
      retidoEm: "2026-11-12T14:00:00.000Z",
    },
    {
      qid: "demo-q2",
      tentativas: 1,
      acertos: 1,
      erros: 0,
      brancos: 0,
      ultimaMarcada: "C",
      conf: 3,
      nivel: 2,
      proxRevisao: "2026-11-18",
    },
    {
      qid: "demo-q3",
      tentativas: 1,
      acertos: 0,
      erros: 1,
      brancos: 0,
      ultimaMarcada: "E",
      conf: 3,
      noCaderno: true,
      motivo: "erro",
      nivel: 0,
      proxRevisao: "2026-11-14",
    },
  ],
  revisao: [
    {
      id: "pl-1.cartoes",
      materia: "Processo Legislativo",
      cartoes: [
        {
          frente: "Quem pode propor Emenda à Constituição (PEC)?",
          verso: "1/3 dos deputados ou senadores, Presidente da República ou mais da metade das Assembleias Legislativas (CF/88, art. 60).",
          ref: "CF/88, art. 60",
        },
        {
          frente: "Qual o prazo inicial e a prorrogação de uma Medida Provisória?",
          verso: "60 dias, prorrogáveis uma única vez por igual período (CF/88, art. 62, §§ 3º e 7º).",
          ref: "CF/88, art. 62",
        },
      ],
    },
    {
      id: "pl-1.mapa",
      titulo: "Processo Legislativo · CF/88",
      ramos: [
        {
          label: "PEC (art. 60)",
          x: "Iniciativa restrita (sem iniciativa popular); aprovação em 2 turnos por 3/5 em cada Casa.",
          children: [
            { label: "Limitações circunstanciais", x: "Não pode ser emendada na vigência de intervenção federal, estado de defesa ou estado de sítio." },
            { label: "Cláusulas pétreas", x: "Forma federativa, voto direto/secreto/universal/periódico, separação dos Poderes e direitos e garantias individuais." },
          ],
        },
        {
          label: "Medida Provisória (art. 62)",
          x: "Relevância e urgência; força de lei imediata; prazo 60+60 dias.",
        },
      ],
    },
  ],
  diario: [
    {
      id: "2026-11-14",
      data: "2026-11-14",
      resumo: "Sessão demonstrativa — aguardando migração do Controle de Estudo.",
      proximoPasso: "Quando: hoje → Farei: revisar MP (art. 62 CF/88) e calibrar certeza.",
    },
  ],
  pegadinhas: [{ id: "p-demo-1" }],
};
