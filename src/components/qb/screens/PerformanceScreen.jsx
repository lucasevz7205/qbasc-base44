import React from 'react';
import { PageHeader } from '@/components/qb/navigation/PageHeader';
import { Tabs } from '@/components/qb/navigation/Tabs';
import { Panel } from '@/components/qb/core/Panel';
import { Button } from '@/components/qb/core/Button';
import { Badge } from '@/components/qb/core/Badge';
import { PerformanceMetricCard } from '@/components/qb/performance/PerformanceMetricCard';
import { PerformanceTrendChart } from '@/components/qb/performance/PerformanceTrendChart';
import { PerformancePriorityPanel } from '@/components/qb/performance/PerformancePriorityPanel';
import StudyTimePanel, { useStudyTimeRecords } from '@/components/qb/performance/StudyTimePanel';
import { PerformancePeriodSelector } from '@/components/qb/performance/PerformancePeriodSelector';
import { SubjectPerformanceExplorer } from '@/components/qb/performance/SubjectPerformanceExplorer';
import '@/components/qb/performance/performance.css';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { SelectField } from '@/components/qb/data/SelectField';
import { Icon } from '@/components/qb/core/Icon';
import { QB_METRICS } from '@/lib/qb-data';
import { useRealStudy } from '@/lib/qb-real-data';
import { groupResponsesByTopic } from '@/lib/daily-question-performance';
import { buildPerformanceNodes, calendarBuckets, recurringTopicErrors } from '@/lib/performance-v4';
import { reviewDay, scheduledReviewQueues } from '@/lib/spaced-review';

function DailyQuestionLinks({ responses, data, edital, activeIds, go, title = 'Questões do dia' }) {
  const [open, setOpen] = React.useState(false);
  const [onlyErrors, setOnlyErrors] = React.useState(false);
  const [shown, setShown] = React.useState(30);
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
        <label className="qb-check"><input type="checkbox" checked={onlyErrors} onChange={event => { setOnlyErrors(event.target.checked); setShown(30); }} />Somente questões com erro</label>
        {!rows.length && <EmptyState compact title="Nenhuma questão com erro neste recorte" />}
        {!!rows.length && <ul style={{ display: 'grid', gap: 10, margin: 0, listStyle: 'none', padding: 0 }}>
          {rows.slice(0, shown).map(([id, counts]) => {
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
        {shown < rows.length && <Button size="sm" variant="secondary" onClick={() => setShown(value => value + 30)}>Mostrar mais questões</Button>}
      </>}
    </Panel>
  );
}

function DailySubjectBreakdown({ date, scopeLabel = date ? QB_METRICS.fmtDate(date) : '', responses, data, subjects, total, go }) {
  const groups = groupResponsesByTopic(responses, data.questions, subjects);
  const unlinked = total - groups.reduce((sum, group) => sum + group.correct + group.wrong + group.blank, 0);
  const nodes = buildPerformanceNodes(groups, responses, data);
  return <section>
    <SubjectPerformanceExplorer nodes={nodes} description={'Respostas de treino de ' + scopeLabel}
      emptyTitle="Sem respostas vinculadas a matérias e assuntos"
      onAction={({ action, topicId, nodeId }) => {
        if (action === 'mindmap') go('map', { topicId, node: nodeId, returnTo: { view: 'performance', label: 'Desempenho' } });
        else if (action === 'review') go('flashcards', { topicId });
        else if (action === 'edital') go('edital', { topicId });
      }} />
    {unlinked > 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{unlinked} {unlinked === 1 ? 'resposta sem assunto vinculado' : 'respostas sem assunto vinculado'}.</p>}
  </section>;
}

function Daily({ go }) {
  const { QB_DATA, QB_EDITAL, QB_PLAN, QB_PERF, records } = useRealStudy();
  const M = QB_METRICS, PF = QB_PERF, P = QB_PLAN;
  const studyTime = useStudyTimeRecords();
  const today = reviewDay(new Date());
  const firstDate = studyTime.rows.reduce((first, row) => row.date < first ? row.date : first, PF.days[0]?.date || today);
  const [date, setDate] = React.useState(today);
  const [subjectId, setSubjectId] = React.useState('all');
  const [topicId, setTopicId] = React.useState('all');
  const filter = performanceScope(QB_DATA.questions, QB_EDITAL.subjects, subjectId, topicId);
  const responses = filter(PF.attemptsByDay[date] || []);
  const scoped = row => subjectId === 'all' ? row : { ...row, ...countAttempts(filter(PF.attemptsByDay[row.date] || [])) };
  const selectedDay = PF.days.find(d => d.date === date);
  const d = M.dayStats(scoped(selectedDay || { date, n: 0, correct: 0, wrong: 0, blank: 0 }));
  const activeIds = new Set(QB_DATA.questionBank.map(q => q.id));
  const wrongIds = [...new Set(responses.filter(item => item.result === 'wrong' && activeIds.has(item.qid)).map(item => item.qid))];
  const tasks = P.tasks.filter(t => t.date === date);
  const priorityDays = Array.from({ length: 7 }, (_, index) => {
    const day = P.addDays(date, index - 6);
    return { date: day, attempts: filter(PF.attemptsByDay[day] || []) };
  });
  const extraPriorities = priorityItems(priorityDays, QB_DATA, QB_EDITAL.subjects, records, subjectId, topicId, go);
  const series = PF.days.filter(day => day.date <= date).slice(-14).map(x => { const s = M.dayStats(scoped(x)); return { ...s, label: M.fmtDate(x.date), x: M.fmtDate(x.date), y: s.accuracy, n: s.valid, vol: s.n }; });
  const tiers = QB_EDITAL.subjects.flatMap(s => s.topics).filter(t => t.correct + t.wrong >= 20 && t.correct / (t.correct + t.wrong) < 0.6).length;
  const prev = PF.days.map(scoped).findLast(day => day.date < date && day.correct + day.wrong);
  const delta = prev && d.valid ? Math.round(d.accuracy - M.dayStats(prev).accuracy) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Panel className="qb-performance-v4-filters" padding={14}>
        <PerformancePeriodSelector mode="day" value={{ date }} min={firstDate} max={today} today={today} onChange={value => setDate(value.date)} />
        {scopeFilters(QB_EDITAL.subjects, subjectId, topicId, setSubjectId, setTopicId)}
      </Panel>
      <StudyTimePanel data={studyTime} from={date} />
      <PerformanceMetrics stats={d} tasks={tasks} cards={PF.cardsByDay[date] || 0} go={go}
        comparison={delta !== null ? { delta, label: formatDelta(delta) + ' p.p. vs. ' + M.fmtDate(prev.date) } : null} />
      <div className="qb-performance-v4-panes">
        <PerformanceTrendChart style={{ flex: '3 1 480px' }} subtitle={'Treino até ' + M.fmtDate(date)} data={series} />
        <PerformancePriorityPanel style={{ flex: '2 1 320px' }} basis={'7 dias até ' + M.fmtDate(date) + ' · revisões conforme a fila de hoje'} items={[
          ...extraPriorities,
          ...(wrongIds.length ? [{ id: 'errors', kind: 'Erros do dia', tone: 'incorrect', title: d.wrong + ' erros no recorte', reason: 'Reveja a origem dos erros nas questões registradas.', action: { label: 'Treinar erros', run: () => go('questions', { questionIds: wrongIds, filter: 'all' }) } }] : []),
          ...(tasks.some(t => t.status !== 'done') ? [{ id: 'plan', kind: 'Planejamento', tone: 'attention', title: 'Tarefas por concluir', reason: 'Confira as tarefas planejadas para esta data.', action: { label: 'Abrir planejamento', run: () => go('plan', 'semana') } }] : []),
          ...(tiers && subjectId === 'all' ? [{ id: 'heat', kind: 'Baixa precisão', tone: 'attention', title: tiers + ' tópicos abaixo de 60%', reason: 'Cada tópico tem pelo menos 20 respostas válidas no acumulado.', action: { label: 'Mapa de calor', run: () => go('edital', 'calor') } }] : []),
        ]} onAction={item => item.action.run()} />
      </div>
      <DailySubjectBreakdown date={date} total={d.n} responses={responses} data={QB_DATA} subjects={QB_EDITAL.subjects} go={go} />
      {!!responses.length && <DailyQuestionLinks responses={responses} data={QB_DATA} edital={QB_EDITAL} activeIds={activeIds} go={go} />}
    </div>
  );
}

function priorityItems(days, data, subjects, records, subjectId, topicId, go) {
  const topics = new Map(subjects.flatMap(subject => subject.topics.map(topic => [topic.id, topic])));
  const active = new Set(data.questionBank.map(q => q.id));
  const errors = recurringTopicErrors(days, new Map(data.questions.map(q => [q.id, q]))).slice(0, 3).map(group => {
    const ids = [...group.ids].filter(id => active.has(id));
    return { id: 'recurring-' + group.topicId, kind: 'Erros recorrentes', tone: 'incorrect',
      title: topics.get(group.topicId)?.title || group.topicId,
      reason: group.errors + ' erros em ' + group.dates.size + ' dias.',
      action: ids.length ? { label: 'Treinar erros', run: () => go('questions', { questionIds: ids, filter: 'all' }) } : null };
  });
  const subject = subjects.find(item => item.id === subjectId);
  const queue = scheduledReviewQueues({
    questions: data.questionBank, flashcards: data.flashcards, reviews: data.reviews, rounds: records?.rodadas,
    today: reviewDay(new Date()), subjectId: subjectId === 'all' ? undefined : subjectId, topicId: topicId === 'all' ? undefined : topicId,
    cardTopicIds: subjectId === 'all' ? null : new Set(subject?.topics.map(topic => topic.id) || []),
  });
  for (const [type, label, open] of [
    ['questions', 'Questões', ids => go('questions', { questionIds: ids, filter: 'all', scheduledReview: true })],
    ['flashcards', 'Flashcards', ids => go('flashcards', { cardIds: ids, scheduledReview: true })],
  ]) {
    const { due, ids } = queue[type];
    if (!due) continue;
    errors.push({ id: 'due-' + type, kind: 'Revisão pendente', tone: 'attention', title: label + ' a revisar · ' + due,
      reason: ids.length ? ids.length + ' disponíveis na fila de hoje.' : 'O limite diário desta fila já foi atingido.',
      action: ids.length ? { label: 'Iniciar revisão', run: () => open(ids) } : null });
  }
  return errors;
}

const formatDelta = delta => (delta > 0 ? '+' : '') + delta;

function PerformanceMetrics({ stats, tasks, cards, go, comparison }) {
  const { n, correct, wrong, blank, valid, accuracy, net } = stats;
  const done = tasks.filter(task => task.status === 'done').length;
  return <div className="qb-performance-v4-grid">
    <PerformanceMetricCard label="Itens julgados" icon="list-checks" value={n} state={n ? 'ok' : 'empty'}
      formula="Acertos + erros + brancos" warning={n > 0 && valid < 10 ? 'Amostra pequena' : null}
      breakdown={[{ label: 'acertos', value: correct, tone: 'correct' }, { label: 'erros', value: wrong, tone: 'incorrect' }, { label: 'em branco', value: blank }]} />
    <PerformanceMetricCard label="Taxa de acerto" icon="target" tone="correct" state={valid ? 'ok' : 'empty'}
      stateText="Sem respostas válidas" value={QB_METRICS.pct(accuracy)} detail={correct + ' de ' + valid + ' válidas'} comparison={comparison}
      formula="Acertos ÷ (acertos + erros)" method="Respostas em branco entram no volume, mas ficam fora da taxa de acerto." />
    <PerformanceMetricCard label="Nota líquida" icon="scale" tone="gold" state={n ? 'ok' : 'empty'} value={formatDelta(net)}
      formula="+1 acerto · −1 erro · 0 branco" />
    <PerformanceMetricCard label="Calibração da confiança" icon="circle-help" state="pending"
      formula="Aguardando fórmula formal e registros compatíveis." />
    <PerformanceMetricCard label="Tarefas concluídas" icon="calendar" state={tasks.length ? 'ok' : 'empty'} stateText="Sem tarefas planejadas"
      value={done} unit={'de ' + tasks.length} formula="Planejamento do período · todas as matérias" action={{ label: 'Abrir planejamento', onClick: () => go('plan', 'semana') }} />
    <PerformanceMetricCard label="Flashcards avaliados" icon="layers" state={cards ? 'ok' : 'empty'} stateText="Sem avaliações registradas"
      value={cards} formula="Avaliações no período · todas as matérias" />
  </div>;
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

function Historic({ go }) {
  const { QB_PERF: PF, QB_EDITAL: E, QB_SIM: S, QB_PLAN: P, QB_DATA: D, records } = useRealStudy();
  const M = QB_METRICS;
  const studyTime = useStudyTimeRecords();
  const today = reviewDay(new Date());
  const [from, setFrom] = React.useState(() => P.addDays(today, -13));
  const [to, setTo] = React.useState(today);
  const [group, setGroup] = React.useState('dia');
  const [subjectId, setSubjectId] = React.useState('all');
  const [topicId, setTopicId] = React.useState('all');
  const end = to;
  const start = from;
  const duration = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  const validRange = duration >= 1 && duration <= 90 && end <= today;
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
  const buckets = calendarBuckets(days, group, P.addDays);
  const previousBuckets = calendarBuckets(previous, group, P.addDays);
  const toPoint = rows => {
    const first = M.fmtDate(rows[0].date), last = M.fmtDate(rows.at(-1).date);
    return { ...sum(rows), label: first === last ? first : first + '–' + last };
  };
  const points = buckets.map(toPoint);
  const matchingBuckets = buckets.length === previousBuckets.length && buckets.every((rows, index) => rows.length === previousBuckets[index].length);
  const previousPoints = matchingBuckets ? previousBuckets.map(toPoint) : null;
  const tasks = P.tasks.filter(task => task.date >= start && task.date <= end);
  const extraPriorities = priorityItems(days, D, E.subjects, records, subjectId, topicId, go);
  const cards = days.reduce((count, day) => count + (PF.cardsByDay[day.date] || 0), 0);
  const wrongIds = [...new Set(responses.filter(row => row.result === 'wrong' && activeIds.has(row.qid)).map(row => row.qid))];
  const sim = S.history.filter(h => h.correct != null).reduce((a, h) => ({ c: a.c + h.correct, v: a.v + h.correct + h.wrong }), { c: 0, v: 0 });
  const delta = current.valid && prior.valid ? Math.round(current.accuracy - prior.accuracy) : null;
  return (
    <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
      <Panel padding={14} className="qb-performance-v4-filters">
        <PerformancePeriodSelector mode="range" value={{ from: start, to: end }} max={today}
          presets={[7, 14, 30].map(n => ({ id: n, label: n + ' dias', from: P.addDays(today, 1 - n), to: today }))}
          onChange={range => { setFrom(range.from); setTo(range.to); }} />
        {scopeFilters(E.subjects, subjectId, topicId, setSubjectId, setTopicId)}
      </Panel>
      {!validRange ? <EmptyState compact title="Intervalo inválido" description="Selecione de 1 a 90 dias, até a data de hoje." /> : <>
        <StudyTimePanel data={studyTime} from={start} to={end} />
        <PerformanceMetrics stats={current} tasks={tasks} cards={cards} go={go}
          comparison={delta !== null ? { delta, label: formatDelta(delta) + ' p.p. vs. período anterior' } : null} />
        <div className="qb-performance-v4-panes">
          <PerformanceTrendChart style={{ flex: '3 1 480px' }} data={points} previous={prior.valid ? previousPoints : null}
            subtitle={M.fmtDate(start) + ' a ' + M.fmtDate(end) + ' · taxa de acerto do treino'}
            previousNote={prior.valid && !matchingBuckets ? 'Os agrupamentos do período anterior têm limites diferentes. Confira os totais na comparação abaixo.' : 'Sem respostas válidas no período anterior.'}
            granularity={group} onGranularity={setGroup}
            granularities={[{ id: 'dia', label: 'Dia' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mês' }]} />
          <PerformancePriorityPanel style={{ flex: '2 1 320px' }} basis="Erros do período · revisões conforme a fila de hoje" items={[
            ...extraPriorities,
            ...(wrongIds.length ? [{ id: 'errors', kind: 'Erros do período', tone: 'incorrect', title: wrongIds.length + ' questões com erro', reason: 'Questões com erro registradas neste recorte e disponíveis para treino.', action: { label: 'Treinar erros', run: () => go('questions', { questionIds: wrongIds, filter: 'all' }) } }] : []),
          ]} onAction={item => item.action?.run()} />
        </div>
        <div className="qb-performance-v4-panes">
          <Panel padding={14} style={{ flex: '3 1 480px', minWidth: 0 }}>
            <h2 className="qb-overline">Período atual × anterior</h2>
            {!prior.valid ? <EmptyState compact title="Sem período anterior comparável" /> :
              <div style={{ overflowX: 'auto' }}><table className="qb-table">
                <thead><tr><th>Indicador</th><th>Anterior</th><th>Atual</th></tr></thead>
                <tbody>{[['Itens julgados', prior.n, current.n], ['Respostas válidas', prior.valid, current.valid], ['Taxa de acerto', M.pct(prior.accuracy), M.pct(current.accuracy)], ['Nota líquida', formatDelta(prior.net), formatDelta(current.net)]].map(([label, before, now]) =>
                  <tr key={label}><th scope="row">{label}</th><td>{before}</td><td>{now}</td></tr>)}</tbody>
              </table></div>}
          </Panel>
          <div style={{ flex: '2 1 320px', display: 'grid', gap: 10, minWidth: 0 }}>
            <span className="qb-overline">Séries separadas · acumulado</span>
            <PerformanceMetricCard compact label="Revisões" icon="repeat" value={M.pct(M.dayStats(PF.review).accuracy)} />
            <PerformanceMetricCard compact label="Simulados" icon="graduation-cap" value={M.pct(sim.v ? sim.c / sim.v * 100 : null)} />
          </div>
        </div>
        <DailySubjectBreakdown scopeLabel={M.fmtDate(start) + ' a ' + M.fmtDate(end)} total={current.n} responses={responses} data={D} subjects={E.subjects} go={go} />
        {!!responses.length && <DailyQuestionLinks responses={responses} data={D} edital={E} activeIds={activeIds} go={go} title="Questões do período" />}
      </>}
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
      <div className="qb-performance-v4-hero">
      <PageHeader overline="Análise do estudo" title="Desempenho" description={tab === 'metodo' ? 'Fórmulas e regras de cálculo de cada indicador.' : 'Respostas de treino registradas no período analisado.'}
        actions={<Tabs label="Análises" value={tab} onChange={setTab} items={[{ id: 'diaria', label: 'Análise diária', icon: 'calendar' }, { id: 'historica', label: 'Análise histórica', icon: 'activity' }, { id: 'metodo', label: 'Método', icon: 'scale' }]} />} />
      </div>
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
