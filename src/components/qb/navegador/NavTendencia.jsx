import React from 'react';
import { dominioTendencia, escalaLinear, posicoesX } from '@/lib/navegador-visual';

const H = 168, PAD = { top: 18, right: 22, bottom: 26, left: 38 };

function useLargura(ref, inicial = 560) {
  const [w, setW] = React.useState(inicial);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/**
 * Linha semanal com faixa de incerteza opcional.
 * pontos: [{ id, rotulo, valor, low?, high? }]. `percentual` fixa a escala em 0–100% e formata os rótulos.
 */
export function NavTendencia({ titulo, pontos, cor = 'var(--viz-1)', forma = 'circulo', percentual = false, referencia, rotuloReferencia, descricaoValor }) {
  const ref = React.useRef(null);
  const W = useLargura(ref);
  const validos = pontos.filter(p => Number.isFinite(p.valor));
  const dominio = percentual ? [0, 1] : dominioTendencia(validos.map(p => p.valor), { incluir: referencia === undefined ? [] : [referencia] });
  const y = escalaLinear(dominio, [H - PAD.bottom, PAD.top]);
  const xs = posicoesX(pontos.length, PAD.left + 12, W - PAD.right - 12);
  const fmt = v => (percentual ? Math.round(v * 100) + '%' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v));
  const ticks = percentual ? [0, 0.5, 1] : [dominio[0], dominio[1], ...(referencia !== undefined && referencia > dominio[0] && referencia < dominio[1] ? [referencia] : [])];
  const linha = pontos.map((p, i) => Number.isFinite(p.valor) ? `${xs[i]},${y(p.valor)}` : null).filter(Boolean);
  const comFaixa = pontos.map((p, i) => ({ p, x: xs[i] })).filter(({ p }) => Number.isFinite(p.low) && Number.isFinite(p.high));
  const faixa = comFaixa.length > 1
    ? [...comFaixa.map(({ p, x }) => `${x},${y(p.high)}`), ...[...comFaixa].reverse().map(({ p, x }) => `${x},${y(p.low)}`)].join(' ')
    : '';
  const ultimo = validos[validos.length - 1];
  const rotuloSalto = Math.max(1, Math.ceil(pontos.length / Math.max(2, Math.floor((W - PAD.left - PAD.right) / 56))));
  const resumo = validos.length
    ? `${titulo}: ${validos.length} ${validos.length === 1 ? 'semana' : 'semanas'}; última ${ultimo.rotulo} com ${descricaoValor ? descricaoValor(ultimo) : fmt(ultimo.valor)}.`
    : `${titulo}: sem dados.`;
  return (
    <figure className="nv-tendencia" style={{ margin: 0 }}>
      <figcaption className="nv-tendencia__cab">
        <span className="nv-overline">{titulo}</span>
        {ultimo && <span className="nv-tendencia__ultimo">{fmt(ultimo.valor)}<span className="nv-muted" style={{ fontSize: 12, marginLeft: 6 }}>em {ultimo.rotulo}</span></span>}
      </figcaption>
      <div ref={ref} style={{ width: '100%', minWidth: 0 }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={resumo}>
          {ticks.map(t => <g key={'t' + t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y(t) + 3.5} textAnchor="end">{fmt(t)}</text>
          </g>)}
          {referencia !== undefined && <g>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(referencia)} y2={y(referencia)} stroke="var(--qb-ivory)" strokeOpacity=".55" strokeDasharray="4 3" strokeWidth="1.25" />
            {rotuloReferencia && <text className="nv-t-ref" x={W - PAD.right} y={y(referencia) - 5} textAnchor="end">{rotuloReferencia}</text>}
          </g>}
          {faixa && <polygon points={faixa} fill={cor} fillOpacity=".14" stroke="none" />}
          {comFaixa.length === 1 && <line x1={comFaixa[0].x} x2={comFaixa[0].x} y1={y(comFaixa[0].p.low)} y2={y(comFaixa[0].p.high)} stroke={cor} strokeOpacity=".4" strokeWidth="10" strokeLinecap="round" />}
          {linha.length > 1 && <polyline points={linha.join(' ')} fill="none" stroke={cor} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />}
          {pontos.map((p, i) => Number.isFinite(p.valor) && (forma === 'quadrado'
            ? <rect key={p.id} x={xs[i] - 4.5} y={y(p.valor) - 4.5} width="9" height="9" rx="1.5" fill={cor} stroke="var(--qb-navy-deep)" strokeWidth="2" />
            : <circle key={p.id} cx={xs[i]} cy={y(p.valor)} r="5" fill={cor} stroke="var(--qb-navy-deep)" strokeWidth="2" />))}
          {ultimo && <text className="nv-t-valor" x={xs[pontos.indexOf(ultimo)]} y={y(ultimo.valor) - 10} textAnchor="middle">{fmt(ultimo.valor)}</text>}
          {pontos.map((p, i) => ((pontos.length - 1 - i) % rotuloSalto === 0) && <text key={'x' + p.id} x={xs[i]} y={H - 6} textAnchor="middle">{p.rotulo}</text>)}
        </svg>
      </div>
      <div className="nv-sr"><table>
        <caption>{titulo}</caption>
        <thead><tr><th>Semana</th><th>Valor</th>{comFaixa.length > 0 && <th>Intervalo</th>}</tr></thead>
        <tbody>{pontos.map(p => <tr key={p.id}><td>{p.rotulo}</td><td>{Number.isFinite(p.valor) ? fmt(p.valor) : 'sem dados'}</td>
          {comFaixa.length > 0 && <td>{Number.isFinite(p.low) ? fmt(p.low) + ' a ' + fmt(p.high) : '—'}</td>}</tr>)}</tbody>
      </table></div>
    </figure>
  );
}
export default NavTendencia;
