import React from 'react';

/** Sinal de um assunto ou matéria: cor, forma e texto (nunca só cor). */
export const SELOS = {
  fraco: { tom: 'incorrect', rotulo: 'Ponto fraco', forma: 'baixo' },
  'sem-sinal': { tom: 'attention', rotulo: 'Sem sinal claro', forma: 'losango' },
  forte: { tom: 'correct', rotulo: 'Forte', forma: 'cima' },
  insuficiente: { tom: 'no-evidence', rotulo: 'Amostra insuficiente', forma: 'aro' },
};

export function NavForma({ forma, size = 10 }) {
  const common = { width: size, height: size, viewBox: '0 0 10 10', 'aria-hidden': true, focusable: 'false' };
  if (forma === 'baixo') return <svg {...common}><path d="M0.5 1.5h9L5 9z" fill="currentColor" /></svg>;
  if (forma === 'cima') return <svg {...common}><path d="M0.5 8.5h9L5 1z" fill="currentColor" /></svg>;
  if (forma === 'losango') return <svg {...common}><path d="M5 0.5 9.5 5 5 9.5 0.5 5z" fill="currentColor" /></svg>;
  return <svg {...common}><circle cx="5" cy="5" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 1.6" /></svg>;
}

export function NavSelo({ sinal, rotulo, style }) {
  const s = SELOS[sinal] || SELOS.insuficiente;
  return (
    <span className={`nv-selo nv-tone-${s.tom}` + (sinal === 'insuficiente' || !SELOS[sinal] ? ' nv-selo--insuficiente' : '')} style={style}>
      <NavForma forma={s.forma} />{rotulo || s.rotulo}
    </span>
  );
}
export default NavSelo;
