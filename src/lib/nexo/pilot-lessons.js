// The LG kit is absent from the checkout. This scoped pilot lesson cites the local course PDF.
export const LG_LESSON = {
  subjectId: 'lg', topicId: 'lg-3-2', nodeId: 'piloto-lg-3-2-ideia-central',
  reference: 'Linguística, Etapa 09, cap. 3.2, p. 2 (síntese do piloto). Parágrafos de aplicação fictícios e originais.',
  lines: [
    'Uma formulação da ideia principal precisa abranger o parágrafo inteiro.',
    'Um detalhe pode sustentar essa ideia ao apresentar um exemplo concreto.',
  ],
  referenceLevel: 'node',
};

const situation = (id, label) => ({ id, label });
const match = (id, label, expected, explanation) => ({ id, label, expected, explanation });

export const PILOT_BOARDS = {
  'cp8-influencia': {
    title: 'Mecanismos de influência diplomática',
    instruction: 'Associe cada situação ao mecanismo que explica a decisão do país.',
    pieces: [
      situation('sancao', 'Um governo muda seu voto para evitar o bloqueio de suas exportações.'),
      situation('cultura', 'Um governo adota um programa cultural estrangeiro que passou a admirar.'),
    ],
    slots: [
      match('atracao', 'Soft power', 'cultura', 'O prestígio cultural atrai adesão voluntária ao programa.'),
      match('coercao', 'Hard power', 'sancao', 'O custo comercial anunciado pressiona o governo a mudar o voto.'),
    ],
  },
  'lg32-leitura': {
    title: 'Ideia principal e apoio no parágrafo',
    passage: 'A biblioteca decidiu facilitar o empréstimo para quem trabalha longe. Passou a atender até as oito da noite. Também instalou uma caixa de devolução junto à estação.',
    instruction: 'Leia o parágrafo e associe cada afirmação à função que desempenha.',
    pieces: [
      situation('detalhe', 'A biblioteca ampliou o horário de atendimento.'),
      situation('central', 'A biblioteca facilitou o empréstimo para quem trabalha longe.'),
    ],
    slots: [
      match('abrangencia', 'Ideia principal', 'central', 'Facilitar o empréstimo explica tanto a mudança no horário quanto a caixa junto à estação.'),
      match('exemplo', 'Detalhe de apoio', 'detalhe', 'O horário estendido exemplifica uma medida específica da biblioteca.'),
    ],
  },
};
