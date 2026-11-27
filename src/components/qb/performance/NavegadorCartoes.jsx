import React from 'react';
import { NavNumero } from '@/components/qb/navegador/NavNumero';
import { NavBarraIntervalo } from '@/components/qb/navegador/NavBarraIntervalo';
import { pct } from '@/components/qb/performance/NavegadorRelatorio';

const ESTADOS = [['novo', 'Novos', 'no-evidence'], ['aprendendo', 'Aprendendo', 'attention'], ['retencao', 'Em retenção', 'correct'], ['dominado', 'Dominados', 'gold']];
const comoStats = s => ({ acerto: s.taxa, intervaloAcerto: s.intervalo, validas: s.n });

/** Aba própria dos flashcards. Medida à parte das questões: nunca soma nem compara com a chance de acerto. */
export default function NavegadorCartoes({ cartoes, titles, nomeMateria }) {
  const p = cartoes.principal;
  const totalEstados = ESTADOS.reduce((n, [k]) => n + cartoes.estados[k], 0) || 1;
  const topicos = cartoes.topicos.filter(t => t.n > 0).slice(0, 8);
  return <div className="nv-stack" style={{ gap: 16 }}>
    <p className="nv-note">Lembrar com intervalo de 3 dias ou mais. Repetição no mesmo dia não conta.</p>
    <div className="nv-cartoes__numeros">
      <NavNumero rotulo="Lembrança com intervalo" icone="brain" valor={p.n ? Math.round(p.taxa * 100) : null} unidade={p.n ? '%' : undefined}
        legenda={p.n ? `${p.lembrou} de ${p.n} revisões${p.amostraSuficiente ? '' : ` · faltam ${p.falta} para concluir`}` : 'Sem revisões com intervalo na janela'} />
      <NavNumero rotulo="Dominados" icone="trophy" valor={cartoes.estados.dominado} legenda="2 lembranças seguidas, 7 dias ou mais" />
      <NavNumero rotulo="Vencidos" icone="clock" valor={cartoes.atrasados} legenda="atrasados há mais de 2 dias" />
    </div>
    {p.n > 0 && <div className="nv-stack" style={{ gap: 6 }}>
      <span className="nv-overline">Faixa de confiança (95%)</span>
      <NavBarraIntervalo stats={comoStats(p)} rotulo="Lembrança com intervalo" eixo />
    </div>}
    <section className="nv-stack" style={{ gap: 8 }} aria-label="Estado dos cartões">
      <h3 className="nv-title nv-title--sm">Estado dos cartões</h3>
      <div className="nv-estados" role="img" aria-label={ESTADOS.map(([k, l]) => `${l}: ${cartoes.estados[k]}`).join(', ')}>
        {ESTADOS.map(([k, , tom]) => cartoes.estados[k] > 0 && <span key={k} className={`nv-estados__seg nv-tone-${tom}`} style={{ flexGrow: cartoes.estados[k] / totalEstados }} />)}
      </div>
      <ul className="nv-estados__legenda">{ESTADOS.map(([k, l, tom]) => <li key={k} className={`nv-tone-${tom}`}><i aria-hidden="true" />{l} <b className="nv-mono">{cartoes.estados[k]}</b></li>)}</ul>
    </section>
    <section className="nv-stack" style={{ gap: 8 }} aria-label="Lembrança por intervalo">
      <h3 className="nv-title nv-title--sm">Lembrança por intervalo</h3>
      <ul className="nv-faixas">{cartoes.faixas.map(f => <li key={f.faixa}>
        <span className="nv-mono">{f.faixa} dias</span>
        <span className="nv-faixas__barra" aria-hidden="true"><span style={{ width: (f.taxa || 0) * 100 + '%' }} /></span>
        <span className="nv-mono">{f.n ? pct(f.taxa) : '—'} <span className="nv-muted">· {f.n}</span></span>
      </li>)}</ul>
    </section>
    {!!topicos.length && <section className="nv-stack" style={{ gap: 8 }} aria-label="Assuntos">
      <h3 className="nv-title nv-title--sm">Assuntos com menor lembrança</h3>
      <ul className="nv-cartoes__lista">{topicos.map(t => <li key={t.topico}>
        <span className="nv-cartoes__nome">{titles.get(t.topico) || t.topico}<small className="nv-muted">{nomeMateria?.(t.topico)}</small></span>
        <NavBarraIntervalo stats={comoStats(t)} rotulo={titles.get(t.topico) || t.topico} />
        <span className="nv-mono">{t.n ? pct(t.taxa) : '—'} <span className="nv-muted">· {t.n}</span></span>
      </li>)}</ul>
    </section>}
    {!!cartoes.lapsosRepetidos.length && <p className="nv-note"><strong>Reformular:</strong> {cartoes.lapsosRepetidos.length} cartões com 2 lapsos ou mais depois de já retidos.</p>}
    <p className="nv-note nv-muted">Repescagem do dia: {cartoes.repescagem.recuperados} recuperados, {cartoes.repescagem.erros} errados{cartoes.limites.semData ? ` · ${cartoes.limites.semData} sem data` : ''}.</p>
  </div>;
}
