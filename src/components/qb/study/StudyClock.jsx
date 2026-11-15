import React from 'react';
import { Button } from '@/components/qb/core/Button';
import { Icon } from '@/components/qb/core/Icon';
import { IconButton } from '@/components/qb/core/IconButton';
import { useStudyClock } from '@/lib/StudyClockContext';
import { STUDY_ACTIVITIES, formatStudyTime, studyClockTimes } from '@/lib/study-clock';

function useClockDisplay() {
  const { state, send } = useStudyClock();
  const [, update] = React.useReducer(value => value + 1, 0);
  React.useEffect(() => {
    if (state.since === null) return;
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [state.since]);
  const times = studyClockTimes(state, typeof performance === 'undefined' ? 0 : performance.now());
  const total = Object.values(times).reduce((sum, time) => sum + time, 0);
  return { state, send, times, total };
}

export function StudyClockControls({ onOpen }) {
  const { state, send, total } = useClockDisplay();
  const started = state.status === 'active' || state.status === 'paused';
  const paused = state.status === 'paused';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button type="button" className="qb-chip" aria-label="Abrir resumo da sessão de estudo" onClick={onOpen}>
        <Icon name="timer" size={16} color="var(--qb-gold)" />
        <span role="timer" style={{ fontFamily: 'var(--font-mono)' }}>{formatStudyTime(total)}</span>
      </button>
      {started && <IconButton icon={paused ? 'play' : 'pause'} label={paused ? 'Retomar cronômetro' : 'Pausar cronômetro'} onClick={() => send({ type: 'toggle' })} />}
    </div>
  );
}

export default function StudyClock() {
  const { state, send, times, total } = useClockDisplay();
  const started = state.status === 'active' || state.status === 'paused';
  const paused = state.status === 'paused';
  const counts = { ...state.counts, maps: state.maps.length };
  const status = state.status === 'finished' ? 'Sessão encerrada' :
    paused ? 'Sessão pausada' :
    !started ? 'Sessão de estudo' :
    state.since === null ? 'Aguardando uma atividade de estudo' :
    'Em estudo · ' + STUDY_ACTIVITIES[state.activity.kind];
  return (
    <section className="qb-panel qb-panel--sunken" aria-label="Cronômetro da sessão" style={{ padding: 16, display: 'grid', gap: 14 }}>
      <span className="qb-overline">{status}</span>
      <span role="timer" aria-label="Tempo total de estudo" style={{ font: '500 44px/1 var(--font-mono)' }}>{formatStudyTime(total)}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Button icon={started && !paused ? 'pause' : 'play'} onClick={() => send({ type: started ? 'toggle' : 'start' })}>
          {started ? (paused ? 'Retomar' : 'Pausar') : (state.status === 'finished' ? 'Nova sessão' : 'Iniciar sessão')}
        </Button>
        {started && <Button variant="secondary" icon="square" onClick={() => send({ type: 'finish' })}>Encerrar</Button>}
      </div>
      <dl style={{ display: 'grid', gap: 8, margin: 0 }}>
        {Object.entries(STUDY_ACTIVITIES).map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 8, borderTop: '1px solid var(--divider)' }}>
            <dt>{label}</dt>
            <dd style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>{formatStudyTime(times[key] || 0)} · {counts[key]} {key === 'questions' ? 'registr.' : key === 'flashcards' ? 'avaliações' : 'abertos'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
