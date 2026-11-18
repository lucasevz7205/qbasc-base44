import React from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon } from '@/components/qb/core/Icon';
import { PerformanceMetricCard } from '@/components/qb/performance/PerformanceMetricCard';
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

function SessionList({ rows }) {
  return <ul className="qb-study-time-list">
    {rows.map(row => {
      const startedDay = reviewDay(row.startedAt);
      return <li key={row.id}>
        <div className="qb-study-time-row">
          <time dateTime={new Date(row.startedAt).toISOString()}>
            {startedDay && startedDay !== row.date ? displayDate(startedDay) + ' · ' : ''}
            {startTime.format(row.startedAt)}
          </time>
          <strong>{formatStudyTime(studyTimeTotal(row.time))}</strong>
        </div>
        <span className="qb-study-time-caption">
          {byActivity.filter(([kind]) => row.time[kind] > 0).map(([kind, label]) => label + ' ' + formatStudyTime(row.time[kind])).join(' · ')}
          {row.estimated && ' · Estimativa'}
        </span>
      </li>;
    })}
  </ul>;
}

export default function StudyTimeMetric({ data, from, to = from }) {
  const { rows: history, pending, sync, query } = data;
  const rows = history.filter(row => row.date >= from && row.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt - a.startedAt);
  const days = new Map();
  const totals = Object.fromEntries(byActivity.map(([kind]) => [kind, 0]));
  for (const row of rows) {
    const day = days.get(row.date) ?? [];
    day.push(row);
    days.set(row.date, day);
    for (const [kind] of byActivity) totals[kind] += row.time[kind];
  }
  const total = formatStudyTime(studyTimeTotal(totals));
  const count = new Set(rows.map(row => row.sessionId)).size;
  const estimated = rows.some(row => row.estimated);
  const awaitingSync = pending.some(row => row.date >= from && row.date <= to);
  const detail = (count === 1 ? '1 sessão' : count + ' sessões') + (estimated ? ' · Inclui estimativa' : '');
  const stateText = query.isPending ? 'Carregando tempo…' : query.isError ? 'Tempo indisponível' : 'Sem sessões registradas';
  const retry = query.isError ? { label: 'Tentar novamente', onClick: () => query.refetch() } : null;

  return <Dialog.Root>
    <PerformanceMetricCard label="Tempo de sessão" icon="timer" value={total} state={count ? 'ok' : 'empty'}
      detail={detail} stateText={stateText} warning={awaitingSync ? 'Sincronização pendente' : null} action={count ? null : retry}>
      {!!count && <Dialog.Trigger className="qb-linkbtn qb-study-time-trigger">Ver sessões</Dialog.Trigger>}
    </PerformanceMetricCard>
    <Dialog.Portal>
      <Dialog.Overlay className="qb-study-time-overlay" />
      <Dialog.Content className="qb-panel qb-study-time-dialog">
        <header className="qb-study-time-row">
          <Dialog.Title>Tempo de sessão</Dialog.Title>
          <Dialog.Close className="qb-iconbtn" aria-label="Fechar sessões"><Icon name="x" size={18} /></Dialog.Close>
        </header>
        <Dialog.Description className="qb-study-time-caption">
          {from === to ? displayDate(from) : displayDate(from) + ' a ' + displayDate(to)} · {total} · Todas as matérias
        </Dialog.Description>
        <dl className="qb-study-time-totals">
          {byActivity.map(([kind, label]) => <div key={kind}>
            <dt>{label}</dt>
            <dd>{formatStudyTime(totals[kind])}</dd>
          </div>)}
        </dl>
        {estimated && <p className="qb-study-time-caption">As sessões estimadas somam intervalos entre respostas da mesma rodada de até 3 minutos.</p>}
        {awaitingSync && <button type="button" className="qb-linkbtn qb-study-time-trigger" onClick={sync}>Sincronizar tempo</button>}
        {query.isError && <button type="button" className="qb-linkbtn qb-study-time-trigger" onClick={() => query.refetch()}>Recarregar tempo salvo</button>}
        {from === to ? <SessionList rows={rows} /> : [...days].map(([date, sessions]) =>
          <details key={date} className="qb-study-time-day">
            <summary>{displayDate(date)} · {formatStudyTime(sessions.reduce((sum, row) => sum + studyTimeTotal(row.time), 0))}</summary>
            <SessionList rows={sessions} />
          </details>
        )}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
