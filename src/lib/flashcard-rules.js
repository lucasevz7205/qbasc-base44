// Regras de cartões do QB Ascensão (claude/Regras_de_Perguntas.md, regras 1 a 16, de 16/11/2026).
// Fonte única: usada na geração a partir de material e na revisão editorial de cartões.
export const FLASHCARD_RULES = [
  "PADRÃO DE CARTÃO (obrigatório; o cartão deve passar no teste do leitor frio: quem estudou o tópico, mas não viu o mapa, sabe exatamente o que responder).",
  "1. FRENTE sem prefixo de matéria e assunto: o app já mostra os dois no cabeçalho do cartão. Comece direto pela pergunta e coloque o recorte necessário dentro dela. Não escreva 'Matéria · tópico:' na frente; guarde matéria e tópico nos metadados e remova o prefixo da pergunta.",
  "2. UMA resposta definida por cartão (número, prazo, artigo, nome, termo, conjunto curto e fechado). Proibido 'explique', 'comente', 'fale sobre'.",
  "3. UM conceito por cartão. Se a afirmação tem duas ideias, gere dois cartões.",
  "4. Pista no enunciado: diga o recorte; se for para classificar, liste as opções na própria frente. Prefira lacunas ('___') a 'cite'.",
  "5. Defina termos, siglas e classificações na própria frente. Proibida metalinguagem solta ('o caso da aula', 'o que a banca costuma cobrar') sem dizer o contexto.",
  "6. Se a resposta é uma lista, diga o tamanho dela na frente. Listas com mais de 3 itens viram lacunas sobrepostas: um cartão por item, mostrando os demais.",
  "7. Norma que muda (prazo, quórum, redação de artigo, competência): a frente traz o dispositivo e, se couber, a data ou a vigência de referência. Se o texto-base não tiver a data, não a invente.",
  "8. Conceitos vizinhos que a banca troca (privativa × exclusiva, vírgula obrigatória × facultativa, espécies próximas) pedem um cartão de contraste: a frente apresenta os dois e pergunta a diferença em uma resposta curta.",
  "9. VERSO: só a resposta curta (até 3 frases) e a fonte (dispositivo ou trecho do material). Sem reexplicar a matéria.",
  "10. Citação sempre entre aspas curvas, com aspas internas simples.",
  "11. Fidelidade: use só o texto fornecido. Não crie artigo, prazo, número, jurisprudência ou fonte ausentes do texto. Se o texto não sustenta a resposta, não gere o cartão e diga isso.",
  "12. Texto vindo de outra IA (Gemini, NotebookLM), apostila ou resumo é matéria-prima, nunca cartão pronto: reescreva no padrão acima, sem copiar a redação.",
].join("\n");
