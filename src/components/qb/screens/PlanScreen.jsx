import React from 'react';
import { PageHeader } from '@/components/qb/navigation/PageHeader';
import { Tabs } from '@/components/qb/navigation/Tabs';
import { StatCard } from '@/components/qb/data/StatCard';
import { BarChart } from '@/components/qb/data/BarChart';
import { Panel } from '@/components/qb/core/Panel';
import { WeekCalendar } from '@/components/qb/planning/WeekCalendar';
import { TaskCard } from '@/components/qb/planning/TaskCard';
import { RescheduleActions } from '@/components/qb/planning/RescheduleActions';
import { CycleConfigurator } from '@/components/qb/planning/CycleConfigurator';
import { HorasPorDia } from '@/components/qb/planning/HorasPorDia';
import { WeeklyPlanEditor } from '@/components/qb/planning/WeeklyPlanEditor';
import { PLAN_SETTINGS_ID, advanceCycle, planSettings, taskRecord } from '@/lib/plan-settings';
import { Button } from '@/components/qb/core/Button';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { QB_METRICS } from '@/lib/qb-data';
import { useRealStudy } from '@/lib/qb-real-data';

const WDL = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export default function PlanScreen({ tab = 'hoje', setTab, go, openArchitect, toast }) {
  const { QB_EDITAL, QB_PLAN, QB_PERF, save } = useRealStudy();
  const P = QB_PLAN, M = QB_METRICS;
  const tasks = P.tasks;
  const [offset, setOffset] = React.useState(0);
  const [selDate, setSelDate] = React.useState(P.today);
  const [selTask, setSelTask] = React.useState(null);
  const [qty, setQty] = React.useState(3);
  const [preview, setPreview] = React.useState(null);
  const [undo, setUndo] = React.useState(null);
  const [editor, setEditor] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const editorHeading = React.useRef(null);
  const [error, setError] = React.useState('');
  React.useEffect(() => { if (editor) editorHeading.current?.focus(); }, [editor]);

  const dl = iso => { const d = new Date(iso + 'T12:00:00Z'); return WDL[d.getUTCDay()] + ' ' + M.fmtDate(iso); };
  const start = P.weekStart(offset), end = P.addDays(start, 6);
  const days = Array.from({ length: 7 }, (_, i) => { const date = P.addDays(start, i); const ts = tasks.filter(t => t.date === date); return { date, weekday: P.weekday[i], dayNum: +date.slice(8), tasks: ts, autoReviews: ts.filter(t => t.auto).length }; });
  const movable = t => t.status !== 'done' && !t.auto;
  const editorDate = selDate >= start && selDate <= end ? selDate : start;
  const nextBlock = P.cycle.find(block => block.subjectId === P.currentSubjectId);
  const savedSettings = planSettings(P);
  const late = tasks.filter(t => t.status === 'late');
  const dayMovable = tasks.filter(t => t.date === selDate && movable(t));
  const weekPending = tasks.filter(t => t.date >= P.weekStart(0) && t.date <= P.addDays(P.weekStart(0), 6) && movable(t));

  const compute = action => {
    let ch = [], skipped = 0, desc = '';
    const after = tasks.filter(t => t.date > selDate && movable(t) && t.status === 'pending').sort((a, b) => a.date.localeCompare(b.date));
    if (action === 'pull') { ch = after.slice(0, qty).map(t => ({ t, to: selDate })); desc = 'antecipar as próximas ' + qty + ' atividades para ' + dl(selDate); }
    if (action === 'spread') {
      const targets = Array.from({ length: 7 }, (_, i) => P.addDays(P.today, i));
      const load = Object.fromEntries(targets.map(d => [d, tasks.filter(t => t.date === d).length]));
      ch = tasks.filter(t => t.date > P.addDays(P.today, 6) && movable(t)).slice(0, qty).map(t => { const d = targets.reduce((a, b) => load[b] < load[a] ? b : a); load[d]++; return { t, to: d }; });
      desc = 'distribuir as próximas ' + qty + ' atividades nos próximos 7 dias, priorizando os dias mais leves';
    }
    if (action === 'late') { ch = late.filter(t => !t.auto).map(t => ({ t, to: P.today })); skipped = late.filter(t => t.auto).length; desc = 'trazer ' + ch.length + ' atividades atrasadas para hoje'; }
    if (action === 'relieve') { ch = dayMovable.slice(-qty).map(t => ({ t, to: P.addDays(selDate, 1) })); skipped = tasks.filter(t => t.date === selDate && t.auto && t.status !== 'done').length; desc = 'aliviar ' + dl(selDate) + ' movendo ' + ch.length + ' atividades para o dia seguinte'; }
    if (action === 'redistribute') {
      const targets = Array.from({ length: 7 }, (_, i) => P.addDays(P.today, i));
      const pool = [...late.filter(t => !t.auto), ...tasks.filter(t => t.date >= P.today && t.date <= P.addDays(P.weekStart(0), 6) && movable(t) && t.status === 'pending')];
      ch = pool.map((t, i) => ({ t, to: targets[i % targets.length] })).filter(c => c.to !== c.t.date || c.t.status === 'late');
      skipped = late.filter(t => t.auto).length; desc = 'redistribuir ' + ch.length + ' pendências igualmente pelos próximos 7 dias';
    }
    setPreview({ action, description: desc, skipped, changes: ch.map(c => ({ id: c.t.id, title: (c.t.topicNum ? c.t.topicNum + ' ' : '') + c.t.title, from: dl(c.t.date) + (c.t.status === 'late' ? ' (atrasada)' : ''), to: dl(c.to), _to: c.to })) });
  };
  const [saving, setSaving] = React.useState(false);
  const writeInProgress = React.useRef(false);
  const persist = async operation => {
    if (writeInProgress.current) return false;
    writeInProgress.current = true;
    setSaving(true);
    setError('');
    try {
      return await operation();
    } catch {
      setError('Não foi possível salvar no Base44. Verifique a conexão e tente novamente.');
      return false;
    } finally {
      writeInProgress.current = false;
      setSaving(false);
    }
  };
  const updateTasks = changes => persist(async () => {
    for (const [task, fields] of changes)
      await save('planejamento', task.id, taskRecord(task, fields, new Date().toISOString()));
    return true;
  });
  const saveActivity = (task, fields) => persist(async () => {
    const id = task?.id || 'qbasc-plan-' + crypto.randomUUID();
    await save('planejamento', id, taskRecord(task, fields, new Date().toISOString()));
    toast?.({ tone: 'success', title: task ? 'Atividade atualizada' : 'Atividade adicionada' });
    return id;
  });
  const archiveActivity = (task, archive) => updateTasks([[task, { arquivadaEm: archive ? new Date().toISOString() : null }]]);
  const saveSettings = settings => persist(async () => {
    await save('planejamento', PLAN_SETTINGS_ID, planSettings(settings));
    return true;
  });
  const openEditor = (mode = P.mode) => {
    setPreview(null);
    setDraft(savedSettings);
    setEditor(mode);
  };
  const closeEditor = () => { setEditor(null); setDraft(null); };
  const changeMode = async mode => {
    if (!await saveSettings({ ...(mode === 'cycle' ? draft : savedSettings), mode })) return;
    closeEditor();
    setTab?.('hoje');
    toast?.({ tone: 'success', title: mode === 'cycle' ? 'Ciclo de estudos ativado' : 'Cronograma semanal ativado' });
  };
  const apply = async () => {
    const dates = new Map(preview.changes.map(change => [change.id, change._to]));
    const affected = tasks.filter(task => dates.has(task.id) && movable(task));
    if (!await updateTasks(affected.map(task => [task, { data: dates.get(task.id) }]))) return;
    const msg = affected.length + ' atividades reagendadas.';
    setUndo({ affected, dates, msg }); setPreview(null);
    toast && toast({ tone: 'success', title: 'Cronograma ajustado', message: msg });
  };
  const restore = async () => {
    const changes = undo.affected.flatMap(old => {
      const task = tasks.find(item => item.id === old.id);
      return task && movable(task) && task.date === undo.dates.get(old.id) ? [[task, { data: old.date }]] : [];
    });
    if (await updateTasks(changes)) setUndo(null);
  };
  const previews = preview ? Object.fromEntries(preview.changes.map(c => [c.id, '→ ' + c.to])) : {};

  const today = QB_PERF.days[QB_PERF.days.length - 1];
  const td = M.dayStats(today);
  const last7 = QB_PERF.days.slice(-7).map(M.dayStats);
  const s7 = last7.reduce((a, d) => ({ c: a.c + d.correct, v: a.v + d.valid }), { c: 0, v: 0 });
  const todayTasks = tasks.filter(t => t.date === P.today);
  const tDone = todayTasks.filter(t => t.status === 'done').length;
  const sel = selTask && tasks.find(t => t.id === selTask);

  const reschedule = (
    <RescheduleActions dayLabel={dl(selDate)} quantity={qty} onQuantity={setQty} counts={{ late: late.filter(t => !t.auto).length, day: dayMovable.length, week: weekPending.length + late.filter(t => !t.auto).length }}
      preview={preview} onPreview={compute} onConfirm={apply} onCancel={() => setPreview(null)} lastApplied={undo && undo.msg} onUndo={restore} />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHeader emblema="calendar-days" overline="Planejamento de estudos" title="Planejamento" description="Tarefas do dia, calendário da semana e sequência do ciclo de matérias."
        actions={<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Tabs label="Visualização do planejamento" value={tab} onChange={setTab} items={[{ id: 'hoje', label: 'Hoje', icon: 'calendar' }, { id: 'semana', label: 'Semana', icon: 'calendar-days' }, { id: 'ciclos', label: 'Ciclos', icon: 'repeat' }]} />
          <Button variant="secondary" icon="pencil" disabled={saving} aria-expanded={!!editor} aria-controls={editor ? 'qb-plan-editor' : undefined} onClick={() => editor ? closeEditor() : openEditor(tab === 'semana' ? 'weekly' : tab === 'ciclos' ? 'cycle' : P.mode)}>Editar cronograma</Button>
        </div>} />
      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Modo ativo · <strong>{P.mode === 'cycle' ? 'Ciclo de estudos' : 'Cronograma semanal'}</strong></p>
      {error && <p role="alert" style={{ color: 'var(--state-incorrect)' }}>{error}</p>}
      {editor && <Panel id="qb-plan-editor" padding={16} style={{ display: 'grid', gap: 12 }}>
        <h2 tabIndex={-1} ref={editorHeading} style={{ font: 'var(--type-h2)' }}>Editar planejamento</h2>
        <Tabs label="Formato do planejamento" value={editor} onChange={value => { if (!saving) setEditor(value); }}
          items={[{ id: 'weekly', label: 'Cronograma semanal', icon: 'calendar-days' }, { id: 'cycle', label: 'Ciclo de estudos', icon: 'repeat' }]} />
        {editor === 'weekly' ? <>
          <p>{M.fmtDate(start)} a {M.fmtDate(end)}. Selecione um dia e uma atividade pendente, ou adicione uma nova.</p>
          <WeeklyPlanEditor days={days} date={editorDate} onDayChange={setSelDate} formatDay={dl}
            editable={tasks.filter(task => task.date === editorDate && movable(task))}
            archived={P.archivedTasks.filter(task => task.date === editorDate)}
            subjects={[...new Set(QB_EDITAL.subjects.map(subject => subject.name))]}
            busy={saving} onSave={saveActivity} onArchive={archiveActivity} />
          <HorasPorDia hours={draft.hours} onChange={hours => setDraft(value => ({ ...value, hours }))} />
          <Button variant="secondary" icon="check" disabled={saving} onClick={async () => { if (await saveSettings({ ...savedSettings, hours: draft.hours })) toast?.({ tone: 'success', title: 'Horas salvas' }); }}>Salvar horas</Button>
          {P.mode !== 'weekly' && <Button variant="secondary" disabled={saving} onClick={() => changeMode('weekly')}>Usar cronograma semanal</Button>}
        </> : <>
          <CycleConfigurator hours={draft.hours} onHoursChange={hours => setDraft(value => ({ ...value, hours }))}
            cycle={draft.cycle} onCycleChange={cycle => setDraft(value => ({ ...value, cycle }))}
            available={QB_EDITAL.subjects.map(subject => ({ id: subject.id, name: subject.name }))} />
          {!QB_EDITAL.subjects.length && <p>Cadastre as matérias no edital para montar o ciclo.</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Button variant={P.mode === 'cycle' ? 'primary' : 'secondary'} icon="check" disabled={saving || (P.mode === 'cycle' && !draft.cycle.length)} onClick={async () => {
              if (await saveSettings({ ...draft, mode: P.mode })) {
                closeEditor();
                toast?.({ tone: 'success', title: 'Ciclo salvo' });
              }
            }}>Salvar ciclo</Button>
            {P.mode !== 'cycle' && <Button disabled={saving || !draft.cycle.length} onClick={() => changeMode('cycle')}>Usar ciclo de estudos</Button>}
          </div>
        </>}
      </Panel>}
      <Panel padding={16} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Panorama de {dl(P.today)}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,132px),1fr))', gap: 8 }}>
            <StatCard compact label="Respostas C/E" value={td.valid} detail={td.blank + ' em branco à parte'} />
            <StatCard compact label="Taxa de acertos" tone="correct" value={M.pct(td.accuracy)} detail={td.correct + '/' + td.valid} />
            <StatCard compact label="Tarefas" value={tDone + '/' + todayTasks.length} detail={P.mode === 'cycle' ? 'do cronograma semanal' : 'concluídas hoje'} />
          </div>
          <button className="qb-linkbtn" style={{ alignSelf: 'flex-start' }} onClick={() => go('performance')}>Abrir análise diária →</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ font: '500 13px/1.3 var(--font-body)', color: 'var(--text-secondary)' }}>Acertos nas rodadas de treino · últimos 7 dias</span>
          <BarChart height={120} max={100} format={v => Math.round(v) + '%'} label="Taxa de acertos por dia" data={last7.map(d => ({ label: M.fmtDate(d.date), value: d.accuracy, muted: d.valid > 0 && d.valid < 10, title: M.fmtDate(d.date) + ': ' + (d.valid ? M.pct(d.accuracy) + ' (' + d.correct + '/' + d.valid + ')' : 'sem respostas') }))} />
          <span style={{ font: '400 12px/1.3 var(--font-body)', color: 'var(--text-muted)' }}>No período: {s7.c}/{s7.v} acertos ({M.pct(s7.c / s7.v * 100)}). Brancos fora do cálculo; barra esmaecida = menos de 10 respostas.</span>
        </div>
      </Panel>

      {tab === 'hoje' && P.mode === 'cycle' && (
        <Panel style={{ display: 'grid', gap: 12 }}>
          <h2 style={{ font: 'var(--type-h2)' }}>Bloco atual do ciclo</h2>
          {nextBlock ? <>
            <p><strong>{nextBlock.name}</strong> · {nextBlock.minutes} min</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Button variant="secondary" icon="book-open" onClick={() => go('study')}>Abrir Estudo</Button>
              <Button icon="check" disabled={saving} onClick={async () => {
                if (await saveSettings(advanceCycle(savedSettings))) toast?.({ tone: 'success', title: 'Bloco concluído' });
              }}>Concluir bloco e avançar</Button>
            </div>
          </> : <Button variant="secondary" onClick={() => openEditor('cycle')}>Configurar ciclo</Button>}
        </Panel>
      )}
      {tab === 'hoje' && P.mode === 'weekly' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16, alignItems: 'start' }}>
          <Panel style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><h2 style={{ font: 'var(--type-h2)', flex: 1 }}>Hoje · {dl(P.today)}</h2><span style={{ font: '400 13px/1 var(--font-mono)', color: 'var(--text-muted)' }}>{Math.round(todayTasks.reduce((a, t) => a + t.minutes, 0) / 6) / 10} h planejadas · {P.hours[new Date(P.today+'T12:00:00Z').getUTCDay()] || '—'} h disponíveis</span></div>
            {todayTasks.map(t => <TaskCard key={t.id} task={t} selected={t.id === selTask} preview={previews[t.id]} onClick={() => setSelTask(t.id)} />)}
            {late.length > 0 && <>
              <span className="qb-overline" style={{ color: 'var(--state-incorrect)', marginTop: 8 }}>Atrasadas · {late.length}</span>
              {late.slice(0, 3).map(t => <TaskCard key={t.id} task={t} selected={t.id === selTask} preview={previews[t.id]} onClick={() => setSelTask(t.id)} />)}
              {late.length > 3 && <span style={{ font: '400 13px/1 var(--font-body)', color: 'var(--text-muted)' }}>+ {late.length - 3} atrasadas — veja a semana</span>}
            </>}
          </Panel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sel ? (
              <Panel variant="ornate" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Tarefa selecionada</span>
                <h3 style={{ font: '400 22px/1.25 var(--font-heading)' }}>{sel.topicNum ? sel.topicNum + ' · ' : ''}{sel.title}</h3>
                <span style={{ font: '400 14px/1.4 var(--font-body)', color: 'var(--text-secondary)' }}>{sel.subject} · {sel.minutes} min · {dl(sel.date)}{sel.auto ? ' · revisão automática' : ''}</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button icon="play" onClick={() => go(sel.type === 'questoes' || sel.type === 'revisao' ? 'questions' : sel.type === 'flashcards' ? 'flashcards' : sel.type === 'simulado' ? 'simulado' : 'study')}>Iniciar</Button>
                  <Button variant="secondary" icon="check" disabled={saving || sel.status === 'done'} onClick={async () => { if(await updateTasks([[sel,{status:'concluida',concluidaEm:new Date().toISOString()}]]))toast?.({tone:'success',title:'Tarefa concluída'}); }}>Marcar concluída</Button>
                  <Button variant="ghost" icon="astrolabe" onClick={() => openArchitect && openArchitect({ subjectId: sel.subjectId, origin: 'tarefa de ' + dl(sel.date) })}>O Arquiteto</Button>
                </div>
              </Panel>
            ) : <EmptyState icon="calendar" title="Selecione uma tarefa" description="Veja detalhes, inicie a atividade ou abra O Arquiteto no contexto dela." />}
            {reschedule}
          </div>
        </div>
      )}

      {tab === 'semana' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reschedule}
          <Panel padding={14}>
            <WeekCalendar days={days} today={P.today} selectedDate={selDate} onSelectDay={d => { setSelDate(d); setPreview(null); }} selectedTaskId={selTask} onSelectTask={t => { setSelTask(t.id); setSelDate(t.date); }} previews={previews}
              weekLabel={M.fmtDate(start) + ' a ' + M.fmtDate(end) + (offset === 0 ? ' · semana atual' : '')} onPrevWeek={() => setOffset(o => Math.max(-1, o - 1))} onNextWeek={() => setOffset(o => Math.min(1, o + 1))} onToday={() => setOffset(0)} isCurrentWeek={offset === 0} />
          </Panel>
          <span style={{ font: '400 12px/1.4 var(--font-body)', color: 'var(--text-muted)' }}> Carga da semana: {Math.round(days.reduce((a, d) => a + d.tasks.reduce((x, t) => x + t.minutes, 0), 0) / 60)} h planejadas · {Math.round(days.reduce((a, d) => a + d.tasks.filter(t => t.status === 'done').reduce((x, t) => x + t.minutes, 0), 0) / 60)} h realizadas · {P.hours.reduce((a, b) => a + b, 0)} h disponíveis.</span>
        </div>
      )}

      {tab === 'ciclos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)', maxWidth: '72ch' }}>O <strong>calendário</strong> diz quando você estuda (horas por dia). O <strong>ciclo</strong> diz o que vem a seguir (sequência de matérias) — ao terminar uma matéria, o plano passa para a próxima, independentemente do dia da semana.</p>
          {P.cycle.length ? <Panel as="ol" aria-label="Ordem do ciclo" style={{ display: 'grid', gap: 8, paddingInlineStart: 40 }}>
            {P.cycle.map(block => <li key={block.subjectId} aria-current={block.subjectId === P.currentSubjectId ? 'step' : undefined}>
              {block.name} · {block.minutes} min{block.subjectId === P.currentSubjectId ? ' · bloco atual' : ''}
            </li>)}
          </Panel> : <EmptyState icon="repeat" title="Nenhuma matéria no ciclo" description="Abra Editar cronograma para montar a sequência de matérias." />}
        </div>
      )}
    </div>
  );
}
export { PlanScreen };
