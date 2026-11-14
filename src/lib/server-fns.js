import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";

async function githubFetch(accessToken, url, raw = false) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      "User-Agent": "QBAsc-Base44",
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`GitHub API (${res.status}): ${errText.slice(0, 180)}`);
  }
  return raw ? res.text() : res.json();
}

export const getDashboardState = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        discipline: z.string().optional(),
        search: z.string().optional(),
        cursor: z.string().optional(),
      })
      .optional()
  )
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44().asServiceRole;
    const filter = {};
    if (data?.discipline && data.discipline !== "todas") {
      filter.discipline = data.discipline;
    }
    if (data?.search && data.search.trim()) {
      const q = data.search.trim();
      filter.$or = [
        { title: { $regex: q } },
        { chapter_code: { $regex: q.toUpperCase() } },
        { summary: { $regex: q } },
      ];
    }

    const [
      chaptersPage,
      totalChapters,
      totalClaudeDocs,
      disciplinesRes,
      logsPage,
      disciplineBreakdown,
    ] = await Promise.all([
      base44.entities.NarrativeChapter.filter(filter, {
        sort: "order_index",
        limit: 40,
        ...(data?.cursor ? { cursor: data.cursor } : {}),
      }),
      base44.entities.NarrativeChapter.count({}),
      base44.entities.ClaudeDocument.count({}),
      base44.entities.NarrativeChapter.list({ distinct: "discipline" }),
      base44.entities.GitHubImportLog.list({ sort: "-created_date", limit: 10 }),
      base44.entities.NarrativeChapter.aggregate({
        query: {},
        groupBy: "discipline",
        sum: ["questions_count", "cards_count"],
      }),
    ]);

    return {
      chapters: chaptersPage.items ?? [],
      nextCursor: chaptersPage.next_cursor ?? null,
      hasMore: Boolean(chaptersPage.has_more),
      totalChapters,
      totalClaudeDocs,
      disciplines: disciplinesRes.items ?? [],
      logs: logsPage.items ?? [],
      disciplineStats: disciplineBreakdown.rows ?? [],
    };
  });

export const getChapterDetail = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().max(120) }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44().asServiceRole;
    const chapter = await base44.entities.NarrativeChapter.get(data.id).catch((err) => {
      if (err?.status === 404) return null;
      throw err;
    });
    if (!chapter) return null;

    const codeLower = (chapter.chapter_code || "").toLowerCase();
    const relatedDocs = await base44.entities.ClaudeDocument.filter(
      { legacy_id: codeLower },
      { limit: 10 }
    );

    return {
      chapter,
      relatedDocs: (relatedDocs.items ?? []).map((doc) => {
        let parsed = null;
        try {
          parsed = JSON.parse(doc.payload_json);
        } catch {
          parsed = null;
        }
        return {
          id: doc.id,
          collection: doc.collection,
          legacy_id: doc.legacy_id,
          source: doc.source,
          parsed,
        };
      }),
    };
  });

export const updateChapterContent = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      id: z.string().max(120),
      title: z.string().min(1).max(300),
      summary: z.string().max(2000).optional(),
      content_markdown: z.string().max(20000).optional(),
      status: z.enum(["rascunho", "importado", "revisado", "publicado"]),
    })
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    return context.getBase44().asServiceRole.entities.NarrativeChapter.update(id, patch);
  });

export const listGitHubRepos = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { accessToken } = await context
      .getBase44()
      .asServiceRole.connectors.getConnection("github");
    const repos = await githubFetch(
      accessToken,
      "https://api.github.com/user/repos?per_page=30&sort=updated"
    );
    return (Array.isArray(repos) ? repos : []).map((r) => ({
      full_name: r.full_name,
      name: r.name,
      private: Boolean(r.private),
      default_branch: r.default_branch || "main",
      updated_at: r.updated_at,
      description: r.description || "",
      html_url: r.html_url,
    }));
  });

export const inspectGitHubRepoFiles = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(
    z.object({
      repoFullName: z.string().min(3).max(160),
      branch: z.string().min(1).max(80).default("main"),
    })
  )
  .handler(async ({ data, context }) => {
    const { accessToken } = await context
      .getBase44()
      .asServiceRole.connectors.getConnection("github");
    const treeData = await githubFetch(
      accessToken,
      `https://api.github.com/repos/${data.repoFullName}/git/trees/${encodeURIComponent(data.branch)}?recursive=1`
    );
    const blobs = (treeData.tree || []).filter((item) => item.type === "blob");
    const seedFiles = blobs
      .filter(
        (b) =>
          b.path.startsWith("scripts/claude-seed/") ||
          b.path.startsWith("scripts/fiscal/") ||
          b.path.startsWith("scripts/pcmg-pilot/") ||
          b.path.startsWith("docs/") ||
          b.path === "README.md"
      )
      .map((b) => ({ path: b.path, size: b.size }));

    return {
      repoFullName: data.repoFullName,
      branch: data.branch,
      totalFiles: blobs.length,
      importableFiles: seedFiles.slice(0, 80),
    };
  });

export const syncGitHubRepositoryToQBAsc = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      repoFullName: z.string().min(3).max(160),
      branch: z.string().min(1).max(80).default("main"),
      mode: z.enum(["all", "edital_pontos", "fiscal_trilhas", "markdown_docs"]).default("all"),
    })
  )
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44().asServiceRole;
    const { accessToken } = await base44.connectors.getConnection("github");
    const repo = data.repoFullName;
    const branch = data.branch || "main";

    const fetchRawSafe = async (path) => {
      try {
        return await githubFetch(
          accessToken,
          `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
          true
        );
      } catch {
        return null;
      }
    };

    const existingChapters = await base44.entities.NarrativeChapter.filter(
      { source_repo: repo },
      { limit: 500 }
    );
    const existingByCode = new Map(
      (existingChapters.items ?? []).map((c) => [c.chapter_code, c])
    );

    const existingDocs = await base44.entities.ClaudeDocument.filter(
      { source: `github-sync-${repo}` },
      { limit: 500 }
    );
    const existingDocKeys = new Set(
      (existingDocs.items ?? []).map((d) => `${d.collection}:${d.legacy_id}`)
    );

    const chaptersToCreate = [];
    const chaptersToUpdate = [];
    const docsToCreate = [];
    const collectionsSynced = [];

    // 1. Sync Edital + Pontos + Materiais + Textos if present
    if (data.mode === "all" || data.mode === "edital_pontos") {
      const [editalRaw, pontosRaw, materiaisRaw, textosRaw] = await Promise.all([
        fetchRawSafe("scripts/claude-seed/edital.json"),
        fetchRawSafe("scripts/claude-seed/pontos.json"),
        fetchRawSafe("scripts/claude-seed/materiais.json"),
        fetchRawSafe("scripts/claude-seed/textos.json"),
      ]);

      if (editalRaw) {
        const edital = JSON.parse(editalRaw);
        const pontos = pontosRaw ? JSON.parse(pontosRaw) : [];
        const materiais = materiaisRaw ? JSON.parse(materiaisRaw) : [];
        const textos = textosRaw ? JSON.parse(textosRaw) : [];

        collectionsSynced.push("edital", "pontos", "materiais", "textos");

        const pontosByTopico = new Map(pontos.map((p) => [p.topico || p.id, p]));
        const materiaisByTopico = new Map();
        for (const m of materiais) {
          for (const t of m.topicos || []) {
            if (!materiaisByTopico.has(t)) materiaisByTopico.set(t, []);
            materiaisByTopico.get(t).push(m);
          }
        }

        for (const [idx, item] of edital.entries()) {
          const code = String(item.id || `cap-${idx + 1}`).toUpperCase();
          const ponto = pontosByTopico.get(item.id);
          const mats = materiaisByTopico.get(item.id) || [];

          let md = `## ${item.materia} — Tópico ${item.num}: ${item.titulo}\n\n`;
          if (item.nota || item.obs) md += `> **Nota Editorial:** ${item.nota || item.obs}\n\n`;
          if (mats.length > 0) {
            md += `### Materiais e Cobertura\n`;
            for (const m of mats) {
              md += `- **${m.titulo}** (${m.tipo}): ${m.descricao}\n`;
            }
            md += `\n`;
          }
          if (ponto && Array.isArray(ponto.itens)) {
            md += `### Pontos-Chave e Armadilhas (${ponto.itens.length} pontos)\n\n`;
            for (const pt of ponto.itens) {
              md += `#### [${pt.grupo}] ${pt.k}\n- **Doutrina / Lei:** ${pt.d}\n`;
              if (pt.trap) md += `- **Armadilha (Trap):** ${pt.trap}\n`;
              md += `\n`;
            }
          }

          const payload = {
            chapter_code: code,
            title: item.titulo || `Capítulo ${idx + 1}`,
            discipline: item.materia || "Geral",
            arc_name:
              item.prova === "P2"
                ? "Arco II · Conhecimentos Específicos"
                : "Arco I · Conhecimentos Gerais",
            order_index: item.ordem || idx + 1,
            summary:
              mats[0]?.descricao ||
              (ponto
                ? `${ponto.itens?.length || 0} pontos doutrinários e armadilhas mapeadas.`
                : item.titulo),
            content_markdown: md.slice(0, 12000),
            questions_count: ponto?.itens?.length || 0,
            cards_count: mats.length,
            source_repo: repo,
            source_path: "scripts/claude-seed/edital.json",
            status: ponto ? "publicado" : mats.length ? "revisado" : "importado",
          };

          if (existingByCode.has(code)) {
            chaptersToUpdate.push({ id: existingByCode.get(code).id, ...payload });
          } else {
            chaptersToCreate.push(payload);
          }
        }

        const rawCollections = [
          ["edital", edital],
          ["pontos", pontos],
          ["materiais", materiais],
          ["textos", textos],
        ];
        for (const [colName, arr] of rawCollections) {
          for (const doc of arr) {
            const lid = String(doc.id || "");
            if (lid && !existingDocKeys.has(`${colName}:${lid}`)) {
              docsToCreate.push({
                collection: colName,
                legacy_id: lid,
                payload_json: JSON.stringify(doc).slice(0, 6500),
                source: `github-sync-${repo}`,
              });
            }
          }
        }
      }
    }

    // 2. Sync Fiscal Trilhas if present
    if (data.mode === "all" || data.mode === "fiscal_trilhas") {
      const fiscalFiles = [
        "scripts/fiscal/t05-dikw-dados-abertos.seed.json",
        "scripts/fiscal/t06-regime-principios.seed.json",
        "scripts/fiscal/t07-ortografia-acentuacao.seed.json",
        "scripts/fiscal/t08-tributo-conceito-natureza.seed.json",
        "scripts/fiscal/t09-aspectos-introdutorios.seed.json",
        "scripts/fiscal/t11-metadados.seed.json",
        "scripts/fiscal/t12-principios-implicitos.seed.json",
        "scripts/fiscal/t21-governanca-dados-fundamentos.seed.json",
        "scripts/fiscal/t26-governanca-arquitetura-controles.seed.json",
        "scripts/fiscal/t35-banco-sgbd-transacoes.seed.json",
        "scripts/fiscal/t38-ansi-sparc-papeis-projetos.seed.json",
        "scripts/fiscal/t50-mer-entidades-relacionamentos.seed.json",
        "scripts/fiscal/t59-atributos-estendido-crowfoot.seed.json",
      ];
      const rawResults = await Promise.all(
        fiscalFiles.map(async (f) => ({ path: f, raw: await fetchRawSafe(f) }))
      );
      const validSeeds = rawResults.filter((r) => r.raw);
      if (validSeeds.length > 0) collectionsSynced.push("trilhas_fiscais");

      for (const [idx, { path, raw }] of validSeeds.entries()) {
        const seed = JSON.parse(raw);
        const firstQ = seed.questions?.[0] || {};
        const code = String(firstQ.cap || seed.topic || `FISCAL-${idx + 1}`).toUpperCase();
        let md = `## ${seed.map?.centro || firstQ.capNome || seed.topic}\n\n`;
        md += `**Fonte:** ${seed.source || path}\n\n`;
        for (const ramo of seed.map?.ramos || []) {
          md += `#### ${ramo.t}\n> ${ramo.n}\n\n`;
          for (const f of ramo.f || []) {
            md += `- **${f.t}:** ${f.n}\n`;
          }
          md += `\n`;
        }
        const payload = {
          chapter_code: code,
          title: firstQ.capNome || seed.map?.centro || seed.topic,
          discipline: "Área Fiscal & TI",
          arc_name: "Arco III · Trilhas da Ascensão Fiscal",
          order_index: 500 + idx,
          summary: `Trilha com ${seed.questions?.length || 0} questões, ${seed.cards?.length || 0} flashcards e mapa mental (${seed.source || ""}).`,
          content_markdown: md.slice(0, 12000),
          questions_count: seed.questions?.length || 0,
          cards_count: seed.cards?.length || 0,
          source_repo: repo,
          source_path: path,
          status: "publicado",
        };
        if (existingByCode.has(code)) {
          chaptersToUpdate.push({ id: existingByCode.get(code).id, ...payload });
        } else {
          chaptersToCreate.push(payload);
        }
      }
    }

    // 3. Fallback / Markdown docs sync (works for any repo like TutorIA or UI-Desing)
    if (
      data.mode === "markdown_docs" ||
      (chaptersToCreate.length === 0 && chaptersToUpdate.length === 0)
    ) {
      const treeData = await githubFetch(
        accessToken,
        `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
      );
      const mdBlobs = (treeData.tree || [])
        .filter(
          (item) =>
            item.type === "blob" &&
            item.path.endsWith(".md") &&
            !item.path.startsWith(".agents/") &&
            !item.path.startsWith("agent/") &&
            !item.path.startsWith(".claude/")
        )
        .slice(0, 25);

      if (mdBlobs.length > 0) collectionsSynced.push("documentacao_markdown");

      for (const [idx, blob] of mdBlobs.entries()) {
        const text = await fetchRawSafe(blob.path);
        if (!text) continue;
        const cleanName = blob.path.replace(/\.md$/i, "").replace(/[^a-zA-Z0-9_-]/g, "-");
        const code = `MD-${cleanName.toUpperCase().slice(0, 32)}`;
        const firstHeading = text.match(/^#\s+(.+)$/m)?.[1] || blob.path;
        const payload = {
          chapter_code: code,
          title: firstHeading.slice(0, 180),
          discipline: "Documentação & Arquitetura",
          arc_name: `Repositório · ${repo.split("/")[1] || repo}`,
          order_index: 800 + idx,
          summary: `Documento Markdown importado de ${blob.path} (${blob.size} bytes).`,
          content_markdown: text.slice(0, 12000),
          questions_count: 0,
          cards_count: 0,
          source_repo: repo,
          source_path: blob.path,
          status: "importado",
        };
        if (existingByCode.has(code)) {
          chaptersToUpdate.push({ id: existingByCode.get(code).id, ...payload });
        } else {
          chaptersToCreate.push(payload);
        }
      }
    }

    for (let i = 0; i < chaptersToCreate.length; i += 100) {
      await base44.entities.NarrativeChapter.bulkCreate(chaptersToCreate.slice(i, i + 100));
    }
    for (let i = 0; i < chaptersToUpdate.length; i += 100) {
      await base44.entities.NarrativeChapter.bulkUpdate(chaptersToUpdate.slice(i, i + 100));
    }
    for (let i = 0; i < docsToCreate.length; i += 100) {
      await base44.entities.ClaudeDocument.bulkCreate(docsToCreate.slice(i, i + 100));
    }

    const totalChaptersSynced = chaptersToCreate.length + chaptersToUpdate.length;
    await base44.entities.GitHubImportLog.create({
      repo_full_name: repo,
      branch,
      imported_collections: collectionsSynced.join(", ") || data.mode,
      chapters_synced: totalChaptersSynced,
      documents_synced: docsToCreate.length,
      status: "sucesso",
      notes: `Sincronização concluída (${chaptersToCreate.length} novos capítulos, ${chaptersToUpdate.length} atualizados, ${docsToCreate.length} documentos ClaudeDocument).`,
    });

    return {
      ok: true,
      repo,
      createdChapters: chaptersToCreate.length,
      updatedChapters: chaptersToUpdate.length,
      createdDocs: docsToCreate.length,
      collections: collectionsSynced,
    };
  });