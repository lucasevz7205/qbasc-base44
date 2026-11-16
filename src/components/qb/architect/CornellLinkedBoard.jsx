import React from 'react';
import { Button } from '@/components/qb/core/Button';
import { cornellPairTitle } from '@/lib/cornell-pairs';
import { CornellRichEditor } from '@/components/qb/architect/CornellFormatting';

const fieldStyle = { display: 'grid', gap: 6, minWidth: 0 };
const columnStyle = { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 };

export function CornellLinkedBoard({ pairs, onChange, disabled, notesHidden }) {
  const [selectedId, setSelectedId] = React.useState(null);
  const [editingCue, setEditingCue] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const editorView = React.useRef(null);
  const editorId = React.useId();
  const titleInput = React.useRef(null);
  const index = pairs.findIndex(pair => pair.id === selectedId);
  const selected = pairs[index];

  const select = id => {
    setSelectedId(id);
    setEditingCue(false);
  };
  const add = () => {
    const id = crypto.randomUUID();
    onChange([...pairs, { id, title: '', cue: '', note: '' }]);
    select(id);
    requestAnimationFrame(() => titleInput.current?.focus({ preventScroll: true }));
  };
  const toggleNoteSize = () => {
    editorView.current?.remember();
    setExpanded(value => !value);
  };
  const edit = updates => onChange(pairs.map(pair => pair.id === selected.id ? { ...pair, ...updates } : pair));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px,100%),1fr))', gap: 12 }}>
      <div style={columnStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Pistas</span>
          <Button size="sm" variant="secondary" icon="plus" disabled={disabled} onClick={add}>Nova pista</Button>
        </div>
        <ul aria-label="Pistas do Cornell" className="qb-textarea" style={{ listStyle: 'none', display: 'grid', alignContent: 'start', gap: 4, height: 220, margin: 0, padding: 8, overflowY: 'auto', resize: 'none' }}>
          {pairs.map((pair, position) => (
            <li key={pair.id} style={{ minWidth: 0 }}>
              <Button size="sm" fullWidth variant={pair.id === selected?.id ? 'secondary' : 'ghost'}
                aria-pressed={pair.id === selected?.id} disabled={disabled} onClick={() => select(pair.id)}
                style={{ minHeight: 44, justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                {cornellPairTitle(pair, position)}
              </Button>
            </li>
          ))}
          {!pairs.length && <li style={{ color: 'var(--text-muted)' }}>Crie uma pista para começar.</li>}
        </ul>
      </div>
      <div style={columnStyle}>
        {selected ? <>
          <label style={fieldStyle}>
            <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Nome da pista e da nota</span>
            <input ref={titleInput} className="qb-input" value={typeof selected.title === 'string' ? selected.title : cornellPairTitle(selected, index)}
              disabled={disabled} maxLength={100} onChange={event => edit({ title: event.target.value })} placeholder="Dê um nome para esta pista" />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>{editingCue ? 'Texto da pista' : 'Nota'}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <Button size="sm" variant="ghost" aria-pressed={editingCue} disabled={disabled} onClick={() => setEditingCue(value => !value)}>
                {editingCue ? 'Voltar à nota' : 'Editar texto da pista'}
              </Button>
              {!editingCue && !notesHidden && <Button size="sm" variant="ghost"
                icon={expanded ? 'chevron-up' : 'maximize'} aria-expanded={expanded} aria-controls={editorId}
                disabled={disabled} onClick={toggleNoteSize}
                onPointerDown={event => { if (editorView.current?.focused()) event.preventDefault(); }}>
                {expanded ? 'Recolher nota' : 'Expandir nota'}
              </Button>}
            </div>
          </div>
          {notesHidden && !editingCue ? (
            <div className="qb-textarea" style={{ minHeight: 148, color: 'var(--text-muted)' }}>Nota oculta. Responda à pista de memória.</div>
          ) : (
            <CornellRichEditor key={selected.id + (editingCue ? ':cue' : ':note')} id={editorId} viewRef={editorView}
              label={editingCue ? 'Texto da pista' : 'Nota'} height={!editingCue && expanded ? 'clamp(220px, 55dvh, 560px)' : 148}
              value={editingCue ? selected.cue : selected.note} disabled={disabled}
              onChange={value => edit(editingCue ? { cue: value } : { note: value })}
              placeholder={editingCue ? 'Escreva uma pergunta para esta pista.' : 'Escreva a nota vinculada.'} />
          )}
        </> : <span style={{ color: 'var(--text-muted)' }}>A nota da pista selecionada aparece aqui.</span>}
      </div>
    </div>
  );
}
