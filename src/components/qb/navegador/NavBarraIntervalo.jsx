import React from 'react';
import { intervaloNaBarra, tomDoIntervalo } from '@/lib/navegador-visual';

const pct = v => Math.round(v * 100);

/**
 * Barra de 0 a 100%: o ponto é a estimativa de acerto, a faixa é o intervalo de 95% e a linha tracejada marca 50%.
 * Amostra pequena aparece como faixa larga.
 */
export function NavBarraIntervalo({ stats, rotulo = 'Chance de acerto', eixo = false }) {
  const pos = intervaloNaBarra(stats);
  const tom = pos ? tomDoIntervalo(stats.intervaloAcerto) : 'no-evidence';
  const descricao = pos
    ? `${rotulo}: ${pct(stats.acerto)}%, intervalo de ${pct(stats.intervaloAcerto.low)}% a ${pct(stats.intervaloAcerto.high)}%; linha de 50% marcada.`
    : `${rotulo}: sem respostas válidas.`;
  return (
    <div className={`nv-barra-wrap nv-tone-${tom}`} style={{ minWidth: 0 }}>
      <div className={'nv-barra' + (pos ? '' : ' nv-barra--vazia')} role="img" aria-label={descricao}>
        <span className="nv-barra__trilho" />
        {pos && <span className="nv-barra__faixa" style={{ left: pos.de + '%', width: pos.largura + '%' }} />}
        <span className="nv-barra__meio" />
        {pos && <span className="nv-barra__ponto" style={{ left: pos.ponto + '%' }} />}
      </div>
      {eixo && <div className="nv-barra__eixo" aria-hidden="true"><span>0</span><span>50%</span><span>100</span></div>}
    </div>
  );
}
export default NavBarraIntervalo;
