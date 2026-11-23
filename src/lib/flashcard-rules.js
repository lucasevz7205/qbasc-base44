// Metodologia de flashcards do QB Ascensão (16 regras completas).
// Fundamentos científicos: recuperação ativa, princípio da informação mínima,
// contextualização independente e revisão espaçada (Conhecimentos/pesquisa_flashcards_repeticao_espacada_cebraspe.md).
// Nota documental: o comentário legado citava "claude/Regras_de_Perguntas.md (regras 1 a 16)",
// mas enumerava apenas 12 regras; este módulo completa e unifica as 16 regras pedagógicas.

export const FLASHCARD_CARD_TYPES = Object.freeze([
  'factual',
  'contraste',
  'aplicacao',
  'lacuna',
]);

export const FLASHCARD_RULE_SPECS = Object.freeze([
  {
    number: 1,
    code: 'contextualizacao',
    title: 'Metadados fora da frente',
    text: '1. FRENTE sem prefixo de matéria e assunto: o app já exibe matéria e assunto no cabeçalho. Comece direto pela pergunta e mantenha na frente apenas o recorte indispensável à interpretação. Nunca escreva "Matéria · assunto:" no início da frente.',
  },
  {
    number: 2,
    code: 'univocidade',
    title: 'Resposta única e conferível',
    text: '2. UMA resposta definida e conferível por cartão (prazo, quórum, artigo, conceito delimitado, critério objetivo ou aplicação fechada). Proibido pedir "explique", "comente", "fale sobre" ou "discorra" de forma aberta.',
  },
  {
    number: 3,
    code: 'atomicidade',
    title: 'Princípio da informação mínima',
    text: '3. UM alvo de recuperação por cartão. Se uma pergunta cobra duas ideias, dois requisitos independentes ou duas perguntas na mesma frente, divida em cartões separados.',
  },
  {
    number: 4,
    code: 'tipo_cartao',
    title: 'Tipos permitidos com alvo explícito',
    text: '4. Escolha o tipo mais adequado ao conhecimento: factual, contraste, aplicação ou lacuna ("___"). A técnica de lacunas não é obrigatória; todo cartão deve ter um alvo de recuperação identificável.',
  },
  {
    number: 5,
    code: 'autonomia',
    title: 'Teste do leitor frio',
    text: '5. Autonomia total: a pergunta deve ser compreensível sem visualizar o mapa mental, o PDF ou outro cartão. Defina termos, siglas e classificações necessários na própria frente e elimine metalinguagem solta ("neste nó", "na aula acima", "conforme o trecho").',
  },
  {
    number: 6,
    code: 'listas',
    title: 'Decomposição de listas extensas',
    text: '6. Listas fechadas curtas (até 3 itens) devem indicar o tamanho esperado na frente. Listas com mais de 3 itens não podem virar um único cartão: divida por item, por critério discriminativo ou em lacunas sobrepostas.',
  },
  {
    number: 7,
    code: 'vigencia',
    title: 'Referência normativa e vigência',
    text: '7. Em conteúdo normativo sujeito a alteração (prazo, quórum, redação de dispositivo, competência, súmula), registre a referência normativa exata e, quando constar na fonte, a versão ou data de conferência. Nunca invente data ou dispositivo.',
  },
  {
    number: 8,
    code: 'contraste',
    title: 'Contraste discriminativo de conceitos vizinhos',
    text: '8. Conceitos vizinhos frequentemente confundidos pela banca (ex.: privativa × exclusiva, gestão × fiscalização, vírgula obrigatória × facultativa) pedem cartão de contraste apresentando ambos e cobrando o critério distintivo em resposta objetiva.',
  },
  {
    number: 9,
    code: 'concisao',
    title: 'Verso conciso sem amputar qualificações',
    text: '9. VERSO objetivo (preferencialmente até 3 frases) trazendo a resposta direta, qualificações essenciais (exceções ou ressalvas indispensáveis) e a referência da fonte. Sem reexplicar a aula inteira.',
  },
  {
    number: 10,
    code: 'citacao',
    title: 'Fidelidade formal em citações',
    text: '10. Citações literais devem vir entre aspas curvas (“...”), usando aspas simples (‘...’) para citações internas, preservando o texto exato do dispositivo ou da fonte.',
  },
  {
    number: 11,
    code: 'fidelidade',
    title: 'Ancoragem estrita na fonte acessível',
    text: '11. Fidelidade documental: use exclusivamente o texto-fonte acessível. Não invente artigo, prazo, número, exceção, jurisprudência ou referência ausente. Se a fonte não sustenta a resposta, bloqueie ou não gere o cartão.',
  },
  {
    number: 12,
    code: 'reescrita_ativa',
    title: 'Matéria-prima não é cartão pronto',
    text: '12. Texto de apostila, resumo, mapa mental ou outra IA é matéria-prima, nunca cartão pronto: formule o cartão para evocação ativa no padrão acima, sem copiar parágrafos inteiros.',
  },
  {
    number: 13,
    code: 'nao_redundancia',
    title: 'Não redundância de alvo de recuperação',
    text: '13. Evite cartões redundantes no mesmo lote ou baralho: não repita o mesmo alvo de recuperação apenas mudando palavras superficiais, salvo quando houver ângulo cognitivo distinto e justificado.',
  },
  {
    number: 14,
    code: 'remissao',
    title: 'Remissão íntegra a tópico e nó do mapa',
    text: '14. Preserve topicId nos metadados e o identificador exato do nó do mapa (mapaNoId) somente quando houver evidência desse vínculo no mapa de origem.',
  },
  {
    number: 15,
    code: 'anti_ilusao',
    title: 'Prevenção de memória falsa em pegadinhas',
    text: '15. Evite formular frentes como afirmações falsas soltas que induzam efeito de verdade ilusória; cobre a regra verdadeira, o contraste ou a aplicação concreta com resposta corretiva inequívoca.',
  },
  {
    number: 16,
    code: 'revisao_independente',
    title: 'Verificação independente e aprovação humana',
    text: '16. Todo cartão gerado passa por validação determinística e revisão cega independente (recuperação pela frente + fonte, sem ver o verso proposto) e exige aprovação humana antes de entrar no baralho definitivo.',
  },
]);

export const FLASHCARD_RULES = [
  'PADRÃO DE CARTÃO DO QB ASCENSÃO (16 regras obrigatórias; recuperação ativa, informação mínima, contextualização independente e revisão espaçada):',
  ...FLASHCARD_RULE_SPECS.map(rule => rule.text),
].join('\n');
