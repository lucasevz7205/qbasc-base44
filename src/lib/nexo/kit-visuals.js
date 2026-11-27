// Source-bound visual models for the CP-6, CP-7 and TI-5.3 kits.
// Same contract as dahl-puzzle.js and functional-architecture.js: every piece and slot
// restates text that already exists in the kit node, and the model is only offered
// when each anchor is found verbatim in that node (fail closed on any kit change).
import {validPuzzle} from './association-puzzle.js';

const CP6='kit-arr-cp-6-teoria-dos-partidos-politicos-2026-11-26-';
const CP7='kit-arr-cp-7-organizacao-politica-brasileira-2026-11-26-';
const TI53='kit-arr-ti-5.3-ia-generativa-conceitos-exemplos-e-casos-2026-11-25-';

const slot=(id,label,expected,explanation)=>({id,label,expected,explanation});
const piece=(id,label)=>({id,label});

export const KIT_PUZZLES=Object.freeze([
  {
    id:'cp6-sartori',subjectId:'cp',topicId:'cp-6',prefix:CP6,
    type:'Escada classificatória',title:'Escada de Sartori',icon:'layers',
    desc:'Ordene os sete tipos de sistema partidário e separe competitivos de não competitivos.',
    nodes:['r4.2','r4.3'],
    anchors:[
      ['r4.2','Partido único (só um é permitido)'],
      ['r4.2','hegemônico (outros existem como satélites, sem alternância possível)'],
      ['r4.2','predominante (competição livre, mas um partido vence seguidamente com maioria absoluta das cadeiras)'],
      ['r4.2','bipartidarismo; pluralismo moderado; pluralismo polarizado; atomizado'],
      ['r4.2','Os dois primeiros são não competitivos; os demais, competitivos'],
      ['r4.3','de três a cinco partidos relevantes, pequena distância ideológica, competição centrípeta'],
      ['r4.3','mais de cinco partidos, grande distância ideológica'],
      ['r4.3','competição centrífuga']
    ],
    stages:[
      {id:'escada',label:'Ordem dos tipos',node:'r4.2',layout:'matrix',structure:'hierarchical',format:'Escada classificatória',
        instruction:'Encaixe os sete tipos na ordem da tipologia. Os dois primeiros degraus são não competitivos.',
        pieces:[piece('atomizado','Atomizado'),piece('hegemonico','Hegemônico'),piece('moderado','Pluralismo moderado'),piece('unico','Partido único'),piece('bipartidarismo','Bipartidarismo'),piece('polarizado','Pluralismo polarizado'),piece('predominante','Predominante')],
        slots:[
          slot('d1','1º degrau · não competitivo','unico','Partido único: só um partido é permitido.'),
          slot('d2','2º degrau · não competitivo','hegemonico','Hegemônico: outros partidos existem como satélites, sem alternância possível.'),
          slot('d3','3º degrau · competitivo','predominante','Predominante: há competição livre, mas um partido vence seguidamente com maioria absoluta das cadeiras.'),
          slot('d4','4º degrau · competitivo','bipartidarismo','Bipartidarismo: quarto tipo da lista, já no campo competitivo.'),
          slot('d5','5º degrau · competitivo','moderado','Pluralismo moderado: de três a cinco partidos relevantes, competição centrípeta.'),
          slot('d6','6º degrau · competitivo','polarizado','Pluralismo polarizado: mais de cinco partidos, grande distância ideológica, competição centrífuga.'),
          slot('d7','7º degrau · competitivo','atomizado','Atomizado: último tipo da tipologia.')
        ]},
      {id:'traco',label:'Traço de cada tipo',node:'r4.3',layout:'matrix',structure:'comparative',format:'Quadro comparativo',
        instruction:'Associe cada descrição ao tipo correspondente. Há peças que não se encaixam.',
        pieces:[piece('polarizado','Pluralismo polarizado'),piece('unico','Partido único'),piece('bipartidarismo','Bipartidarismo'),piece('predominante','Predominante'),piece('moderado','Pluralismo moderado'),piece('hegemonico','Hegemônico')],
        slots:[
          slot('t-unico','Só um partido é permitido','unico','Partido único: não competitivo.'),
          slot('t-hegemonico','Outros existem como satélites, sem alternância possível','hegemonico','Hegemônico: não competitivo, apesar de haver outros partidos.'),
          slot('t-predominante','Competição livre, mas um partido vence seguidamente com maioria absoluta','predominante','Predominante: competitivo. Não confundir com hegemônico ou partido único.'),
          slot('t-moderado','Três a cinco relevantes, pequena distância ideológica, competição centrípeta','moderado','Pluralismo moderado: converge para o centro, governos de coalizão.'),
          slot('t-polarizado','Mais de cinco, grande distância ideológica, competição centrífuga','polarizado','Pluralismo polarizado: oposições bilaterais e antissistema; a competição foge do centro.')
        ]}
    ]
  },
  {
    id:'cp6-modelos',subjectId:'cp',topicId:'cp-6',prefix:CP6,
    type:'Linha do tempo',title:'Modelos de partido no tempo',icon:'timer',
    desc:'Encaixe autores, anos e traços na sequência Duverger, Kirchheimer, Panebianco, Katz e Mair.',
    nodes:['r2','r2.1','r2.2','r2.3','r2.4','r2.5'],
    anchors:[
      ['r2','Duverger (1951)'],['r2','Kirchheimer (1966)'],['r2','Panebianco (1982)'],['r2','Katz e Mair (1995)'],
      ['r2.1','partidos nascidos de grupos parlamentares e comitês eleitorais'],['r2.1','criados por organizações fora do parlamento, como sindicatos e igrejas'],
      ['r2.2','poucos membros, notáveis, financiamento por grandes doadores, base no comitê'],['r2.2','muitos filiados, contribuição dos membros, educação política, base na seção'],
      ['r2.3','redução da bagagem ideológica'],['r2.3','busca de eleitores de todas as classes'],
      ['r2.4','profissionais especializados (marketing, comunicação), apelo ao eleitor de opinião'],
      ['r2.5','se aproximam do Estado, vivem de recursos públicos e cooperam entre si para limitar a entrada de novos competidores']
    ],
    stages:[
      {id:'linha',label:'Autor e ano',node:'r2',layout:'matrix',structure:'temporal',format:'Quadro cronológico',
        instruction:'Encaixe cada modelo no marco da linha do tempo.',
        pieces:[piece('cartel','Partido cartel'),piece('massa','Partido de massa'),piece('pegatudo','Pega-tudo (catch-all)'),piece('quadros','Partido de quadros'),piece('profissional','Profissional-eleitoral')],
        slots:[
          slot('l-quadros','1951 · Duverger · base no comitê','quadros','Partido de quadros: poucos membros, notáveis, grandes doadores, base no comitê.'),
          slot('l-massa','1951 · Duverger · base na seção','massa','Partido de massa: muitos filiados, contribuição dos membros, educação política, base na seção.'),
          slot('l-pegatudo','1966 · Kirchheimer','pegatudo','Pega-tudo: menos ideologia, eleitores de todas as classes.'),
          slot('l-profissional','1982 · Panebianco','profissional','Profissional-eleitoral: profissionais especializados e eleitor de opinião.'),
          slot('l-cartel','1995 · Katz e Mair','cartel','Cartel: partidos perto do Estado, contra novos competidores.')
        ]},
      {id:'tracos',label:'Traço de cada modelo',node:'r2.2',layout:'matrix',structure:'comparative',format:'Quadro comparativo',
        instruction:'Associe cada traço ao modelo descrito pelo material.',
        pieces:[piece('profissional','Profissional-eleitoral'),piece('quadros','Partido de quadros'),piece('cartel','Partido cartel'),piece('massa','Partido de massa'),piece('pegatudo','Pega-tudo (catch-all)')],
        slots:[
          slot('t-quadros','Poucos membros, notáveis, grandes doadores, comitê','quadros','Duverger: partido de quadros. Não descrevê-lo com traços do de massa.'),
          slot('t-massa','Muitos filiados, contribuição dos membros, educação política, seção','massa','Duverger: partido de massa.'),
          slot('t-pegatudo','Menos bagagem ideológica, eleitores de todas as classes','pegatudo','Kirchheimer (1966): pega-tudo.'),
          slot('t-profissional','Profissionais de marketing e comunicação, eleitor de opinião','profissional','Panebianco (1982): profissional-eleitoral, oposto ao burocrático de massa.'),
          slot('t-cartel','Perto do Estado, recursos públicos, cooperação contra novos competidores','cartel','Katz e Mair (1995): partido cartel.')
        ]},
      {id:'origem',label:'Origem (Duverger)',node:'r2.1',layout:'matrix',structure:'comparative',format:'Quadro comparativo por origem',
        instruction:'Origem e estrutura são critérios diferentes. Encaixe a origem.',
        pieces:[piece('externa','Origem externa'),piece('interna','Origem interna')],
        slots:[
          slot('o-interna','Grupos parlamentares e comitês eleitorais','interna','Origem interna (eleitoral e parlamentar), como conservadores e liberais do século XIX.'),
          slot('o-externa','Organizações fora do parlamento, como sindicatos e igrejas','externa','Origem externa; exemplo clássico, o Partido Trabalhista britânico.')
        ]}
    ]
  },
  {
    id:'cp7-competencias',subjectId:'cp',topicId:'cp-7',prefix:CP7,
    type:'Quadro de encaixe',title:'Quadro da repartição de competências',icon:'puzzle',
    desc:'Ligue cada tipo de competência ao ente titular e ao artigo da Constituição.',
    nodes:['r2.2'],
    anchors:[
      ['r2.2','Exclusiva (material) e privativa (legislativa) da União: arts. 21 e 22'],
      ['r2.2','Comum (material), de todos os entes em cooperação: art. 23'],
      ['r2.2','Concorrente (legislativa): União edita normas gerais e Estados e DF suplementam: art. 24'],
      ['r2.2','Remanescente: Estados (art. 25, § 1º)'],
      ['r2.2','Interesse local: Municípios (art. 30)'],
      ['r2.2','Cumulativa: Distrito Federal, com competências de Estado e de Município']
    ],
    stages:[
      {id:'quadro',label:'Tipo → titular e artigo',node:'r2.2',layout:'matrix',structure:'relational',format:'Quadro de competências',
        instruction:'Encaixe o titular e o artigo de cada tipo de competência.',
        pieces:[piece('df','Distrito Federal · art. 32'),piece('todos','Todos os entes · art. 23'),piece('municipios','Municípios · art. 30'),piece('uniao','União · arts. 21 e 22'),piece('estados','Estados · art. 25, § 1º'),piece('concorrente','União (normas gerais) + Estados e DF (suplementar) · art. 24')],
        slots:[
          slot('c-exclusiva','Exclusiva (material) e privativa (legislativa)','uniao','Exclusiva e privativa: União, arts. 21 e 22.'),
          slot('c-comum','Comum (material), em cooperação','todos','Comum: todos os entes, em cooperação, art. 23.'),
          slot('c-concorrente','Concorrente (legislativa)','concorrente','Concorrente: a União edita normas gerais e Estados e DF suplementam, art. 24.'),
          slot('c-remanescente','Remanescente','estados','Remanescente: Estados, art. 25, § 1º.'),
          slot('c-local','Interesse local','municipios','Interesse local: Municípios, art. 30.'),
          slot('c-cumulativa','Cumulativa (Estado + Município)','df','Cumulativa: Distrito Federal, vedada sua divisão em Municípios, art. 32.')
        ]}
    ]
  },
  {
    id:'cp7-consulta',subjectId:'cp',topicId:'cp-7',prefix:CP7,
    type:'Linha do ato',title:'Plebiscito, referendo e iniciativa popular',icon:'timer',
    desc:'Posicione as consultas antes ou depois do ato, monte a convocação e a regra 1 – 5 – 0,3.',
    nodes:['r3.1','r3.2','r3.3'],
    anchors:[
      ['r3.1','O plebiscito é convocado com anterioridade ao ato legislativo ou administrativo'],
      ['r3.1','o referendo, com posterioridade, para ratificação ou rejeição'],
      ['r3.2','são convocados por decreto legislativo, por proposta de pelo menos um terço dos membros de qualquer das Casas'],
      ['r3.2','A aprovação do decreto segue a regra geral de maioria'],
      ['r3.2','O Presidente da República não os convoca por decreto'],
      ['r3.3','apresentação de projeto de lei à Câmara dos Deputados'],
      ['r3.3','no mínimo 1% do eleitorado nacional, distribuído por pelo menos cinco Estados, com não menos de 0,3% dos eleitores de cada um deles']
    ],
    stages:[
      {id:'ato',label:'Antes ou depois do ato',node:'r3.1',layout:'act',structure:'temporal',format:'Linha do ato',
        reviewTogether:true,
        instruction:'Posicione as consultas em relação ao ato e indique a finalidade do referendo.',
        pieces:[piece('referendo','Referendo'),piece('iniciativa','Iniciativa popular'),piece('propor','Propor um projeto de lei'),piece('plebiscito','Plebiscito'),piece('ratificar','Ratificar ou rejeitar o ato'),piece('orientar','Consultar a população sobre uma medida ainda em discussão')],
        slots:[
          slot('antes','Consulta antes do ato','plebiscito','O plebiscito é convocado com anterioridade ao ato.'),
          slot('depois','Consulta depois do ato','referendo','O referendo é convocado com posterioridade ao ato.'),
          slot('finalidade','Finalidade do referendo','ratificar','No referendo, o povo ratifica ou rejeita o ato.')
        ]},
      {id:'convocacao',label:'Convocação',node:'r3.2',layout:'matrix',structure:'relational',format:'Quadro de convocação',
        instruction:'Monte a convocação de plebiscito e referendo em questões de relevância nacional.',
        pieces:[piece('presidente','Decreto do Presidente da República'),piece('maioria','Regra geral de maioria'),piece('decreto','Decreto legislativo'),piece('terco','1/3 dos membros de qualquer das Casas')],
        slots:[
          slot('instrumento','Instrumento de convocação','decreto','Decreto legislativo (Lei nº 9.709/1998, art. 3º). O Presidente não os convoca por decreto.'),
          slot('proposta','Proposta mínima','terco','Pelo menos um terço dos membros de qualquer das Casas do Congresso.'),
          slot('aprovacao','Aprovação do decreto','maioria','A aprovação segue a regra geral de maioria.')
        ]},
      {id:'iniciativa',label:'Iniciativa popular 1 – 5 – 0,3',node:'r3.3',layout:'matrix',structure:'relational',format:'Quadro de requisitos',
        instruction:'Complete os requisitos da iniciativa popular de lei.',
        pieces:[piece('cinco','5 Estados'),piece('senado','Senado Federal'),piece('um','1% do eleitorado nacional'),piece('camara','Câmara dos Deputados'),piece('zerotres','0,3% dos eleitores de cada Estado')],
        slots:[
          slot('i-casa','Onde o projeto é apresentado','camara','Perante a Câmara dos Deputados.'),
          slot('i-total','Subscrição mínima','um','No mínimo 1% do eleitorado nacional.'),
          slot('i-estados','Distribuição mínima','cinco','Distribuído por pelo menos cinco Estados.'),
          slot('i-cada','Mínimo em cada Estado','zerotres','Não menos de 0,3% dos eleitores de cada um deles.')
        ]}
    ]
  },
  {
    id:'cp7-idades',subjectId:'cp',topicId:'cp-7',prefix:CP7,
    type:'Escada de requisitos',title:'Escada das idades mínimas',icon:'layers',
    desc:'Suba a escada 35 – 30 – 21 – 18 e separe voto obrigatório, facultativo e inalistáveis.',
    nodes:['r4.3','r4.4'],
    anchors:[
      ['r4.4','35 anos para Presidente, Vice-Presidente e Senador'],
      ['r4.4','30 anos para Governador e Vice-Governador'],
      ['r4.4','21 anos para Deputado federal, estadual ou distrital, Prefeito, Vice-Prefeito e juiz de paz'],
      ['r4.4','18 anos para Vereador'],
      ['r4.4','Os analfabetos podem votar, mas são inelegíveis'],
      ['r4.3','obrigatórios para os maiores de dezoito anos'],
      ['r4.3','facultativos para os analfabetos, os maiores de setenta anos e os maiores de dezesseis e menores de dezoito anos'],
      ['r4.3','São inalistáveis os estrangeiros e, durante o serviço militar obrigatório, os conscritos']
    ],
    stages:[
      {id:'idades',label:'Idade mínima',node:'r4.4',layout:'ladder',structure:'comparative',format:'Escada de requisitos',
        instruction:'Encaixe os cargos em cada degrau de idade mínima.',
        pieces:[piece('vereador','Vereador'),piece('presidente','Presidente, Vice-Presidente e Senador'),piece('deputado','Deputado, Prefeito, Vice-Prefeito e juiz de paz'),piece('governador','Governador e Vice-Governador')],
        slots:[
          slot('a35','35 anos','presidente','35 anos: Presidente, Vice-Presidente e Senador (art. 14, § 3º, VI).'),
          slot('a30','30 anos','governador','30 anos: Governador e Vice-Governador.'),
          slot('a21','21 anos','deputado','21 anos: Deputado federal, estadual ou distrital, Prefeito, Vice-Prefeito e juiz de paz.'),
          slot('a18','18 anos','vereador','18 anos: Vereador.')
        ]},
      {id:'voto',label:'Alistamento e voto',node:'r4.3',layout:'matrix',structure:'conditional',format:'Quadro de condições e consequências',
        instruction:'Encaixe cada grupo na situação correta.',
        pieces:[piece('facultativo','Analfabetos, maiores de 70 e de 16 a 18 anos'),piece('estrangeiros','Estrangeiros e conscritos'),piece('maiores','Maiores de 18 anos')],
        slots:[
          slot('v-obrigatorio','Alistamento e voto obrigatórios','maiores','Obrigatórios para os maiores de dezoito anos (art. 14, § 1º).'),
          slot('v-facultativo','Alistamento e voto facultativos','facultativo','Facultativos para analfabetos, maiores de setenta e maiores de dezesseis e menores de dezoito. O analfabeto vota, mas é inelegível.'),
          slot('v-inalistavel','Inalistáveis','estrangeiros','Estrangeiros e, durante o serviço militar obrigatório, os conscritos (§ 2º).')
        ]}
    ]
  },
  {
    id:'ti53-ciclo',subjectId:'ti',topicId:'ti-5-3',prefix:TI53,
    type:'Esteira de processo',title:'Esteira do ciclo de desenvolvimento',icon:'timer',
    desc:'Monte a sequência pela qual um modelo generativo passa, do dado ao monitoramento.',
    nodes:['r1.3','r1.3.1','r1.3.2'],
    anchors:[
      ['r1.3','preparar dados, treinar, ajustar e alinhar, implantar, gerar (inferência) e monitorar'],
      ['r1.3.1','Treinar é ajustar milhões ou bilhões de parâmetros'],
      ['r1.3.1','Alinhamento é a calibragem posterior para comportamentos mais úteis, seguros e coerentes'],
      ['r1.3.2','Inferência é o momento em que o modelo já implantado gera conteúdo a partir das entradas do usuário'],
      ['r1.3.2','monitoramento em uso real, com atualização, correção ou retreinamento quando necessário']
    ],
    stages:[
      {id:'ordem',label:'Ordem das etapas',node:'r1.3',layout:'pipeline',structure:'sequential',format:'Esteira de processo',
        instruction:'Encaixe as seis etapas na ordem apresentada pela fonte.',
        pieces:[piece('monitorar','Monitorar'),piece('treinar','Treinar'),piece('implantar','Implantar'),piece('dados','Preparar dados'),piece('inferencia','Gerar (inferência)'),piece('alinhar','Ajustar e alinhar')],
        slots:[
          slot('e1','Etapa 1','dados','Preparar dados: coleta e limpeza.'),
          slot('e2','Etapa 2','treinar','Treinar: ajustar milhões ou bilhões de parâmetros a partir de padrões estatísticos.'),
          slot('e3','Etapa 3','alinhar','Ajustar e alinhar: fine-tuning e calibragem para comportamentos mais úteis, seguros e coerentes.'),
          slot('e4','Etapa 4','implantar','Implantar: o modelo passa a ser usado.'),
          slot('e5','Etapa 5','inferencia','Gerar (inferência): o modelo já implantado gera conteúdo a partir das entradas do usuário.'),
          slot('e6','Etapa 6','monitorar','Monitorar: uso real, com atualização, correção ou retreinamento quando necessário.')
        ]},
      {id:'definicao',label:'O que acontece em cada etapa',node:'r1.3.2',layout:'matrix',structure:'relational',format:'Quadro etapa × função',
        instruction:'Associe a descrição à etapa. Não confunda inferência (uso) com treinamento (aprendizado).',
        pieces:[piece('inferencia','Inferência'),piece('alinhamento','Alinhamento'),piece('monitoramento','Monitoramento'),piece('treinamento','Treinamento')],
        slots:[
          slot('d-treino','Ajustar milhões ou bilhões de parâmetros a partir de padrões estatísticos','treinamento','Treinamento: é quando o modelo aprende.'),
          slot('d-alinha','Calibragem posterior para comportamentos mais úteis, seguros e coerentes','alinhamento','Alinhamento: vem depois do treino.'),
          slot('d-infer','O modelo já implantado gera conteúdo a partir das entradas do usuário','inferencia','Inferência: geração efetiva, uso, não aprendizado.'),
          slot('d-monit','Uso real, com atualização, correção ou retreinamento quando necessário','monitoramento','Monitoramento: última etapa do ciclo.')
        ]}
    ]
  },
  {
    id:'ti53-gendisc',subjectId:'ti',topicId:'ti-5-3',prefix:TI53,
    type:'Matriz comparativa',title:'Generativo × discriminativo',icon:'puzzle',
    desc:'Preencha a matriz: probabilidade, o que o modelo aprende, função e exemplos.',
    nodes:['r2','r2.1','r2.1.1','r2.2','r2.2.1'],
    anchors:[
      ['r2','O discriminativo aprende a separar categorias; o generativo aprende a estrutura dos dados e pode criar amostras novas'],
      ['r2.1','P(Y|X) é a probabilidade condicional'],
      ['r2.1','aprende fronteiras entre categorias'],
      ['r2.1.1','SVM (máquina de vetores de suporte) e regressão logística são classificadores clássicos; BERT é citado pela fonte como exemplo discriminativo'],
      ['r2.1.1','Sistemas de recomendação e mecanismos de busca aplicam, com frequência, modelos discriminativos'],
      ['r2.2','P(X,Y) é a distribuição conjunta'],
      ['r2.2','Modelando a estrutura inteira dos dados, o modelo pode também gerar amostras novas'],
      ['r2.2.1','GPT, DALL·E, Stable Diffusion, as GANs e os VAEs']
    ],
    stages:[
      {id:'matriz',label:'Matriz',node:'r2',layout:'matrix',structure:'comparative',format:'Matriz comparativa',columns:['Discriminativo','Generativo'],reviewTogether:true,
        instruction:'Encaixe cada peça na coluna e na linha certas. Coluna da esquerda: discriminativo; da direita: generativo.',
        pieces:[piece('conjunta','P(X,Y) · distribuição conjunta'),piece('fronteiras','Fronteiras entre categorias'),piece('gerar','Produzir novas amostras'),piece('exdisc','Regressão logística, SVM, BERT'),piece('condicional','P(Y|X) · probabilidade condicional'),piece('estrutura','A estrutura inteira dos dados'),piece('exgen','GPT, DALL·E, Stable Diffusion, GANs, VAEs'),piece('classificar','Classificar, detectar e predizer')],
        slots:[
          slot('m-prob-d','Probabilidade','condicional','Discriminativo: P(Y|X), a chance da classe Y dadas as entradas X.'),
          slot('m-prob-g','Probabilidade','conjunta','Generativo: P(X,Y), entrada e rótulo ocorrendo juntos. Não inverter.'),
          slot('m-apr-d','O que aprende','fronteiras','Discriminativo: fronteiras entre categorias, com exemplos rotulados.'),
          slot('m-apr-g','O que aprende','estrutura','Generativo: a estrutura inteira dos dados.'),
          slot('m-fun-d','Função','classificar','Discriminativo: classifica, detecta e prediz.'),
          slot('m-fun-g','Função','gerar','Generativo: gera amostras novas semelhantes às originais.'),
          slot('m-ex-d','Exemplos','exdisc','Discriminativo: regressão logística, SVM e BERT.'),
          slot('m-ex-g','Exemplos','exgen','Generativo: GPT, DALL·E, Stable Diffusion, GANs e VAEs.')
        ]},
      {id:'aplicacao',label:'Aplicação',node:'r2.1.1',layout:'matrix',structure:'comparative',format:'Encaixe por aplicação',reviewTogether:true,
        instruction:'Classifique cada aplicação citada pela fonte.',
        pieces:[piece('gen','Generativo'),piece('disc','Discriminativo')],
        slots:[
          slot('a-busca','Sistemas de recomendação e mecanismos de busca','disc','Aplicam, com frequência, modelos discriminativos. Pegadinha: pôr recomendação como exemplo típico de generativo.'),
          slot('a-dalle','DALL·E produzindo uma imagem a partir de uma descrição','gen','DALL·E é citado como modelo generativo.')
        ]}
    ]
  }
]);

export const NEP_NODE=CP6+'r4.4';
export const NEP_EXAMPLE=Object.freeze([40,35,15,10]);
export const NEP_MODEL=Object.freeze({id:'cp6-nep',subjectId:'cp',topicId:'cp-6',type:'Instrumento de cálculo',title:'Medidor do número efetivo de partidos',icon:'chart-column',desc:'Distribua as cadeiras entre os partidos e veja o NEP de Laakso e Taagepera.'});

const nodeText=n=>[n?.x?.e,n?.n].filter(s=>typeof s==='string').join(' \n ');
function indexKit(kit){
  const nodes=new Map();
  const walk=n=>{if(n?.id)nodes.set(n.id,n);(n?.f||[]).forEach(walk);};
  (kit?.ramos||[]).forEach(walk);
  return nodes;
}
export function nepSum(shares){
  const total=shares.reduce((a,b)=>a+b,0);
  if(!Number.isFinite(total)||total<=0)return null;
  const p=shares.map(s=>s/total);
  const squares=p.map(v=>v*v);
  const sum=squares.reduce((a,b)=>a+b,0);
  return {total,proportions:p,squares,sum,nep:1/sum};
}
export function getNepSource(kit){
  if(kit?.topico!=='cp-6'||kit.materia!=='cp')return null;
  const node=indexKit(kit).get(NEP_NODE);
  if(!node?.x?.src||!node.x.e)return null;
  const t=nodeText(node);
  if(!t.includes('NEP = 1 ÷ Σ p²')||!t.includes('Com 40%, 35%, 15% e 10% das cadeiras, Σ p² = 0,315 e NEP ≈ 3,2')||!t.includes('Laakso e Taagepera'))return null;
  // The worked example must still match the formula.
  const r=nepSum([...NEP_EXAMPLE]);
  if(Math.abs(r.sum-0.315)>1e-9||Math.round(r.nep*10)/10!==3.2)return null;
  return {node,reference:node.x.src,example:[...NEP_EXAMPLE]};
}
export function getKitPuzzleSource(kit,model){
  if(!model||kit?.topico!==model.topicId||kit.materia!==model.subjectId)return null;
  const nodes=indexKit(kit);
  const byNode={};
  for(const s of model.nodes){const n=nodes.get(model.prefix+s);if(!n?.x?.src||!n.x.e)return null;byNode[s]=n;}
  for(const [s,anchor] of model.anchors){if(!byNode[s]||!nodeText(byNode[s]).includes(anchor))return null;}
  for(const st of model.stages){if(!byNode[st.node]||!validPuzzle(st))return null;}
  return {model,nodes:byNode,nodeIds:model.nodes.map(s=>model.prefix+s)};
}
export function kitPuzzleStages(source,nodeId){
  if(!source)return [];
  const suffix=nodeId&&nodeId.startsWith(source.model.prefix)?nodeId.slice(source.model.prefix.length):null;
  const all=source.model.stages.map((s,i)=>({...s,index:i}));
  if(!nodeId)return all;
  const own=all.filter(s=>s.node===suffix);
  return own;
}
// Only activities with their own learning objective route an exact concept.
export function kitLearningRoutes(kit){
  const routes=new Map();
  for(const model of KIT_PUZZLES){
    const source=getKitPuzzleSource(kit,model);
    if(!source)continue;
    for(const stage of model.stages){
      const node=source.nodes[stage.node];
      const anchors=model.anchors.filter(([id,text])=>id===stage.node&&node.x.e.includes(text)).map(([,text])=>text);
      if(!anchors.length)continue;
      routes.set(node.id,{
        modelId:model.id,structure:stage.structure,format:stage.format,objective:stage.instruction,
        anchors,requiredNodes:source.nodeIds
      });
    }
  }
  if(getNepSource(kit))routes.set(NEP_NODE,{
    modelId:NEP_MODEL.id,structure:'simulation',format:'Instrumento de cálculo',
    objective:'Distribua as cadeiras e preveja como muda o número efetivo de partidos.',
    anchors:['NEP = 1 ÷ Σ p²'],requiredNodes:[NEP_NODE]
  });
  return routes;
}
export function kitPuzzleContext(source,stage,slotId){
  const s=stage?.slots.find(x=>x.id===slotId);
  if(!source||!s)return null;
  return {title:s.label,detail:s.explanation,reference:source.nodes[stage.node].x.src};
}
export function kitVisualBindings(){
  return [
    ...KIT_PUZZLES.flatMap(m=>m.stages.map(s=>({subjectId:m.subjectId,topicId:m.topicId,modelId:m.id,nodeId:m.prefix+s.node}))),
    {subjectId:'cp',topicId:'cp-6',modelId:NEP_MODEL.id,nodeId:NEP_NODE}
  ];
}
export function kitVisualSources(kits){
  const out={};
  for(const m of KIT_PUZZLES){const kit=kits.find(k=>k?.topico===m.topicId);const s=kit&&getKitPuzzleSource(kit,m);if(s)out[m.id]=s;}
  const cp6=kits.find(k=>k?.topico==='cp-6');
  const nep=cp6&&getNepSource(cp6);
  if(nep)out[NEP_MODEL.id]=nep;
  return out;
}
export function kitVisualDefinitions(sources){
  return [
    ...KIT_PUZZLES.filter(m=>sources[m.id]).map(m=>({id:m.id,type:m.type,title:m.title,desc:m.desc,icon:m.icon})),
    ...(sources[NEP_MODEL.id]?[{id:NEP_MODEL.id,type:NEP_MODEL.type,title:NEP_MODEL.title,desc:NEP_MODEL.desc,icon:NEP_MODEL.icon}]:[])
  ];
}
