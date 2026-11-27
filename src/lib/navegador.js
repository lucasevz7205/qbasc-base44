import { dailyQuestionPerformance } from './daily-question-performance.js';
import { ERROR_ORIGINS } from './question-feedback.js';

const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
const day = value => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return formatter.format(new Date(value));
};
const delta = (d, days) => new Date(Date.parse(d + 'T12:00:00Z') + 86400000 * days).toISOString().slice(0, 10);
const monthStart = (d, back = 0) => {
  const [y, m] = d.split('-').map(Number);
  const index = y * 12 + (m - 1) - back;
  return Math.floor(index / 12) + '-' + String(index % 12 + 1).padStart(2, '0') + '-01';
};
/** Janelas de análise: semanal (7 + 7 dias) ou mensal (mês anterior e o anterior a ele), sempre até a véspera de `today`. */
export function janelaDe(today, tipo = 'semanal') {
  if (tipo === 'mensal') { const first = monthStart(today); return { start: monthStart(first, 2), cut: monthStart(first, 1), end: first }; }
  return { start: delta(today, -14), cut: delta(today, -7), end: today };
}
/** Data de referência do relatório devido: último sábado (semanal) ou dia 1 (mensal) até `today`. */
export function referenciaDe(today, tipo = 'semanal') {
  if (tipo === 'mensal') return monthStart(today);
  const weekday = new Date(today + 'T12:00:00Z').getUTCDay();
  return delta(today, -((weekday + 1) % 7));
}
const asList = value => Array.isArray(value) ? value : [];
const mark = value => String(value ?? '').trim().toUpperCase();
const exactTime = value => typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? Date.parse(value) : NaN;
const outcomes = { correct: 'C', wrong: 'E', blank: 'B' };
const knownOfficial = /(?:cebraspe|cespe|prova\s+real|oficial)/i;
const notOfficial = /n[ãa]o\s+oficial/i;
const invented = /in[eé]dit|sint[eé]tic|autor(?:al)?/i;
const gradeOrigin = origin => !origin ? undefined : invented.test(origin) ? 'inédito'
  : notOfficial.test(origin) ? undefined : knownOfficial.test(origin) ? 'oficial' : undefined;

// Limiares são hipóteses a calibrar com o histórico real (parecer de 27/11/2026, seção 5).
export const MIN_RESPOSTAS_TOPICO = 8;
export const MIN_RESPOSTAS_CONFIANCA = 20;
export const LIMIAR_FORTE = 0.7;
export const MIN_RESPOSTAS_DISCIPLINA = 30;
export const MIN_COMPARACAO = 20;
export const CAUSAS = Object.freeze(Object.keys(ERROR_ORIGINS));

/** Intervalo de Wilson (95%) para uma proporção k/n. */
export function wilson(k, n, z = 1.96) {
  if (!n) return null;
  const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n);
  const m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return { low: Math.max(0, (c - m) / d), high: Math.min(1, (c + m) / d) };
}

// Simulados vivem em coleção própria e não passam pelo histórico das questões.
function simuladoAttempts(simulados, meta, limits) {
  const out = [];
  for (const s of asList(simulados)) {
    if (s?.tipo !== 'obj') continue;
    const date = day(s.inicio) || day(s.data);
    const timestamp = exactTime(s.inicio);
    for (const item of asList(s.itens)) {
      if (!item?.qid) continue;
      const answer = mark(item.marcada) || 'B';
      const key = mark(item.gabarito || meta.get(item.qid)?.key);
      const result = answer === 'B' ? 'blank'
        : (answer === 'C' || answer === 'E') && (key === 'C' || key === 'E') ? (answer === key ? 'correct' : 'wrong') : null;
      if (!date) { limits.tentativasSemData++; continue; }
      if (!result) { limits.simuladoSemGabarito++; continue; }
      out.push({ qid: item.qid, result, date, confidence: undefined, timestamp, context: 'simulado' });
    }
  }
  return out;
}

export function navegadorExport(records, questions, today, { desde } = {}) {
  const meta = new Map(questions.map(q => [q.id, q]));
  const raw = Object.fromEntries(questions.map(q => [q.id, { gabarito: q.key ?? q.raw?.gabarito }]));
  const answers = Object.fromEntries(asList(records?.respostas).map(r => [r.qid ?? r.id, r]));
  const { attemptTimeline, aggregateOnly } = dailyQuestionPerformance({
    answers, questions: raw, rounds: asList(records?.rodadas), day, includeTimeline: true,
  });
  const limits = { tentativasSemData: 0, tentativasSemHorario: 0, simuladoSemGabarito: 0 };
  // Tentativas do histórico sem data válida não entram em nenhuma conta; aqui ao menos são contadas.
  for (const r of asList(records?.respostas)) {
    for (const h of asList(r?.hist)) if (h && mark(h.m) && !day(h.em)) limits.tentativasSemData++;
  }
  const history = new Map();
  let unknownTime = 0;
  const begin = desde || delta(today, -14);
  const causaPorTentativa = new Map();
  for (const j of asList(records?.justificativas)) {
    if (j?.qid && CAUSAS.includes(j.origem)) causaPorTentativa.set(j.qid + '|' + Date.parse(j.tentativaEm), j.origem);
  }
  for (const a of [...attemptTimeline, ...simuladoAttempts(records?.simulados, meta, limits)]) {
    const b = history.get(a.qid) || [];
    b.push(a);
    history.set(a.qid, b);
  }
  const respostas = [];
  for (const [id, entries] of history) {
    const attempts = entries.filter(a => a.date < today);
    if (!attempts.some(a => a.date >= begin)) continue;
    attempts.sort((a,b) => a.date.localeCompare(b.date) || a.timestamp - b.timestamp);
    const first = attempts[0];
    const sameDay = attempts.filter(a => a.date === first.date);
    // Uma tentativa histórica sem horário não pode ganhar precedência inventada.
    if (sameDay.some(a => !Number.isFinite(a.timestamp)) ||
        sameDay.some(a => a !== first && a.timestamp === first.timestamp && (a.result !== first.result || a.confidence !== first.confidence))) {
      unknownTime++;
      continue;
    }
    const q = meta.get(id);
    const mechanism = q?.raw?.mecanismo;
    for (const a of attempts) {
      if (a.date < begin && a !== first) continue;
      if (!Number.isFinite(a.timestamp)) { limits.tentativasSemHorario++; continue; }
      respostas.push({
        data: new Date(a.timestamp).toISOString(), itemId: id, topico: q?.topicId || 'sem-tópico',
        resultado: outcomes[a.result], confianca: a.confidence,
        origem: gradeOrigin(q?.origin),
        mecanismo: typeof mechanism === 'string' && /^(?:F(?:10|[1-9])|V[0-4])$/.test(mechanism) ? mechanism : undefined,
        ...(a.context === 'simulado' ? { contexto: 'simulado' } : {}),
        ...(a.result === 'wrong' && causaPorTentativa.has(id + '|' + a.timestamp) ? { causa: causaPorTentativa.get(id + '|' + a.timestamp) } : {}),
      });
    }
  }
  const aggregateCount = Object.entries(aggregateOnly).reduce((n,[d,c]) => n + (d >= begin && d < today ? c : 0), 0);
  return { versao: 1, fonte: 'QBAsc', respostas, limites: { itensSemOrdemConfirmada: unknownTime, tentativasApenasEmTotais: aggregateCount, ...limits } };
}

function summary(rows) {
  const C = rows.filter(r => r.resultado === 'C').length;
  const E = rows.filter(r => r.resultado === 'E').length;
  const confident = rows.filter(r => r.confianca === 3 && r.resultado !== 'B');
  return { n: rows.length, C, E, B: rows.length - C - E, liquida: C - E,
    certezaN: confident.length, certezaErros: confident.filter(r => r.resultado === 'E').length };
}

// Primeira tentativa de cada item nos 14 dias que terminam ontem. Repetições são só contadas.
function primeiras(respostas, today, janela = janelaDe(today)) {
  const { start, cut } = janela;
  const seen = new Set();
  const current = [], previous = [];
  let repetidas = 0;
  for (const r of [...respostas].sort((a,b) => Date.parse(a.data) - Date.parse(b.data))) {
    const d = day(r.data);
    if (!d || d >= today) continue;
    if (seen.has(r.itemId)) { if (d >= start) repetidas++; continue; }
    seen.add(r.itemId);
    if (d >= start) (d >= cut ? current : previous).push(r);
  }
  return { start, cut, current, previous, repetidas };
}

export function navegadorSemanal(respostas, today, janela = janelaDe(today)) {
  const { start, cut, current, previous, repetidas } = primeiras(respostas, today, janela);
  const groups = new Map();
  for (const r of current) {
    if (r.resultado !== 'E' || r.topico === 'sem-tópico') continue;
    const signal = groups.get(r.topico) || { topico:r.topico, erros:0, certeza:0 };
    signal.erros++;
    if (r.confianca === 3) signal.certeza++;
    groups.set(r.topico, signal);
  }
  const priorities = [...groups.values()].filter(x => x.certeza || x.erros >= 2)
    .sort((a,b) => b.certeza - a.certeza || b.erros - a.erros || a.topico.localeCompare(b.topico)).slice(0,3);
  const split = rows => Object.fromEntries(['oficial', 'inédito', 'não informado'].map(o => [o, summary(rows.filter(r => (r.origem || 'não informado') === o))]));
  const contextos = rows => ({ treino: summary(rows.filter(r => r.contexto !== 'simulado')), simulado: summary(rows.filter(r => r.contexto === 'simulado')) });
  return { atual: {...summary(current), de:cut, ate:delta(janela.end,-1), origens:split(current), contextos:contextos(current)},
    anterior: {...summary(previous), de:start, ate:delta(cut,-1), origens:split(previous), contextos:contextos(previous)}, repetidas, priorities };
}

function countRows(rows) {
  const C = rows.filter(r => r.resultado === 'C').length;
  const E = rows.filter(r => r.resultado === 'E').length;
  const answered = rows.filter(r => r.resultado !== 'B');
  const certeza = answered.filter(r => r.confianca === 3);
  return {
    n: rows.length, C, E, B: rows.length - C - E,
    certezaN: certeza.length, certezaErros: certeza.filter(r => r.resultado === 'E').length,
    semConfianca: answered.filter(r => ![1, 2, 3].includes(r.confianca)).length,
    simulado: rows.filter(r => r.contexto === 'simulado').length,
    causas: Object.fromEntries(CAUSAS.map(c => [c, rows.filter(r => r.resultado === 'E' && r.causa === c).length])),
  };
}

/** Completa contagens com taxas, intervalo e causa dominante. Serve a linhas brutas e a contagens salvas. */
export function finishStats(base) {
  const validas = base.C + base.E;
  const errosComCausa = Object.values(base.causas || {}).reduce((a, b) => a + b, 0);
  const [topCausa, topN] = Object.entries(base.causas || {}).sort((a, b) => b[1] - a[1])[0] || [null, 0];
  const causaDominante = !base.E ? null : errosComCausa >= 2 && topN / errosComCausa > 0.5 ? topCausa : 'indeterminada';
  return {
    ...base, validas,
    taxaErro: validas ? base.E / validas : null,
    acerto: validas ? base.C / validas : null,
    intervaloAcerto: wilson(base.C, validas),
    errosComCausa, causaDominante,
  };
}

const topicStats = rows => finishStats(countRows(rows));

function sinalDe(s, geral, minimo) {
  if (s.validas < minimo) return 'insuficiente';
  const erroMin = 1 - s.intervaloAcerto.high;
  return geral.taxaErro !== null && erroMin > geral.taxaErro ? 'fraco' : s.intervaloAcerto.low > LIMIAR_FORTE ? 'forte' : 'sem-sinal';
}
const porRisco = (a, b) => (b.intervaloAcerto ? 1 - b.intervaloAcerto.high : 0) - (a.intervaloAcerto ? 1 - a.intervaloAcerto.high : 0)
  || b.E - a.E || String(a.topico ?? a.id).localeCompare(String(b.topico ?? b.id));

/** Tabela por tópico sobre as primeiras tentativas da janela (treino e simulado). */
export function navegadorTopicos(respostas, today, janela = janelaDe(today)) {
  const { start, current, previous } = primeiras(respostas, today, janela);
  const rows = [...previous, ...current];
  const geral = topicStats(rows);
  const byTopic = new Map();
  let semTopico = 0;
  for (const r of rows) {
    if (r.topico === 'sem-tópico') { semTopico++; continue; }
    byTopic.set(r.topico, [...(byTopic.get(r.topico) || []), r]);
  }
  const topicos = [...byTopic].map(([topico, group]) => {
    const s = topicStats(group);
    return { topico, ...s, sinal: sinalDe(s, geral, MIN_RESPOSTAS_TOPICO) };
  }).sort(porRisco);
  const calibracao = [1, 2, 3].map(nivel => {
    const x = summary(rows.filter(r => r.confianca === nivel && r.resultado !== 'B'));
    return { nivel, n: x.n, acerto: x.n ? x.C / x.n : null, amostraPequena: x.n < MIN_RESPOSTAS_CONFIANCA };
  });
  return { de: start, ate: delta(janela.end, -1), geral, topicos, semTopico, calibracao };
}

/** Agrega os tópicos por matéria do edital (subjects: [{ id, name, short, topics: [{ id }] }]). */
export function navegadorDisciplinas(resultado, subjects) {
  const owner = new Map(subjects.flatMap(s => s.topics.map(t => [t.id, s])));
  const groups = new Map();
  for (const t of resultado.topicos) {
    const subject = owner.get(t.topico);
    if (!subject) continue;
    const g = groups.get(subject.id) || { id: subject.id, nome: subject.name, short: subject.short, base: { n: 0, C: 0, E: 0, B: 0, certezaN: 0, certezaErros: 0, semConfianca: 0, simulado: 0, causas: Object.fromEntries(CAUSAS.map(c => [c, 0])) }, topicos: 0 };
    for (const k of ['n', 'C', 'E', 'B', 'certezaN', 'certezaErros', 'semConfianca', 'simulado']) g.base[k] += t[k];
    for (const c of CAUSAS) g.base.causas[c] += t.causas?.[c] || 0;
    g.topicos++;
    groups.set(subject.id, g);
  }
  return [...groups.values()].map(({ base, ...g }) => {
    const s = finishStats(base);
    return { ...g, ...s, sinal: sinalDe(s, resultado.geral, MIN_RESPOSTAS_DISCIPLINA) };
  }).sort(porRisco);
}

/** Compara as duas janelas; só conclui quando ambas têm volume mínimo. */
export function compararJanelas(semanal) {
  const { atual, anterior } = semanal;
  const conclusivo = atual.n >= MIN_COMPARACAO && anterior.n >= MIN_COMPARACAO;
  return { conclusivo, minimo: MIN_COMPARACAO, nAtual: atual.n, nAnterior: anterior.n };
}

/** Documento compacto para salvar: só contagens e códigos; textos e taxas são recalculados ao exibir. */
export function gerarRelatorio({ respostas, today, tipo = 'semanal' }) {
  const referencia = referenciaDe(today, tipo);
  const janela = janelaDe(referencia, tipo);
  const semanal = navegadorSemanal(respostas, referencia, janela);
  const topicos = navegadorTopicos(respostas, referencia, janela);
  const compacto = s => ({ n: s.n, C: s.C, E: s.E, B: s.B, liquida: s.liquida, certezaN: s.certezaN, certezaErros: s.certezaErros,
    simulado: s.contextos?.simulado.n || 0, de: s.de, ate: s.ate });
  return {
    versao: 1, id: tipo + '-' + referencia, tipo, referencia, gerado: today,
    periodo: { de: janela.start, ate: delta(janela.end, -1) },
    placar: { atual: compacto(semanal.atual), anterior: compacto(semanal.anterior), repetidas: semanal.repetidas },
    semTopico: topicos.semTopico,
    topicos: topicos.topicos.slice(0, 80).map(t => [t.topico, t.C, t.E, t.B, t.certezaN, t.certezaErros, t.semConfianca, t.simulado, ...CAUSAS.map(c => t.causas[c])]),
  };
}

/** Reconstrói as estatísticas completas a partir do documento salvo. */
export function expandirRelatorio(doc, subjects = []) {
  const topicos = asList(doc?.topicos).map(row => {
    const [topico, C, E, B, certezaN, certezaErros, semConfianca, simulado, ...causas] = row;
    return { topico, ...finishStats({ n: C + E + B, C, E, B, certezaN, certezaErros, semConfianca, simulado,
      causas: Object.fromEntries(CAUSAS.map((c, i) => [c, causas[i] || 0])) }) };
  });
  const base = { n: 0, C: 0, E: 0, B: 0, certezaN: 0, certezaErros: 0, semConfianca: 0, simulado: 0, causas: Object.fromEntries(CAUSAS.map(c => [c, 0])) };
  for (const t of topicos) {
    for (const k of ['n', 'C', 'E', 'B', 'certezaN', 'certezaErros', 'semConfianca', 'simulado']) base[k] += t[k];
    for (const c of CAUSAS) base.causas[c] += t.causas[c];
  }
  const geral = finishStats(base);
  const lista = topicos.map(t => ({ ...t, sinal: sinalDe(t, geral, MIN_RESPOSTAS_TOPICO) })).sort(porRisco);
  const { atual, anterior } = doc.placar;
  return { ...doc, geral, topicos: lista, disciplinas: navegadorDisciplinas({ topicos: lista, geral }, subjects),
    comparacao: compararJanelas({ atual, anterior }) };
}
