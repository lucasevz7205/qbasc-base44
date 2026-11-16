const greeting = /^\s*(?:\*\*|__)?(?:olá|oi|salve|bom dia|boa tarde|boa noite)(?=\s*[,!.:—*]|$)(?:[ \t]*,[^.\n!?]{1,80})?[ \t]*[.!:—]?(?:\*\*|__)?\s*/iu;
const intro = /^\s*(?:\*\*|__)?(?:sou|eu sou|aqui é) (?:o )?arquiteto\b[.!]?(?:\*\*|__)?\s*/iu;

export function continueTutorConversation(reply, hasHistory) {
  if (!hasHistory) return reply;
  return reply.replace(greeting, '').replace(intro, '').trimStart() ||
    'O Arquiteto não devolveu uma resposta para esta mensagem. Tente novamente.';
}
