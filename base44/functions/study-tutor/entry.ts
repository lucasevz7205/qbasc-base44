import { createClientFromRequest } from "npm:@base44/sdk";

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
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
