import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getServerTime = createServerFn({ method: "GET" }).handler(async () => ({
  now: new Date().toISOString(),
}));

const MODE_INSTRUCTIONS = {
  socratico:
    "Modo Socrático: não entregue a resposta pronta de imediato. Conduza o aluno com 1 ou 2 perguntas incisivas que o façam evocar a regra constitucional/legal ou identificar a premissa central, validando o que ele já demonstrou saber.",
  feynman:
    "Modo Feynman: peça ou avalie uma explicação em linguagem simples, sem jargão jurídico desnecessário, apontando eventuais lacunas conceituais e sugerindo uma analogia clara.",
  banca:
    "Modo Banca CEBRASPE: elabore ou analise um item inédito no estilo Certo/Errado da banca CEBRASPE sobre o tópico, destacando a literalidade legal/constitucional, jurisprudência ou pegadinha clássica.",
  oral:
    "Modo Arguição Oral: atue como examinador de prova oral da Câmara dos Deputados. Faça uma pergunta direta de arguição ou avalie a resposta oral/escrita do candidato quanto à precisão técnica, estrutura e concisão.",
  retencao:
    "Teste de Retenção Ativa: proponha 3 perguntas rápidas de evocação ativa (sem consulta) cobrindo: 1) regra geral/conceito, 2) exceção ou prazo/quórum, e 3) pegadinha clássica de prova sobre o tópico.",
  armadilhas:
    "Armadilhas da Banca: liste as 3 pegadinhas mais cobradas pelo CEBRASPE neste tópico (troca de competência, quórum, prazo, palavras restritivas ou exceção inexistente) e proponha 1 item rápido C/E para testar o aluno.",
  analogia:
    "Analogia Feynman: explique o núcleo do tópico usando uma analogia concreta do cotidiano e, ao final, mostre exatamente até onde a analogia funciona e qual o detalhe técnico-jurídico que não pode ser esquecido na prova.",
};

const TutorInputSchema = z.object({
  mode: z.enum([
    "socratico",
    "feynman",
    "banca",
    "oral",
    "retencao",
    "armadilhas",
    "analogia",
  ]),
  subjectName: z.string().max(200).optional(),
  topicLabel: z.string().min(1).max(300),
  userMessage: z.string().min(1).max(3000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "tutor"]),
        text: z.string().max(3000),
      }),
    )
    .max(16)
    .optional(),
});

export const askArchitectTutor = createServerFn({ method: "POST" })
  .validator(TutorInputSchema)
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const historyBlock = (data.history || [])
      .slice(-10)
      .map((m) => `${m.role === "user" ? "Estudante" : "O Arquiteto"}: ${m.text}`)
      .join("\n\n");

    const prompt = [
      "Você é 'O Arquiteto', mentor de aprendizagem ativa da plataforma Quebrando a Banca (foco: Câmara dos Deputados · Analista Legislativo · banca CEBRASPE).",
      "Seja preciso, elegante, direto e rigorosamente fiel à Constituição Federal de 1988, à legislação aplicável e à doutrina consolidada. Nunca invente artigos ou súmulas.",
      `Matéria: ${data.subjectName || "Concurso Câmara dos Deputados"}`,
      `Tópico do edital: ${data.topicLabel}`,
      `Diretriz pedagógica atual: ${MODE_INSTRUCTIONS[data.mode] || MODE_INSTRUCTIONS.socratico}`,
      historyBlock ? `Histórico recente da conversa:\n${historyBlock}` : "",
      `Mensagem/solicitação atual do estudante:\n${data.userMessage}`,
      "Responda em português (pt-BR), em texto fluido e bem estruturado (máximo de 2 a 3 parágrafos curtos ou tópicos objetivos).",
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    const reply = typeof res === "string" ? res.trim() : JSON.stringify(res);
    return { reply };
  });

const FeynmanInputSchema = z.object({
  topicLabel: z.string().min(1).max(300),
  explanation: z.string().min(15).max(5000),
});

export const evaluateFeynmanExplanation = createServerFn({ method: "POST" })
  .validator(FeynmanInputSchema)
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const words = data.explanation.trim().split(/\s+/).filter(Boolean).length;

    const prompt = [
      "Você é 'O Arquiteto', avaliador do Laboratório Feynman da plataforma Quebrando a Banca (Câmara dos Deputados · CEBRASPE).",
      `Avalie a explicação escrita pelo estudante sobre o tópico "${data.topicLabel}" segundo a técnica Feynman (explicar um conceito complexo com palavras simples, precisão conceitual, frases claras e exemplo concreto).`,
      `Explicação do estudante (${words} palavras):\n"""\n${data.explanation}\n"""`,
      "Retorne um JSON avaliando:",
      "- clarityScore: nota de 0 a 100 pela clareza e precisão técnica.",
      "- isAdequateLength: true se a explicação desenvolve a ideia central com substância suficiente.",
      "- lengthFeedback: comentário curto sobre a extensão e densidade da explicação.",
      "- jargonDetected: lista de termos excessivamente rebuscados ou jargões usados sem explicar (vazio se não houver).",
      "- jargonFeedback: comentário sobre a simplicidade do vocabulário.",
      "- sentenceClarityOk: true se as frases estão claras e diretas.",
      "- sentenceFeedback: comentário sobre a estrutura e clareza das frases.",
      "- hasConcreteExample: true se o aluno incluiu um exemplo prático ou aplicação concreta.",
      "- exampleFeedback: comentário sobre o exemplo usado (ou sugestão de um exemplo curto caso falte).",
      "- gaps: lista de até 3 pontos ou exceções importantes do tópico que faltaram ou tiveram imprecisão.",
      "- nextStep: recomendação prática em 1 frase sobre o que ajustar na reescrita.",
    ].join("\n\n");

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          clarityScore: { type: "number" },
          isAdequateLength: { type: "boolean" },
          lengthFeedback: { type: "string" },
          jargonDetected: { type: "array", items: { type: "string" } },
          jargonFeedback: { type: "string" },
          sentenceClarityOk: { type: "boolean" },
          sentenceFeedback: { type: "string" },
          hasConcreteExample: { type: "boolean" },
          exampleFeedback: { type: "string" },
          gaps: { type: "array", items: { type: "string" } },
          nextStep: { type: "string" },
        },
        required: [
          "clarityScore",
          "isAdequateLength",
          "lengthFeedback",
          "jargonDetected",
          "jargonFeedback",
          "sentenceClarityOk",
          "sentenceFeedback",
          "hasConcreteExample",
          "exampleFeedback",
          "gaps",
          "nextStep",
        ],
      },
    });

    return {
      words,
      ...res,
    };
  });

const CornellInputSchema = z.object({
  topicLabel: z.string().min(1).max(300),
  notes: z.string().min(15).max(8000),
});

export const generateCornellCues = createServerFn({ method: "POST" })
  .validator(CornellInputSchema)
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const prompt = [
      "Você é 'O Arquiteto', especialista no método Cornell de anotações para concursos de alto nível (Câmara dos Deputados · CEBRASPE).",
      `Com base nas anotações do estudante sobre "${data.topicLabel}", gere:`,
      "1) cues: de 4 a 6 perguntas curtas de evocação ativa (pistas para a coluna da esquerda do Caderno Cornell) que testem os conceitos-chave, prazos, quóruns, competências e exceções presentes nas notas.",
      "2) summary: uma síntese de 2 a 3 frases condensando a regra central das notas para o rodapé do Caderno Cornell.",
      `Anotações do estudante:\n"""\n${data.notes}\n"""`,
    ].join("\n\n");

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          cues: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
        required: ["cues", "summary"],
      },
    });

    return {
      cues: Array.isArray(res?.cues) ? res.cues : [],
      summary: String(res?.summary || ""),
    };
  });

const ExtractMaterialSchema = z.object({
  file_uri: z.string().min(1).max(1000),
  topicLabel: z.string().max(300).optional(),
});

export const extractMaterialText = createServerFn({ method: "POST" })
  .validator(ExtractMaterialSchema)
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: data.file_uri,
      expires_in: 300,
    });

    const prompt = [
      "Extraia e organize com fidelidade o texto de estudo contido no arquivo enviado (imagem, página digitalizada ou PDF).",
      data.topicLabel ? `Contexto do tópico: ${data.topicLabel}.` : "",
      "Corrija apenas quebras de linha quebradas por OCR, mantendo a redação técnica, artigos de lei e conceitos exatos. Retorne somente o texto extraído limpo.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [signed_url],
    });

    return {
      text: typeof res === "string" ? res.trim() : JSON.stringify(res),
    };
  });

const GenerateFlashcardsSchema = z.object({
  topicLabel: z.string().min(1).max(300),
  sourceText: z.string().min(20).max(10000),
  count: z.number().int().min(1).max(8).optional(),
});

export const generateFlashcardsFromMaterial = createServerFn({ method: "POST" })
  .validator(GenerateFlashcardsSchema)
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const count = data.count || 4;
    const prompt = [
      "Você é 'O Arquiteto', criador de flashcards de repetição espaçada da plataforma Quebrando a Banca (Câmara dos Deputados · CEBRASPE).",
      `A partir do texto-base abaixo sobre "${data.topicLabel}", gere ${count} flashcards de alta retenção.`,
      "Regras para cada cartão:",
      "- front: pergunta direta, específica e sem ambiguidade (ex.: quórum, competência, exceção, distinção conceitual ou pegadinha clássica).",
      "- back: resposta objetiva, precisa e fundamentada no texto/dispositivo legal (1 a 3 frases curtas).",
      `Texto-base:\n"""\n${data.sourceText}\n"""`,
    ].join("\n\n");

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" },
              },
              required: ["front", "back"],
            },
          },
        },
        required: ["cards"],
      },
    });

    return {
      cards: Array.isArray(res?.cards) ? res.cards.slice(0, 8) : [],
    };
  });