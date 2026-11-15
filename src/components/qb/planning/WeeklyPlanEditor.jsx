import React from 'react';
import { Button } from '@/components/qb/core/Button';
import { TASK_TYPES } from '@/components/qb/planning/TaskCard';

const field = { display: 'grid', gap: 5, minWidth: 0 };
const row = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 };

export function WeeklyPlanEditor({ days, date, onDayChange, formatDay, editable, archived, subjects, busy, onSave, onArchive }) {
  const [selection, setSelection] = React.useState('');
  const selected = editable.find(task => task.id === selection);
  return <>
    <label style={{ ...field, maxWidth: 300 }}>Dia da semana
      <select className="qb-select" value={date} onChange={event => { setSelection(''); onDayChange(event.target.value); }} disabled={busy}>
        {days.map(day => <option key={day.date} value={day.date}>{formatDay(day.date)}</option>)}
      </select>
    </label>
    <label style={field}>Atividade
      <select className="qb-select" value={selected?.id || ''} onChange={event => setSelection(event.target.value)} disabled={busy}>
        <option value="">Nova atividade</option>
        {editable.map(task => <option key={task.id} value={task.id}>{task.title}{task.subject ? ' · ' + task.subject : ''} ({TASK_TYPES[task.type]?.label || task.type})</option>)}
      </select>
    </label>
    <TaskForm key={date + ':' + (selected?.id || 'new')} task={selected} date={date} days={days} formatDay={formatDay}
      subjects={subjects} busy={busy} onSave={async fields => {
        const saved = await onSave(selected, fields);
        if (saved) { onDayChange(fields.data); setSelection(saved); }
        return saved;
      }} onArchive={async () => { if (await onArchive(selected, true)) setSelection(''); }} />
    {archived.length > 0 && <details>
      <summary>Atividades arquivadas neste dia ({archived.length})</summary>
      <ul style={{ display: 'grid', gap: 8, paddingInlineStart: 20 }}>
        {archived.map(task => <li key={task.id}><div style={row}>
          <span>{task.title}</span><Button variant="secondary" size="sm" disabled={busy} onClick={() => onArchive(task, false)}>Restaurar</Button>
        </div></li>)}
      </ul>
    </details>}
  </>;
}

function TaskForm({ task, date, days, formatDay, subjects, busy, onSave, onArchive }) {
  const [confirmArchive, setConfirmArchive] = React.useState(false);
  const [title, setTitle] = React.useState(task?.title || '');
  const [subject, setSubject] = React.useState(task?.subject || '');
  const [type, setType] = React.useState(task?.type || 'estudo');
  const [activityDate, setActivityDate] = React.useState(task?.date || date);
  const [minutes, setMinutes] = React.useState(task?.minutes ?? '');
  const [time, setTime] = React.useState(task?.raw?.horario || '');
  const subjectListId = React.useId();
  return <form style={{ display: 'grid', gap: 12 }} onSubmit={event => {
    event.preventDefault();
    if (title.trim()) void onSave({ titulo: title.trim(), materia: subject.trim(), tipo: type, data: activityDate, minutos: Number(minutes), horario: time });
  }}>
    <fieldset disabled={busy} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 12, minInlineSize: 0, padding: 0, border: 0 }}>
      <label style={field}>Título
        <input className="qb-input" value={title} onChange={event => setTitle(event.target.value)} required maxLength={280} />
      </label>
      <label style={field}>Matéria
        <input className="qb-input" list={subjectListId} value={subject} onChange={event => setSubject(event.target.value)} maxLength={140} />
        <datalist id={subjectListId}>{subjects.map(name => <option key={name} value={name} />)}</datalist>
      </label>
      <label style={field}>Tipo
        <select className="qb-select" value={type} onChange={event => setType(event.target.value)}>
          {!TASK_TYPES[type] && <option value={type}>{type}</option>}
          {Object.entries(TASK_TYPES).map(([id, detail]) => <option key={id} value={id}>{detail.label}</option>)}
        </select>
      </label>
      <label style={field}>Data da atividade
        <select className="qb-select" value={activityDate} onChange={event => setActivityDate(event.target.value)}>
          {days.map(day => <option key={day.date} value={day.date}>{formatDay(day.date)}</option>)}
        </select>
      </label>
      <label style={field}>Duração em minutos
        <input className="qb-input" type="number" min={0} max={1440} value={minutes} onChange={event => setMinutes(event.target.value)} />
      </label>
      <label style={field}>Horário (opcional)
        <input className="qb-input" type="time" value={time} onChange={event => setTime(event.target.value)} />
      </label>
    </fieldset>
    <div style={row}>
      <Button type="submit" icon="check" disabled={busy || !title.trim()}>{task ? 'Salvar alterações' : 'Adicionar atividade'}</Button>
      {task && !confirmArchive && <Button variant="secondary" disabled={busy} onClick={() => setConfirmArchive(true)}>Arquivar atividade</Button>}
      {confirmArchive && <>
        <Button variant="secondary" disabled={busy} onClick={onArchive}>Confirmar arquivamento</Button>
        <Button variant="ghost" onClick={() => setConfirmArchive(false)}>Cancelar</Button>
      </>}
    </div>
  </form>;
}
