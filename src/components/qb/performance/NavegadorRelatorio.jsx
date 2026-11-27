import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { MIN_RESPOSTAS_TOPICO } from '@/lib/navegador';
import { variacao, dataBR } from '@/lib/navegador-visual';
import {
  NavMedidor, NavNumero, NavSelo, NavBarraIntervalo, NavCartaoAcao, NavOrientacao,
} from '@/components/qb/navegador';

export const pct = value => (value === null || value === undefined ? '—' : Math.round(value * 100) + '%');
const sinalNum = v => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0');
const periodo = r => dataBR(r.periodo.de) + ' a ' + dataBR(r.periodo.ate);
export const tituloRelatorio = r => (r.tipo === 'mensal' ? 'Relatório mensal' : 'Relatório semanal') + ' · ' + periodo(r);

/** Assuntos que pedem ação agora: ponto fraco ou erro com certeza, na ordem de risco. */
export const prioridadesDe = (topicos, n = 3) => topicos.filter(t => t.sinal === 'fraco' || t.certezaErros > 0).slice(0, n);

/**
 * Medidor da chance geral e os três números (nota líquida, erros com certeza, volume).
 * Com `placar` compara as duas janelas; sem ele (escopo de matéria) mostra os totais de `stats`.
 */
export function NavResumoNumeros({ stats, placar, comparacao, rotuloMedidor = 'Chance geral de acerto', legendaMedidor, compacto = false }) {
  const atual = placar ? placar.atual : { liquida: stats.C - stats.E, n: stats.n, C: stats.C, E: stats.E, B: stats.B, certezaN: stats.certezaN, certezaErros: stats.certezaErros };
  const ok = placar && comparacao?.conclusivo;
  const sem = !placar ? 'Janela de 14 dias' : ok ? undefined : 'Sem comparação';
  const inconclusivo = placar && !ok ? `Comparação só com ${comparacao.minimo}+ primeiras tentativas nas duas semanas (agora ${comparacao.nAtual} e ${comparacao.nAnterior}).` : '';
  return (
    <div className="nv-resumo">
      <div className="nv-cartao nv-cartao--medidor">
        <span className="nv-overline">{rotuloMedidor}</span>
        <NavMedidor stats={stats} rotulo={rotuloMedidor} animar={!compacto} />
        {legendaMedidor && <p className="nv-note" style={{ textAlign: 'center' }}>{legendaMedidor}</p>}
      </div>
      <div className="nv-numeros">
        <NavNumero rotulo="Nota líquida" icone="scale" valor={sinalNum(atual.liquida)}
          variacao={ok ? variacao(atual.liquida, placar.anterior.liquida, 'maior') : null} semComparacao={sem}
          legenda={<><span className="nv-mono">{atual.C}</span> C · <span className="nv-mono">{atual.E}</span> E · <span className="nv-mono">{atual.B}</span> em branco{compacto ? '' : '. ' + (placar ? 'Semana mais recente.' : 'C − E.')}{!compacto && inconclusivo ? ' ' + inconclusivo : ''}</>} />
        <NavNumero rotulo="Erros com certeza" icone="triangle-alert" valor={atual.certezaErros} unidade={'de ' + atual.certezaN}
          variacao={ok ? variacao(atual.certezaErros, placar.anterior.certezaErros, 'menor') : null} semComparacao={sem}
          legenda={compacto ? 'Confiança 3 e erro.' : 'Erros marcados com confiança 3: os mais urgentes.'} />
        <NavNumero rotulo="Volume" icone="list-checks" valor={atual.n} unidade="resp."
          variacao={ok ? variacao(atual.n, placar.anterior.n, 'neutro') : null} semComparacao={sem}
          legenda={compacto ? 'Primeiras tentativas.' : 'Primeiras tentativas, treino e simulado.'} />
      </div>
    </div>
  );
}

/** Assuntos como linhas com barra de intervalo; clicar abre a orientação completa. */
export function NavListaAssuntos({ topicos, titles, materiaDe, abertoInicial = null }) {
  const [aberto, setAberto] = React.useState(abertoInicial);
  React.useEffect(() => { if (abertoInicial) setAberto(abertoInicial); }, [abertoInicial]);
  if (!topicos.length) return null;
  return (
    <ul className="nv-lista">
      {topicos.map(t => {
        const nome = titles.get(t.topico) || t.topico;
        const open = aberto === t.topico;
        const idDetalhe = 'nv-assunto-' + String(t.topico).replace(/[^a-zA-Z0-9_-]/g, '_');
        return <li key={t.topico}>
          <button type="button" className="nv-linha" aria-expanded={open} aria-controls={idDetalhe} onClick={() => setAberto(open ? null : t.topico)}>
            <span className="nv-linha__nome">
              <span className="nv-linha__titulo">{nome}</span>
              <span className="nv-linha__meta">
                <NavSelo sinal={t.sinal} />
                {materiaDe && materiaDe(t.topico) && <span>{materiaDe(t.topico)}</span>}
                {t.sinal === 'insuficiente' && t.validas < MIN_RESPOSTAS_TOPICO && <span className="nv-mono">faltam {MIN_RESPOSTAS_TOPICO - t.validas}</span>}
              </span>
            </span>
            <NavBarraIntervalo stats={t} rotulo={'Chance de acerto em ' + nome} />
            <span className="nv-linha__num">
              <strong>{t.validas && t.sinal !== 'insuficiente' ? Math.round(t.acerto * 100) + '%' : '—'}</strong>
              <span>{t.validas ? Math.round(t.intervaloAcerto.low * 100) + '–' + Math.round(t.intervaloAcerto.high * 100) + '% · ' : ''}{t.validas} resp.</span>
            </span>
          </button>
          {open && <div className="nv-detalhe" id={idDetalhe}>
            <div className="nv-contagens">
              <span>{t.C} C</span><span>{t.E} E</span><span>{t.B} em branco</span>
              <span>{t.certezaErros}/{t.certezaN} erros com certeza</span>
              {t.simulado > 0 && <span>{t.simulado} em simulado</span>}
            </div>
            <NavOrientacao stats={t} />
          </div>}
        </li>;
      })}
    </ul>
  );
}

/** Relatório salvo, já expandido por `expandirRelatorio`. */
export function NavegadorRelatorio({ relatorio, titles, compacto = false }) {
  const { placar, geral, topicos, comparacao } = relatorio;
  const prioridades = prioridadesDe(topicos, compacto ? 2 : 3);
  const outros = compacto ? [] : topicos.filter(t => !prioridades.includes(t)).slice(0, 5);
  return (
    <div className="nv-stack" style={{ gap: 16 }}>
      <NavResumoNumeros stats={geral} placar={placar} comparacao={comparacao} compacto={compacto}
        legendaMedidor={compacto ? undefined : `Primeiras tentativas de ${periodo(relatorio)}.`} />
      <section className="nv-stack" aria-label="Faça agora">
        <h3 className="nv-title nv-title--sm">{prioridades.length ? 'Faça agora' : 'Assuntos'}</h3>
        {!topicos.length && <EmptyState compact tone="empty" title="Sem primeiras tentativas com tópico neste período" />}
        {!!topicos.length && !prioridades.length && <p className="nv-note">Nenhum assunto com ponto fraco ou erro com certeza neste período.</p>}
        {!!prioridades.length && <div className="nv-acoes">{prioridades.map(t => <NavCartaoAcao key={t.topico} stats={t} titulo={titles.get(t.topico) || t.topico} />)}</div>}
        {outros.length > 0 && <NavListaAssuntos topicos={outros} titles={titles} />}
      </section>
      {relatorio.semTopico > 0 && <p className="nv-note"><Icon name="info" size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {relatorio.semTopico} primeiras tentativas estão sem tópico e não entram na análise por assunto.</p>}
    </div>
  );
}
