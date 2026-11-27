// Geometria e escalas dos gráficos do Navegador. Só apresentação: nenhum cálculo estatístico novo.

const clamp01 = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const round = value => Math.round(value * 100) / 100;

/**
 * Ponto do arco do medidor (meia-lua de cima). `fracao` 0 fica à esquerda, 1 à direita, 0,5 no topo.
 */
export function pontoNoArco(cx, cy, r, fracao) {
  const angulo = Math.PI * (1 - clamp01(fracao));
  return { x: round(cx + r * Math.cos(angulo)), y: round(cy - r * Math.sin(angulo)) };
}

/** Caminho SVG do arco entre duas frações (0 a 1). Vazio quando o trecho não tem comprimento. */
export function caminhoDoArco(cx, cy, r, de, ate) {
  const a = clamp01(Math.min(de, ate)), b = clamp01(Math.max(de, ate));
  if (b - a < 1e-6) return '';
  const p0 = pontoNoArco(cx, cy, r, a), p1 = pontoNoArco(cx, cy, r, b);
  // Da esquerda para a direita pelo alto é sentido horário na tela; nunca passa de 180°.
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y}`;
}

/** Posição (0 a 100) de um valor numa barra com domínio [min, max], presa às bordas. */
export function posicaoNaBarra(valor, min = 0, max = 1) {
  if (!Number.isFinite(valor) || max <= min) return null;
  return round(clamp01((valor - min) / (max - min)) * 100);
}

/** Ponto e faixa de uma estatística com `acerto` e `intervaloAcerto`, em % da barra. */
export function intervaloNaBarra(stats) {
  if (!stats?.validas || !stats.intervaloAcerto || !Number.isFinite(stats.acerto)) return null;
  const de = posicaoNaBarra(stats.intervaloAcerto.low), ate = posicaoNaBarra(stats.intervaloAcerto.high);
  return { ponto: posicaoNaBarra(stats.acerto), de, ate, largura: round(ate - de) };
}

/**
 * Tom de estado de um intervalo de acerto em relação ao equilíbrio de 50% da nota líquida:
 * acima mesmo no pior caso, abaixo mesmo no melhor caso, ou ainda atravessando 50%.
 */
export function tomDoIntervalo(intervalo, limite = 0.5) {
  if (!intervalo) return 'no-evidence';
  if (intervalo.low > limite) return 'correct';
  if (intervalo.high < limite) return 'incorrect';
  return 'attention';
}

/** Variação entre dois números inteiros. `melhorQuando` 'maior' ou 'menor' diz o sentido de melhora; outro valor deixa neutro. */
export function variacao(atual, anterior, melhorQuando = 'maior') {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior)) return null;
  const delta = atual - anterior;
  const sentido = delta > 0 ? 'sobe' : delta < 0 ? 'desce' : 'estavel';
  const melhora = delta === 0 || !['maior', 'menor'].includes(melhorQuando) ? null : (delta > 0) === (melhorQuando === 'maior');
  return { delta, sentido, melhora, texto: (delta > 0 ? '+' : delta < 0 ? '−' : '±') + Math.abs(delta) };
}

/** Contagem de assuntos por sinal, na ordem dos filtros. */
export function contarSinais(topicos) {
  const out = { fraco: 0, 'sem-sinal': 0, forte: 0, insuficiente: 0 };
  for (const t of topicos || []) if (t.sinal in out) out[t.sinal]++;
  return out;
}

/** Domínio arredondado para a escala de uma série, incluindo as referências pedidas (ex.: 0 ou 0,5). */
export function dominioTendencia(valores, { incluir = [], passo = 1, minimoAmplitude = passo * 4 } = {}) {
  const v = [...valores, ...incluir].filter(Number.isFinite);
  if (!v.length) return [0, minimoAmplitude];
  const max = Math.max(...v);
  let lo = Math.floor(Math.min(...v) / passo) * passo;
  let hi = Math.ceil(max / passo) * passo;
  if (hi - lo < minimoAmplitude) {
    // Abre a escala para os dois lados, sem deixar o maior valor de fora.
    lo -= Math.floor((minimoAmplitude - (hi - lo)) / passo / 2) * passo;
    hi = lo + minimoAmplitude;
  }
  return [round(lo), round(hi)];
}

/** Escala linear de um domínio para um intervalo de pixels (y cresce para baixo quando range é [base, topo]). */
export function escalaLinear([d0, d1], [r0, r1]) {
  const span = d1 - d0 || 1;
  return value => round(r0 + ((value - d0) / span) * (r1 - r0));
}

/** Posições x igualmente espaçadas para n pontos entre `inicio` e `fim` (um ponto fica no meio). */
export function posicoesX(n, inicio, fim) {
  if (n <= 0) return [];
  if (n === 1) return [round((inicio + fim) / 2)];
  return Array.from({ length: n }, (_, i) => round(inicio + ((fim - inicio) * i) / (n - 1)));
}

const dm = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7);

/**
 * Pontos da tendência a partir dos relatórios semanais já expandidos (mais antigo primeiro).
 * Nota líquida é a da semana do relatório; a chance usa a janela de 14 dias que o relatório salvou.
 */
export function pontosTendencia(relatorios, limite = 12) {
  return (relatorios || [])
    .filter(r => r?.tipo === 'semanal' && r.placar?.atual)
    .sort((a, b) => a.referencia.localeCompare(b.referencia))
    .slice(-limite)
    .map(r => {
      const g = r.geral || {};
      const temChance = g.validas > 0 && g.intervaloAcerto;
      return {
        id: r.id, referencia: r.referencia, rotulo: dm(r.referencia),
        liquida: r.placar.atual.liquida, n: r.placar.atual.n,
        acerto: temChance ? g.acerto : null,
        low: temChance ? g.intervaloAcerto.low : null,
        high: temChance ? g.intervaloAcerto.high : null,
        validas: g.validas || 0,
      };
    });
}

/** Data ISO (aaaa-mm-dd) em dd/mm/aaaa. */
export const dataBR = iso => (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : '');
/** Data ISO em dd/mm. */
export const diaMes = iso => (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? dm(iso) : '');
