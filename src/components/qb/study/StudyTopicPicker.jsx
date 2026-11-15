import React from 'react';
import { Icon } from '@/components/qb/core/Icon';

const norm = s =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
let seq = 0;

export default function StudyTopicPicker({
  subjects = [],
  value,
  onSelect,
  counts = {},
  countLabel = ['mapa', 'mapas'],
  recents = [],
  favorites = [],
  pendingReviews = [],
  label = 'Assunto',
  placeholder = 'Buscar por matéria, código ou assunto',
  emptyTitle = 'Título não disponível nos arquivos',
  style,
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [selectedSubjId, setSelectedSubjId] = React.useState(null);
  const [active, setActive] = React.useState(0);
  const trigger = React.useRef(null),
    input = React.useRef(null),
    list = React.useRef(null),
    closeBtn = React.useRef(null);
  const uid = React.useMemo(() => 'qb-picker-' + ++seq, []);

  const index = React.useMemo(() => {
    const m = {};
    subjects.forEach(s =>
      s.topics.forEach(t => {
        m[t.id] = { s, t };
      }),
    );
    return m;
  }, [subjects]);

  const cur = value ? index[value] : null;
  const activeSubj = selectedSubjId ? subjects.find(s => s.id === selectedSubjId) || null : null;
  const toks = React.useMemo(() => norm(q).split(/\s+/).filter(Boolean), [q]);
  const isSearching = toks.length > 0;

  // Mode 1: Matérias list (when not searching and no subject drilled-in)
  // Mode 2: Assuntos of selectedSubjId (when drilled into a subject and not searching)
  // Mode 3: Search results across all subjects (when typing in the search box)
  const subjectRows = React.useMemo(() => {
    return subjects.map(s => {
      const totalMaps = s.topics.reduce((acc, t) => acc + (counts[t.id] || 0), 0);
      return {
        kind: 'subject',
        s,
        topicCount: s.topics.length,
        mapCount: totalMaps,
      };
    });
  }, [subjects, counts]);

  const sections = React.useMemo(() => {
    if (!isSearching && activeSubj) {
      return [
        {
          key: activeSubj.id,
          label: activeSubj.name,
          meta: activeSubj.block,
          icon: activeSubj.icon || 'book-open',
          items: activeSubj.topics.map(t => ({ kind: 'topic', s: activeSubj, t })),
          total: activeSubj.topics.length,
        },
      ];
    }
    if (isSearching) {
      const out = [];
      subjects.forEach(s => {
        const items = s.topics
          .filter(t => {
            const h = norm(s.name + ' ' + (s.short || '') + ' ' + t.num + ' ' + (s.short || '') + ' ' + t.num + ' ' + (t.title || ''));
            return toks.every(k => h.includes(k));
          })
          .map(t => ({ kind: 'topic', s, t }));
        if (items.length) out.push({ key: s.id, label: s.name, meta: s.meta || s.block, icon: s.icon || 'book-open', items, total: s.topics.length });
      });
      return out;
    }
    return [];
  }, [isSearching, activeSubj, subjects, toks]);

  const shortcutItems = React.useMemo(() => {
    if (isSearching || activeSubj) return [];
    const out = [];
    [
      ['recent', 'Recentes', 'history', recents],
      ['fav', 'Favoritos', 'bookmark', favorites],
      ['rev', 'Revisões pendentes', 'repeat', pendingReviews],
    ].forEach(([key, lab, icon, ids]) => {
      const items = ids.map(id => index[id]).filter(Boolean).map(x => ({ ...x, kind: 'topic', shortcut: true }));
      if (items.length) out.push({ key, label: lab, icon, items });
    });
    return out;
  }, [isSearching, activeSubj, recents, favorites, pendingReviews, index]);

  const flat = React.useMemo(() => {
    if (!isSearching && !activeSubj) {
      const sc = shortcutItems.flatMap(sec => sec.items.map(it => ({ ...it, sec })));
      return [...subjectRows, ...sc];
    }
    return sections.flatMap(sec => sec.items.map(it => ({ ...it, sec })));
  }, [isSearching, activeSubj, subjectRows, shortcutItems, sections]);

  const show = (startAtSubjects = true) => {
    setQ('');
    setSelectedSubjId(startAtSubjects ? null : cur?.s?.id || null);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    trigger.current && trigger.current.focus();
  };
  const enterSubject = s => {
    setSelectedSubjId(s.id);
    setQ('');
    setActive(0);
    if (list.current) list.current.scrollTop = 0;
    input.current && input.current.focus();
  };
  const backToSubjects = () => {
    setSelectedSubjId(null);
    setQ('');
    const idx = cur?.s ? Math.max(0, subjects.findIndex(s => s.id === cur.s.id)) : 0;
    setActive(idx);
    if (list.current) list.current.scrollTop = 0;
    input.current && input.current.focus();
  };
  const choose = it => {
    if (!it) return;
    if (it.kind === 'subject') {
      enterSubject(it.s);
      return;
    }
    onSelect && onSelect({ subjectId: it.s.id, topicId: it.t.id });
    close();
  };

  React.useEffect(() => {
    if (!open) return;
    if (!activeSubj && !isSearching) {
      const i = cur?.s ? subjects.findIndex(s => s.id === cur.s.id) : 0;
      setActive(i < 0 ? 0 : i);
    } else {
      const i = flat.findIndex(f => f.kind === 'topic' && f.t.id === value);
      setActive(i < 0 ? 0 : i);
    }
    input.current && input.current.focus();
  }, [open, selectedSubjId]);

  React.useEffect(() => {
    if (!open || !list.current) return;
    const el = document.getElementById(uid + '-' + active),
      box = list.current;
    if (!el) return;
    const top = el.offsetTop - 40,
      bottom = el.offsetTop + el.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = Math.max(0, top);
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight + 6;
  }, [active, open, q, selectedSubjId, uid]);

  const onKey = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(a => Math.min(flat.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(flat[active]);
    } else if (e.key === 'Backspace' && !q && activeSubj) {
      e.preventDefault();
      backToSubjects();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (activeSubj && !q) {
        backToSubjects();
      } else {
        close();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      (document.activeElement === input.current ? closeBtn.current : input.current).focus();
    }
  };

  const count = id => {
    const n = counts[id];
    return n ? n + ' ' + (n > 1 ? countLabel[1] : countLabel[0]) : null;
  };
  let i = -1;

  return (
    <div style={{ minWidth: 0, ...style }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
        <button
          ref={trigger}
          type="button"
          className="qb-picker__trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => show(true)}
          style={{ flex: 1 }}
        >
          <Icon name="search" size={18} color="var(--qb-gold)" />
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span className="qb-overline" style={{ fontSize: 11 }}>
              {label} · {cur ? cur.s.name : 'Escolher matéria e assunto'}
            </span>
            {cur ? (
              <span style={{ font: '500 15px/1.35 var(--font-body)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="qb-picker__code">{cur.s.short} {cur.t.num}</span>
                <span style={cur.t.title ? undefined : { fontStyle: 'italic', color: 'var(--text-muted)', fontWeight: 400 }}>
                  {cur.t.title || emptyTitle}
                </span>
              </span>
            ) : (
              <span style={{ font: '400 15px/1.35 var(--font-body)', color: 'var(--text-muted)' }}>
                {value ? 'Identificador não encontrado: ' + value : 'Selecionar matéria › assunto'}
              </span>
            )}
          </span>
          <Icon name="chevron-down" size={18} color="var(--text-muted)" />
        </button>
        {cur && (
          <button
            type="button"
            className="qb-btn qb-btn--secondary qb-btn--sm"
            onClick={() => show(false)}
            title={'Ver todos os assuntos de ' + cur.s.name}
            style={{ height: 'auto', minHeight: 52, padding: '0 14px', flexShrink: 0 }}
          >
            <Icon name={cur.s.icon || 'book-open'} size={16} color="var(--qb-gold)" />
            <span>{cur.s.short}</span>
          </button>
        )}
      </div>

      {open && (
        <div className="qb-picker__scrim" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
          <div role="dialog" aria-modal="true" aria-label={'Selecionar ' + label.toLowerCase()} className="qb-picker" onKeyDown={onKey}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 10px 16px', borderBottom: '1px solid var(--divider)' }}>
              <Icon name="search" size={18} color="var(--text-muted)" />
              <input
                ref={input}
                role="combobox"
                aria-expanded="true"
                aria-controls={uid + '-list'}
                aria-activedescendant={flat.length ? uid + '-' + active : undefined}
                aria-autocomplete="list"
                aria-label={placeholder}
                value={q}
                onChange={e => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                placeholder={activeSubj ? `Buscar em ${activeSubj.name} ou digite para buscar em todas...` : placeholder}
                autoComplete="off"
                spellCheck="false"
                style={{ flex: 1, minWidth: 0, height: 44, border: 0, outline: 'none', background: 'transparent', color: 'var(--qb-ivory)', font: '400 16px/1.4 var(--font-body)' }}
              />
              <button ref={closeBtn} type="button" className="qb-iconbtn" aria-label="Fechar seletor" onClick={close}>
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Breadcrumb navigation: Matérias -> Assuntos da matéria */}
            {!isSearching && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--divider)', background: 'var(--surface-sunken)', flexWrap: 'wrap' }}>
                <nav aria-label="Nível de seleção" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="qb-tool"
                    aria-current={!activeSubj ? 'step' : undefined}
                    onClick={backToSubjects}
                  >
                    <Icon name="grid-3x3" size={13} />
                    1. Matérias ({subjects.length})
                  </button>
                  {activeSubj ? (
                    <>
                      <Icon name="chevron-right" size={14} color="var(--text-muted)" />
                      <span className="qb-tool" aria-current="step" style={{ cursor: 'default' }}>
                        <Icon name={activeSubj.icon || 'book-open'} size={13} />
                        2. {activeSubj.short} · {activeSubj.name} ({activeSubj.topics.length})
                      </span>
                    </>
                  ) : (
                    cur && (
                      <>
                        <Icon name="chevron-right" size={14} color="var(--text-muted)" />
                        <button
                          type="button"
                          className="qb-tool"
                          onClick={() => enterSubject(cur.s)}
                          title={'Ir direto para os assuntos de ' + cur.s.name}
                        >
                          Ir para {cur.s.short} ({cur.s.topics.length} assuntos)
                        </button>
                      </>
                    )
                  )}
                </nav>
                {activeSubj && (
                  <button type="button" className="qb-linkbtn" onClick={backToSubjects} style={{ fontSize: 13 }}>
                    <Icon name="arrow-left" size={14} />
                    Trocar matéria
                  </button>
                )}
              </div>
            )}

            <div ref={list} id={uid + '-list'} role="listbox" aria-label={activeSubj ? 'Assuntos de ' + activeSubj.name : 'Matérias do edital'} className="qb-picker__list">
              {!isSearching && !activeSubj ? (
                <>
                  <div role="group" aria-label="Matérias">
                    <div className="qb-picker__group" style={{ position: 'static' }}>
                      <Icon name="book-open" size={14} />
                      <span style={{ flex: 1 }}>Escolha a matéria para ver os assuntos</span>
                      <span style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 0 }}>
                        {subjects.length} matérias
                      </span>
                    </div>
                    {subjectRows.map(row => {
                      i++;
                      const n = i;
                      const isCurrentSubj = cur?.s?.id === row.s.id;
                      const mapLabel = row.mapCount
                        ? `${row.mapCount} ${row.mapCount > 1 ? countLabel[1] : countLabel[0]}`
                        : null;
                      return (
                        <div
                          key={row.s.id}
                          id={uid + '-' + n}
                          role="option"
                          aria-selected={isCurrentSubj}
                          data-active={n === active}
                          data-subject-id={row.s.id}
                          className="qb-picker__opt"
                          onMouseMove={() => n !== active && setActive(n)}
                          onClick={() => enterSubject(row.s)}
                        >
                          <span className="qb-picker__code" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icon name={row.s.icon || 'book-open'} size={15} color="var(--qb-gold)" />
                            {row.s.short}
                          </span>
                          <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 500, color: 'var(--qb-ivory)' }}>{row.s.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {row.s.block ? row.s.block + ' · ' : ''}{row.topicCount} {row.topicCount === 1 ? 'assunto' : 'assuntos'}
                            </span>
                          </span>
                          <span style={{ font: '500 12px/1.7 var(--font-mono)', color: mapLabel ? 'var(--qb-gold)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {mapLabel || `${row.topicCount} assuntos`}
                          </span>
                          <span style={{ display: 'flex', paddingTop: 2 }}>
                            <Icon name="chevron-right" size={16} color="var(--text-muted)" />
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {shortcutItems.map(sec => (
                    <div key={sec.key} role="group" aria-label={sec.label}>
                      <div className="qb-picker__group" style={{ position: 'static', marginTop: 8 }}>
                        <Icon name={sec.icon} size={14} />
                        <span style={{ flex: 1, minWidth: 0 }}>{sec.label}</span>
                        <span style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 0 }}>
                          {sec.items.length}
                        </span>
                      </div>
                      {sec.items.map(it => {
                        i++;
                        const n = i,
                          on = it.t.id === value,
                          c = count(it.t.id);
                        return (
                          <div
                            key={sec.key + it.t.id}
                            id={uid + '-' + n}
                            role="option"
                            aria-selected={on}
                            data-active={n === active}
                            data-topic-id={it.t.id}
                            className="qb-picker__opt"
                            onMouseMove={() => n !== active && setActive(n)}
                            onClick={() => choose(it)}
                          >
                            <span className="qb-picker__code">{it.s.short} {it.t.num}</span>
                            <span style={it.t.title ? { minWidth: 0 } : { minWidth: 0, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                              {it.t.title || emptyTitle}
                            </span>
                            <span style={{ font: '500 12px/1.7 var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{c}</span>
                            <span style={{ display: 'flex', paddingTop: 2 }}>{on && <Icon name="check" size={16} color="var(--qb-gold-bright)" />}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              ) : (
                sections.map(sec => (
                  <div key={sec.key} role="group" aria-label={sec.label}>
                    <div className="qb-picker__group" style={{ position: 'static' }}>
                      <Icon name={sec.icon} size={14} />
                      <span style={{ flex: 1, minWidth: 0 }}>{sec.label}</span>
                      <span style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 0 }}>
                        {sec.meta ? sec.meta + ' · ' : ''}
                        {sec.total && sec.items.length !== sec.total ? sec.items.length + ' de ' + sec.total : sec.items.length + ' assuntos'}
                      </span>
                    </div>
                    {sec.items.map(it => {
                      i++;
                      const n = i,
                        on = it.t.id === value,
                        c = count(it.t.id);
                      return (
                        <div
                          key={sec.key + it.t.id}
                          id={uid + '-' + n}
                          role="option"
                          aria-selected={on}
                          data-active={n === active}
                          data-topic-id={it.t.id}
                          className="qb-picker__opt"
                          onMouseMove={() => n !== active && setActive(n)}
                          onClick={() => choose(it)}
                        >
                          <span className="qb-picker__code">{isSearching ? it.s.short + ' ' : ''}{it.t.num}</span>
                          <span style={it.t.title ? { minWidth: 0 } : { minWidth: 0, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                            {it.t.title || emptyTitle}
                          </span>
                          <span style={{ font: '500 12px/1.7 var(--font-mono)', color: c ? 'var(--qb-gold)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {c || ''}
                          </span>
                          <span style={{ display: 'flex', paddingTop: 2 }}>{on && <Icon name="check" size={16} color="var(--qb-gold-bright)" />}</span>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              {!flat.length && (
                <div style={{ padding: '28px 16px', textAlign: 'center', font: '400 15px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
                  Nenhum assunto corresponde a “{q}”.
                  <br />
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Tente o código (ex.: 10.6) ou parte do nome da matéria.</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '8px 16px', borderTop: '1px solid var(--divider)', font: '400 12px/1.4 var(--font-mono)', color: 'var(--text-muted)' }}>
              <span>
                ↑ ↓ percorrer · Enter {activeSubj || isSearching ? 'selecionar assunto' : 'abrir matéria'} · Esc {activeSubj && !isSearching ? 'voltar às matérias' : 'fechar'}
              </span>
              <span aria-live="polite">
                {!isSearching && !activeSubj
                  ? `${subjects.length} matérias`
                  : `${flat.length} ${flat.length === 1 ? 'assunto' : 'assuntos'}`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export { StudyTopicPicker };