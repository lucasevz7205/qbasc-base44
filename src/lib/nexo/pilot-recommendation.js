import { LG_LESSON } from './pilot-lessons.js';
import { PILOT_ACTIVITIES } from './controlled-pilot.js';

export const PILOT_TASKS = [
  {
    id: 'prever-amostragem', modelId: 'sampling',
    title: 'RF · Prever o efeito da taxa de amostragem',
    reason: 'O osciloscópio permite variar a taxa e comparar os pontos amostrados com a onda.',
    parts: [
      ['Determinar o limite de Nyquist', 'a frequência máxima representada é a metade da taxa'],
      ['Prever distorção acima do limite', 'frequências acima desse limite são distorcidas pelo fenômeno chamado aliasing'],
    ],
  },
  {
    id: 'situar-consultas', modelId: 'cp7-consulta',
    title: 'CP-7 · Situar as consultas e indicar a finalidade do referendo',
    reason: 'A linha do ato permite posicionar cada consulta e associar a finalidade do referendo.',
    parts: [
      ['Situar o plebiscito', 'O plebiscito é convocado com anterioridade ao ato legislativo ou administrativo'],
      ['Situar o referendo', 'o referendo, com posterioridade'],
      ['Identificar a finalidade do referendo', 'para ratificação ou rejeição'],
    ],
  },
  {
    id: 'comparar-modelos', modelId: 'ti53-gendisc',
    title: 'TI-5.3 · Comparar o que cada modelo aprende e produz',
    reason: 'A matriz permite comparar os dois modelos pelo mesmo critério em cada linha.',
    parts: [
      ['Identificar o objetivo discriminativo', 'O discriminativo aprende a separar categorias'],
      ['Relacionar aprendizado e geração de amostras', 'o generativo aprende a estrutura dos dados e pode criar amostras novas'],
    ],
  },
  {
    id: 'relacionar-blocos-asr', modelId: 'asr', title: 'RF-1.1 · Relacionar cada bloco do ASR à sua função',
    reason: 'O diagrama permite seguir o áudio e comparar o que cada bloco recebe e produz.',
    parts: [
      ['Reconhecer a entrada acústica', 'vetores → verossimilhança por fone (aprende com áudio transcrito)'],
      ['Identificar o papel do modelo de linguagem', 'palavras → probabilidade da sequência (aprende só com texto)'],
    ],
  },
  {
    id: 'distinguir-influencia', modelId: 'cp8-influencia', title: 'CP-8 · Distinguir atração e coerção',
    reason: 'O quadro permite comparar o mecanismo de influência em duas situações diplomáticas fictícias.',
    parts: [
      ['Identificar influência por atração', 'capacidade de obter resultados pela atração (cultura, valores, políticas)'],
      ['Reconhecer coerção econômica', 'Hard power é a coerção, militar ou econômica, como sanções e ameaças'],
    ],
  },
  {
    id: 'identificar-ideia-central', modelId: 'lg32-leitura', title: 'LG-3.2 · Distinguir ideia principal e detalhes de apoio',
    reason: 'O quadro permite testar qual afirmação abrange o parágrafo e quais informações a sustentam.',
    parts: [
      ['Identificar a afirmação abrangente', LG_LESSON.lines[0]],
      ['Reconhecer um exemplo de apoio', LG_LESSON.lines[1]],
    ],
  },
];

export function recommendPilotTask(taskId, effectiveSources, models) {
  const task = PILOT_TASKS.find(entry => entry.id === taskId);
  const activity = PILOT_ACTIVITIES.find(entry => entry.modelId === task?.modelId);
  const review = reason => ({ status: 'review', reason });
  if (!activity) return review('A tarefa precisa de curadoria.');
  const { subjectId, topicId, nodeId, modelId } = activity;
  const matches = effectiveSources.filter(source => source.subjectId === subjectId &&
    source.topicId === topicId && source.nodeId === nodeId);
  const source = matches[0];
  const reviewed = source && (source === LG_LESSON || source.central);
  if (matches.length !== 1 || !reviewed || source.referenceLevel !== 'node' || !source.reference?.trim()) {
    return review('Confira o nó e a referência individual no mapa efetivo.');
  }
  const evidence = task.parts.map(([part, anchor]) => {
    const supported = source.lines?.some(line => typeof line === 'string' && line.includes(anchor));
    return { part, excerpt: supported ? anchor : null };
  });
  const missing = evidence.filter(row => !row.excerpt);
  if (missing.length) return review('Falta evidência para ' + missing.map(row => row.part.toLocaleLowerCase('pt-BR')).join(', ') + '.');
  const model = models.find(candidate => candidate.id === modelId && candidate.binding.subjectId === subjectId &&
    candidate.binding.topicId === topicId && candidate.source.id === nodeId && candidate.binding.nodeId === nodeId);
  if (!model || (['cp7-consulta', 'ti53-gendisc'].includes(modelId) && source.learningRoute?.modelId !== modelId)) {
    return review('Confira o vínculo entre a tarefa e o modelo no material efetivo.');
  }
  return { status: 'recommended', model, reason: task.reason, evidence, reference: source.reference };
}
