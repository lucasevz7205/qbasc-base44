import React from 'react';
import { Button } from '@/components/qb/core/Button';
import { Icon } from '@/components/qb/core/Icon';
import { Tabs } from '@/components/qb/navigation/Tabs';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { useRealStudy } from '@/lib/qb-real-data';
import { useQBStudy } from '@/lib/QBStudyContext';
import { navegadorExport, navegadorSemanal, navegadorTopicos, navegadorDisciplinas, compararJanelas, MIN_RESPOSTAS_CONFIANCA } from '@/lib/navegador';
import { contarSinais, dataBR, diaMes, pontosTendencia, tomDoIntervalo } from '@/lib/navegador-visual';
import { NavCartaoAcao, NavCartaoMateria, NavForma, NavTendencia, SELOS } from '@/components/qb/navegador';
import { NavegadorRelatorio, NavListaAssuntos, NavResumoNumeros, pct, prioridadesDe, tituloRelatorio } from '@/components/qb/performance/NavegadorRelatorio';
import { marcarVisto, useNavegadorRelatorios } from '@/components/qb/performance/useNavegadorRelatorios';

const ABAS = [
  { id: 'resumo', label: 'Resumo', icon: 'compass' },
  { id: 'materias', label: 'Matérias', icon: 'library' },
  { id: 'assuntos', label: 'Assuntos', icon: 'list' },
  { id: 'historico', label: 'Histórico', icon: 'activity' },
];
const FILTROS = ['todos', 'fraco', 'sem-sinal', 'forte', 'insuficiente'];

function Comparativo({ semanal }) {
  const linhas = [
    ['Primeiras tentativas', s => s.n], ['Certas (C)', s => s.C], ['Erradas (E)', s => s.E], ['Em branco', s => s.B],
    ['Nota líquida', s => s.liquida], ['Erros com certeza', s => s.certezaErros + '/' + s.certezaN],
    ['Oficiais', s => s.origens.oficial.n], ['Inéditas', s => s.origens['inédito'].n], ['Sem origem', s => s.origens['não informado'].n],
    ['Em simulado', s => s.contextos?.simulado?.n || 0],
  ];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="nv-comparativo">
        <thead><tr><th scope="col">Semana</th>
          <th scope="col">Anterior<br /><span className="nv-mono" style={{ letterSpacing: 0, textTransform: 'none' }}>{diaMes(semanal.anterior.de)}–{diaMes(semanal.anterior.ate)}</span></th>
          <th scope="col">Recente<br /><span className="nv-mono" style={{ letterSpacing: 0, textTransform: 'none' }}>{diaMes(semanal.atual.de)}–{diaMes(semanal.atual.ate)}</span></th></tr></thead>
        <tbody>{linhas.map(([rotulo, f]) => <tr key={rotulo}><th scope="row">{rotulo}</th><td>{f(semanal.anterior)}</td><td>{f(semanal.atual)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function Calibracao({ calibracao }) {
  return (
    <div className="nv-calibracao" role="list" aria-label="Acerto por nível de confiança">
      {calibracao.map(c => {
        const tom = c.n ? (c.acerto > 0.5 ? 'correct' : c.acerto < 0.5 ? 'incorrect' : 'attention') : 'no-evidence';
        return <div key={c.nivel} role="listitem" className={`nv-calibracao__linha nv-tone-${tom}`}>
          <span>Confiança {c.nivel}</span>
          <span className={'nv-calibracao__barra' + (c.amostraPequena ? ' nv-calibracao__barra--pequena' : '')} aria-hidden="true"><span style={{ width: (c.acerto || 0) * 100 + '%' }} /></span>
          <span className="nv-mono">{c.n ? pct(c.acerto) : '—'} <span className="nv-muted">· {c.n}</span></span>
        </div>;
      })}
      {calibracao.some(c => c.amostraPequena) && <p className="nv-note">Barras listradas: menos de {MIN_RESPOSTAS_CONFIANCA} respostas no nível, ainda sem regra de chute para ele.</p>}
    </div>
  );
}

export default function NavegadorPanel() {
  const { records, QB_DATA, QB_PLAN, QB_EDITAL } = useRealStudy();
  const { navegadorScope, setNavegadorScope } = useQBStudy();
  const { relatorios } = useNavegadorRelatorios();
  const [aba, setAba] = React.useState('resumo');
  const [filtroSinal, setFiltroSinal] = React.useState('todos');
  const [filtroMateria, setFiltroMateria] = React.useState('');
  const [relatorioId, setRelatorioId] = React.useState(null);
  const [verFora, setVerFora] = React.useState(false);
  const [todosRelatorios, setTodosRelatorios] = React.useState(false);
  const today = QB_PLAN.today;
  const subjects = QB_EDITAL.subjects;
  const payload = React.useMemo(() => navegadorExport(records, QB_DATA.questions, today), [records, QB_DATA.questions, today]);
  const semanal = React.useMemo(() => navegadorSemanal(payload.respostas, today), [payload, today]);
  const analise = React.useMemo(() => navegadorTopicos(payload.respostas, today), [payload, today]);
  const materias = React.useMemo(() => navegadorDisciplinas(analise, subjects), [analise, subjects]);
  const titles = React.useMemo(() => new Map(subjects.flatMap(s => s.topics.map(t => [t.id, t.title]))), [subjects]);
  const donoDe = React.useMemo(() => new Map(subjects.flatMap(s => s.topics.map(t => [t.id, s]))), [subjects]);
  const pontos = React.useMemo(() => pontosTendencia(relatorios), [relatorios]);

  const subject = subjects.find(s => s.id === navegadorScope?.subjectId);
  React.useEffect(() => {
    setFiltroMateria(navegadorScope?.subjectId || '');
    setFiltroSinal('todos');
    if (navegadorScope) setAba('resumo');
  }, [navegadorScope]);

  const topicIds = new Set(subject?.topics.map(t => t.id) || []);
  const topicosEscopo = subject ? analise.topicos.filter(t => topicIds.has(t.topico)) : analise.topicos;
  const materiaEscopo = subject ? materias.find(m => m.id === subject.id) : null;
  const materiasShown = subject ? materias.filter(m => m.id === subject.id) : materias;
  const focoTopico = navegadorScope?.topicId ? analise.topicos.find(t => t.topico === navegadorScope.topicId) : null;
  const prioridades = prioridadesDe(topicosEscopo.filter(t => t.topico !== focoTopico?.topico), focoTopico ? 2 : 3);
  const aberto = relatorios.find(r => r.id === relatorioId) || relatorios[0];
  const nomeMateria = id => donoDe.get(id)?.short || donoDe.get(id)?.name;

  const daMateria = filtroMateria ? new Set(subjects.find(s => s.id === filtroMateria)?.topics.map(t => t.id) || []) : null;
  const porMateria = daMateria ? analise.topicos.filter(t => daMateria.has(t.topico)) : analise.topicos;
  const contagem = contarSinais(porMateria);
  const assuntosFiltrados = filtroSinal === 'todos' ? porMateria : porMateria.filter(t => t.sinal === filtroSinal);

  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qbasc-navegador-' + today + '.json';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const limites = payload.limites;
  const excluded = [
    [semanal.repetidas, 'repetições (só a primeira tentativa conta)'],
    [limites.itensSemOrdemConfirmada, 'itens sem primeira tentativa verificável'],
    [limites.tentativasApenasEmTotais, 'tentativas registradas só em totais'],
    [limites.tentativasSemData, 'tentativas sem data válida'],
    [limites.tentativasSemHorario, 'tentativas posteriores sem horário'],
    [limites.simuladoSemGabarito, 'respostas de simulado sem gabarito'],
    [analise.semTopico, 'primeiras tentativas sem tópico (fora da análise por assunto)'],
  ].filter(([n]) => n > 0);
  const totalFora = excluded.reduce((s, [n]) => s + n, 0);
  const abrirMateria = id => { setFiltroMateria(id); setFiltroSinal('todos'); setAba('assuntos'); };
  const statsResumo = materiaEscopo || (subject ? { n: 0, C: 0, E: 0, B: 0, validas: 0, certezaN: 0, certezaErros: 0 } : analise.geral);
  const tomGeral = analise.geral.validas ? tomDoIntervalo(analise.geral.intervaloAcerto) : 'no-evidence';

  return <div className="nv" data-tom={tomGeral}>
    <header className="nv-faixa">
      <span className="nv-emblema" aria-hidden="true"><Icon name="compass" size={26} /></span>
      <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="nv-selo-marca">Navegador</span>
          {subject && <span className="nv-escopo"><Icon name="scroll-text" size={14} />{subject.name}</span>}
        </span>
        <h2 className="nv-title" style={{ fontSize: 24 }}>{subject ? 'Análise da matéria' : 'Análise global'}</h2>
        <div className="nv-faixa__meta">
          <span><Icon name="calendar" size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Janela <span className="nv-mono">{dataBR(analise.de)} a {dataBR(analise.ate)}</span></span>
          <span><span className="nv-mono">{analise.geral.n}</span> primeiras tentativas</span>
          {totalFora > 0 && <button type="button" className="nv-pill" aria-expanded={verFora} aria-controls="nv-fora" onClick={() => setVerFora(v => !v)}>
            <Icon name="filter" size={13} /><span className="nv-mono">{totalFora}</span> fora da análise<Icon name="chevron-down" size={13} style={{ transform: verFora ? 'rotate(180deg)' : undefined }} />
          </button>}
        </div>
      </div>
      <div className="nv-faixa__acoes">
        {subject && <Button size="sm" variant="secondary" icon="globe" onClick={() => setNavegadorScope(null)}>Ver análise global</Button>}
        <Button size="sm" variant="ghost" icon="arrow-down-to-line" onClick={download} disabled={!payload.respostas.length}>Exportar JSON</Button>
      </div>
      {verFora && totalFora > 0 && <ul className="nv-fora" id="nv-fora">
        {excluded.map(([n, label]) => <li key={label}><span className="nv-mono">{n}</span><span>{label}</span></li>)}
        <li className="nv-muted" style={{ marginTop: 4 }}>Só entram primeiras tentativas identificadas, de treino e de simulado; o dia atual não entra.</li>
      </ul>}
    </header>

    <div className="nv-tabs">
      <Tabs label="Seções do Navegador" variant="underline" value={aba} onChange={setAba} style={{ minWidth: 0 }}
      items={ABAS.map(a => ({ ...a, count: a.id === 'materias' ? materiasShown.length || undefined : a.id === 'assuntos' ? porMateria.length || undefined : a.id === 'historico' ? relatorios.length || undefined : undefined }))} />
    </div>

    <div role="tabpanel" aria-label={ABAS.find(a => a.id === aba).label} className="nv-stack" style={{ gap: 16 }}>
      {aba === 'resumo' && <>
        {!analise.geral.n && <EmptyState compact title="Sem atividade nova com dados suficientes" description="Resolva questões novas para o Navegador ter o que analisar. O dia de hoje entra a partir de amanhã." />}
        {!!analise.geral.n && <NavResumoNumeros stats={statsResumo} placar={subject ? null : semanal} comparacao={compararJanelas(semanal)}
          rotuloMedidor={subject ? 'Chance de acerto na matéria' : 'Chance geral de acerto'}
          legendaMedidor={`Faixa = intervalo de 95% · ${statsResumo.validas || 0} respostas válidas em 14 dias.`} />}
        {navegadorScope?.topicId && subject && <section className="nv-stack" aria-label="Assunto escolhido">
          {focoTopico
            ? <div className="nv-acoes"><NavCartaoAcao stats={focoTopico} titulo={titles.get(focoTopico.topico) || focoTopico.topico} destaque="Assunto escolhido" /></div>
            : <EmptyState compact tone="empty" title={(titles.get(navegadorScope.topicId) || 'Este assunto') + ' ainda não tem primeiras tentativas no período'} description="Resolva questões novas deste assunto e volte aqui." />}
        </section>}
        {!!analise.geral.n && <section className="nv-stack" aria-labelledby="nv-faca-agora">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <h3 id="nv-faca-agora" className="nv-title">Faça agora</h3>
            {topicosEscopo.length > prioridades.length && <button type="button" className="qb-linkbtn nv-btnlink" onClick={() => { setFiltroSinal('todos'); setAba('assuntos'); }}>Ver todos os assuntos</button>}
          </div>
          {prioridades.length
            ? <div className="nv-acoes">{prioridades.map(t => <NavCartaoAcao key={t.topico} stats={t} titulo={titles.get(t.topico) || t.topico} subtitulo={subject ? undefined : nomeMateria(t.topico)} />)}</div>
            : <EmptyState compact tone="empty" icon="circle-check" title="Nada urgente" description="Nenhum assunto com ponto fraco ou erro com certeza na janela." />}
        </section>}
        {!subject && !!analise.geral.n && <details className="nv-janela">
          <summary><Icon name="calendar-days" size={16} />Detalhes da janela: semanas e confiança<Icon name="chevron-down" size={16} className="nv-janela__seta" style={{ marginLeft: 'auto' }} /></summary>
          <div className="nv-janela__corpo">
            <Comparativo semanal={semanal} />
            <div className="nv-stack" style={{ gap: 8 }}><span className="nv-overline">Acerto por nível de confiança · 14 dias</span><Calibracao calibracao={analise.calibracao} /></div>
          </div>
        </details>}
      </>}

      {aba === 'materias' && <>
        {!materiasShown.length && <EmptyState compact title="Sem matérias com primeiras tentativas na janela" description="Resolva questões novas para ver a chance de acerto por matéria." />}
        {!!materiasShown.length && <>
          <p className="nv-note">Ordenadas por risco: as de menor chance no melhor cenário primeiro. Toque em uma matéria para ver os assuntos.</p>
          <div className="nv-materias">{materiasShown.map(m => <NavCartaoMateria key={m.id} materia={m} onAbrir={abrirMateria} />)}</div>
        </>}
      </>}

      {aba === 'assuntos' && <>
        <div className="nv-filtros">
          <div role="group" aria-label="Filtrar por sinal" className="nv-filtros">
            {FILTROS.map(f => {
              const s = SELOS[f];
              const n = f === 'todos' ? porMateria.length : contagem[f];
              return <button key={f} type="button" className={'nv-filtro' + (s ? ' nv-tone-' + s.tom : '')} aria-pressed={filtroSinal === f} onClick={() => setFiltroSinal(f)}>
                {s && <span style={{ color: 'var(--nv-tone)', display: 'inline-flex' }}><NavForma forma={s.forma} /></span>}
                {s ? s.rotulo : 'Todos'}<span className="nv-mono">{n}</span>
              </button>;
            })}
          </div>
          <label className="nv-filtros__materia"><span className="nv-sr">Matéria</span>
            <select className="qb-select" value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)}>
              <option value="">Todas as matérias</option>
              {subjects.filter(s => materias.some(m => m.id === s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
        <div className="nv-legenda" aria-hidden="true">
          <span><i style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--qb-ivory)' }} />estimativa</span>
          <span><i style={{ width: 22, height: 8, borderRadius: 4, background: 'rgba(241,232,213,.25)', border: '1px solid rgba(241,232,213,.6)' }} />intervalo de 95%: amostra pequena, faixa larga</span>
          <span><i style={{ width: 0, height: 12, borderLeft: '1.5px dashed rgba(241,232,213,.7)' }} />50%</span>
        </div>
        {!assuntosFiltrados.length && <EmptyState compact title="Nenhum assunto com este filtro" description={porMateria.length ? 'Troque o sinal ou a matéria.' : 'Resolva questões novas para ver os assuntos.'} />}
        <NavListaAssuntos topicos={assuntosFiltrados} titles={titles} materiaDe={filtroMateria ? undefined : nomeMateria} abertoInicial={navegadorScope?.topicId || null} />
      </>}

      {aba === 'historico' && <>
        <p className="nv-note">O Navegador gera o relatório semanal no sábado e o mensal no dia 1, e apresenta quando você abre o app.</p>
        {!relatorios.length && <EmptyState title="Nenhum relatório ainda" description="O primeiro aparece no próximo sábado ou dia 1 em que houver primeiras tentativas registradas." />}
        {!!relatorios.length && <div className="nv-cartao nv-stack" style={{ gap: 18 }}>
          {pontos.length < 2 && <p className="nv-note"><Icon name="info" size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {pontos.length ? 'Só um relatório semanal até agora: a linha aparece a partir do segundo sábado.' : 'Ainda não há relatório semanal; a linha usa só os semanais.'}</p>}
          {!!pontos.length && <>
            <NavTendencia titulo="Nota líquida por semana" pontos={pontos.map(p => ({ id: p.id, rotulo: p.rotulo, valor: p.liquida }))} cor="var(--viz-2)" forma="quadrado" referencia={0} />
            <NavTendencia titulo="Chance de acerto · janela de 14 dias" pontos={pontos.map(p => ({ ...p, valor: p.acerto }))} cor="var(--viz-1)" percentual referencia={0.5} rotuloReferencia="50%"
              descricaoValor={p => Math.round(p.valor * 100) + '%'} />
          </>}
        </div>}
        {!!relatorios.length && <section className="nv-stack" aria-labelledby="nv-relatorios">
          <h3 id="nv-relatorios" className="nv-title">Relatórios salvos</h3>
          <ul className="nv-relatorios">
            {relatorios.slice(0, todosRelatorios ? 24 : 4).map(r => <li key={r.id}>
              <button type="button" className="nv-relatorio-item" aria-pressed={r.id === aberto.id} onClick={() => { setRelatorioId(r.id); marcarVisto(r.id); }}>
                <span className="nv-relatorio-item__tipo">{r.tipo === 'mensal' ? 'Mensal' : 'Semanal'}</span>
                <span className="nv-relatorio-item__periodo">{dataBR(r.periodo.de)} a {dataBR(r.periodo.ate)}</span>
                <span className="nv-relatorio-item__nums" aria-label={'Nota líquida ' + r.placar.atual.liquida + ', chance ' + pct(r.geral.acerto)}>
                  <span title="Nota líquida">{r.placar.atual.liquida > 0 ? '+' : ''}{r.placar.atual.liquida}</span><span title="Chance de acerto">{pct(r.geral.acerto)}</span>
                </span>
              </button>
            </li>)}
          </ul>
          {relatorios.length > 4 && <div><Button size="sm" variant="ghost" icon={todosRelatorios ? 'chevron-up' : 'chevron-down'} aria-expanded={todosRelatorios} onClick={() => setTodosRelatorios(v => !v)}>
            {todosRelatorios ? 'Mostrar só os recentes' : 'Mostrar todos (' + Math.min(relatorios.length, 24) + ')'}</Button></div>}
        </section>}
        {aberto && <section className="nv-cartao nv-cartao--sunken nv-stack" aria-label={tituloRelatorio(aberto)} style={{ gap: 14 }}>
          <h3 className="nv-title nv-title--sm">{tituloRelatorio(aberto)}</h3>
          <NavegadorRelatorio relatorio={aberto} titles={titles} />
        </section>}
      </>}
    </div>

    <p className="nv-note" style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
      <Icon name="info" size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> A nota líquida isolada não mede avanço quando o volume ou a dificuldade mudam. Os limites de amostra são hipóteses a calibrar com o seu histórico.
    </p>
  </div>;
}
