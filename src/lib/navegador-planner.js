// Assistente de planejamento do Navegador: lógica pura (sem rede, sem armazenamento).
// A IA só propõe; nada é gravado sem confirmação, e só como tarefa nova na coleção `planejamento`.
import { MIN_RESPOSTAS_TOPICO, MIN_RESPOSTAS_CONFIANCA, referenciaDe } from './navegador.js';

export const DATA_PROVA = '2027-01-17';
export const MAX_REVISOES_SEMANA = 5;
export const MIN_MINUTOS = 15;
export const MAX_MINUTOS = 45;
export const ORIGEM_NAVEGADOR = 'navegador';

const iso = /^\d{4}-\d{2}-\d{2}$/;
const addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + 86400000 * n).toISOString().slice(0, 10);
const pct = v => (v === null || v === undefined ? null : Math.round(v * 100));

/** Resumo compacto enviado à IA: só números, códigos e títulos de assuntos do edital. Sem texto de questões. */
export function resumoParaPlanner({ topicos, erros, tasks = [], today, subjects = [], horas = [] }) {
  const dono = new Map(subjects.flatMap(s => s.topics.map(t => [t.id, { materia: s.name, titulo: t.title || '' }])));
  const nomeDe = id => ({ id, ...(dono.get(id) || { materia: '', titulo: '' }) });
  const fracos = topicos.topicos.filter(t => t.sinal === 'fraco' || t.sinal === 'sem-sinal').slice(0, 12).map(t => ({
    ...nomeDe(t.topico), respostas: t.validas, acertoPct: pct(t.acerto), erros: t.E, errosComCerteza: t.certezaErros,
    causaDominante: t.causaDominante, sinal: t.sinal,
  }));
  return {
    hoje: today, provaEm: DATA_PROVA,
    diasAteProva: Math.round((Date.parse(DATA_PROVA + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 86400000),
    horasDisponiveisPorDiaSemana: horas, limites: { minRespostasAssunto: MIN_RESPOSTAS_TOPICO, minRespostasConfianca: MIN_RESPOSTAS_CONFIANCA },
    periodoAnalise: { de: erros.de, ate: erros.ate },
    geral: { respostas: topicos.geral.validas, acertoPct: pct(topicos.geral.acerto) },
    pareto: erros.pareto.slice(0, 8).map(g => ({ ...nomeDe(g.topico), erros: g.erros, comCerteza: g.certeza, acumuladaPct: pct(g.acumulada) })),
    foco80: erros.foco.map(nomeDe),
    recuperacao: { diasMinimos: erros.recuperacao.diasMinimos, errosComRetorno: erros.recuperacao.errosComRetorno, taxaPct: pct(erros.recuperacao.taxa) },
    metaFoco: { alvoPct: pct(erros.meta.alvo), acertoPct: pct(erros.meta.acertoFoco), respostas: erros.meta.nFoco },
    mitigacao: erros.mitigacao.filter(m => m.variacao !== null).map(m => ({ ...nomeDe(m.topico), taxaErroAntesPct: pct(m.taxaAntes), taxaErroAgoraPct: pct(m.taxaAgora) })),
    assuntosComSinal: fracos,
    proximasTarefas: tasks.filter(t => t.date >= today && t.date <= addDays(today, 14))
      .map(t => ({ data: t.date, materia: t.subject, titulo: t.title, minutos: t.minutes, tipo: t.type })),
    revisoesDoNavegadorNaSemana: tasks.filter(t => t.raw?.origem === ORIGEM_NAVEGADOR && t.raw?.semanaRef === referenciaDe(today)).length,
  };
}

export const PLANNER_SCHEMA = {
  type: 'object',
  properties: {
    resposta: { type: 'string' },
    propostas: {
      type: 'array',
      items: {
        type: 'object',
        properties: { topicId: { type: 'string' }, data: { type: 'string' }, minutos: { type: 'integer' }, motivo: { type: 'string' } },
        required: ['topicId', 'data', 'minutos', 'motivo'],
      },
    },
  },
  required: ['resposta', 'propostas'],
};

export function plannerPrompt({ resumo, history = [], userMessage }) {
  const hist = history.slice(-10).map(m => `${m.role === 'user' ? 'Estudante' : 'Navegador'}: ${m.text}`).join('\n\n');
  return [
    "Você é 'O Navegador', assistente de planejamento do Quebrando a Banca. Com a mesma disciplina do Arquiteto, ajuda o estudante a organizar revisões pontuais a partir da análise semanal (erros, Pareto, recuperação, mitigação por assunto).",
    'Seja preciso e direto, em português (pt-BR), no máximo 3 parágrafos curtos ou tópicos. Separe fato dos dados, inferência e hipótese. Nunca invente números, fontes, artigos ou assuntos: use só os dados abaixo.',
    `Só trate um assunto como fraco se ele tiver ao menos ${MIN_RESPOSTAS_TOPICO} respostas válidas; com menos, diga que a amostra é insuficiente. Confiança e chute exigem ${MIN_RESPOSTAS_CONFIANCA} respostas.`,
    'Faça no máximo uma pergunta por vez. Pule saudações quando já houver histórico.',
    `Você pode propor revisões em "propostas" (no máximo ${MAX_REVISOES_SEMANA}, de ${MIN_MINUTOS} a ${MAX_MINUTOS} minutos, datas futuras AAAA-MM-DD antes de ${DATA_PROVA}, topicId exatamente como aparece nos dados). Elas só valem depois que o estudante confirmar. Só proponha quando houver sinal nos dados ou o estudante pedir; caso contrário devolva "propostas": [].`,
    'Você não altera respostas, status do edital, flashcards, revisão espaçada nem tarefas do estudante, e não registra nada no Tutory.',
    'Responda SOMENTE em JSON no formato {"resposta": string, "propostas": [{"topicId","data","minutos","motivo"}]}.',
    `Dados calculados do estudante:\n${JSON.stringify(resumo)}`,
    hist ? `Histórico recente:\n${hist}` : '',
    `Mensagem atual do estudante:\n${userMessage}`,
  ].filter(Boolean).join('\n\n');
}

/** Lê a resposta bruta da IA; nunca lança. */
export function lerRespostaPlanner(reply) {
  let obj;
  try { obj = typeof reply === 'string' ? JSON.parse(reply.replace(/^```(?:json)?\s*|\s*```$/g, '')) : reply; } catch { obj = null; }
  if (!obj || typeof obj !== 'object') return { resposta: typeof reply === 'string' ? reply.slice(0, 2000) : '', propostas: [] };
  return { resposta: typeof obj.resposta === 'string' ? obj.resposta.slice(0, 3000) : '', propostas: Array.isArray(obj.propostas) ? obj.propostas : [] };
}

export const prefixoSemana = today => 'qbasc-nav-' + referenciaDe(today) + '-';
export const revisaoId = (today, topicId) => prefixoSemana(today) + topicId;

/**
 * Valida propostas contra o edital, a data e a carga. Descarta o que viola alguma regra e diz o porquê.
 * `existentes`: ids já gravados (não duplica); `jaNaSemana`: revisões do Navegador já criadas nesta semana.
 */
export function validarPropostas(propostas, { today, subjects, horas = [], tasks = [], existentes = new Set(), jaNaSemana = 0 }) {
  const dono = new Map(subjects.flatMap(s => s.topics.map(t => [t.id, { s, t }])));
  const validas = [], descartadas = [], usados = new Set();
  const carga = d => tasks.filter(t => t.date === d).reduce((a, t) => a + (t.minutes || 0), 0)
    + validas.filter(v => v.data === d).reduce((a, v) => a + v.minutos, 0);
  for (const p of Array.isArray(propostas) ? propostas : []) {
    const falha = motivo => descartadas.push({ proposta: p, motivo });
    const info = dono.get(p?.topicId);
    const minutos = Math.round(Number(p?.minutos));
    if (!info) { falha('assunto fora do edital'); continue; }
    if (typeof p.data !== 'string' || !iso.test(p.data) || Number.isNaN(Date.parse(p.data + 'T12:00:00Z'))) { falha('data inválida'); continue; }
    if (p.data < today || p.data >= DATA_PROVA) { falha('data fora do período até a prova'); continue; }
    if (!Number.isFinite(minutos) || minutos < MIN_MINUTOS || minutos > MAX_MINUTOS) { falha('duração fora de ' + MIN_MINUTOS + '–' + MAX_MINUTOS + ' min'); continue; }
    const id = revisaoId(today, p.topicId);
    if (existentes.has(id) || usados.has(id)) { falha('já há revisão deste assunto nesta semana'); continue; }
    if (jaNaSemana + validas.length >= MAX_REVISOES_SEMANA) { falha('limite de ' + MAX_REVISOES_SEMANA + ' revisões por semana'); continue; }
    const disponivel = (Number(horas[new Date(p.data + 'T12:00:00Z').getUTCDay()]) || 0) * 60;
    if (carga(p.data) + minutos > disponivel) { falha('dia sem horas disponíveis suficientes'); continue; }
    usados.add(id);
    validas.push({ id, topicId: p.topicId, materia: info.s.name, titulo: info.t.title || '', data: p.data, minutos,
      motivo: String(p.motivo || '').slice(0, 300) });
  }
  return { validas, descartadas };
}

/** Documento de `planejamento` para uma revisão confirmada. Sempre um registro novo; nunca sobrescreve tarefas existentes. */
export function revisaoRecord(proposta, today, timestamp) {
  return {
    status: 'planejada', origem: ORIGEM_NAVEGADOR, criadoEm: timestamp, atualizadoEm: timestamp,
    titulo: 'Revisão: ' + (proposta.titulo || proposta.topicId), materia: proposta.materia, tipo: 'revisao',
    data: proposta.data, minutos: proposta.minutos, topicId: proposta.topicId, topico: proposta.topicId,
    motivo: proposta.motivo, semanaRef: referenciaDe(today),
  };
}

/** Só tarefas criadas pelo Navegador podem ser alteradas por ele (e nunca as já concluídas). */
export const podeAlterarTarefa = task => task?.raw?.origem === ORIGEM_NAVEGADOR && task.status !== 'done';

/** Tarefas do estudante em atraso que podem ir a um cartão de confirmação. Revisões automáticas ficam de fora. */
export function atrasadasParaConfirmar(tasks = []) {
  const list = tasks.filter(t => t.status === 'late' && !t.auto && !t.raw?.arquivadaEm).sort((a, b) => a.date.localeCompare(b.date));
  return { itens: list.map(t => ({ id: t.id, data: t.date, titulo: t.title || '', materia: t.subject || '', minutos: t.minutes || 0 })),
    automaticasIgnoradas: tasks.filter(t => t.status === 'late' && t.auto).length };
}
export const pedidoDeAtrasadas = texto => /atrasad/i.test(texto || '') && /(retir|remov|tir[ae]|limp|conclu|cumpr|apag|arquiv)/i.test(texto || '');

/** Marca como concluída (nunca apaga). Só roda depois do clique do estudante no cartão. */
export const registroConcluida = (task, timestamp) => ({ ...task.raw, status: 'concluida', concluidaEm: timestamp, atualizadoEm: timestamp });
