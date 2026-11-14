import { createClientFromRequest } from "npm:@base44/sdk";

function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseJsonBlock(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  const s = text(raw);
  try {
    return JSON.parse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(s.slice(start, end + 1));
    }
    return { raw: s };
  }
}

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const task = text(body?.task);

  if (!task) {
    return Response.json({ error: "Parâmetro 'task' é obrigatório." }, { status: 400 });
  }

  if (task === "tutor-chat") {
    const mode = text(body?.mode) || "socratic";
    const topic = text(body?.topic);
    const question = text(body?.question);
    const context = body?.context ? JSON.stringify(body.context).slice(0, 3500) : "";
    if (!question) {
      return Response.json({ error: "Pergunta vazia." }, { status: 400 });
    }
    const modeRules: Record<string, string> = {
      socratic: "Modo Socrático: guie o estudante com 1 a 2 perguntas curtas para que ele deduza a resposta antes de entregar o gabarito.",
      exam: "Modo Banca Cebraspe: analise sob a ótica da banca (pegadinhas F1–F10, troca de conceito, exceções e regra de decisão).",
      simple: "Modo Simples: explique de forma direta, clara e com exemplo prático curto.",
      challenge: "Modo Desafio: proponha um contraexemplo ou pegadinha difícil para testar o domínio do estudante.",
    };
    const prompt = [
      "Você é o Arquiteto Cognitivo ARR (Câmara dos Deputados, Cebraspe) da plataforma Quebrando a Banca.",
      modeRules[mode] || modeRules.socratic,
      topic ? `Tópico em foco: ${topic}` : "",
      context ? `Contexto do estudante:\n${context}` : "",
      `Mensagem do estudante:\n${question}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const answer = await base44.integrations.Core.InvokeLLM({ prompt });
    return Response.json({
      task,
      mode,
      answer: typeof answer === "string" ? answer : JSON.stringify(answer),
    });
  }

  if (task === "feynman-evaluate") {
    const topic = text(body?.topic);
    const explanation = text(body?.explanation);
    const targetAudience = text(body?.targetAudience) || "iniciante";
    if (topic.length < 2 || explanation.length < 5) {
      return Response.json({ error: "Informe tópico e explicação." }, { status: 400 });
    }
    const prompt = [
      "Avalie a explicação pelo Método Feynman para o concurso ARR (Cebraspe).",
      `Tópico: ${topic}`,
      `Público-alvo: ${targetAudience}`,
      `Explicação do estudante:\n${explanation}`,
      'Responda exclusivamente em JSON válido: {"score":0-100,"strengths":["..."],"gaps":["..."],"simplifiedSummary":"..."}',
    ].join("\n\n");

    const raw = await base44.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ task, result: parseJsonBlock(raw) });
  }

  if (task === "evocar-corrigir") {
    const rotulo = text(body?.rotulo);
    const explicacao = text(body?.explicacao);
    const tentativa = text(body?.tentativa);
    if (!rotulo || tentativa.length < 3) {
      return Response.json({ error: "Informe o nó e sua tentativa de evocação." }, { status: 400 });
    }
    const prompt = [
      "Corrija a evocação ativa (antes de ler) de um nó do mapa mental.",
      `Conceito/Nó: ${rotulo}`,
      explicacao ? `Referência do nó: ${explicacao}` : "",
      `Tentativa de memória do estudante:\n${tentativa}`,
      'Responda exclusivamente em JSON válido: {"acertou":["..."],"errosExatos":["..."],"faltou":["..."],"veredito":"correto|parcial|incorreto"}',
    ]
      .filter(Boolean)
      .join("\n\n");

    const raw = await base44.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ task, result: parseJsonBlock(raw) });
  }

  if (task === "summarize-cornell") {
    const topic = text(body?.topic);
    const rawNotes = text(body?.rawNotes);
    const attempt = text(body?.attempt);
    if (attempt.length < 120) {
      return Response.json(
        { error: "A tentativa de memória antes de consultar a fonte exige no mínimo 120 caracteres." },
        { status: 400 }
      );
    }
    const prompt = [
      "Estruture notas no Método Cornell após tentativa de evocação ativa.",
      `Tópico: ${topic}`,
      `Tentativa de memória do estudante:\n${attempt}`,
      rawNotes ? `Anotações/Fonte:\n${rawNotes}` : "",
      'Responda exclusivamente em JSON válido: {"cues":["..."],"notes":["..."],"summary":"...","gapsFromAttempt":["..."]}',
    ]
      .filter(Boolean)
      .join("\n\n");

    const raw = await base44.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ task, result: parseJsonBlock(raw) });
  }

  if (task === "cornell-to-mindmap") {
    const title = text(body?.title) || "Mapa Mental";
    const notes = text(body?.notes);
    const cues = Array.isArray(body?.cues) ? body.cues.map(text).filter(Boolean) : [];
    const summary = text(body?.summary);
    if (notes.length < 5 && cues.length === 0) {
      return Response.json({ error: "Notas ou pistas Cornell insuficientes." }, { status: 400 });
    }
    const prompt = [
      "Converta as notas Cornell em uma árvore hierárquica de Mapa Mental (ramo -> microtópico -> folha) com explicação em todo nó.",
      `Título central: ${title}`,
      cues.length ? `Pistas: ${cues.join("; ")}` : "",
      notes ? `Notas:\n${notes}` : "",
      summary ? `Resumo:\n${summary}` : "",
      'Responda exclusivamente em JSON válido: {"title":"...","branches":[{"id":"b1","label":"...","summary":"...","children":[{"id":"b1-1","label":"...","summary":"..."}]}]}',
    ]
      .filter(Boolean)
      .join("\n\n");

    const raw = await base44.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ task, result: parseJsonBlock(raw) });
  }

  if (task === "generate-flashcards") {
    const topic = text(body?.topic);
    const sourceText = text(body?.text);
    const count = Math.min(8, Math.max(1, Number(body?.count) || 4));
    if (!topic) {
      return Response.json({ error: "Informe o tópico." }, { status: 400 });
    }
    const prompt = [
      `ARQUITETURA GAN DE FLASHCARDS (Gerador + Discriminador): gere ${count} cartões de active recall concisos e atômicos.`,
      `Tópico: ${topic}`,
      sourceText ? `Base:\n${sourceText.slice(0, 6000)}` : "",
      'Responda exclusivamente em JSON válido: {"cards":[{"front":"...","back":"...","basis":"..."}]}',
    ]
      .filter(Boolean)
      .join("\n\n");

    const raw = await base44.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ task, result: parseJsonBlock(raw) });
  }

  if (task === "mindmap-gan-questions") {
    const topicTitle = text(body?.topicTitle) || text(body?.topic);
    const count = Math.min(6, Math.max(1, Number(body?.count) || 3));
    const sourceText = text(body?.sourceText);
    if (!topicTitle) {
      return Response.json({ error: "Informe o título do tópico." }, { status: 400 });
    }
    const prompt = [
      `Gere ${count} itens inéditos padrão Cebraspe (Certo/Errado), metade C e metade E, com mecanismo (F1–F10 ou V1–V4) e vacina.`,
      `Tópico: ${topicTitle}`,
      sourceText ? `Conteúdo do mapa:\n${sourceText.slice(0, 6000)}` : "",
      'Responda exclusivamente em JSON válido: {"questions":[{"enunciado":"...","gabarito":"C|E","comentario":"...","mecanismo":"F3|V1|...","vacina":"...","origem":"inédito Arquiteto"}]}',
    ]
      .filter(Boolean)
      .join("\n\n");

    const raw = await base44.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ task, result: parseJsonBlock(raw) });
  }

  return Response.json({ error: `Task desconhecida: ${task}` }, { status: 400 });
}
