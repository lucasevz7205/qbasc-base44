import React from 'react';
import { QUESTION_FILTERS } from '@/lib/study-session-rules';

export function QuestionFilters({ value, onChange, disabled = false }) {
  return (
    <div className="qb-seg" role="group" aria-label="Filtrar questões pelo histórico" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
      {QUESTION_FILTERS.map(({ id, label }) => (
        <button key={id} type="button" className="qb-seg__opt" aria-pressed={value === id} disabled={disabled}
          onClick={() => { if (value !== id) onChange(id); }}>
          {label}
        </button>
      ))}
    </div>
  );
}
