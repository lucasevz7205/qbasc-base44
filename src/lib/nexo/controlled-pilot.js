import { moveReviewDay, reviewDay } from '../spaced-review.js';
import { newState, record } from './core.js';
import { VISUAL_BINDINGS } from './visual-catalog.js';

export const PILOT_BINDINGS = [
  ...VISUAL_BINDINGS,
  { subjectId: 'cp', topicId: 'cp-8', modelId: 'cp8-influencia',
    nodeId: 'kit-arr-cp-8-temas-relevantes-de-politica-internacion-2026-11-25-r2.1' },
  { subjectId: 'lg', topicId: 'lg-3-2', modelId: 'lg32-leitura', nodeId: 'piloto-lg-3-2-ideia-central' },
];

export const PILOT_VERSION = 'nexo-transfer-1';

function activity(modelId, topicId, nodeSuffix, label, items) {
  const binding = PILOT_BINDINGS.find(entry => entry.modelId === modelId &&
    entry.topicId === topicId && entry.nodeId.endsWith(nodeSuffix));
  if (!binding) throw new Error('Vínculo do piloto ausente: ' + modelId);
  return {
    ...binding,
    label,
    items: items.map((item, index) => ({ ...item, id: PILOT_VERSION + ':' + modelId + ':' + (index ? 'd7' : 'd0') })),
  };
}

export const PILOT_ACTIVITIES = [
  activity('sampling', 'rf-1', '-r1.1', 'RF · Amostragem e Nyquist', [
    {
      enunciado: 'Um sensor de vibração produz uma senoide de 6 kHz, sem outras componentes. Para digitalizá-la sem aliasing, uma equipe propôs fazer 10 mil amostras por segundo, sem filtrar o sinal. Julgue o item. A taxa proposta atende ao critério de Nyquist para esse sinal.',
      gabarito: 'E', mecanismo: 'F6',
      trechoDecisivo: '10 mil amostras por segundo […] atende ao critério de Nyquist',
      comentario: 'O limite de Nyquist a 10 kHz é 5 kHz. A componente de 6 kHz fica acima do limite.',
      correcaoMinima: 'A taxa proposta não atende ao critério. Para essa componente, a taxa deve superar 12 kHz.',
    },
    {
      enunciado: 'Um registrador de ultrassom recebe uma senoide de 9 kHz, sem outras componentes. O projeto prevê 22 mil amostras por segundo. Julgue o item. A taxa escolhida atende ao critério de Nyquist para esse sinal.',
      gabarito: 'C', mecanismo: 'V1',
      trechoDecisivo: '22 mil amostras por segundo',
      comentario: 'O limite de Nyquist a 22 kHz é 11 kHz. A componente de 9 kHz fica abaixo do limite.',
    },
  ]),
  activity('cp7-consulta', 'cp-7', '-r3.1', 'CP-7 · Plebiscito e referendo', [
    {
      enunciado: 'Em uma hipótese regida pela Lei nº 9.709/1998, uma lei foi editada e o eleitorado será chamado a decidir se ratifica ou rejeita o ato. Julgue o item. A consulta descrita é um plebiscito.',
      gabarito: 'E', mecanismo: 'F3', trechoDecisivo: 'plebiscito',
      comentario: 'A consulta é posterior à edição do ato e submete sua ratificação ou rejeição à população.',
      correcaoMinima: 'Substituir “plebiscito” por “referendo”.',
    },
    {
      enunciado: 'Em uma hipótese regida pela Lei nº 9.709/1998, um ato administrativo reorganiza um serviço público. Depois que o ato é adotado, os eleitores são chamados a confirmar ou rejeitar a medida. Julgue o item. A consulta descrita é um referendo.',
      gabarito: 'C', mecanismo: 'V1', trechoDecisivo: 'Depois que o ato é adotado […] confirmar ou rejeitar a medida',
      comentario: 'A consulta é posterior ao ato administrativo e tem a finalidade de ratificá-lo ou rejeitá-lo.',
    },
  ]),
  activity('ti53-gendisc', 'ti-5-3', '-r2', 'TI-5.3 · Generativo e discriminativo', [
    {
      enunciado: 'Um sistema de triagem de encomendas, dadas medições X de um pacote, estima a probabilidade de cada categoria Y para encaminhá-lo. Ele modela diretamente essa probabilidade condicional. Julgue o item. O modelo descrito é discriminativo.',
      gabarito: 'C', mecanismo: 'V1', trechoDecisivo: 'estima a probabilidade de cada categoria Y […] modela diretamente essa probabilidade condicional',
      comentario: 'Estimar diretamente P(Y|X) para distinguir as categorias é a abordagem discriminativa apresentada no kit.',
    },
    {
      enunciado: 'Para testar diagnósticos de elevadores, uma equipe ajusta um modelo à distribuição conjunta dos sinais X e dos tipos de falha Y. O modelo pode produzir pares sintéticos de sinais e tipos de falha. Julgue o item. O modelo descrito é discriminativo.',
      gabarito: 'E', mecanismo: 'F3', trechoDecisivo: 'discriminativo',
      comentario: 'A distribuição conjunta P(X,Y) representa os sinais e as classes em conjunto e permite produzir amostras, como na abordagem generativa apresentada no kit.',
      correcaoMinima: 'Substituir “discriminativo” por “generativo”.',
    },
  ]),
  activity('asr', 'rf-1-1', '-r2.2', 'RF-1.1 · ASR modular', [
    {
      enunciado: 'Uma emissora adapta um reconhecedor modular de fala ao vocabulário dos esportes. Usando somente reportagens escritas, estima quais sequências de palavras são mais prováveis. Julgue o item. A etapa descrita treina o modelo acústico.',
      gabarito: 'E', mecanismo: 'F3', trechoDecisivo: 'treina o modelo acústico',
      comentario: 'No ASR clássico do material, a probabilidade da sequência de palavras cabe ao modelo de linguagem. O modelo acústico relaciona características do áudio a fones.',
      correcaoMinima: 'Substituir “modelo acústico” por “modelo de linguagem”.',
    },
    {
      enunciado: 'Um serviço de legendagem ajusta um reconhecedor modular clássico. Um componente recebe vetores extraídos de gravações transcritas e aprende a estimar verossimilhanças por fone. Julgue o item. O componente descrito é o modelo acústico.',
      gabarito: 'C', mecanismo: 'V1', trechoDecisivo: 'vetores extraídos de gravações transcritas […] verossimilhanças por fone',
      comentario: 'A entrada acústica e a saída por fone identificam o modelo acústico do sistema clássico.',
    },
  ]),
  activity('cp8-influencia', 'cp-8', '-r2.1', 'CP-8 · Atração e coerção nas relações internacionais', [
    {
      enunciado: 'Em um cenário hipotético, um país condiciona o fim de uma sanção comercial à mudança de um voto brasileiro em um organismo multilateral. Julgue o item. O instrumento empregado exemplifica hard power.',
      gabarito: 'C', mecanismo: 'V1', trechoDecisivo: 'condiciona o fim de uma sanção comercial',
      comentario: 'A sanção impõe um custo econômico para mudar a decisão do outro país, mecanismo de coerção.',
    },
    {
      enunciado: 'Em um cenário hipotético, o prestígio internacional de um programa cultural brasileiro leva outro país a adotar espontaneamente uma iniciativa semelhante. Julgue o item. A influência exercida nesse caso exemplifica hard power.',
      gabarito: 'E', mecanismo: 'F3', trechoDecisivo: 'exemplifica hard power',
      comentario: 'A adesão voluntária decorre da atração exercida pelo programa cultural.',
      correcaoMinima: 'Substituir “hard power” por “soft power”.',
    },
  ]),
  activity('lg32-leitura', 'lg-3-2', '-ideia-central', 'LG-3.2 · Ideia principal e detalhes de apoio', [
    {
      enunciado: 'Leia o texto fictício. “O plantão itinerante tornou o atendimento mais acessível aos moradores. Na serra, a equipe passou a visitar três povoados. Na várzea, abriu um posto às quartas-feiras.” Julgue o item. A abertura de um posto às quartas-feiras constitui a ideia principal do texto.',
      gabarito: 'E', mecanismo: 'F3', trechoDecisivo: 'constitui a ideia principal',
      comentario: 'O posto é um dos exemplos de ampliação do acesso. A ideia principal reúne tanto a visita aos povoados quanto o novo posto.',
      correcaoMinima: 'Substituir “a ideia principal” por “um detalhe de apoio”.',
    },
    {
      enunciado: 'Leia o texto fictício. “A oficina redesenhou seu espaço para reduzir o desperdício. Instalou reservatórios para reaproveitar a água da limpeza. Também passou a transformar as sobras de madeira em calços.” Julgue o item. A instalação de reservatórios funciona como detalhe de apoio à ideia de redução do desperdício.',
      gabarito: 'C', mecanismo: 'V1', trechoDecisivo: 'instalação de reservatórios funciona como detalhe de apoio',
      comentario: 'Os reservatórios exemplificam uma das mudanças descritas e sustentam a afirmação mais abrangente sobre o desperdício.',
    },
  ]),
];

export function readPilotAttempts(storage, key) {
  const raw = JSON.parse(storage.getItem(key) || '{}') || {};
  const attempts = {};
  for (const { items } of PILOT_ACTIVITIES) {
    for (const item of items) {
      const saved = raw[item.id];
      if (saved && ['C', 'E'].includes(saved.marked) && Number.isFinite(Date.parse(saved.at))) {
        attempts[item.id] = { marked: saved.marked, at: saved.at };
      }
    }
    const [first, followUp] = items;
    if (attempts[followUp.id] && (!attempts[first.id] ||
      reviewDay(attempts[followUp.id].at) < dueDay(attempts[first.id]))) delete attempts[followUp.id];
  }
  return attempts;
}

export const dueDay = attempt => attempt ? moveReviewDay(reviewDay(attempt.at), 7) : null;

export function submitPilotAttempt(attempts, itemId, marked, now) {
  const activity = PILOT_ACTIVITIES.find(({ items }) => items.some(item => item.id === itemId));
  if (!activity || !['C', 'E'].includes(marked) || !Number.isFinite(now.getTime())) {
    throw new Error('Tentativa inválida.');
  }
  if (attempts[itemId]) return attempts;
  const [first, followUp] = activity.items;
  const due = dueDay(attempts[first.id]);
  if (itemId === followUp.id && (!due || reviewDay(now) < due)) throw new Error('O item D+7 ainda está bloqueado.');
  return { ...attempts, [itemId]: { marked, at: now.toISOString() } };
}

const graph = {
  version: PILOT_VERSION,
  nodes: PILOT_ACTIVITIES.map(({ nodeId, label, topicId }) => ({
    id: nodeId, label, sourceRefs: [topicId + '/' + nodeId],
  })),
  edges: [],
};

export function pilotNavigator(attempts, learnerId) {
  let state = newState(learnerId, graph.version);
  for (const activity of PILOT_ACTIVITIES) {
    for (const item of activity.items) {
      const attempt = attempts[item.id];
      if (!attempt || !['C', 'E'].includes(attempt.marked)) continue;
      state = record(graph, state, {
        id: item.id,
        activityId: item.id,
        assessmentRef: PILOT_VERSION + '/' + item.id,
        studentId: learnerId,
        graphVersion: graph.version,
        nodeId: activity.nodeId,
        modality: 'recognition',
        correct: attempt.marked === item.gabarito,
      });
    }
  }
  return state;
}
