import { finishStats, janelaDe, sinalDe, diaBrasilia, MIN_RESPOSTAS_TOPICO } from './navegador.js';

/**
 * Avaliação de flashcards pelo Navegador. Trilha própria: não entra na chance de acerto das questões.
 * Só conta recordação: uma avaliação feita num cartão que já tinha sido avaliado antes (`rev: true`).
 * A primeira vista é aprendizado, não prova de retenção. Lembrou = Difícil, Bom ou Fácil; esqueceu = Errei.
 * Difícil é contado à parte, porque lembrar com esforço é um sinal mais fraco que lembrar sem esforço.
 */
const ESQUECEU = new Set(['errei', 'n', 'novamente']);
const LEMBROU = new Set(['dificil', 'bom', 'facil']);
export const MIN_ESQUECIDOS_REINCIDENTE = 2;

const lista = v => Array.isArray(v) ? v : [];

export function navegadorCartoes({ avaliacoes, cartoes, today, janela = janelaDe(today) }) {
  const donoDe = new Map(lista(cartoes).map(c => [c.id, c.topicId]));
  const porTopico = new Map();
  const reincidentes = [];
  let semTopico = 0, primeirasVistas = 0;
  const total = { C: 0, E: 0, B: 0, dificeis: 0, causas: {} };
  for (const aval of lista(avaliacoes)) {
    const id = aval?.id ?? aval?.k;
    let esquecidos = 0;
    const topico = donoDe.get(id);
    for (const h of lista(aval?.hist)) {
      const dia = diaBrasilia(h?.em), v = String(h?.v ?? '').toLowerCase();
      if (!dia || dia < janela.start || dia >= janela.end) continue;
      if (!ESQUECEU.has(v) && !LEMBROU.has(v)) continue;
      if (h.rev !== true) { primeirasVistas++; continue; }
      if (!topico) { semTopico++; continue; }
      const t = porTopico.get(topico) || { C: 0, E: 0, B: 0, dificeis: 0, causas: {} };
      if (ESQUECEU.has(v)) { t.E++; total.E++; esquecidos++; }
      else { t.C++; total.C++; if (v === 'dificil') { t.dificeis++; total.dificeis++; } }
      porTopico.set(topico, t);
    }
    if (topico && esquecidos >= MIN_ESQUECIDOS_REINCIDENTE) reincidentes.push({ id, topico, esquecidos });
  }
  const geral = finishStats({ ...total, n: total.C + total.E });
  const topicos = [...porTopico].map(([topico, base]) => {
    const s = finishStats({ ...base, n: base.C + base.E });
    return { topico, ...s, sinal: sinalDe(s, geral, MIN_RESPOSTAS_TOPICO) };
  }).sort((a, b) => (b.intervaloAcerto ? 1 - b.intervaloAcerto.high : 0) - (a.intervaloAcerto ? 1 - a.intervaloAcerto.high : 0) || b.E - a.E || a.topico.localeCompare(b.topico));
  reincidentes.sort((a, b) => b.esquecidos - a.esquecidos || a.id.localeCompare(b.id));
  return { de: janela.start, ate: diaBrasilia(new Date(Date.parse(janela.end + 'T12:00:00Z') - 86400000)), geral, topicos, reincidentes, semTopico, primeirasVistas };
}
