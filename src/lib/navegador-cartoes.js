import { janelaDe, wilson } from './navegador.js';

// Flashcards são medidos à parte das questões: nota autoavaliada, item repetido por desenho e intervalo decidido pelo app.
// Limiares são hipóteses a calibrar com o histórico real (plano de 27/11/2026).
export const MIN_REVISOES = 20;
export const MIN_REVISOES_TOPICO = 8;
export const INTERVALO_LEMBRANCA = 3;
export const INTERVALO_DOMINIO = 7;
export const DIAS_ATRASO = 2;
export const FAIXAS = Object.freeze([['1-2', 1, 2], ['3-6', 3, 6], ['7-14', 7, 14], ['15+', 15, Infinity]]);
const LEMBROU = new Set(['dificil', 'bom', 'facil']);
const nota = v => String(v ?? '').trim().toLowerCase();

const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
const day = value => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return fmt.format(new Date(value));
};
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
const shift = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + 86400000 * n).toISOString().slice(0, 10);
const median = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/**
 * Transforma o histórico de um cartão em eventos. Só leitura.
 * Revisão válida = não é a primeira exposição e ocorreu em dia diferente da avaliação anterior.
 * Mesmo dia = repescagem (memória curta), contada à parte.
 */
export function eventosDoCartao(review) {
  const hist = Array.isArray(review?.hist) ? review.hist : [];
  let semData = 0;
  const rows = [];
  for (const h of hist) {
    const d = day(h?.em), v = nota(h?.v);
    if (!d || !v) { semData++; continue; }
    rows.push({ d, t: Date.parse(h.em) || 0, v, int: Number(h.int) });
  }
  rows.sort((a, b) => a.d.localeCompare(b.d) || a.t - b.t);
  const eventos = [];
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    if (!prev) return eventos.push({ ...r, tipo: 'primeira' });
    const gap = daysBetween(prev.d, r.d);
    if (gap < 1) return eventos.push({ ...r, tipo: 'repescagem', recuperou: LEMBROU.has(r.v) });
    eventos.push({ ...r, tipo: 'revisao', gap, lembrou: LEMBROU.has(r.v), lapso: !LEMBROU.has(r.v) && prev.int >= INTERVALO_DOMINIO });
  });
  return { eventos, semData };
}

/** Dominado: as duas últimas revisões válidas tiveram intervalo >= 7 dias e foram lembradas. */
export function estadoDoCartao(review, eventos) {
  const rev = eventos.filter(e => e.tipo === 'revisao');
  if (!eventos.length) return 'novo';
  const last = eventos.at(-1);
  if (!LEMBROU.has(last.v)) return 'aprendendo';
  const ult2 = rev.slice(-2);
  if (ult2.length === 2 && ult2.every(e => e.lembrou && e.gap >= INTERVALO_DOMINIO)) return 'dominado';
  const nivel = Number(review?.nivel);
  return Number.isFinite(nivel) && nivel >= 2 ? 'retencao' : 'aprendendo';
}

function resumir(revs) {
  const n = revs.length, L = revs.filter(e => e.lembrou).length;
  return { n, lembrou: L, esqueceu: n - L, taxa: n ? L / n : null, intervalo: wilson(L, n),
    dificeis: revs.filter(e => e.v === 'dificil').length, lapsos: revs.filter(e => e.lapso).length };
}

/**
 * cartoes: [{ id, topicId, ... }] (flashcards do app); reviews: documentos de cartoes_aval ({ id|k, hist, prox, nivel }).
 * Janela: mesma do Navegador (até a véspera de today). Estados e atraso são fotografias de hoje.
 */
export function navegadorCartoes(reviews, cartoes, today, janela = janelaDe(today)) {
  const topicoDe = new Map((cartoes || []).map(c => [c.id, c.topicId || 'sem-tópico']));
  const { cut, end } = janela;
  const naJanela = e => e.d >= cut && e.d < end && e.d < today;
  const todas = [], porTopico = new Map(), estados = { novo: 0, aprendendo: 0, retencao: 0, dominado: 0 };
  let semData = 0, atrasados = 0, repescagemErros = 0, repescagemRecuperados = 0;
  const lapsosPorCartao = [];
  const avaliados = new Set();
  for (const review of reviews || []) {
    const id = review?.k ?? review?.id;
    if (!id) continue;
    avaliados.add(id);
    const { eventos, semData: sd } = eventosDoCartao(review);
    semData += sd;
    const topico = topicoDe.get(id) || 'sem-tópico';
    const estado = estadoDoCartao(review, eventos);
    estados[estado]++;
    const prox = day(review.prox);
    if (prox && daysBetween(prox, today) > DIAS_ATRASO) atrasados++;
    const atuais = eventos.filter(naJanela);
    const revs = atuais.filter(e => e.tipo === 'revisao').map(e => ({ ...e, id, topico }));
    for (const e of atuais) if (e.tipo === 'repescagem') { repescagemRecuperados += e.recuperou ? 1 : 0; repescagemErros += e.recuperou ? 0 : 1; }
    todas.push(...revs);
    if (topico !== 'sem-tópico') {
      const g = porTopico.get(topico) || { topico, revs: [], estados: { novo: 0, aprendendo: 0, retencao: 0, dominado: 0 } };
      g.revs.push(...revs); g.estados[estado]++; porTopico.set(topico, g);
    }
    const lapsos = eventos.filter(e => e.lapso).length;
    if (lapsos >= 2) lapsosPorCartao.push({ id, topico, lapsos });
  }
  for (const c of cartoes || []) if (!avaliados.has(c.id)) estados.novo++;
  const principais = todas.filter(e => e.gap >= INTERVALO_LEMBRANCA);
  const base = resumir(principais);
  const faixas = FAIXAS.map(([rotulo, min, max]) => ({ faixa: rotulo, ...resumir(todas.filter(e => e.gap >= min && e.gap <= max)) }));
  const topicos = [...porTopico.values()].map(g => {
    const p = g.revs.filter(e => e.gap >= INTERVALO_LEMBRANCA);
    const s = resumir(p);
    const gaps = g.revs.filter(e => e.lembrou).map(e => e.gap);
    return { topico: g.topico, ...s, estados: g.estados, medianaIntervalo: median(gaps), maxIntervalo: gaps.length ? Math.max(...gaps) : null,
      sinal: s.n < MIN_REVISOES_TOPICO ? 'insuficiente' : s.intervalo.high < 0.7 ? 'fraco' : s.intervalo.low > 0.7 ? 'forte' : 'sem-sinal' };
  }).sort((a, b) => (a.intervalo?.high ?? 2) - (b.intervalo?.high ?? 2) || a.topico.localeCompare(b.topico));
  const gapsLembrados = todas.filter(e => e.lembrou).map(e => e.gap);
  return {
    de: cut, ate: shift(end, -1), principal: { ...base, amostraSuficiente: base.n >= MIN_REVISOES, falta: Math.max(0, MIN_REVISOES - base.n) },
    faixas, estados, topicos, lapsosRepetidos: lapsosPorCartao.sort((a, b) => b.lapsos - a.lapsos).slice(0, 10),
    intervalo: { mediana: median(gapsLembrados), maximo: gapsLembrados.length ? Math.max(...gapsLembrados) : null },
    atrasados, repescagem: { erros: repescagemErros, recuperados: repescagemRecuperados },
    revisoesValidas: todas.length, limites: { semData },
  };
}

/** Export compacto, sem texto do cartão. */
export function cartoesExport(reviews, cartoes) {
  const topicoDe = new Map((cartoes || []).map(c => [c.id, c.topicId || 'sem-tópico']));
  const out = [];
  for (const r of reviews || []) {
    const id = r?.k ?? r?.id;
    if (!id) continue;
    for (const h of Array.isArray(r.hist) ? r.hist : []) {
      if (!h?.em || !Number.isFinite(Date.parse(h.em)) || !nota(h.v)) continue;
      out.push({ data: new Date(h.em).toISOString(), cartaoId: id, topico: topicoDe.get(id) || 'sem-tópico', nota: nota(h.v), intervalo: Number.isFinite(Number(h.int)) ? Number(h.int) : undefined });
    }
  }
  return out;
}
