import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { chanceDeAcerto, orientacaoEstudo, orientacaoProva, NOMES_CAUSA } from '@/lib/navegador-orientacao';
import { NavBarraIntervalo } from '@/components/qb/navegador/NavBarraIntervalo';
import { NavSelo } from '@/components/qb/navegador/NavSelo';

/** Ação de prova: marcar, chutar, deixar em branco ou ainda sem dados. */
export const ACOES_PROVA = {
  marcar: { tom: 'correct', icon: 'circle-check' },
  chutar: { tom: 'attention', icon: 'dices' },
  branco: { tom: 'incorrect', icon: 'square-dashed' },
  'sem-dados': { tom: 'no-evidence', icon: 'circle-dashed' },
};
/** Método de estudo sugerido pela causa que o estudante marcou ao errar. */
export const METODOS = {
  flashcards: { icon: 'layers', curto: 'Flashcards' },
  feynman: { icon: 'message-circle', curto: 'Método Feynman' },
  contraste: { icon: 'split', curto: 'Contraste' },
  leitura: { icon: 'scan-line', curto: 'Leitura da assertiva' },
  'registrar-causa': { icon: 'notebook-pen', curto: 'Registrar a causa' },
};

export function NavChance({ stats }) {
  const c = chanceDeAcerto(stats);
  if (!c) return <span className="nv-mono nv-muted">—</span>;
  return <span className="nv-mono">{c.valor}%<span className="nv-muted" style={{ fontSize: '0.8em' }}> {c.min}–{c.max}</span></span>;
}

export function NavChipProva({ prova }) {
  const a = ACOES_PROVA[prova.acao] || ACOES_PROVA['sem-dados'];
  return <span className={`nv-chip nv-tone-${a.tom}`}><Icon name={a.icon} size={14} strokeWidth={2.2} />{prova.titulo}</span>;
}
export function NavChipEstudo({ estudo }) {
  const m = METODOS[estudo.metodo] || METODOS['registrar-causa'];
  return <span className="nv-chip nv-chip--neutro"><Icon name={m.icon} size={14} strokeWidth={2.2} />{m.curto}</span>;
}

/** Textos completos da orientação (prova e estudo) para um assunto. */
export function NavOrientacao({ stats }) {
  const prova = orientacaoProva(stats);
  const estudo = orientacaoEstudo(stats);
  return <>
    <div className="nv-detalhe__linha"><NavChipProva prova={prova} /><p>{prova.texto}</p></div>
    {estudo && <div className="nv-detalhe__linha"><NavChipEstudo estudo={estudo} /><p>{estudo.texto}{estudo.causa !== 'indeterminada' && <> Causa mais marcada: {NOMES_CAUSA[estudo.causa]}.</>}</p></div>}
  </>;
}

/** Cartão curto de "Faça agora": o que fazer na prova e como estudar o assunto. */
export function NavCartaoAcao({ stats, titulo, subtitulo, destaque }) {
  const prova = orientacaoProva(stats);
  const estudo = orientacaoEstudo(stats);
  const metodo = estudo && METODOS[estudo.metodo];
  const acao = ACOES_PROVA[prova.acao] || ACOES_PROVA['sem-dados'];
  const icone = metodo ? metodo.icon : acao.icon;
  return (
    <article className={`nv-acao nv-tone-${acao.tom}`} aria-label={titulo}>
      <span className="nv-acao__icone" aria-hidden="true"><Icon name={icone} size={22} /></span>
      <div className="nv-acao__corpo">
        <div style={{ display: 'grid', gap: 3 }}>
          {(destaque || subtitulo) && <span className="nv-acao__sub">{destaque ? <strong style={{ color: 'var(--qb-gold-bright)' }}>{destaque}{subtitulo ? ' · ' : ''}</strong> : null}{subtitulo}</span>}
          <h4 className="nv-acao__titulo">{titulo}</h4>
        </div>
        <div className="nv-acao__chance"><NavChance stats={stats} /><NavBarraIntervalo stats={stats} rotulo={'Chance de acerto em ' + titulo} /></div>
        <div className="nv-acao__linha">
          <NavChipProva prova={prova} />
          {estudo && <NavChipEstudo estudo={estudo} />}
          {stats.sinal && stats.sinal !== 'fraco' && stats.sinal !== 'sem-sinal' && <NavSelo sinal={stats.sinal} />}
        </div>
        <div className="nv-contagens" aria-label="Contagens">
          <span>{stats.validas} resp.</span><span>{stats.E} {stats.E === 1 ? 'erro' : 'erros'}</span>
          {stats.certezaErros > 0 && <span style={{ color: 'var(--state-incorrect)' }}>{stats.certezaErros} com certeza</span>}
        </div>
        <details className="nv-porque">
          <summary>Por quê <Icon name="chevron-down" size={14} /></summary>
          <p>{prova.texto}</p>
          {estudo && <p>{estudo.texto}{estudo.causa !== 'indeterminada' && <> Causa mais marcada: {NOMES_CAUSA[estudo.causa]}.</>}</p>}
        </details>
      </div>
    </article>
  );
}
export default NavCartaoAcao;
