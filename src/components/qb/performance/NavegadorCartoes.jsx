import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { NavBarraIntervalo, NavNumero, NavSelo } from '@/components/qb/navegador';
import { MIN_RESPOSTAS_TOPICO } from '@/lib/navegador';

const pct = v => Math.round(v * 100);
const dataBR = d => d.split('-').reverse().join('/');

/** Aba "Cartões" do Navegador: recordação dos flashcards, separada da chance de acerto das questões. */
export default function NavegadorCartoes({ analise, titles, nomeMateria }) {
  const { geral, topicos, reincidentes } = analise;
  if (!geral.n) {
    return <EmptyState compact title="Sem revisões de cartões na janela"
      description="Só contam cartões revisados depois da primeira vez. A primeira vista é aprendizado, não prova de retenção." />;
  }
  const dificeisPct = geral.C ? Math.round(100 * geral.dificeis / geral.C) : 0;
  return <>
    <div className="nv-numeros" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
      <NavNumero icone="layers" rotulo="Lembrança" valor={geral.validas ? pct(geral.acerto) : '—'} unidade="%"
        legenda={`${geral.C} lembrou · ${geral.E} esqueceu, de ${geral.n} revisões. Intervalo ${geral.intervaloAcerto ? pct(geral.intervaloAcerto.low) + '–' + pct(geral.intervaloAcerto.high) + '%' : 'indisponível'}.`} semComparacao="Sem comparação com a semana anterior" />
      <NavNumero icone="circle-alert" rotulo="Lembrou com esforço" valor={dificeisPct} unidade="%"
        legenda={`${geral.dificeis} de ${geral.C} cartões lembrados foram avaliados como Difícil.`} />
      <NavNumero icone="repeat" rotulo="Esquecidos mais de uma vez" valor={reincidentes.length}
        legenda="Cartões com 2 ou mais erros na janela." />
    </div>
    <p className="nv-note">Janela de <span className="nv-mono">{dataBR(analise.de)} a {dataBR(analise.ate)}</span>. Lembrou = Difícil, Bom ou Fácil; esqueceu = Errei. Esta trilha não entra na chance de acerto das questões.</p>
    {!!topicos.length && <section className="nv-stack" aria-label="Lembrança por assunto">
      <h3 className="nv-title nv-title--sm">Lembrança por assunto</h3>
      <ul className="nv-lista">{topicos.map(t => {
        const nome = titles.get(t.topico) || t.topico;
        return <li key={t.topico}><div className="nv-linha nv-linha--cartoes" style={{ cursor: 'default' }}>
          <span className="nv-linha__nome">
            <span className="nv-linha__titulo">{nome}</span>
            <span className="nv-linha__meta">
              <NavSelo sinal={t.sinal} />
              {nomeMateria(t.topico) && <span>{nomeMateria(t.topico)}</span>}
              {t.sinal === 'insuficiente' && t.validas < MIN_RESPOSTAS_TOPICO && <span className="nv-mono">faltam {MIN_RESPOSTAS_TOPICO - t.validas}</span>}
            </span>
          </span>
          <NavBarraIntervalo stats={t} rotulo={'Lembrança em ' + nome} />
          <span className="nv-linha__num">
            <strong>{t.validas ? pct(t.acerto) + '%' : '—'}</strong>
            <span>{t.C} lembrou · {t.E} esqueceu</span>
            {t.dificeis > 0 && <span>{t.dificeis} com esforço</span>}
          </span>
        </div></li>;
      })}</ul>
    </section>}
    {!!reincidentes.length && <section className="nv-stack" aria-label="Cartões esquecidos mais de uma vez">
      <h3 className="nv-title nv-title--sm">Esquecidos mais de uma vez</h3>
      <ul className="nv-lista">{reincidentes.slice(0, 8).map(c => <li key={c.id} className="nv-linha" style={{ cursor: 'default', gridTemplateColumns: 'minmax(0,1fr) auto' }}>
        <span className="nv-linha__nome">
          <span className="nv-linha__titulo">{titles.get(c.topico) || c.topico}</span>
          <span className="nv-linha__meta"><span className="nv-mono">{c.id}</span></span>
        </span>
        <span className="nv-selo nv-tone-incorrect"><Icon name="circle-x" size={14} />{c.esquecidos} erros</span>
      </li>)}</ul>
    </section>}
  </>;
}
