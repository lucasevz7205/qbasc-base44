import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { chanceDeAcerto } from '@/lib/navegador-orientacao';
import { tomDoIntervalo } from '@/lib/navegador-visual';
import { MIN_RESPOSTAS_DISCIPLINA } from '@/lib/navegador';
import { NavMedidor } from '@/components/qb/navegador/NavMedidor';
import { NavSelo } from '@/components/qb/navegador/NavSelo';

/** Cartão de matéria com mini-medidor, chance, sinal e contagens. Clicar abre os assuntos da matéria. */
export function NavCartaoMateria({ materia, onAbrir }) {
  const c = chanceDeAcerto(materia);
  const tom = materia.validas ? tomDoIntervalo(materia.intervaloAcerto) : 'no-evidence';
  const faltam = materia.sinal === 'insuficiente' && materia.validas < MIN_RESPOSTAS_DISCIPLINA ? MIN_RESPOSTAS_DISCIPLINA - materia.validas : 0;
  return (
    <button type="button" className={`nv-materia nv-tone-${tom}`} onClick={() => onAbrir && onAbrir(materia.id)}
      aria-label={`${materia.nome}: ${c ? c.valor + '% de chance de acerto, de ' + c.min + '% a ' + c.max + '%' : 'sem respostas válidas'}. Abrir assuntos.`}>
      <span className="nv-materia__topo">
        <span className="nv-materia__nome">{materia.nome}</span>
      </span>
      <span className="nv-materia__meio">
        <NavMedidor stats={materia} tamanho="sm" />
        <span className="nv-materia__num">
          <strong>{c ? c.valor + '%' : '—'}</strong>
          <span>{c ? c.min + '–' + c.max + '%' : 'sem dados'}</span>
          <span>{materia.validas} resp. · {materia.topicos} {materia.topicos === 1 ? 'assunto' : 'assuntos'}</span>
        </span>
      </span>
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <NavSelo sinal={materia.sinal} />
        {faltam > 0 && <span className="nv-mono nv-muted" style={{ fontSize: 12 }}>faltam {faltam}</span>}
      </span>
      <span className="nv-materia__rodape">
        <span><span className="nv-mono">{materia.E}</span> {materia.E === 1 ? 'erro' : 'erros'} · <span className="nv-mono">{materia.certezaErros}</span> com certeza</span>
        <span className="nv-materia__ir" aria-hidden="true">Assuntos<Icon name="arrow-right" size={14} /></span>
      </span>
    </button>
  );
}
export default NavCartaoMateria;
