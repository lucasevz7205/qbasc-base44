/**
 * Regras de checagem das afirmações do Arquiteto (modo Socrático e demais modos do tutor).
 * Puro: sem efeitos, sem chamadas externas e sem dados do banco.
 * Usado por askArchitectTutor em src/lib/server-fns.js.
 */

export const ARCHITECT_CLAIM_RULES = [
  'Ao afirmar uma regra gramatical, jurídica ou de procedimento, separe a resposta em três blocos curtos: (a) "Na fonte": somente o que estiver no texto fornecido nesta mensagem (enunciado, gabarito, comentário, material ou histórico do estudante); (b) "Classificação do Arquiteto": seu raciocínio, com o critério usado; (c) "Hipótese": o que não tiver base no texto fornecido e precisa ser conferido em material oficial.',
  'Se não houver texto de fonte nesta mensagem que sustente a afirmação, use a palavra "hipótese", e não "regra". Não cite obras, autores, páginas, artigos ou aulas de memória; cite apenas o que estiver no texto fornecido.',
  'Quando o estudante contestar uma afirmação sua, reexamine essa afirmação antes de responder: releia o critério que a sustentou e o caso que ele trouxe. Se ela estiver errada, reconheça o erro de forma direta, corrija-a e explique a diferença entre os casos. Se estiver correta, explique o critério em poucas frases, sem repetir a afirmação sem argumento novo.',
  'Nunca mantenha uma posição só porque ela foi dita antes na conversa.',
  'Nunca responda a uma contestação com "pesquise você mesmo", "consulte a fonte" ou pedindo ao estudante que avalie a confiança numa regra como substituto da sua própria checagem. Você faz a checagem; o estudante pode consultar o material como complemento.',
].join('\n');

// Sinais de contestação em português: o aluno discorda, aponta erro ou pede revisão.
const CONTESTATION_PATTERN = /(?:\berrad[oa]s?\b|\bincorret[oa]s?\b|\bn[ãa]o\s+(?:est[áa]|[ée]|s[ãa]o)\s+(?:certo|certa|assim|correto|correta|verdade)|\bdiscordo\b|\bn[ãa]o\s+concordo\b|\bn[ãa]o\s+[ée]\s+isso\b|\btem\s+certeza\b|\bn[ãa]o\s+existe\s+(?:essa\s+)?regra\b|\bisso\s+n[ãa]o\s+[ée]\s+(?:regra|assim)\b|\bsegundo\s+(?:a|o)\s+(?:aula|fonte|material|livro)\b)/iu;

/**
 * Indica se a mensagem do estudante contesta a afirmação anterior do tutor.
 * Heurística deliberadamente simples: serve só para acionar a diretriz de reexame.
 */
export function isTutorContestation(userMessage) {
  return typeof userMessage === "string" && CONTESTATION_PATTERN.test(userMessage);
}

/**
 * Diretriz extra, só quando há histórico e a mensagem atual contesta o tutor.
 * Sem histórico ou sem contestação, retorna string vazia.
 */
export function tutorContestationDirective(userMessage, hasHistory) {
  if (!hasHistory || !isTutorContestation(userMessage)) return "";
  return [
    "Reexame obrigatório: a mensagem atual contesta uma afirmação sua.",
    "Antes de responder, identifique no histórico a última afirmação do Arquiteto que está sendo contestada.",
    "Reexamine-a segundo as regras de checagem acima, diga explicitamente se ela estava certa ou errada e, se estava errada, reconheça o erro e corrija em uma frase direta.",
  ].join(" ");
}
