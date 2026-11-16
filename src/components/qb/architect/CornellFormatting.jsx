import React from 'react';
import { Bold, Highlighter, IndentDecrease, IndentIncrease, List, ListOrdered, Palette, Strikethrough, Underline } from 'lucide-react';
import { Button } from '@/components/qb/core/Button';
import { CORNELL_FORMATS, CORNELL_HIGHLIGHTS, CORNELL_INK, cornellContentOps, cornellPlainText, readCornellRich, writeCornellRich } from '@/lib/cornell-rich';
import 'react-quill-new/dist/quill.core.css';
import './cornell-formatting.css';

const Selection = React.createContext(null);
const tools = [
  ['Negrito', Bold, 'bold', true],
  ['Sublinhado', Underline, 'underline', true],
  ['Tachado', Strikethrough, 'strike', true],
  ['Lista numerada', ListOrdered, 'list', 'ordered'],
  ['Lista com marcadores', List, 'list', 'bullet'],
  ['Diminuir recuo', IndentDecrease, 'indent', '-1'],
  ['Aumentar recuo', IndentIncrease, 'indent', '+1'],
];

const quillContents = editor => writeCornellRich(editor.getContents());

export function CornellFormatting({ actions, children, disabled }) {
  const active = React.useRef(null);
  const [formats, setFormats] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const toolbarId = React.useId();

  const activate = React.useCallback((editor, range) => {
    active.current = { editor, range };
    setFormats(editor.getFormat(range));
  }, []);
  const release = React.useCallback(editor => {
    if (active.current?.editor === editor) {
      active.current = null;
      setFormats(null);
    }
  }, []);
  const context = React.useMemo(() => ({ activate, release }), [activate, release]);

  const withSelection = action => {
    if (disabled || !active.current) return;
    const { editor, range: lastRange } = active.current;
    if (!editor.isEnabled()) return;
    const range = editor.getSelection() || lastRange;
    editor.focus({ preventScroll: true });
    editor.setSelection(range.index, range.length, 'silent');
    action(editor, range);
    activate(editor, editor.getSelection() || range);
  };

  const format = (name, value) => withSelection((editor, range) => {
    const next = name !== 'indent' && editor.getFormat(range)[name] === value ? false : value;
    editor.format(name, next, 'user');
  });
  const highlight = value => withSelection((editor, range) => {
    const chosen = CORNELL_HIGHLIGHTS.find(tone => tone.value === value);
    const attrs = { background: chosen?.value || false, color: chosen?.ink || false };
    if (range.length) editor.formatText(range.index, range.length, attrs, 'user');
    else for (const [name, attr] of Object.entries(attrs)) editor.format(name, attr, 'user');
  });

  return (
    <Selection.Provider value={context}>
      <div className="qb-cornell-format-header">
        {actions}
        <Button size="sm" variant="ghost" icon={open ? 'chevron-up' : 'chevron-down'}
          aria-expanded={open} aria-controls={open ? toolbarId : undefined} onClick={() => setOpen(value => !value)}>
          Formatação
        </Button>
      </div>
      {open && <div id={toolbarId} className="qb-cornell-format" role="group" aria-label="Formatação do Cornell">
        {tools.map(([label, Glyph, name, value]) => (
          <Button key={label} size="sm" variant={formats?.[name] === value ? 'secondary' : 'ghost'} aria-label={label}
            title={label} aria-pressed={name === 'indent' ? undefined : formats?.[name] === value}
            disabled={disabled || !formats} onClick={() => format(name, value)} onMouseDown={event => event.preventDefault()}>
            <Glyph size={16} aria-hidden="true" />
          </Button>
        ))}
        <label><Highlighter size={16} aria-hidden="true" />
          <select className="qb-select" aria-label="Marca-texto" value="" disabled={disabled || !formats}
            onChange={event => highlight(event.target.value)}>
            <option value="" disabled>Marca-texto</option>
            {CORNELL_HIGHLIGHTS.map(tone => <option key={tone.value} value={tone.value}>{tone.name}</option>)}
            <option value="none">Sem marca-texto</option>
          </select>
        </label>
        <label><Palette size={16} aria-hidden="true" />
          <select className="qb-select" aria-label="Cor do texto" value="" disabled={disabled || !formats}
            onChange={event => withSelection(editor => editor.format('color', event.target.value === 'none' ? false : event.target.value, 'user'))}>
            <option value="" disabled>Cor do texto</option>
            {CORNELL_INK.map(tone => <option key={tone.value} value={tone.value}>{tone.name}</option>)}
            <option value="none">Cor padrão</option>
          </select>
        </label>
        {!formats && <small>Selecione um campo do caderno para formatar.</small>}
      </div>}
      {children}
    </Selection.Provider>
  );
}

export function CornellRichEditor({ value, onChange, label, placeholder, disabled, height, id, viewRef }) {
  const { activate, release } = React.useContext(Selection);
  const host = React.useRef(null);
  const editor = React.useRef(null);
  const rememberedView = React.useRef(null);
  const latest = React.useRef(null);
  latest.current = { value, onChange, disabled, label };
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useImperativeHandle(viewRef, () => ({
    focused: () => editor.current?.hasFocus(),
    remember: () => {
      const quill = editor.current;
      if (quill) rememberedView.current = { top: quill.root.scrollTop, range: quill.hasFocus() ? quill.getSelection() : null };
    },
  }), []);

  React.useLayoutEffect(() => {
    const quill = editor.current;
    const view = rememberedView.current;
    rememberedView.current = null;
    if (!quill || !view) return;
    if (view.range && quill.isEnabled()) {
      quill.focus({ preventScroll: true });
      quill.setSelection(view.range.index, view.range.length, 'silent');
    }
    quill.root.scrollTop = view.top;
  }, [height]);

  React.useEffect(() => {
    let mounted = true;
    const element = host.current;
    let cleanup;
    import('react-quill-new').then(({ default: ReactQuill }) => {
      if (!mounted) return;
      const quill = new ReactQuill.Quill(element, {
        formats: CORNELL_FORMATS,
        modules: { toolbar: false, history: { userOnly: true } },
        placeholder,
      });
      editor.current = quill;
      quill.root.setAttribute('role', 'textbox');
      quill.root.setAttribute('aria-multiline', 'true');
      quill.root.setAttribute('aria-label', latest.current.label);
      quill.clipboard.addMatcher(Node.ELEMENT_NODE, (_, delta) => {
        delta.ops = cornellContentOps(delta.ops);
        return delta;
      });
      quill.setContents(readCornellRich(latest.current.value), 'silent');
      quill.enable(!latest.current.disabled);
      const selection = range => {
        if (range) activate(quill, range);
      };
      const change = (_delta, _previous, source) => {
        if (source === 'user') latest.current.onChange(quillContents(quill));
      };
      quill.on('selection-change', selection);
      quill.on('text-change', change);
      cleanup = () => {
        quill.off('selection-change', selection);
        quill.off('text-change', change);
        release(quill);
        editor.current = null;
        element.replaceChildren();
      };
      setReady(true);
    }).catch(() => { if (mounted) setFailed(true); });
    return () => { mounted = false; cleanup?.(); };
  }, [activate, release, placeholder]);

  React.useEffect(() => {
    const quill = editor.current;
    if (!quill) return;
    quill.root.setAttribute('aria-label', label);
    quill.enable(!disabled);
    if (quillContents(quill) !== value) quill.setContents(readCornellRich(value), 'silent');
  }, [disabled, label, value]);

  return (
    <div id={id} style={{ minWidth: 0 }}>
      <div className="qb-textarea qb-cornell-editor" ref={host} hidden={!ready} style={{ height, minHeight: height }} />
      {!ready && <textarea className="qb-textarea" style={{ height, minHeight: height }} aria-label={label}
        value={cornellPlainText(value)} readOnly disabled={disabled} placeholder={placeholder} />}
      {failed && <p role="alert">O editor de formatação não carregou. Reabra o Cornell para tentar novamente.</p>}
    </div>
  );
}
