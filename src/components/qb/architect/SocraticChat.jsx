import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Icon } from '@/components/qb/core/Icon';
import { ChatMarkdown } from '@/components/qb/tutor/ChatMarkdown';
import { Button } from '@/components/qb/core/Button';
import StudyTopicPicker from '@/components/qb/study/StudyTopicPicker';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { ConfirmDialog } from '@/components/qb/feedback/ConfirmDialog';
import { askArchitectTutor, getArchitectProviderStatus, getArchitectModelTelemetry } from '@/lib/server-fns';
import { DEFAULT_TUTOR_MODE, EMPTY_TUTOR_HISTORY, tutorHistory } from '@/lib/tutor-history';

const MODES = [['socratico', 'Socrático'], ['feynman', 'Feynman'], ['banca', 'Banca CEBRASPE'], ['oral', 'Arguição oral']];
const MODEL_OPTIONS = [
  ['auto', 'Automático', 'Escolhe o modelo conforme a complexidade da tarefa'],
  ['flash', 'Flash', 'Prioriza qualidade para raciocínio e correção'],
  ['lite', 'Flash-Lite', 'Prioriza eficiência em tarefas simples'],
];
const modelAvailability = routing => {
  if (!routing) return '';
  if (routing.check === 'error') return ' · não foi possível listar os modelos';
  if (routing.check !== 'ok') return '';
  return ' · ' + routing.models.map(m => m.label + (m.available ? ' disponível' : ' indisponível')).join(' · ');
};
const QUICK = [['retencao', 'target', 'Testar retenção'], ['armadilhas', 'triangle-alert', 'Armadilhas da banca'], ['analogia', 'lightbulb', 'Analogia Feynman'], ['voz', 'mic', 'Arguição por voz']];

const QUICK_PROMPTS = {
  retencao: 'Quero testar minha retenção ativa sobre este tópico sem consultar o material.',
  armadilhas: 'Quais são as principais armadilhas e pegadinhas da banca CEBRASPE sobre este tópico?',
  analogia: 'Me explique este tópico usando uma analogia estilo Feynman e aponte onde a analogia tem limite técnico.',
};

export default function SocraticChat({ accountId, subjects = [], subjectId, topicId, onContextChange, origin, compact = false, personal = false, style }) {
  const askTutor = useServerFn(askArchitectTutor);
  const getProviderStatus = useServerFn(getArchitectProviderStatus);
  const getTelemetry = useServerFn(getArchitectModelTelemetry);
  const statusFnRef = React.useRef(getProviderStatus);
  const subj = subjects.find(s => s.id === subjectId) || subjects[0];
  const topic = subj && (subj.topics.find(t => t.id === topicId) || subj.topics[0]);
  const key = topic ? topic.id : 'none';
  const modeLabel = (kind, label) => personal && kind === 'banca' ? 'Questão de banca' : label;
  const tLabel = topic ? (topic.num + ' · ' + (topic.title || 'Tópico ' + topic.num)) : 'Tópico geral';
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const subjectKey = subj?.id ?? null;
  const [provider, setProvider] = React.useState('base44');
  const [modelPreference, setModelPreference] = React.useState('auto');
  const [telemetry, setTelemetry] = React.useState(null);
  const [integrationStatus, setIntegrationStatus] = React.useState(null);
  const [text, setText] = React.useState('');
  const [listening, setListening] = React.useState(false);
  const [voiceNotice, setVoiceNotice] = React.useState(null);
  const [ask, setAsk] = React.useState(false);
  const listRef = React.useRef(null);
  const recRef = React.useRef(null);
  const msgs = React.useSyncExternalStore(tutorHistory.subscribe, () => tutorHistory.read(accountId, key), () => EMPTY_TUTOR_HISTORY);
  const busy = React.useSyncExternalStore(tutorHistory.subscribe, () => tutorHistory.isPending(accountId, key), () => false);
  const mode = React.useSyncExternalStore(tutorHistory.subscribe, () => tutorHistory.mode(accountId, subjectKey, key), () => DEFAULT_TUTOR_MODE);
  const setMode = value => tutorHistory.setMode(accountId, subjectKey, key, value);

  React.useEffect(() => {
    if (personal) return;
    let mounted = true;
    statusFnRef.current().then(status => { if (mounted) setIntegrationStatus(status); })
      .catch(() => { if (mounted) setIntegrationStatus({ checkError: true }); });
    return () => { mounted = false; };
  }, [personal]);

  React.useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [key, msgs.length, busy]);

  const push = message => tutorHistory.append(accountId, key, message);

  const answer = async (kind, userText) => {
    const cleanText = (userText || '').trim();
    if (!cleanText || !tutorHistory.begin(accountId, key)) return;
    if (topic) tutorHistory.rememberTopic(accountId, topic.id);
    const priorHistory = tutorHistory.read(accountId, key)
      .filter(m => m.role === 'user' || m.role === 'tutor')
      .slice(-10)
      .map(m => ({ role: m.role, text: m.text.slice(0, 3000) }));

    push({ role: 'user', text: cleanText });
    try {
      const res = await askTutor({
        data: {
          mode: kind,
          subjectName: subj?.name,
          topicLabel: tLabel,
          userMessage: cleanText,
          provider: personal ? "base44" : provider,
          ...(!personal && provider === 'gemini' ? { modelPreference } : {}),
          history: priorHistory,
        },
      });
      const modeBadge = MODES.find(x => x[0] === kind)?.[0] || mode;
      push({
        role: 'tutor', mode: modeBadge, provider: res?.provider || "base44", text: res?.reply || 'Não foi possível obter resposta.',
        ...(res?.model ? { model: res.model } : {}),
        ...(res?.routing?.fallbackFrom ? { fallbackFrom: res.routing.fallbackFrom } : {}),
      });
    } catch (err) {
      push({
        role: 'error',
        text: err?.message || 'Não foi possível gerar a resposta da IA agora.',
        retryKind: kind,
        retryText: cleanText,
      });
    } finally {
      tutorHistory.finish(accountId, key);
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
    const prompt = personal && k === 'armadilhas'
      ? 'Quais armadilhas de prova vale analisar neste tópico do meu projeto de estudo?'
      : QUICK_PROMPTS[k];
    answer(k, prompt || QUICK.find(q => q[0] === k)?.[2] || k);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 14, minHeight: 0, ...style }}>
      {compact && <button type="button" className="qb-chip" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(value => !value)} style={{ alignSelf: 'flex-start' }}><Icon name={settingsOpen ? 'chevron-up' : 'chevron-down'} size={14} />Configurar conversa</button>}
      <div className="qb-panel qb-panel--sunken" style={{ padding: 14, display: compact && !settingsOpen ? 'none' : 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
          <div style={{ flex: '1 1 410px', minWidth: 0, pointerEvents: busy ? 'none' : undefined }} aria-busy={busy}>
            <StudyTopicPicker
              label="Matéria e assunto do tutor"
              subjects={subjects}
              value={topic?.id || null}
              placeholder="Pesquisar matéria, código ou assunto do edital…"
              onSelect={selection => {
                tutorHistory.rememberTopic(accountId, selection.topicId);
                onContextChange?.(selection.subjectId, selection.topicId);
              }}
            />
          </div>
          <Button variant="secondary" size="sm" icon="trash-2" disabled={!msgs.length || busy} onClick={() => setAsk(true)} style={{ minHeight: 52 }}>Limpar histórico</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="qb-overline">Provedor</span>
          {personal ? <span>Base44 · créditos</span> : <div className="qb-seg" role="group" aria-label="Provedor de IA do Arquiteto" style={{ flexWrap: 'wrap' }}>
            <button className="qb-seg__opt" aria-pressed={provider === 'gemini'} onClick={() => setProvider('gemini')} disabled={busy}>Gemini · API externa</button>
            <button className="qb-seg__opt" aria-pressed={provider === 'base44'} onClick={() => setProvider('base44')} disabled={busy}>Base44 · créditos</button>
          </div>}
          {!personal && <span role="status" style={{ font: '400 12px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>
            {integrationStatus === null ? 'Verificando chave externa…' : integrationStatus.checkError ? 'Não foi possível verificar a chave' : integrationStatus.geminiConfigured ? 'Gemini: chave detectada' + modelAvailability(integrationStatus.routing) : 'Gemini: chave não detectada neste aplicativo'}
          </span>}
        </div>
        {!personal && provider === 'gemini' && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="qb-overline">Modelo</span>
          <div className="qb-seg" role="group" aria-label="Modelo Gemini do Arquiteto" style={{ flexWrap: 'wrap' }}>
            {MODEL_OPTIONS.map(([value, label, hint]) => <button key={value} type="button" className="qb-seg__opt" title={hint} aria-pressed={modelPreference === value} onClick={() => setModelPreference(value)} disabled={busy}>{label}</button>)}
          </div>
          <span style={{ font: '400 12px/1.3 var(--font-body)', color: 'var(--text-muted)' }}>{MODEL_OPTIONS.find(o => o[0] === modelPreference)?.[2]}. Sem troca de chave nem créditos Base44 em caso de falha.</span>
          {integrationStatus?.routing?.notice && <small style={{ flexBasis: '100%', color: 'var(--text-muted)' }}>{integrationStatus.routing.notice}</small>}
          <details style={{ flexBasis: '100%', font: '400 12px/1.4 var(--font-body)', color: 'var(--text-muted)' }}
            onToggle={event => { if (event.currentTarget.open) getTelemetry().then(setTelemetry).catch(() => setTelemetry({ error: true })); }}>
            <summary style={{ cursor: 'pointer' }}>Registros do roteador (esta instância do servidor)</summary>
            {telemetry === null ? 'Carregando…' : telemetry.error ? 'Não foi possível carregar os registros.' : !Object.keys(telemetry.models || {}).length ? 'Nenhuma chamada registrada desde o último reinício.' :
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{Object.entries(telemetry.models).map(([model, s]) => <li key={model}>{model}: {s.requests} chamadas, {s.errors} erros{Object.keys(s.errorsByCode).length ? ' (' + Object.entries(s.errorsByCode).map(([code, n]) => code + ' ' + n).join(', ') + ')' : ''}, média {s.avgDurationMs} ms, tokens {s.inputTokens} entrada / {s.outputTokens} saída</li>)}</ul>}
          </details>
        </div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="qb-overline">Modo</span>
          <div className="qb-seg" role="group" aria-label="Modo pedagógico" style={{ flexWrap: 'wrap' }}>{MODES.map(([v, l]) => <button key={v} className="qb-seg__opt" aria-pressed={mode === v} onClick={() => setMode(v)}>{modeLabel(v, l)}</button>)}</div>
          <span style={{ font: '400 12px/1.3 var(--font-body)', color: 'var(--text-muted)' }}>Histórico separado por tópico{origin ? ' · aberto a partir de ' + origin : ''}</span>
        </div>
      </div>
      <div className="qb-arch-transcript" data-compact={compact} data-expanded="true">
        <div ref={listRef} role="log" aria-live="polite" aria-label="Conversa"
          className="qb-panel qb-panel--sunken qb-arch-transcript__messages">
          {!msgs.length && !busy && <EmptyState icon="message-circle" title={'Nenhuma conversa em ' + (topic ? topic.num : 'este tópico')} description={compact ? "Digite sua dúvida ou escolha uma ação abaixo." : "Escolha um modo pedagógico e escreva sua dúvida para a IA, ou acione uma ferramenta rápida abaixo."} />}
          {msgs.map((m, i) => m.role === 'user'
            ? <div key={i} className="qb-arch-msg" style={{ alignSelf: 'flex-end', background: 'var(--surface)', border: '1px solid rgba(208,179,134,.5)', color: 'var(--text-primary)', borderBottomRightRadius: 4, whiteSpace: 'pre-wrap' }}>{m.text}</div>
            : m.role === 'error'
              ? <div key={i} role="alert" className="qb-arch-msg" style={{ alignSelf: 'flex-start', border: '1px solid rgba(238,138,124,.55)', background: 'rgba(238,138,124,.08)', color: 'var(--text-primary)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><Icon name="circle-x" size={16} color="var(--state-incorrect)" />{m.text}<Button size="sm" variant="ghost" icon="rotate-ccw" onClick={() => answer(m.retryKind || mode, m.retryText)}>Tentar novamente</Button></div>
              : <div key={i} className="qb-arch-msg" style={{ alignSelf: 'flex-start', background: 'var(--surface-sunken)', border: 'var(--border-hairline)', color: 'var(--text-secondary)', borderBottomLeftRadius: 4 }}>
                  <p style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--qb-gold)' }}>O Arquiteto · {modeLabel(m.mode, (MODES.find(x => x[0] === m.mode) || MODES[0])[1])} · {m.provider === 'gemini' ? 'Gemini' + (m.model ? ' · ' + m.model : '') : 'Base44'}</p>{m.fallbackFrom && <small style={{ color: 'var(--text-muted)' }}>{m.fallbackFrom} indisponível nesta chave; resposta gerada por outro modelo autorizado.</small>}<ChatMarkdown text={m.text} />
                </div>)}
          {busy && <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 13px/1 var(--font-body)', color: 'var(--text-muted)' }}><Icon name="loader-circle" size={16} className="qb-spin" />O Arquiteto está elaborando com IA…</div>}
        </div>
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
      {personal && <small style={{ color: 'var(--text-muted)' }}>Ao enviar, a Base44 usa a mensagem, o assunto selecionado e a conversa recente deste tópico.</small>}
      <form className="qb-arch-composer" onSubmit={event => { event.preventDefault(); send(); }}>
        <textarea className="qb-input qb-arch-composer__input" rows={1}
          value={text} maxLength={3000} aria-label="Mensagem ao Arquiteto"
          placeholder={'Responda ou tire sua dúvida sobre ' + (topic ? (topic.title || topic.num) : 'o tópico') + '…'}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            if (event.key !== 'Enter') return;
            event.stopPropagation();
            if (event.nativeEvent.isComposing || event.shiftKey) return;
            event.preventDefault();
            send();
          }} />
        <Button type="submit" icon="send" loading={busy} disabled={!text.trim() || busy}>Enviar</Button>
      </form>
      <ConfirmDialog open={ask} tone="danger" title="Limpar o histórico deste tópico?" description={'Remove as ' + msgs.length + ' mensagens de ' + tLabel + '. Conversas de outros tópicos são mantidas.'} confirmLabel="Limpar histórico" onCancel={() => setAsk(false)} onConfirm={() => { tutorHistory.clear(accountId, key); setAsk(false); }} />
    </div>
  );
}
export { SocraticChat };