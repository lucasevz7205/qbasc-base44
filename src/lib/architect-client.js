import { base44 } from "../api/base44Client.js";

export const CORNELL_MIN_ATTEMPT_LENGTH = 120;

export const ARCHITECT_MODES = [
  { id: "socratic", label: "Socrático" },
  { id: "exam", label: "Banca Cebraspe" },
  { id: "simple", label: "Simples" },
  { id: "challenge", label: "Desafio" },
];

export function validateCornellAttempt(attempt = "") {
  const clean = String(attempt || "").trim();
  return {
    ok: clean.length >= CORNELL_MIN_ATTEMPT_LENGTH,
    length: clean.length,
    remaining: Math.max(0, CORNELL_MIN_ATTEMPT_LENGTH - clean.length),
  };
}

export function normalizeArchitectMindMap(raw, fallbackTitle = "Mapa Mental") {
  const src = raw && typeof raw === "object" ? raw : {};
  const title = String(src.title || src.centro || fallbackTitle).trim() || fallbackTitle;
  const rawBranches = Array.isArray(src.branches)
    ? src.branches
    : Array.isArray(src.ramos)
      ? src.ramos
      : [];

  function normalizeNode(node, idx, prefix) {
    const id = String(node?.id || `${prefix}-${idx + 1}`);
    const label = String(node?.label || node?.t || node?.titulo || `Conceito ${idx + 1}`).trim();
    const summary = String(
      node?.summary || node?.x || node?.explicacao || "Explicação pendente de preenchimento."
    ).trim();
    const rawChildren = Array.isArray(node?.children)
      ? node.children
      : Array.isArray(node?.filhos)
        ? node.filhos
        : [];
    return {
      id,
      label,
      summary,
      mastery: node?.mastery || "no-evidence",
      children: rawChildren.map((c, j) => normalizeNode(c, j, id)),
    };
  }

  return {
    id: `arch-${Date.now()}`,
    title,
    branches: rawBranches.map((b, i) => normalizeNode(b, i, "b")),
  };
}

function buildDemoFallback(task, payload) {
  if (task === "feynman-evaluate") {
    return {
      demo: true,
      result: {
        score: 78,
        strengths: ["Boa tentativa de explicar o conceito com suas próprias palavras (Modo Demonstração)."],
        gaps: ["Conecte sua conta Base44 para avaliação semântica completa pelo Arquiteto IA."],
        simplifiedSummary: `Resumo de demonstração sobre "${payload.topic}".`,
      },
    };
  }
  if (task === "evocar-corrigir") {
    const ref = String(payload.explicacao || "").toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const att = new Set(String(payload.tentativa || "").toLowerCase().split(/\W+/));
    const hits = ref.filter((w) => att.has(w));
    return {
      demo: true,
      result: {
        veredito: hits.length >= Math.max(2, Math.floor(ref.length * 0.4)) ? "parcial" : "incorreto",
        acertou: hits.slice(0, 4),
        errosExatos: ["Modo Demonstração: comparação lexical local ativa."],
        faltou: ["Faça login na Base44 para correção semântica exata do trecho errado."],
      },
    };
  }
  if (task === "summarize-cornell") {
    return {
      demo: true,
      result: {
        cues: [`Conceito central: ${payload.topic}`, "Exceções e limites constitucionais/legais"],
        notes: [String(payload.attempt || "").slice(0, 220)],
        summary: `Síntese Cornell em Modo Demonstração para "${payload.topic}".`,
        gapsFromAttempt: ["Conecte sua conta Base44 para identificar lacunas reais frente à aula."],
      },
    };
  }
  if (task === "cornell-to-mindmap") {
    const title = String(payload.title || "Mapa Mental");
    return {
      demo: true,
      result: normalizeArchitectMindMap(
        {
          title,
          branches: [
            {
              id: "b1",
              label: "Núcleo conceitual",
              summary: `Estrutura base extraída de ${title} (Modo Demonstração).`,
              children: [
                {
                  id: "b1-1",
                  label: "Regra geral",
                  summary: "Conecte na Base44 para gerar ramos completos via Arquiteto IA.",
                },
              ],
            },
            {
              id: "b2",
              label: "Pegadinhas da banca",
              summary: "Pontos de troca de conceito (F3) e exceções (V4).",
            },
          ],
        },
        title
      ),
    };
  }
  if (task === "generate-flashcards") {
    return {
      demo: true,
      result: {
        cards: [
          {
            front: `[Demonstração] Qual a regra central de ${payload.topic}?`,
            back: "Conecte-se à Base44 para gerar flashcards GAN reais a partir do seu material.",
            basis: "Modo Demonstração",
          },
        ],
      },
    };
  }
  if (task === "mindmap-gan-questions") {
    return {
      demo: true,
      result: {
        questions: [
          {
            enunciado: `[Demonstração] Em ${payload.topicTitle}, a banca Cebraspe costuma cobrar a literalidade das exceções normativas.`,
            gabarito: "C",
            comentario: "Item ilustrativo de demonstração. Faça login na Base44 para gerar itens inéditos reais via Arquiteto.",
            mecanismo: "V1",
            vacina: "Conferir sempre o dispositivo exato citado no tópico.",
            origem: "inédito Demonstração",
          },
        ],
      },
    };
  }
  return {
    demo: true,
    answer: "Modo Demonstração: faça login na Base44 para consultar o Arquiteto Cognitivo em tempo real.",
  };
}

export async function invokeArchitect({ task, payload = {}, user, isDemo = false }) {
  if (!user || isDemo) {
    return buildDemoFallback(task, payload);
  }
  const res = await base44.functions.invoke("study-architect", {
    task,
    ...payload,
  });
  return res?.data || res || {};
}
