import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Icon } from '@/components/qb/core/Icon';
import { ChatMarkdown } from '@/components/qb/tutor/ChatMarkdown';
import { Button } from '@/components/qb/core/Button';
import { SelectField } from '@/components/qb/data/SelectField';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { ConfirmDialog } from '@/components/qb/feedback/ConfirmDialog';
import { askArchitectTutor, getArchitectProviderStatus } from '@/lib/server-fns';

const MODES = [['socratico', 'Socrático'], ['feynman', 'Feynman'], ['banca', 'Banca CEBRASPE'], ['oral', 'Arguição oral']];
const QUICK = [['retencao', 'target', 'Testar retenção'], ['armadilhas', 'triangle-alert', 'Armadilhas da banca'], ['analogia', 'lightbulb', 'Analogia Feynman'], ['voz', 'mic', 'Arguição por voz']];

const QUICK_PROMPTS = {
  retencao: 'Quero testar minha retenção ativa sobre este tópico sem consultar o material.',
  armadilhas: 'Quais são as principais armadilhas e pegadinhas da banca CEBRASPE sobre este tópico?',
  analogia: 'Me explique este tópico usando uma analogia estilo Feynman e aponte onde a analogia tem limite técnico.',
};

export default function SocraticChat({ subjects = [], subjectId, topicId, onContextChange, origin, style }) {
  const askTutor = useServerFn(askArchitectTutor);
  const getProviderStatus = useServerFn(getArchitectProviderStatus);
  const statusFnRef = React.useRef(getProviderStatus);
  const subj = subjects.find(s => s.id === subjectId) || subjects[0];
  const topic = subj && (subj.topics.find(t => t.id === topicId) || subj.topics[0]);
  const key = topic ? topic.id : 'none';
  const tLabel = topic ? (topic.num + ' · ' + (topic.title || 'Tópico ' + topic.num)) : 'Tópico geral';
  const [hist, setHist] = React.useState({});
  const [mode, setMode] = React.useState('socratico');
  const [provider, setProvider] = React.useState('gemini');
  const [integrationStatus, setIntegrationStatus] = React.useState(null);
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [voiceNotice, setVoiceNotice] = React.useState(null);
  const [ask, setAsk] = React.useState(false);
  const listRef = React.useRef(null);
  const recRef = React.useRef(null);
  const msgs = hist[key] || [];

  React.useEffect(() => {
    let mounted = true;
    statusFnRef.current().then(status => { if (mounted) setIntegrationStatus(status); })
      .catch(() => { if (mounted) setIntegrationStatus({ checkError: true }); });
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs.length, busy]);

  const push = m => setHist(h => ({ ...h, [key]: [...(h[key] || []), m] }));

  const answer = async (kind, userText) => {
    const cleanText = (userText || '').trim();
    if (!cleanText || busy) return;
    const priorHistory = (hist[key] || [])
      .filter(m => m.role === 'user' || m.role === 'tutor')
      .slice(-10)
      .map(m => ({ role: m.role, text: m.text }));

    push({ role: 'user', text: cleanText });
    setBusy(true);
    try {
      const res = await askTutor({
        data: {
          mode: kind,
          subjectName: subj ? subj.name : 'Câmara dos Deputados',
          topicLabel: tLabel,
          userMessage: cleanText,
          provider,
          history: priorHistory,
        },
      });
      const modeBadge = MODES.find(x => x[0] === kind)?.[0] || mode;
      push({ role: 'tutor', mode: modeBadge, provider, text: res?.reply || 'Não foi possível obter resposta.' });
    } catch (err) {
      push({
        role: 'error',
        text: err?.message || 'Não foi possível gerar a resposta da IA agora.',
        retryKind: kind,
        retryText: cleanText,
      });
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    const t = text.trim();
    if (!t || busy) return;
    setText('');
    answer(mode, t);
  };

  const toggleVoiceInput = () => {
    setMode('oral');
    const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRec) {
      setVoiceNotice('Seu navegador não suporta ditado por voz direto. O modo Arguição Oral foi ativado para você responder por texto ou iniciar uma pergunta de banca.');
      if (!msgs.length && !busy) {
        answer('oral', 'Inicie uma arguição oral sobre este tópico com uma questão direta de banca.');
      }
      return;
    }
    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.lang = 'pt-BR';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => {
        setListening(true);
        setVoiceNotice('Microfone ativo: fale sua resposta ou dúvida em português…');
      };
      rec.onresult = e => {
        const transcript = e.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setText(prev => (prev ? prev + ' ' + transcript : transcript));
          setVoiceNotice('Fala transcrita no campo abaixo. Revise e clique em Enviar.');
        }
      };
      rec.onerror = () => {
        setListening(false);
        setVoiceNotice('Não foi possível capturar o áudio do microfone. Você pode digitar sua arguição oral abaixo.');
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
    } catch {
      setVoiceNotice('Microfone indisponível neste dispositivo. Use o modo Arguição Oral por texto.');
    }
  };

  const quick = k => {
    if (k === 'voz') {
      toggleVoiceInput();
      return;
    }
    answer(k, QUICK_PROMPTS[k] || QUICK.find(q => q[0] === k)?.[2] || k);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, ...style }}>
      <div className="qb-panel qb-panel--sunken" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, alignItems: 'end' }}>
          <SelectField label="Matéria do concurso" value={subj ? subj.id : ''} onChange={v => { const s = subjects.find(x => x.id === v); onContextChange && onContextChange(v, s.topics[0].id); }} options={subjects.map(s => ({ value: s.id, label: s.name }))} />
          <SelectField label="Assunto / tópico do edital" value={topic ? topic.id : ''} onChange={v => onContextChange && onContextChange(subj.id, v)} options={subj ? subj.topics.map(t => ({ value: t.id, label: t.num + ' · ' + (t.title || 'Tópico ' + t.num) })) : []} />
          <Button variant="secondary" size="sm" icon="trash-2" disabled={!msgs.length} onClick={() => setAsk(true)} style={{ height: 44 }}>Limpar histórico</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="qb-overline">Provedor</span>
          <div className="qb-seg" role="group" aria-label="Provedor de IA do Arquiteto" style={{ flexWrap: 'wrap' }}>
            <button className="qb-seg__opt" aria-pressed={provider === 'gemini'} onClick={() => setProvider('gemini')} disabled={busy}>Gemini · API externa</button>
            <button className="qb-seg__opt" aria-pressed={provider === 'base44'} onClick={() => setProvider('base44')} disabled={busy}>Base44 · créditos</button>
          </div>
          <span role="status" style={{ font: '400 12px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>
            {integrationStatus === null ? 'Verificando chave externa…' : integrationStatus.checkError ? 'Não foi possível verificar a chave' : integrationStatus.geminiConfigured ? 'Gemini: chave detectada' : 'Gemini: chave não detectada neste aplicativo'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="qb-overline">Modo</span>
          <div className="qb-seg" role="group" aria-label="Modo pedagógico" style={{ flexWrap: 'wrap' }}>{MODES.map(([v, l]) => <button key={v} className="qb-seg__opt" aria-pressed={mode === v} onClick={() => setMode(v)}>{l}</button>)}</div>
          <span style={{ font: '400 12px/1.3 var(--font-body)', color: 'var(--text-muted)' }}>Histórico separado por tópico{origin ? ' · aberto a partir de ' + origin : ''}</span>
        </div>
      </div>
      <div ref={listRef} role="log" aria-live="polite" aria-label="Conversa" style={{ flex: 1, minHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: 4 }}>
        {!msgs.length && !busy && <EmptyState icon="message-circle" title={'Nenhuma conversa em ' + (topic ? topic.num : 'este tópico')} description="Escolha um modo pedagógico e escreva sua dúvida para a IA, ou acione uma ferramenta rápida abaixo." />}
        {msgs.map((m, i) => m.role === 'user'
          ? <div key={i} className="qb-arch-msg" style={{ alignSelf: 'flex-end', background: 'var(--qb-navy-hover)', border: '1px solid rgba(208,179,134,.5)', color: 'var(--text-primary)', borderBottomRightRadius: 4, whiteSpace: 'pre-wrap' }}>{m.text}</div>
          : m.role === 'error'
            ? <div key={i} role="alert" className="qb-arch-msg" style={{ alignSelf: 'flex-start', border: '1px solid rgba(238,138,124,.55)', background: 'rgba(238,138,124,.08)', color: 'var(--text-primary)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><Icon name="circle-x" size={16} color="var(--state-incorrect)" />{m.text}<Button size="sm" variant="ghost" icon="rotate-ccw" onClick={() => answer(m.retryKind || mode, m.retryText)}>Tentar novamente</Button></div>
            : <div key={i} className="qb-arch-msg" style={{ alignSelf: 'flex-start', background: 'var(--surface)', border: 'var(--border-hairline)', color: 'var(--text-secondary)', borderBottomLeftRadius: 4 }}>
                <p style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--qb-gold)' }}>O Arquiteto · {(MODES.find(x => x[0] === m.mode) || MODES[0])[1]} · {m.provider === 'gemini' ? 'Gemini' : 'Base44'}</p><ChatMarkdown text={m.text} />
              </div>)}
        {busy && <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 13px/1 var(--font-body)', color: 'var(--text-muted)' }}><Icon name="loader-circle" size={16} className="qb-spin" />O Arquiteto está elaborando com IA…</div>}
      </div>
      {voiceNotice && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: '1px dashed rgba(208,179,134,.5)', font: '400 13px/1.4 var(--font-body)', color: 'var(--text-secondary)' }}>
          <Icon name={listening ? 'mic' : 'info'} size={16} color="var(--qb-gold)" />
          <span>{voiceNotice}</span>
          <button className="qb-iconbtn qb-iconbtn--sm" style={{ marginLeft: 'auto' }} aria-label="Fechar aviso" onClick={() => setVoiceNotice(null)}><Icon name="x" size={14} /></button>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {QUICK.map(([k, ic, l]) => (
          <button key={k} className="qb-chip" onClick={() => quick(k)} disabled={busy} style={k === 'voz' && listening ? { borderColor: 'var(--qb-gold-bright)', color: 'var(--qb-gold-bright)' } : undefined}>
            <Icon name={ic} size={14} />
            {k === 'voz' && listening ? 'Ouvindo… (clique para parar)' : l}
          </button>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); send(); }} style={{ display: 'flex', gap: 8 }}>
        <input className="qb-input" value={text} onChange={e => setText(e.target.value)} placeholder={'Responda ou tire sua dúvida sobre ' + (topic ? (topic.title || topic.num) : 'o tópico') + '…'} aria-label="Mensagem ao Arquiteto" />
        <Button type="submit" icon="send" loading={busy} disabled={!text.trim() || busy}>Enviar</Button>
      </form>
      <ConfirmDialog open={ask} tone="danger" title="Limpar o histórico deste tópico?" description={'Remove as ' + msgs.length + ' mensagens de ' + tLabel + '. Conversas de outros tópicos são mantidas.'} confirmLabel="Limpar histórico" onCancel={() => setAsk(false)} onConfirm={() => { setHist(h => ({ ...h, [key]: [] })); setAsk(false); }} />
    </div>
  );
}
export { SocraticChat };