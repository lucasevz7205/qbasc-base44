import { createClientFromRequest } from "npm:@base44/sdk";

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = String(body?.mode || "chat");

  if (mode === "grade_flashcard") {
    const front = String(body?.front || "").trim();
    const back = String(body?.back || "").trim();
    const userAnswer = String(body?.userAnswer || "").trim();
    if (!front || !back || !userAnswer) {
      return Response.json({ error: "Dados do flashcard incompletos." }, { status: 400 });
    }
    const prompt = [
      "Você é o avaliador de evocação ativa da plataforma Quebrando a Banca (concurso ARR Câmara).",
      "Compare a resposta escrita do estudante com o gabarito do flashcard. Seja direto: aponte o que acertou, o que faltou e sugira uma nota entre 'errei', 'dificil', 'bom' ou 'facil'.",
      `Frente: ${front}`,
      `Gabarito (Verso): ${back}`,
      `Resposta do estudante: ${userAnswer}`,
    ].join("\n\n");

    const answer = await base44.integrations.Core.InvokeLLM({ prompt });
    return Response.json({
      feedback: typeof answer === "string" ? answer : JSON.stringify(answer),
    });
  }

  const question = String(body?.question || "").trim();
  const context = body?.context ? JSON.stringify(body.context).slice(0, 3500) : "";

  if (!question) {
    return Response.json({ error: "Pergunta vazia." }, { status: 400 });
  }

  const prompt = [
    "Você é o Tutor de Estudo ARR (Câmara dos Deputados, banca Cebraspe) da plataforma Quebrando a Banca.",
    "Responda de forma objetiva, baseada em recuperação ativa, sem inventar dispositivo legal ou gabarito.",
    context ? `Contexto atual do estudo:\n${context}` : "",
    `Pergunta do estudante:\n${question}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const answer = await base44.integrations.Core.InvokeLLM({ prompt });
  return Response.json({
    answer: typeof answer === "string" ? answer : JSON.stringify(answer),
  });
}
