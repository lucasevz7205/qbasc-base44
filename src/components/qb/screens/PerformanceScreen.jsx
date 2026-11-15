import React from 'react';
import { PageHeader } from '@/components/qb/navigation/PageHeader';
import { Tabs } from '@/components/qb/navigation/Tabs';
import { Panel } from '@/components/qb/core/Panel';
import { Button } from '@/components/qb/core/Button';
import { Badge } from '@/components/qb/core/Badge';
import { StatCard } from '@/components/qb/data/StatCard';
import { LineChart } from '@/components/qb/data/LineChart';
import { BarChart } from '@/components/qb/data/BarChart';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { SelectField } from '@/components/qb/data/SelectField';
import { Icon } from '@/components/qb/core/Icon';
import { QB_METRICS } from '@/lib/qb-data';
import { useRealStudy } from '@/lib/qb-real-data';
import { groupResponsesByTopic } from '@/lib/daily-question-performance';

function DailyQuestionLinks({ responses, data, edital, activeIds, go, title = 'Questões do dia' }) {
  const [open, setOpen] = React.useState(false);
  const [onlyErrors, setOnlyErrors] = React.useState(false);
  const grouped = new Map();
  for (const { qid, result } of responses) {
    const counts = grouped.get(qid) || { correct: 0, wrong: 0, blank: 0 };
    counts[result]++;
    grouped.set(qid, counts);
  }
  const byId = new Map(data.questions.map(q => [q.id, q]));
  const editalTopics = new Set(edital.subjects.flatMap(subject => subject.topics.map(topic => topic.id)));
  const maps = new Map(data.mindMaps.map(map => [map.topicId, map]));
  const rows = [...grouped].filter(([, counts]) => !onlyErrors || counts.wrong);
  return (
    <Panel variant="ornate" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <h2 style={{ font: 'var(--type-h2)', margin: 0 }}>{title}</h2>
        <Button size="sm" variant="secondary" icon={open ? 'chevron-up' : 'chevron-down'} aria-expanded={open} onClick={() => setOpen(value => !value)}>
          {open ? 'Recolher questões' : 'Ver questões'} · {grouped.size}
        </Button>
      </div>
      {open && <>
        <label className="qb-check"><input type="checkbox" checked={onlyErrors} onChange={event => setOnlyErrors(event.target.checked)} />Somente questões com erro</label>
        {!rows.length && <EmptyState compact title="Nenhuma questão com erro neste recorte" />}
        {!!rows.length && <ul style={{ display: 'grid', gap: 10, margin: 0, listStyle: 'none', padding: 0 }}>
          {rows.map(([id, counts]) => {
            const q = byId.get(id);
            const map = maps.get(q?.topicId);
            const node = map?.nodes.some(node => node.id === q.node) ? q.node : null;
            return (
              <li key={id} style={{ display: 'grid', gap: 8, padding: '12px 0', borderTop: '1px solid var(--divider)', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong>{q?.code || id}</strong>
                  {q?.chapter && <span style={{ color: 'var(--text-muted)' }}>{q.chapter}</span>}
                  {counts.correct > 0 && <Badge tone="correct">{counts.correct} {counts.correct === 1 ? 'acerto' : 'acertos'}</Badge>}
                  {counts.wrong > 0 && <Badge tone="incorrect">{counts.wrong} {counts.wrong === 1 ? 'erro' : 'erros'}</Badge>}
                  {counts.blank > 0 && <Badge tone="neutral">{counts.blank} em branco</Badge>}
                </div>
                {q?.statement && <div style={{ overflowWrap: 'anywhere' }} title={q.statement}>{q.statement}</div>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {activeIds.has(id) && <Button size="sm" variant="secondary" icon="target" onClick={() => go('questions', { questionIds: [id], filter: 'all' })}>Refazer questão</Button>}
                  {map && <Button size="sm" variant="ghost" icon="network" onClick={() => go('map', { topicId: q.topicId, node, returnTo: { view: 'performance', label: 'Desempenho' } })}>{node ? 'Abrir nó no mapa' : 'Abrir mapa do tópico'}</Button>}
                  {editalTopics.has(q?.topicId) && <Button size="sm" variant="ghost" icon="scroll-text" onClick={() => go('edital', { topicId: q.topicId })}>Ver tópico no edital</Button>}
                </div>
              </li>
            );
          })}
        </ul>}
      </>}
    </Panel>
  );
}

function DailySubjectBreakdown({ date, scopeLabel = date ? QB_METRICS.fmtDate(date) : '', responses, questions, subjects, total, go }) {
  const groups = groupResponsesByTopic(responses, questions, subjects);
  const unlinked = total - groups.reduce((sum, group) => sum + group.correct + group.wrong + group.blank, 0);
  const accuracy = row => QB_METRICS.pct(QB_METRICS.dayStats(row).accuracy);
  return (
    <Panel style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ font: 'var(--type-h2)' }}>Desempenho por matéria e assunto</h2>
        <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>Respostas de {scopeLabel}</span>
      </div>
      {!groups.length && <EmptyState compact title="Sem respostas vinculadas a matérias e assuntos neste recorte" />}
      {groups.map(group => (
        <details key={group.id} className="qb-panel qb-panel--sunken" style={{ padding: '12px 16px', minWidth: 0 }}>
          <summary style={{ cursor: 'pointer', font: 'var(--type-label)' }}>
            <strong>{group.name}</strong>
            <span style={{ marginInlineStart: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {accuracy(group)} · {group.correct} acertos · {group.wrong} erros{group.blank ? ' · ' + group.blank + ' em branco' : ''}
            </span>
          </summary>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table className="qb-table" aria-label={'Assuntos de ' + group.name}>
              <thead><tr><th>Assunto</th><th className="num">Acertos</th><th className="num">Erros</th><th className="num">Brancos</th><th className="num">Taxa de acerto</th><th>Remissão</th></tr></thead>
              <tbody>{group.topics.map(topic => (
                <tr key={topic.id}>
                  <th scope="row" style={{ textTransform: 'none', letterSpacing: 'normal', font: 'var(--type-label)' }}>{[topic.num, topic.title].filter(Boolean).join(' · ')}</th>
                  <td className="num">{topic.correct}</td><td className="num">{topic.wrong}</td><td className="num">{topic.blank}</td>
                  <td className="num">{accuracy(topic)}</td>
                  <td><Button size="sm" variant="ghost" icon="scroll-text" onClick={() => go('edital', { topicId: topic.id })}>Ver tópico</Button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      ))}
      {unlinked > 0 && <small style={{ color: 'var(--text-muted)' }}>{unlinked} {unlinked === 1 ? 'resposta sem vínculo com um assunto do edital' : 'respostas sem vínculo com assuntos do edital'}.</small>}
    </Panel>
  );
}

function Daily({ go }) {
  const { QB_DATA, QB_EDITAL, QB_PLAN, QB_PERF } = useRealStudy();
  const M = QB_METRICS, PF = QB_PERF, P = QB_PLAN;
  const [date, setDate] = React.useState(P.today);
  const [subjectId, setSubjectId] = React.useState('all');
  const [topicId, setTopicId] = React.useState('all');
  const filter = performanceScope(QB_DATA.questions, QB_EDITAL.subjects, subjectId, topicId);
  const responses = filter(PF.attemptsByDay[date] || []);
  const scoped = row => subjectId === 'all' ? row : { ...row, ...countAttempts(filter(PF.attemptsByDay[row.date] || [])) };
  const selectedDay = PF.days.find(d => d.date === date);
  const d = M.dayStats(scoped(selectedDay || { date, n: 0, correct: 0, wrong: 0, blank: 0 }));
  const activeIds = new Set(QB_DATA.questionBank.map(q => q.id));
  const wrongIds = [...new Set(responses.filter(item => item.result === 'wrong' && activeIds.has(item.qid)).map(item => item.qid))];
  const tasks = Object.values(P.weeks).flat().filter(t => t.date === date);
  const series = PF.days.filter(day => day.date <= date).slice(-14).map(x => { const s = M.dayStats(scoped(x)); return { x: M.fmtDate(x.date), y: s.accuracy, n: s.valid, vol: s.n }; });
  const tiers = QB_EDITAL.subjects.flatMap(s => s.topics).filter(t => t.correct + t.wrong >= 10 && t.correct / (t.correct + t.wrong) < 0.6).length;
  const prev = PF.days.map(scoped).findLast(day => day.date < date && day.correct + day.wrong);
  const delta = prev && d.valid ? Math.round(d.accuracy - M.dayStats(prev).accuracy) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '500 13px/1 var(--font-body)', color: 'var(--text-secondary)' }}>Data<input type="date" className="qb-input" style={{ width: 170, colorScheme: 'dark' }} min={PF.days[0]?.date} max={P.today} value={date} onChange={e => e.target.value && setDate(e.target.value)} /></label>
        <Button size="sm" variant="secondary" disabled={date === P.today} onClick={() => setDate(P.today)}>Hoje</Button>
        <Badge tone="neutral" icon="info">Respostas confirmadas de treino</Badge>
        {scopeFilters(QB_EDITAL.subjects, subjectId, topicId, setSubjectId, setTopicId)}
      </div>
      {!d.n ? <EmptyState title={'Sem respostas em ' + M.fmtDate(date)} description="Nenhuma resposta de treino registrada neste dia." /> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Itens julgados" value={d.n} detail={d.correct + ' certos · ' + d.wrong + ' errados · ' + d.blank + ' em branco'} warning={d.valid < 10 ? 'Amostra pequena' : null} />
          <StatCard label="Taxa de acerto" tone="correct" value={M.pct(d.accuracy)} detail={d.correct + ' de ' + d.valid + ' respostas válidas (brancos fora)'} trend={delta != null ? { delta, label: (delta > 0 ? '+' : '') + delta + ' p.p. vs. último dia com respostas' } : null} />
          <StatCard label="Nota líquida" tone="gold" value={(d.net > 0 ? '+' : '') + d.net} detail="Regra: +1 certo · −1 errado · 0 branco" />
          <StatCard label="Certeza calibrada" value="—" detail="Comparação entre confiança declarada e acerto observado." warning="Definição da métrica pendente" note="A fórmula não está nos arquivos do projeto; não é estimada aqui." />
          <StatCard label="Tarefas concluídas" value={tasks.filter(t => t.status === 'done').length + '/' + tasks.length} detail="Planejamento do dia · todas as matérias" onClick={() => go('plan', 'hoje')} />
          <StatCard label="Flashcards avaliados" value={PF.cardsByDay[date] || 0} detail="Avaliações na data · todas as matérias" />
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16, alignItems: 'start' }}>
        <Panel style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Evolução da precisão · até {M.fmtDate(date)}</span>
          <LineChart data={series} label="Taxa de acerto diária" height={230} />
          <TrendData points={series} />
        </Panel>
        <Panel style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Prioridades</span>
          {[[tasks.filter(t => t.status !== 'done').length + ' tarefas do dia pendentes', 'Reagende o que não couber, sem perder revisões automáticas.', 'Reorganizar planejamento', () => go('plan', 'semana')],
            [d.wrong + ' itens errados no dia', 'Revise pela origem do erro antes de nova rodada.', 'Treinar erros', wrongIds.length ? () => go('questions', { questionIds: wrongIds, filter: 'all' }) : null],
            [tiers + ' tópicos abaixo de 60%', 'Com pelo menos 10 respostas válidas cada.', 'Ver mapa de calor', () => go('edital', 'calor')]].filter((_, i) => [tasks.some(t => t.status !== 'done'), d.wrong > 0, tiers > 0][i]).map(([t, s, a, fn], i) => (
            <div key={t} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--divider)' }}>
              <span style={{ font: '600 13px/1 var(--font-mono)', color: 'var(--qb-gold)' }}>0{i + 1}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ font: '600 14px/1.3 var(--font-body)', color: 'var(--text-primary)' }}>{t}</span><span style={{ font: '400 13px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>{s}</span></span>
              <Button size="sm" variant="secondary" disabled={!fn} onClick={fn}>{a}</Button>
            </div>
          ))}
        </Panel>
      </div>
      <DailySubjectBreakdown date={date} total={d.n} responses={responses} questions={QB_DATA.questions} subjects={QB_EDITAL.subjects} go={go} />
      {!!responses.length && <DailyQuestionLinks responses={responses} data={QB_DATA} edital={QB_EDITAL} activeIds={activeIds} go={go} />}
    </div>
  );
}

function scopeFilters(subjects, subjectId, topicId, setSubjectId, setTopicId) {
  const subject = subjects.find(item => item.id === subjectId);
  return <>
    <SelectField label="Matéria" value={subjectId} onChange={id => { setSubjectId(id); setTopicId('all'); }}
      options={[{ value: 'all', label: 'Todas as matérias' }, ...subjects.map(item => ({ value: item.id, label: item.name }))]} />
    {subject && <SelectField label="Assunto" value={topicId} onChange={setTopicId}
      options={[{ value: 'all', label: 'Todos os assuntos' }, ...subject.topics.map(item => ({ value: item.id, label: [item.num, item.title].filter(Boolean).join(' · ') }))]} />}
  </>;
}

const countAttempts = attempts => attempts.reduce((row, attempt) => {
  row[attempt.result]++;
  row.n++;
  return row;
}, { correct: 0, wrong: 0, blank: 0, n: 0 });

function performanceScope(questions, subjects, subjectId, topicId) {
  const topics = new Set(subjects.find(item => item.id === subjectId)?.topics.map(item => item.id) || []);
  const allowed = subjectId === 'all' ? null : new Set(questions.filter(q => topics.has(q.topicId) && (topicId === 'all' || topicId === q.topicId)).map(q => q.id));
  return rows => allowed ? rows.filter(row => allowed.has(row.qid)) : rows;
}

function TrendData({ points }) {
  return <details>
    <summary style={{ cursor: 'pointer', paddingBlock: 10 }}>Dados do gráfico</summary>
    <div style={{ overflowX: 'auto' }}>
      <table className="qb-table" aria-label="Dados da evolução">
        <thead><tr><th>Período</th><th>Precisão</th><th>Válidas</th><th>Itens</th></tr></thead>
        <tbody>{points.map(point => <tr key={point.x}><th scope="row">{point.x}</th><td>{QB_METRICS.pct(point.y)}</td><td>{point.n}</td><td>{point.vol}</td></tr>)}</tbody>
      </table>
    </div>
  </details>;
}

function Historic({ go }) {
  const { QB_PERF: PF, QB_EDITAL: E, QB_SIM: S, QB_PLAN: P, QB_DATA: D } = useRealStudy();
  const M = QB_METRICS;
  const [period, setPeriod] = React.useState('14');
  const [from, setFrom] = React.useState(() => P.addDays(P.today, -13));
  const [to, setTo] = React.useState(P.today);
  const [group, setGroup] = React.useState('dia');
  const [subjectId, setSubjectId] = React.useState('all');
  const [topicId, setTopicId] = React.useState('all');
  const end = period === 'custom' ? to : P.today;
  const start = period === 'custom' ? from : P.addDays(end, 1 - Number(period));
  const duration = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  const validRange = duration >= 1 && duration <= 90 && end <= P.today;
  const filter = performanceScope(D.questions, E.subjects, subjectId, topicId);
  const dateIndex = new Map(PF.days.map(day => [day.date, day]));
  const getDays = offset => Array.from({ length: validRange ? duration : 0 }, (_, index) => {
    const date = P.addDays(start, index + offset);
    const attempts = filter(PF.attemptsByDay[date] || []);
    const counts = subjectId === 'all' && dateIndex.has(date) ? dateIndex.get(date) : countAttempts(attempts);
    return { ...counts, date, attempts };
  });
  const days = getDays(0);
  const previous = getDays(-duration);
  const responses = days.flatMap(day => day.attempts);
  const activeIds = new Set(D.questionBank.map(question => question.id));
  const sum = rows => M.dayStats(rows.reduce((total, row) => ({
    n: total.n + row.n, correct: total.correct + row.correct, wrong: total.wrong + row.wrong, blank: total.blank + row.blank,
  }), countAttempts([])));
  const current = sum(days);
  const prior = sum(previous);
  const buckets = new Map();
  days.forEach((day, index) => {
    const key = group === 'mes' ? day.date.slice(0, 7) : group === 'semana' ? Math.floor(index / 7) : day.date;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(day);
  });
  const points = [...buckets.values()].map(rows => {
    const first = M.fmtDate(rows[0].date), last = M.fmtDate(rows.at(-1).date);
    const stats = sum(rows);
    return { x: first === last ? first : first + '–' + last, y: stats.accuracy, n: stats.valid, vol: stats.n };
  });
  const sim = S.history.filter(h => h.correct != null).reduce((a, h) => ({ c: a.c + h.correct, v: a.v + h.correct + h.wrong }), { c: 0, v: 0 });
  const delta = current.valid && prior.valid ? Math.round(current.accuracy - prior.accuracy) : null;
  return (
    <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
      <Panel padding={12} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,170px),1fr))', gap: 10 }}>
        <SelectField label="Período" value={period} onChange={setPeriod} options={[{ value: '7', label: 'Últimos 7 dias' }, { value: '14', label: 'Últimos 14 dias' }, { value: '30', label: 'Últimos 30 dias' }, { value: 'custom', label: 'Personalizado' }]} />
        {period === 'custom' && <>
          <label>De<input type="date" className="qb-input" value={from} max={to || P.today} onChange={event => setFrom(event.target.value)} /></label>
          <label>Até<input type="date" className="qb-input" value={to} min={from} max={P.today} onChange={event => setTo(event.target.value)} /></label>
        </>}
        <SelectField label="Agrupar por" value={group} onChange={setGroup} options={[{ value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Blocos de 7 dias' }, { value: 'mes', label: 'Mês' }]} />
        {scopeFilters(E.subjects, subjectId, topicId, setSubjectId, setTopicId)}
      </Panel>
      {!validRange ? <EmptyState compact title="Intervalo inválido" description="Selecione de 1 a 90 dias, até a data de hoje." /> : <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,190px),1fr))', gap: 10 }}>
          <StatCard compact label="Itens julgados" value={current.n} detail={current.correct + ' certos · ' + current.wrong + ' errados · ' + current.blank + ' em branco'} />
          <StatCard compact label="Taxa de acertos" tone="correct" value={M.pct(current.accuracy)} detail={current.valid ? current.correct + ' de ' + current.valid + ' válidas' : 'Sem respostas válidas'} />
          <StatCard compact label="Nota líquida" tone="gold" value={current.net} detail="+1 por acerto · −1 por erro · 0 por branco" />
        </div>
        {delta !== null && <Panel padding={12}>
          <h2 style={{ font: 'var(--type-h2)' }}>Precisão entre períodos</h2>
          <p>Atual ({M.fmtDate(start)} a {M.fmtDate(end)}) · {M.pct(current.accuracy)} · {current.valid} válidas</p>
          <p>Anterior ({M.fmtDate(previous[0].date)} a {M.fmtDate(previous.at(-1).date)}) · {M.pct(prior.accuracy)} · {prior.valid} válidas</p>
          <p>Diferença de {delta > 0 ? '+' : ''}{delta} p.p.</p>
        </Panel>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16 }}>
          <Panel style={{ minWidth: 0 }}><span className="qb-overline">Taxa de acertos · treino</span><LineChart data={points} label="Taxa de acertos por período" /><TrendData points={points} /></Panel>
          <Panel style={{ minWidth: 0 }}><span className="qb-overline">Volume de itens julgados</span><BarChart color="var(--viz-2)" data={points.map(point => ({ label: point.x, value: point.vol || null }))} label="Volume por período" /></Panel>
        </div>
        <DailySubjectBreakdown scopeLabel={M.fmtDate(start) + ' a ' + M.fmtDate(end)} total={current.n} responses={responses} questions={D.questions} subjects={E.subjects} go={go} />
        {!!responses.length && <DailyQuestionLinks responses={responses} data={D} edital={E} activeIds={activeIds} go={go} title="Questões do período" />}
      </>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,190px),1fr))', gap: 10 }}>
        <StatCard compact label="Revisões (acumulado)" value={M.pct(M.dayStats(PF.review).accuracy)} detail="Contadas à parte" />
        <StatCard compact label="Simulados (acumulado)" value={M.pct(sim.v ? sim.c / sim.v * 100 : null)} detail="Contados à parte" />
      </div>
    </div>
  );
}

const METHOD = [
  ['target', 'Taxa de acertos', 'acertos ÷ (acertos + erros). Itens em branco não entram no denominador. Sempre exibida com as respostas válidas que a sustentam.'],
  ['circle-dashed', 'Itens em branco', 'Contados no volume (itens julgados) e mostrados à parte. Valem 0 na nota líquida.'],
  ['scale', 'Nota líquida', 'Regra configurável. Padrão CEBRASPE de exemplo: +1 por acerto, −1 por erro, 0 por branco. A regra aparece junto ao número.'],
  ['scroll-text', 'Cobertura do edital', 'tópicos com status diferente de "Não iniciado" ÷ total de tópicos previstos. Não usa acertos.'],
  ['book-open', 'Status de estudo', 'Não iniciado · Em estudo · Revisando · Dominado. Informação de progresso, independente da faixa de acertos do mapa de calor.'],
  ['grid-3x3', 'Faixas do mapa de calor', '< 60% · 60–74% · 75–84% · 85–89% · ≥ 90% · sem respostas. Calculadas pela taxa de acertos do tópico.'],
  ['circle-help', 'Certeza calibrada', 'Pendente: a definição não consta nos arquivos. Quando definida, comparará confiança declarada com acerto observado — nunca deve ser confundida com a taxa de acertos.'],
  ['split', 'Limites das comparações', 'Treino, revisão e simulado são séries separadas. Amostras com menos de 10 (gráficos) ou 20 (tabelas) respostas são sinalizadas. Indicadores de estudo não são diagnósticos.'],
];

export default function PerformanceScreen({ tab = 'diaria', setTab, go }) {
  return (
    <div className="qb-performance" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <PageHeader overline="Desempenho" title="Desempenho" description="Números calculados a partir das respostas registradas. Nenhum indicador é um diagnóstico."
        actions={<Tabs label="Análises" value={tab} onChange={setTab} items={[{ id: 'diaria', label: 'Análise diária', icon: 'calendar' }, { id: 'historica', label: 'Análise histórica', icon: 'activity' }, { id: 'metodo', label: 'Método', icon: 'scale' }]} />} />
      {tab === 'diaria' && <Daily go={go} />}
      {tab === 'historica' && <Historic go={go} />}
      {tab === 'metodo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 12 }}>
          {METHOD.map(([i, t, d]) => <Panel key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><span style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(208,179,134,.55)', color: 'var(--qb-gold)' }}><Icon name={i} size={18} /></span><span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ font: '600 15px/1.3 var(--font-body)', color: 'var(--text-primary)' }}>{t}</span><span style={{ font: '400 14px/1.55 var(--font-body)', color: 'var(--text-secondary)' }}>{d}</span></span></Panel>)}
        </div>
      )}
    </div>
  );
}
export { PerformanceScreen };
