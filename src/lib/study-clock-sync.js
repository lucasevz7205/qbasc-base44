import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { saveStudyClockRecords } from './study-accounts';
import { mergeStudyClockRecord, mergeStudyClockRecords, studyClockRecords } from './study-clock';

export const studyClockQueryKey = accountId => ['qbasc-study-clock', accountId];
const batchSize = 20;

function readQueue(storage, prefix, queue) {
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;
    try {
      const row = JSON.parse(storage.getItem(key));
      if (key !== prefix + row?.id || typeof row.time !== 'object' || !row.time) continue;
      const prior = queue.get(row.id);
      queue.set(row.id, prior ? mergeStudyClockRecord(prior, row) : row);
    } catch {
      // A damaged entry must not prevent the other sessions from syncing.
    }
  }
}

export function useStudyClockSync(accountId) {
  const client = useQueryClient();
  const prefix = 'qbasc:tempo:v1:' + accountId + ':';
  const queue = React.useRef(new Map());
  const recorded = React.useRef(new Map());
  const inFlight = React.useRef(null);
  const [pending, setPending] = React.useState([]);

  const checkpoint = React.useCallback((state, now) => {
    let changed = false;
    for (const row of studyClockRecords(state, now)) {
      const serialized = JSON.stringify(row);
      if (recorded.current.get(row.id) === serialized) continue;
      recorded.current.set(row.id, serialized);
      queue.current.set(row.id, row);
      changed = true;
      try { window.localStorage.setItem(prefix + row.id, serialized); }
      catch { /* The in-memory queue still allows cloud sync. */ }
    }
    if (changed) setPending([...queue.current.values()]);
  }, [prefix]);

  const sync = React.useCallback(() => {
    if (inFlight.current) return inFlight.current;

    const send = async () => {
      try { readQueue(window.localStorage, prefix, queue.current); }
      catch { /* Browser storage can be unavailable. */ }
      if (!queue.current.size) return;
      setPending([...queue.current.values()]);
      if (!navigator.onLine) return;

      const queryKey = studyClockQueryKey(accountId);
      const backlog = [...queue.current.values()];
      for (let offset = 0; offset < backlog.length; offset += batchSize) {
        const rows = backlog.slice(offset, offset + batchSize);
        const saved = await saveStudyClockRecords({ data: { accountId, records: rows } });
        await client.cancelQueries({ queryKey });
        client.setQueryData(queryKey, previous => previous && mergeStudyClockRecords(previous, saved));
        void client.invalidateQueries({ queryKey });
        for (const row of rows) {
          const serialized = JSON.stringify(row);
          if (JSON.stringify(queue.current.get(row.id)) === serialized) queue.current.delete(row.id);
          try {
            if (window.localStorage.getItem(prefix + row.id) === serialized) window.localStorage.removeItem(prefix + row.id);
          } catch { /* Retrying a snapshot does not duplicate duration. */ }
        }
        setPending([...queue.current.values()]);
      }
    };

    inFlight.current = (navigator.locks ? navigator.locks.request(prefix, send) : send())
      .catch(() => { /* Leave pending snapshots available for the next sync. */ })
      .finally(() => { inFlight.current = null; });
    return inFlight.current;
  }, [accountId, client, prefix]);

  return { checkpoint, sync, pending };
}
