import React from 'react';
import { StudyClockControls } from '@/components/qb/study/StudyClock';
import { IconButton } from '@/components/qb/core/IconButton';
import { ProgressBar } from '@/components/qb/core/ProgressBar';

export default function StudySessionHeader({
  subject,
  topic,
  current = 0,
  total = 0,
  completed,
  unit = 'Questão',
  focusMode = false,
  onToggleFocus,
  onBack,
  style,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        minHeight: 64,
        padding: '8px 12px',
        borderBottom: '1px solid var(--divider)',
        background: 'var(--canvas)',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {onBack && <IconButton icon="arrow-left" label="Voltar" onClick={onBack} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: '1 1 180px' }}>
        <span className="qb-overline" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subject}
        </span>
        <span style={{ font: '400 18px/1.25 var(--font-heading)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {topic}
        </span>
      </div>
      {total > 0 && <ProgressBar value={(completed ?? current) / total}
        label={completed == null ? unit : current > 0 && current <= total ? `${unit} ${current} de ${total}` : 'Questões da rodada'}
        valueText={completed == null ? `${current} de ${total}` : `${completed}/${total} confirmadas`}
        style={{ flex: '1 1 190px', maxWidth: 320 }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <StudyClockControls />
        {onToggleFocus && <IconButton icon="focus" label="Modo foco" pressed={focusMode} onClick={onToggleFocus} />}
      </div>
    </div>
  );
}
export { StudySessionHeader };