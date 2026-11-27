import React from 'react';
import { Icon } from '@/components/qb/core/Icon';

const TOM_DELTA = v => (v.melhora === true ? 'correct' : v.melhora === false ? 'incorrect' : 'no-evidence');
const ICONE_DELTA = { sobe: 'trending-up', desce: 'trending-down', estavel: 'minus' };

/**
 * Número grande em fonte mono, com rótulo, legenda e variação.
 * `variacao` vem de `variacao()`; `semComparacao` substitui a variação por um aviso em texto.
 */
export function NavNumero({ rotulo, icone, valor, unidade, variacao, contra = 'semana anterior', semComparacao, legenda }) {
  return (
    <div className="nv-numero">
      <span className="nv-numero__rotulo nv-overline">{icone && <Icon name={icone} size={14} />}{rotulo}</span>
      <span className="nv-numero__valor">{valor ?? '—'}{unidade && <span className="nv-numero__unidade">{unidade}</span>}</span>
      {variacao && <span className={`nv-delta nv-tone-${TOM_DELTA(variacao)}`}>
        <Icon name={ICONE_DELTA[variacao.sentido]} size={14} strokeWidth={2.2} />{variacao.texto}<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, opacity: 0.85 }}> vs. anterior</span><span className="nv-sr"> ({contra})</span>
      </span>}
      {!variacao && semComparacao && <span className="nv-delta nv-delta--texto nv-tone-no-evidence"><Icon name="info" size={13} />{semComparacao}</span>}
      {legenda && <p className="nv-numero__legenda">{legenda}</p>}
    </div>
  );
}
export default NavNumero;
