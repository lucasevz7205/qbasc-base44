import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/qb/core/Button';
import { Panel } from '@/components/qb/core/Panel';
import { useStudyClock } from '@/lib/StudyClockContext';
import { useRealStudy } from '@/lib/qb-real-data';
import { reviewDay } from '@/lib/spaced-review';
import { listStudyClockRecords } from '@/lib/study-accounts';
import { STUDY_ACTIVITIES, formatStudyTime, mergeStudyClockRecords, studyTimeTotal } from '@/lib/study-clock';
import { studyClockQueryKey } from '@/lib/study-clock-sync';

const byActivity = Object.entries(STUDY_ACTIVITIES);
const startTime = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
const displayDate = date => date.split('-').reverse().join('/');

export function useStudyTimeRecords() {
  const { accountId } = useRealStudy();
  const { pending, sync } = useStudyClock();
  const query = useQuery({ queryKey: studyClockQueryKey(accountId), queryFn: () => listStudyClockRecords() });
  const rows = React.useMemo(() => mergeStudyClockRecords(query.data || [], pending), [query.data, pending]);
  return { rows, pending, sync, query };
}

function Sessions({ rows }) {
  return <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
    {rows.map(row => {
      const startedDay = reviewDay(row.startedAt);
      return <li key={row.id} style={{ display: 'grid', gap: 4, padding: '10px 0', borderTop: '1px solid var(--divider)' }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <time dateTime={new Date(row.startedAt).toISOString()}>
            {startedDay && startedDay !== row.date ? displayDate(startedDay) + ' · ' : ''}
            {startTime.format(row.startedAt)}
          </time>
          <strong>{formatStudyTime(studyTimeTotal(row.time))}</strong>
        </span>
        <small style={{ color: 'var(--text-muted)' }}>
          {byActivity.filter(([kind]) => row.time[kind] > 0).map(([kind, label]) => label + ' ' + formatStudyTime(row.time[kind])).join(' · ')}
        </small>
      </li>;
    })}
  </ul>;
}

export default function StudyTimePanel({ data, from, to = from }) {
  const { rows: history, pending, sync, query } = data;
  const rows = history.filter(row => row.date >= from && row.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt - a.startedAt);
  const days = new Map();
  const totals = Object.fromEntries(byActivity.map(([kind]) => [kind, 0]));
  for (const row of rows) {
    if (!days.has(row.date)) days.set(row.date, { time: 0, rows: [] });
    const day = days.get(row.date);
    day.time += studyTimeTotal(row.time);
    day.rows.push(row);
    for (const [kind] of byActivity) totals[kind] += row.time[kind];
  }
  const sessionCount = new Set(rows.map(row => row.sessionId)).size;
  return <Panel variant="ornate" style={{ display: 'grid', gap: 12, minWidth: 0 }}>
    <div style={{ display: 'grid', gap: 4 }}>
      <h2 style={{ font: 'var(--type-h2)', margin: 0 }}>Tempo de estudo</h2>
      <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <strong style={{ font: 'var(--type-h1)' }}>{formatStudyTime(studyTimeTotal(totals))}</strong>
        <span style={{ color: 'var(--text-muted)' }}>
          {sessionCount} {sessionCount === 1 ? 'sessão' : 'sessões'} · Todas as matérias
        </span>
      </div>
    </div>
    {!!rows.length && <dl style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', margin: 0 }}>
      {byActivity.map(([kind, label]) => <div key={kind} style={{ display: 'grid', gap: 4 }}>
        <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
        <dd style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>{formatStudyTime(totals[kind])}</dd>
      </div>)}
    </dl>}
    {query.isPending && !rows.length && <span role="status">Carregando tempo de estudo…</span>}
    {query.isError && <div role="status">Falha ao carregar o tempo salvo. <Button size="sm" variant="ghost" onClick={() => query.refetch()}>Tentar novamente</Button></div>}
    {!query.isPending && !query.isError && !rows.length && <span style={{ color: 'var(--text-muted)' }}>Nenhum tempo cronometrado neste período.</span>}
    {pending.length > 0 && <div role="status">Tempo aguardando sincronização. <Button size="sm" variant="ghost" onClick={sync}>Sincronizar</Button></div>}
    {[...days].map(([date, day]) => <details key={date} style={{ borderTop: '1px solid var(--divider)', paddingTop: 10 }}>
      <summary style={{ cursor: 'pointer' }}>
        {from === to ? 'Sessões do dia' : displayDate(date) + ' · ' + formatStudyTime(day.time)}
      </summary>
      <Sessions rows={day.rows} />
    </details>)}
  </Panel>;
}
