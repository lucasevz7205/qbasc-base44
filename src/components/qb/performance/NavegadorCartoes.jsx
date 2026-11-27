import React from 'react';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { NavNumero, NavSelo } from '@/components/qb/navegador';
import { pct } from '@/components/qb/performance/NavegadorRelatorio';
import { dataBR } from '@/lib/navegador-visual';

const ESTADOS = [['novo', 'Novos'], ['aprendendo', 'Aprendendo'], ['retencao', 'Em retenção'], ['dominado', 'Dominados']];
const LIMITE = 8;

/**
 * Aba "Cartões" do Navegador: recordação dos flashcards, medida à parte das questões.
 * Nunca soma nem compara com a chance de acerto das questões.
 * `topicosEscopo` (Set de ids) limita só a lista por assunto; os números de cima valem para todos os cartões.
 */
export default function NavegadorCartoes({ cartoes, titles, nomeMateria, topicosEscopo = null }) {
  const [todos, setTodos] = React.useState(false);
  const p = cartoes.principal;
  const lista = cartoes.topicos.filter(t => t.n > 0 && (!topicosEscopo || topicosEscopo.has(t.topico)));
  const visiveis = todos ? lista : lista.slice(0, LIMITE);
  const rep = cartoes.repescagem;
  const semRevisoes = !cartoes.revisoesValidas;
  return <div className="nv-stack" style={{ gap: 16 }}>
    <p className="nv-note">
      Janela de <span className="nv-mono">{dataBR(cartoes.de)} a {dataBR(cartoes.ate)}</span>. Conta lembrar com intervalo de 3 dias ou mais;
      repetição no mesmo dia (repescagem) fica de fora. Medida à parte das questões.
    </p>

    {semRevisoes
      ? <EmptyState compact title="Sem revisões de cartões com intervalo na janela"
        description="Só contam cartões revisados depois da primeira vez, em dia diferente. A primeira vista é aprendizado, não prova de retenção." />
      : <div className="nv-numeros nv-numeros--tres">
        <NavNumero rotulo="Lembrança com intervalo" icone="layers" valor={p.n ? Math.round(p.taxa * 100) : '—'} unidade="%"
          semComparacao={p.amostraSuficiente ? undefined : `Amostra insuficiente: faltam ${p.falta} revisões`}
          legenda={<>{p.lembrou} de {p.n}{p.intervalo ? <> · 95%: <span className="nv-mono">{pct(p.intervalo.low)}</span> a <span className="nv-mono">{pct(p.intervalo.high)}</span></> : ''}</>} />
        <NavNumero rotulo="Vencidos há +2 dias" icone="calendar-clock" valor={cartoes.atrasados} unidade="cartões"
          legenda="Revisão prevista e ainda não feita." />
        <NavNumero rotulo="Intervalo lembrado" icone="timer" valor={cartoes.intervalo.mediana ?? '—'} unidade={cartoes.intervalo.mediana === null ? undefined : 'dias'}
          legenda={cartoes.intervalo.maximo === null ? 'Sem revisões lembradas.' : `Mediana · máximo de ${cartoes.intervalo.maximo} dias`} />
      </div>}

    <section className="nv-stack" aria-label="Estados dos cartões" style={{ gap: 8 }}>
      <span className="nv-overline">Estado dos cartões hoje</span>
      <ul className="nv-estados">
        {ESTADOS.map(([k, rotulo]) => <li key={k}><span className="nv-mono">{cartoes.estados[k]}</span><span>{rotulo}</span></li>)}
      </ul>
    </section>

    {!!lista.length && <section className="nv-stack" aria-labelledby="nv-cartoes-assuntos">
      <h3 id="nv-cartoes-assuntos" className="nv-title nv-title--sm">Lembrança por assunto</h3>
      <ul className="nv-lista">
        {visiveis.map(t => <li key={t.topico}>
          <div className="nv-linha nv-linha--estatica nv-linha--cartoes">
            <span className="nv-linha__nome">
              <span className="nv-linha__titulo">{titles.get(t.topico) || t.topico}</span>
              <span className="nv-linha__meta">
                <NavSelo sinal={t.sinal} />
                {nomeMateria?.(t.topico) && <span>{nomeMateria(t.topico)}</span>}
              </span>
            </span>
            <span className="nv-linha__num">
              <strong>{pct(t.taxa)}</strong>
              <span>{t.intervalo ? Math.round(t.intervalo.low * 100) + '–' + Math.round(t.intervalo.high * 100) + '% · ' : ''}{t.n} rev.</span>
            </span>
          </div>
        </li>)}
      </ul>
      {lista.length > LIMITE && <div><button type="button" className="qb-linkbtn nv-btnlink" aria-expanded={todos} onClick={() => setTodos(v => !v)}>
        {todos ? 'Mostrar só os primeiros' : `Mostrar todos (${lista.length})`}</button></div>}
    </section>}

    {(rep.erros + rep.recuperados > 0 || !!cartoes.lapsosRepetidos.length || !!cartoes.limites.semData) && <section className="nv-stack" aria-label="Observações" style={{ gap: 6 }}>
      {rep.erros + rep.recuperados > 0 && <p className="nv-note">Repescagem do dia (só informativo): {rep.recuperados} recuperados, {rep.erros} ainda errados.</p>}
      {!!cartoes.lapsosRepetidos.length && <p className="nv-note"><strong>Reformular:</strong> {cartoes.lapsosRepetidos.length} cartões com 2 lapsos ou mais depois de já retidos.</p>}
      {!!cartoes.limites.semData && <p className="nv-note">{cartoes.limites.semData} avaliações sem data válida ficaram fora.</p>}
    </section>}
  </div>;
}
