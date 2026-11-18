import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-middleware";

// Exportação somente leitura dos dados de estudo para análise externa de cobertura.
// Lê as coleções do ClaudeDocument (e as partes do ClaudeDocumentPart) com o cliente do próprio
// dono, sem asServiceRole. Não grava nada e não lê respostas, progresso, status de edital nem caderno.
// Não recebe entrada do cliente: a função é GET sem validator.

const COLLECTIONS = ["edital", "questoes", "questoes_excluidas", "revisao"];
const PAGE = 500;
const MAX_ROWS = 50000;

const list = value => (Array.isArray(value) ? value : []);
const firstOf = (...values) => values.find(value => value !== undefined && value !== null && value !== "") ?? null;

// Lê todas as páginas. Se passar do limite, falha em vez de devolver uma exportação incompleta.
async function readAll(entity, filter, order) {
  const rows = [];
  for (let skip = 0; skip < MAX_ROWS; skip += PAGE) {
    const page = await entity.filter(filter, order, PAGE, skip);
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
  throw new Error("A exportação passou do limite de leitura e ficaria incompleta. Nada foi devolvido.");
}

// Mesma remontagem que o app faz em listClaudeCollection: documentos grandes vêm em partes.
async function readCollection(base44, collection) {
  const docs = await readAll(base44.entities.ClaudeDocument, { collection }, "created_date");
  const parsed = docs.map(row => ({ row, value: JSON.parse(row.payload_json) ?? {} }));

  const partsById = new Map();
  let partes = 0;
  if (parsed.some(({ value }) => value._claudeParts)) {
    const parts = await readAll(base44.entities.ClaudeDocumentPart, { collection }, "part");
    partes = parts.length;
    for (const part of parts) {
      if (!partsById.has(part.legacy_id)) partsById.set(part.legacy_id, []);
      partsById.get(part.legacy_id).push(part);
    }
  }

  const records = parsed.map(({ row, value }) => {
    if (!value._claudeParts) return { ...value, id: row.legacy_id };
    const pieces = (partsById.get(row.legacy_id) || [])
      .sort((a, b) => a.part - b.part)
      .slice(0, value._claudeParts);
    return { ...JSON.parse(pieces.map(p => p.payload_chunk).join("")), id: row.legacy_id };
  });
  return { records, documentos: docs.length, partes };
}

// Conta quantas linhas trazem cada campo como null (campo ausente no registro original).
function camposAusentes(rows) {
  const out = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (value === null) out[key] = (out[key] || 0) + 1;
    }
  }
  return out;
}

export const exportCoberturaEstudo = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (context.user?.role !== "admin") throw new Error("Exportação restrita ao dono do app.");
    const base44 = context.getBase44();

    const lidas = {};
    for (const collection of COLLECTIONS) lidas[collection] = await readCollection(base44, collection);

    // Subitens do edital (matéria + subitem), usados para identificar a cobertura de cada linha.
    const subitens = lidas.edital.records
      .filter(e => e.id && e.materia)
      .map(e => ({
        id: e.id ?? null,
        materia: e.materia ?? null,
        sigla: e.sigla ?? null,
        prova: e.prova ?? null,
        subitem: e.num != null ? String(e.num) : null,
        titulo: e.titulo ?? null,
        caps: list(e.caps),
        foraEdital: e.foraEdital ?? false,
      }));
    const subitemById = new Map(subitens.map(s => [s.id, s]));
    const subitemByCap = new Map();
    for (const s of subitens) for (const cap of s.caps) if (!subitemByCap.has(cap)) subitemByCap.set(cap, s);

    const excluidas = new Set(lidas.questoes_excluidas.records.map(q => q.id));
    const questoes = lidas.questoes.records.map(q => {
      const topicoId = firstOf(q.topico, q.topicId);
      const s = subitemById.get(topicoId) ?? subitemByCap.get(q.cap) ?? null;
      return {
        id: q.id ?? null,
        materia: s?.materia ?? null,
        cap: q.cap ?? null,
        capNome: q.capNome ?? null,
        topico: topicoId ?? s?.id ?? null,
        subitem: s?.subitem ?? null,
        subitemTitulo: s?.titulo ?? null,
        enunciado: q.enunciado ?? null,
        gabarito: q.gabarito ?? null,
        origem: q.origem ?? null,
        status: q.status ?? null,
        statusConfronto: q.statusConfronto ?? null,
        excluida: excluidas.has(q.id),
      };
    });

    // Mapas, cartões e itens de revisão ficam no mesmo documento "revisao" do tópico.
    const mapas = [];
    const cartoes = [];
    const itensRevisao = [];
    for (const d of lidas.revisao.records) {
      const topicoId = d.topico || String(d.id ?? "").replace(/\.(mapa|cartoes)$/, "");
      const s = subitemById.get(topicoId) ?? null;
      const ctx = { materia: s?.materia ?? null, subitem: s?.subitem ?? null, subitemTitulo: s?.titulo ?? null };

      const mapa = d.mapa || d.root;
      if (mapa && typeof mapa === "object") {
        const ramos = list(mapa.ramos ?? mapa.children ?? mapa.nos);
        if (ramos.length || mapa.centro) {
          mapas.push({
            id: d.id ?? null,
            topico: topicoId,
            ...ctx,
            titulo: mapa.centro ?? mapa.titulo ?? mapa.t ?? null,
            ramos: ramos.length,
          });
        }
      }

      list(d.cartoes ?? d.cards).forEach((c, i) => {
        if (!c || typeof c !== "object") return;
        cartoes.push({
          id: c.id ?? `${topicoId}@${i}`,
          topico: topicoId,
          ...ctx,
          frente: c.q ?? c.frente ?? c.front ?? c.pergunta ?? null,
          verso: c.a ?? c.verso ?? c.back ?? c.resposta ?? null,
        });
      });

      list(d.itens).forEach(item => {
        const it = item && typeof item === "object" ? item : {};
        itensRevisao.push({
          id: it.id ?? it.qid ?? null,
          topico: topicoId,
          ...ctx,
          tipo: it.tipo ?? null,
        });
      });
    }

    const contagens = {
      subitens: subitens.length,
      questoes: questoes.length,
      questoesExcluidas: excluidas.size,
      mapas: mapas.length,
      cartoes: cartoes.length,
      itensRevisao: itensRevisao.length,
    };

    const entidadesLidas = [];
    for (const collection of COLLECTIONS) {
      entidadesLidas.push({
        entidade: "ClaudeDocument",
        colecao: collection,
        documentos: lidas[collection].documentos,
        registros: lidas[collection].records.length,
      });
      if (lidas[collection].partes) {
        entidadesLidas.push({
          entidade: "ClaudeDocumentPart",
          colecao: collection,
          registros: lidas[collection].partes,
        });
      }
    }

    return {
      geradoEm: new Date().toISOString(),
      somenteLeitura: true,
      entidadesLidas,
      contagens,
      camposAusentes: {
        subitens: camposAusentes(subitens),
        questoes: camposAusentes(questoes),
        mapas: camposAusentes(mapas),
        cartoes: camposAusentes(cartoes),
        itensRevisao: camposAusentes(itensRevisao),
      },
      subitens,
      questoes,
      mapas,
      cartoes,
      itensRevisao,
    };
  });
