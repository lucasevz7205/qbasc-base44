import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { caminhoDoArco, pontoNoArco, tomDoIntervalo } from '@/lib/navegador-visual';

const pct = v => Math.round(v * 100);
export const VEREDITOS = {
  correct: { icon: 'circle-check', texto: 'Acima de 50% mesmo no pior caso' },
  incorrect: { icon: 'circle-x', texto: 'Abaixo de 50% mesmo no melhor caso' },
  attention: { icon: 'triangle-alert', texto: 'O intervalo ainda cruza 50%' },
  'no-evidence': { icon: 'circle-dashed', texto: 'Sem respostas válidas' },
};

/**
 * Arco de chance de acerto: faixa = intervalo de 95%, ponto e agulha = estimativa, traço no topo = 50%,
 * o ponto de equilíbrio da nota líquida. Recebe estatísticas com `acerto`, `intervaloAcerto` e `validas`.
 */
export function NavMedidor({ stats, tamanho = 'lg', rotulo = 'Chance de acerto', mostrarVeredito = tamanho === 'lg', animar = tamanho === 'lg' }) {
  const intervalo = stats?.validas ? stats.intervaloAcerto : null;
  const tom = tomDoIntervalo(intervalo);
  const lg = tamanho === 'lg';
  const W = 200, cx = 100, cy = 100, r = 82, sw = lg ? 14 : 18;
  const ponto = intervalo ? pontoNoArco(cx, cy, r, stats.acerto) : null;
  const agulha = intervalo ? pontoNoArco(cx, cy, r - (lg ? 26 : 30), stats.acerto) : null;
  const topo = [pontoNoArco(cx, cy, r - sw / 2 - 5, 0.5), pontoNoArco(cx, cy, r + sw / 2 + 5, 0.5)];
  const descricao = intervalo
    ? `${rotulo}: ${pct(stats.acerto)}%, intervalo de ${pct(intervalo.low)}% a ${pct(intervalo.high)}%, com ${stats.validas} ${stats.validas === 1 ? 'resposta válida' : 'respostas válidas'}. ${VEREDITOS[tom].texto}.`
    : `${rotulo}: sem respostas válidas.`;
  const v = VEREDITOS[tom];
  return (
    <div className={`nv-medidor nv-medidor--${tamanho} nv-tone-${tom}`}>
      <svg viewBox={`0 ${lg ? -4 : 4} ${W} ${lg ? 124 : 104}`} role="img" aria-label={descricao}>
        <path d={caminhoDoArco(cx, cy, r, 0, 1)} fill="none" stroke="var(--nv-track)" strokeWidth={sw} strokeLinecap="round" />
        {lg && [0.25, 0.75].map(f => { const a = pontoNoArco(cx, cy, r - sw / 2 - 3, f), b = pontoNoArco(cx, cy, r - sw / 2 - 8, f); return <line key={f} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--text-muted)" strokeOpacity=".5" strokeWidth="1.5" />; })}
        {intervalo && <path className={'nv-medidor__faixa' + (animar ? ' nv-anima-arco' : '')} d={caminhoDoArco(cx, cy, r, intervalo.low, intervalo.high)} fill="none" strokeWidth={sw} strokeLinecap="butt" />}
        <line className="nv-medidor__meio" x1={topo[0].x} y1={topo[0].y} x2={topo[1].x} y2={topo[1].y} strokeWidth="2" strokeDasharray="3 2" />
        {intervalo && <g className={animar ? 'nv-anima-surge' : undefined}>
          <line className="nv-medidor__agulha" x1={cx} y1={cy} x2={agulha.x} y2={agulha.y} strokeWidth={lg ? 2.5 : 3} strokeLinecap="round" opacity=".9" />
          <circle cx={cx} cy={cy} r={lg ? 4 : 5} fill="var(--nv-tone)" />
          <circle className="nv-medidor__ponto" cx={ponto.x} cy={ponto.y} r={lg ? 8 : 9} strokeWidth="3" />
        </g>}
        {lg && <>
          <text className="nv-medidor__escala" x={cx} y={topo[1].y - 4} textAnchor="middle">50%</text>
          <text className="nv-medidor__escala" x={cx - r} y={cy + 20} textAnchor="middle">0</text>
          <text className="nv-medidor__escala" x={cx + r} y={cy + 20} textAnchor="middle">100</text>
        </>}
        {lg && (intervalo
          ? <>
            <text className="nv-medidor__valor" x={cx} y={cy - 18} textAnchor="middle" fontSize="34">{pct(stats.acerto)}<tspan fontSize="16" dx="2">%</tspan></text>
            <text className="nv-medidor__sub" x={cx} y={cy + 16} textAnchor="middle" fontSize="11.5">{pct(intervalo.low)}–{pct(intervalo.high)}%</text>
          </>
          : <text className="nv-medidor__sub" x={cx} y={cy - 18} textAnchor="middle" fontSize="13">sem dados</text>)}
      </svg>
      {lg && mostrarVeredito && <span className="nv-veredito"><Icon name={v.icon} size={15} strokeWidth={2.2} />{v.texto}</span>}
    </div>
  );
}
export default NavMedidor;
