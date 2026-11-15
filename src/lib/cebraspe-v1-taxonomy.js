/** Taxonomia original da versão 1 do Quebrando a Banca. Fonte:
 * scripts/claude-seed/codigo_fonte/servicos/app.js (MEC)
 * scripts/pegadinhas-redesign.js (MEC_MEMORIA)
 * public/claude-export/strategies.js (QBStrategy).
 * Não são categorias oficiais/publicadas pela banca: são uma classificação pedagógica do app.
 * Máximas são adaptações ORIGINAIS inspiradas em princípios estratégicos, não citações literais.
 */
export const CEBRASPE_V1_TAXONOMY = Object.freeze({
  F1:{n:'Generalização',o:'Amplia o alcance da regra além do que a fonte permite.',s:'sempre, nunca, todos, qualquer, independentemente',v:'Procure a exceção que a palavra absoluta apaga.'},
  F2:{n:'Restrição indevida',o:'Diz que a regra só vale num caso quando vale em outros.',s:'apenas, somente, exclusivamente, só',v:'Pergunte: existe outro caso que a fonte admite?'},
  F3:{n:'Troca de conceito',o:'Substitui um termo, instituto, órgão ou classificação por um vizinho parecido.',s:'pares próximos: privativo × exclusivo, nulo × anulável, adjetiva × adverbial',v:'Leia o substantivo-chave e confira se é exatamente o da regra.'},
  F4:{n:'Detalhe alterado',o:'Muda prazo, número, quórum, percentual, órgão ou o verbo de dever.',s:'números, prazos, “mais de” × “no mínimo”, pode × deve',v:'Todo número e todo prazo do item precisam bater com a fonte.'},
  F5:{n:'Regra × exceção',o:'Apresenta a exceção como regra, ou a regra como se não tivesse exceção.',s:'“em regra”, “salvo”, ou a falta deles',v:'Lembre se a regra tem ressalva e se o item a respeita.'},
  F6:{n:'Relação lógica alterada',o:'Muda causa, condição, concessão, finalidade, ordem ou negação entre duas partes verdadeiras.',s:'porque, portanto, desde que, embora, a fim de, não',v:'Cada parte pode ser verdadeira; confira a ligação entre elas.'},
  F7:{n:'Extrapolação',o:'Conclui o que o texto ou a regra não autoriza.',s:'infere-se, conclui-se, o autor defende',v:'Só vale o que o texto diz ou implica necessariamente.'},
  F8:{n:'Fonte superada',o:'Cobra a lei contra a jurisprudência (ou o contrário), posição minoritária ou texto revogado.',s:'“segundo o STF”, redação anterior a emenda',v:'Pergunte qual é a fonte e se ela ainda vale.'},
  F9:{n:'Composição',o:'Junta uma parte certa e uma errada na mesma frase.',s:'e, bem como, além de, ponto e vírgula',v:'Julgue cada parte; basta uma errada.'},
  F10:{n:'Reescrita',o:'Propõe reescrita que muda o sentido ou quebra a correção.',s:'“mantém a correção e o sentido”',v:'Teste sentido e gramática separadamente.'},
  V1:{n:'Paráfrase fiel',o:'Redação diferente da lei ou da aula, com o mesmo sentido.',s:'sinônimos, ordem invertida',v:'Compare o sentido, não as palavras.'},
  V2:{n:'Incompleto não é errado',o:'Cita só parte da regra, sem dizer que é a única.',s:'um requisito, um exemplo',v:'Incompleto é certo, salvo se disser “apenas”.'},
  V3:{n:'Alcance verdadeiro',o:'Usa “sempre”, “nunca” ou “apenas” onde a regra é mesmo absoluta.',s:'palavra absoluta em regra absoluta',v:'Conheça as poucas regras realmente absolutas.'},
  V4:{n:'Exceção real',o:'Cobra uma exceção verdadeira que soa estranha.',s:'caso surpreendente, mas previsto',v:'Lembre as exceções que a banca adora.'}
};);
export const CEBRASPE_V1_MNEMONICS = Object.freeze({
  F1:{lema:'Todo? Ache a exceção.',pergunta:'A regra realmente vale em TODOS os casos?',armadilha:'Uma palavra absoluta amplia uma regra que tem limite.',acao:'Sublinhe “sempre”, “nunca” e “todos”; procure a ressalva na fonte.'},
  F2:{lema:'Só isso? Ache outro caso.',pergunta:'A fonte também permite outra hipótese?',armadilha:'A expressão “apenas” corta possibilidades que a regra permite.',acao:'Transforme “somente” em pergunta: existe mais uma hipótese válida?'},
  F3:{lema:'Parecido não é igual.',pergunta:'Este termo é exatamente o conceito correto?',armadilha:'O item troca um termo por outro próximo, mas diferente.',acao:'Compare os dois conceitos com uma diferença decisiva.'},
  F4:{lema:'Número trocado, item errado.',pergunta:'Prazo, número, quórum ou verbo estão idênticos à fonte?',armadilha:'Um pequeno detalhe derruba todo o enunciado.',acao:'Confira separadamente cada número, prazo, sujeito e verbo de obrigação.'},
  F5:{lema:'Regra ou exceção?',pergunta:'O texto fala da regra geral ou de um caso excepcional?',armadilha:'O item toma a exceção como regra, ou apaga a ressalva.',acao:'Diga a regra primeiro e depois enuncie a exceção.'},
  F6:{lema:'Duas verdades, ligação falsa.',pergunta:'O conector estabelece mesmo essa relação?',armadilha:'Duas afirmações verdadeiras são ligadas por uma causa ou condição falsa.',acao:'Leia as duas metades separadas e teste “porque”, “se”, “embora” e “portanto”.'},
  F7:{lema:'Não invente uma conclusão.',pergunta:'Onde está o apoio literal ou lógico para a conclusão?',armadilha:'O item afirma mais do que a fonte permite concluir.',acao:'Aponte o trecho que sustenta a inferência; sem suporte, desconfie.'},
  F8:{lema:'Fonte certa, data certa.',pergunta:'A fonte, a redação e o entendimento continuam vigentes?',armadilha:'Mistura regras antigas, fontes diferentes ou entendimento superado.',acao:'Identifique a fonte e o marco temporal antes do julgamento.'},
  F9:{lema:'Uma parte falsa derruba tudo.',pergunta:'Todas as partes do item estão corretas?',armadilha:'Esconde uma parte errada entre afirmações verdadeiras.',acao:'Separe as orações ligadas por “e”, “bem como” ou ponto e vírgula.'},
  F10:{lema:'Dois testes: sentido e gramática.',pergunta:'A reescrita preserva o sentido E a correção?',armadilha:'A nova redação parece equivalente, mas muda o sentido ou a norma.',acao:'Compare a ideia original; depois confira regência, concordância e pontuação.'},
  V1:{lema:'Mudou a forma, não a regra.',pergunta:'O sentido continua idêntico apesar das outras palavras?',armadilha:'Uma paráfrase verdadeira parece falsa por não copiar a fonte.',acao:'Traduza as duas frases para a mesma ideia, sem se prender ao vocabulário.'},
  V2:{lema:'Dizer “um” não exclui “outros”.',pergunta:'O item afirma um exemplo ou diz que é o único?',armadilha:'Uma informação incompleta pode ser verdadeira.',acao:'Só trate como exclusão quando aparecer “apenas”, “único” ou equivalente.'},
  V3:{lema:'Nem todo “sempre” é falso.',pergunta:'Há alguma exceção real a essa regra absoluta?',armadilha:'A palavra absoluta assusta, mesmo quando a regra é absoluta.',acao:'Confirme o alcance na fonte; não marque E só por aparecer “nunca”.'},
  V4:{lema:'Estranho pode ser exceção certa.',pergunta:'Essa hipótese incomum está prevista na fonte?',armadilha:'Uma exceção verdadeira contraria a intuição.',acao:'Lembre a hipótese expressa antes de descartar o item.'}
};);
export const CEBRASPE_V1_STRATEGY = Object.freeze({
  "F1": {
    "maxima": "Quem ignora as diferenças do terreno perde antes de avançar.",
    "autor": "Sun Tzu",
    "obra": "A Arte da Guerra",
    "principio": "Reconhecimento do terreno e adaptação às condições",
    "aplicacao": "Na questão, “todos”, “sempre” e “nunca” podem apagar limites e exceções da regra."
  },
  "F2": {
    "maxima": "Não confunda a rota conhecida com o único caminho possível.",
    "autor": "Sun Tzu",
    "obra": "A Arte da Guerra",
    "principio": "Variação de táticas e diversidade de caminhos",
    "aplicacao": "“Somente” e “exclusivamente” podem excluir hipóteses que a norma também permite."
  },
  "F3": {
    "maxima": "O disfarce mais perigoso é o que parece familiar.",
    "autor": "Sun Tzu",
    "obra": "A Arte da Guerra",
    "principio": "Dissimulação e identificação correta do adversário",
    "aplicacao": "Termos parecidos podem designar conceitos diferentes. Reconheça o conceito antes de julgá-lo."
  },
  "F4": {
    "maxima": "Uma medida descuidada compromete toda a manobra.",
    "autor": "Miyamoto Musashi",
    "obra": "O Livro dos Cinco Anéis",
    "principio": "Atenção às pequenas coisas e precisão na prática",
    "aplicacao": "Um número, prazo, quórum ou verbo alterado basta para mudar a resposta."
  },
  "F5": {
    "maxima": "Conhecer a regra é também reconhecer o terreno da exceção.",
    "autor": "Sun Tzu",
    "obra": "A Arte da Guerra",
    "principio": "Condições do terreno e escolhas adequadas a cada situação",
    "aplicacao": "A assertiva pode apresentar o caso excepcional como se fosse a regra geral."
  },
  "F6": {
    "maxima": "Duas posições corretas não garantem uma ponte verdadeira.",
    "autor": "Carl von Clausewitz",
    "obra": "Da Guerra",
    "principio": "Relação entre partes, meios e finalidade do conjunto",
    "aplicacao": "Teste o nexo entre duas afirmações, principalmente “porque”, “logo” e “desde que”."
  },
  "F7": {
    "maxima": "Não avance além do alcance de sua inteligência.",
    "autor": "Sun Tzu",
    "obra": "A Arte da Guerra",
    "principio": "Reconhecimento e uso de informações antes da ação",
    "aplicacao": "Uma conclusão só pode ser aceita se a fonte a sustentar."
  },
  "F8": {
    "maxima": "A estratégia de ontem não substitui o reconhecimento de hoje.",
    "autor": "Carl von Clausewitz",
    "obra": "Da Guerra",
    "principio": "Incerteza, mudança de circunstâncias e fricção",
    "aplicacao": "Antes de julgar, confira a vigência da lei e o entendimento efetivamente exigido."
  },
  "F9": {
    "maxima": "Uma única brecha pode decidir a batalha.",
    "autor": "Antoine-Henri Jomini",
    "obra": "A Arte da Guerra",
    "principio": "Identificar o ponto decisivo",
    "aplicacao": "Divida o enunciado em proposições: uma parte falsa torna o item composto errado."
  },
  "F10": {
    "maxima": "Não se renda à aparência: examine o que mudou.",
    "autor": "Nicolau Maquiavel",
    "obra": "O Príncipe",
    "principio": "Distinção entre aparência e realidade",
    "aplicacao": "Uma reescrita só é correta se preservar o sentido e respeitar a gramática."
  },
  "V1": {
    "maxima": "A formação pode mudar sem abandonar o princípio.",
    "autor": "Miyamoto Musashi",
    "obra": "O Livro dos Cinco Anéis",
    "principio": "Adaptar a forma sem perder a essência da técnica",
    "aplicacao": "Uma paráfrase pode mudar a redação e conservar integralmente o significado."
  },
  "V2": {
    "maxima": "Um mapa incompleto não é necessariamente um mapa falso.",
    "autor": "Carl von Clausewitz",
    "obra": "Da Guerra",
    "principio": "Informações parciais e julgamento sob incerteza",
    "aplicacao": "Uma regra pode ser verdadeira mesmo que cite apenas uma hipótese, sem excluir as demais."
  },
  "V3": {
    "maxima": "Não abandone a posição firme apenas por desconfiar de sua força.",
    "autor": "Sun Tzu",
    "obra": "A Arte da Guerra",
    "principio": "Avaliação das posições realmente sólidas",
    "aplicacao": "“Sempre” e “nunca” não tornam um item errado quando a regra é de fato absoluta."
  },
  "V4": {
    "maxima": "O caminho inesperado também pode conduzir à vitória.",
    "autor": "Sun Tzu",
    "obra": "A Arte da Guerra",
    "principio": "Combinação do esperado com o extraordinário",
    "aplicacao": "Uma exceção pouco intuitiva continua correta quando está expressamente prevista."
  }
});
export const CEBRASPE_V1_ORDER = Object.freeze(['F3','F6','F1','F9','F2','F5','F7','F4','F8','F10','V1','V4','V3','V2']);
export const CEBRASPE_V1_CODES = Object.freeze(Object.keys(CEBRASPE_V1_TAXONOMY));
export function mechanismForKey(code, answer) {
  const normalized = String(code || '').trim().toUpperCase();
  const key = String(answer || '').trim().toUpperCase();
  return Object.hasOwn(CEBRASPE_V1_TAXONOMY, normalized) &&
    (key === 'E' ? normalized.startsWith('F') : key === 'C' ? normalized.startsWith('V') : false);
}
export function mechanismDetail(code) {
  const id = String(code || '').trim().toUpperCase();
  const d = CEBRASPE_V1_TAXONOMY[id], m = CEBRASPE_V1_MNEMONICS[id], strategy = CEBRASPE_V1_STRATEGY[id];
  return d ? { code: id, ...d, ...(m||{}), strategy } : null;
}
export function mechanismOptionList(answer) {
  return CEBRASPE_V1_ORDER.filter(code => mechanismForKey(code, answer)).map(code => ({
    value: code,
    label: code + ' · ' + CEBRASPE_V1_TAXONOMY[code].n,
    question: CEBRASPE_V1_MNEMONICS[code]?.pergunta || '',
  }));
}
export const CEBRASPE_V1_GENERATION_RULES = [
  'TAXONOMIA PEDAGÓGICA ORIGINAL QB V1 — CEBRASPE C/E (F1–F10 e V1–V4):',
  ...CEBRASPE_V1_CODES.map(code => {
    const m = CEBRASPE_V1_TAXONOMY[code];
    return code + ' (' + m.n + '): ' + m.o + ' Pistas: ' + m.s + '. Vacina: ' + m.v;
  }),
  'Use F1–F10 exclusivamente em itens ERRADOS e V1–V4 exclusivamente em itens CERTOS. Uma classificação precisa corresponder ao mecanismo EFETIVAMENTE aplicado, não apenas a uma palavra-chave do enunciado.',
  'Não invente mecanismo quando o item não o sustenta. Se houver incompatibilidade entre gabarito, mecanismo e fundamento, reescreva ou rejeite o item; nunca escolha um código arbitrário.',
  'Cada item testa UMA regra com gabarito inequívoco e fonte verificável. Use apenas texto fornecido no mapa, na lei ou no material do estudante; não invente artigo, prazo, quórum, competência ou jurisprudência.',
  'Em item E, indique o trecho literal que falsifica a assertiva e escreva a versão correta por extenso. Em item C, indique o trecho da fonte que sustenta a proposição.',
  'Não crie pistas artificiais como sempre/nunca sem respaldo. Não apresente itens gerados por IA como questões reais de concurso.',
  'V2: citar uma hipótese sem declarar que ela é a única NÃO torna a afirmação falsa. V3: jamais considerar palavras absolutas erradas por heurística, sem verificar o alcance real.',
  'O sinal é hipótese de investigação, não prova. Diferencie frequência medida em amostra de prova, desempenho do estudante e exemplos hipotéticos.',
].join('\n');
export const CEBRASPE_V1_TUTOR_RULES = [
  'Na análise de C/E, use os 14 mecanismos de falsificação/verdade aparente do catálogo QB V1; nunca alegue que a taxonomia é oficial da banca.',
  'Não revele o gabarito ANTES do estudante responder e declarar confiança (1 chute, 2 dúvida, 3 certeza). Uma pergunta de cada vez.',
  'Depois da resposta, exponha: código e nome, trecho decisivo, regra verdadeira, vacina, pergunta de evocação.',
  'Priorize erros com certeza, erros de interferência e reincidência, quando dados reais estiverem disponíveis. Acerto por chute não é domínio.',
  'Se a informação não estiver na fonte, indique insuficiência e não invente gabarito, artigo nem incidência da banca.',
  'Ao produzir uma questão CEBRASPE inédita, sempre declarar que é inédita; um mecanismo F exige item E e V exige item C.',
  'Encerrar com uma pergunta de recuperação ativa e evitar resumos passivos longos.',
].join('\n');
