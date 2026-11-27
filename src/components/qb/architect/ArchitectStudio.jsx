import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { canOpenAccountPilot } from '@/lib/account-pilot-access';

const AccountPilot = React.lazy(() => import('./AccountPilot'));
import { Icon } from '@/components/qb/core/Icon';
import { Tabs } from '@/components/qb/navigation/Tabs';
import { SocraticChat } from '@/components/qb/architect/SocraticChat';
import { FeynmanLab } from '@/components/qb/architect/FeynmanLab';
import { CornellNotebook } from '@/components/qb/architect/CornellNotebook';
import StudyClock from '@/components/qb/study/StudyClock';
import { useStudyActivity } from '@/lib/StudyClockContext';
import { useAuth } from '@/lib/AuthContext';
import { tutorHistory } from '@/lib/tutor-history';

const TOOLS = [
  { id: 'socratico', label: 'Tutor Socrático', icon: 'message-circle' },
  { id: 'feynman', label: 'Laboratório Feynman', icon: 'lightbulb' },
  { id: 'cornell', label: 'Caderno Cornell', icon: 'notebook-pen' },
  { id: 'study-clock', label: 'Sessão de estudo', icon: 'timer' },
];

const COMPACT_TOOLS = [
  { ...TOOLS[0], label: 'Perguntar' },
  { ...TOOLS[1], label: 'Feynman' },
  { ...TOOLS[2], label: 'Cornell' },
  { ...TOOLS[3], label: 'Sessão' },
];

export default function ArchitectStudio({ open = true, mode = 'modal', onClose, onExpand, subjects = [], context = {}, onContextChange, tool: toolProp, onToolChange, clockOnly = false, personal = false, style }) {
  const dock = mode === 'dock';
  const modal = mode === 'modal';
  const headingRef = React.useRef(null);
  const { user } = useAuth();
  const accountId = user?.id;
  const [rememberedTopic, setRememberedTopic] = React.useState(null);
  React.useEffect(() => {
    if (open && accountId && !context.topicId && !context.subjectId) setRememberedTopic(tutorHistory.lastTopic(accountId));
  }, [open, accountId, context.topicId, context.subjectId]);

  React.useEffect(() => {
    if (open && mode !== 'inline') headingRef.current?.focus({ preventScroll: true });
  }, [open, mode]);

  const [toolState, setToolState] = React.useState(toolProp || 'socratico');
  const access = useQuery({
    queryKey: ['account-pilot-access', accountId],
    queryFn: () => canOpenAccountPilot(),
    enabled: open && user?.role === 'admin' && !clockOnly,
    retry: false,
    staleTime: 60_000,
  });
  const baseTools = dock ? COMPACT_TOOLS : TOOLS;
  const pilotAllowed = user?.role === 'admin' && access.data === true;
  const available = pilotAllowed ? [...baseTools.slice(0, -1), { id: 'visual-lab', label: 'Laboratório Visual', icon: 'network' }, baseTools.at(-1)] : baseTools;
  const tools = personal ? available.filter(item => item.id !== 'cornell') : available;
  const requestedTool = toolProp || toolState;
  const tool = clockOnly ? 'study-clock' : tools.some(item => item.id === requestedTool) ? requestedTool : 'socratico';
  useStudyActivity('tutor', open && !['study-clock','visual-lab'].includes(tool) ? mode : null);
  const setTool = t => { setToolState(t); onToolChange && onToolChange(t); };
  React.useEffect(() => {
    if (!open || mode === 'inline') return;
    const k = e => { if (e.key === 'Escape' && !document.querySelector('[role=alertdialog]')) onClose && onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, mode, onClose]);
  if (!open) return null;
  const topicPreference = context.topicId || (!context.subjectId && (rememberedTopic || (!personal && 'da-10-6')));
  const subj = subjects.find(s => s.id === context.subjectId) ||
    subjects.find(s => s.topics.some(t => t.id === topicPreference)) || (!personal && subjects.find(s => s.id === 'da')) || subjects[0];
  const topic = subj?.topics.find(t => t.id === topicPreference) || subj?.topics[0];
  const tLabel = topic ? (subj.short || subj.name) + ' ' + topic.num + (topic.title ? ' · ' + topic.title : '') : 'o tópico';
  const changeTopic = ({ subjectId, topicId }) => {
    tutorHistory.rememberTopic(accountId, topicId);
    onContextChange?.({ ...context, subjectId, topicId, nodeId: topicId === topic?.id ? context.nodeId : undefined });
  };
  const panel = (
    <div data-qb-architect role={modal ? 'dialog' : 'region'} aria-modal={modal || undefined} aria-label={clockOnly ? 'Sessão de estudo' : dock ? 'O Arquiteto — chat lateral' : 'O Arquiteto — estúdio de aprendizagem ativa'} className="qb-panel qb-panel--ornate"
      style={{ position: 'relative', width: '100%', height: '100%', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', ...style }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: dock ? 8 : 12, padding: dock ? 12 : '14px 16px 14px 20px', borderBottom: '1px solid var(--divider)', flexWrap: 'wrap' }}>
        {!clockOnly && <Icon name="astrolabe" size={24} color="var(--qb-gold)" />}
        {!dock && !clockOnly && <span className="qb-badge qb-badge--gold" style={{ letterSpacing: '.12em', fontWeight: 600 }}>O ARQUITETO</span>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: dock ? 0 : 220 }}>
          <span ref={headingRef} tabIndex={mode === 'inline' ? undefined : -1} style={{ font: '400 20px/1.2 var(--font-heading)', color: 'var(--text-primary)' }}>{clockOnly ? 'Sessão de estudo' : dock ? 'O Arquiteto' : 'Estúdio de aprendizagem ativa'}</span>
          {!dock && !clockOnly && <span style={{ font: '400 12px/1.3 var(--font-body)', color: 'var(--text-muted)' }}>{context.origin ? 'Aberto a partir de ' + context.origin + ' · ' : ''}Contexto: {tLabel}</span>}
        </div>
        {dock && onExpand && <button type="button" className="qb-btn qb-btn--secondary qb-btn--sm" onClick={onExpand}><Icon name="maximize" size={14} />Abrir estúdio completo</button>}
        {!dock && !clockOnly && <span className="qb-badge qb-badge--gold" title={personal ? 'Tutoria socrática e avaliação Feynman com Base44' : 'Tutoria socrática, avaliação Feynman, pistas Cornell'}><Icon name="sparkles" size={13} />IA Ativa</span>}
        {onClose && (dock
          ? <button type="button" className="qb-iconbtn" aria-label="Fechar chat do Arquiteto" onClick={onClose}><Icon name="x" size={16} /></button>
          : <button type="button" className="qb-btn qb-btn--secondary qb-btn--sm" onClick={onClose}><Icon name="x" size={16} />Fechar{modal ? ' (Esc)' : ''}</button>)}
        {dock && !clockOnly && <span title={tLabel} style={{ flexBasis: '100%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: '400 12px/1.3 var(--font-body)', color: 'var(--text-muted)' }}>Contexto: {tLabel}</span>}
      </header>
      {!clockOnly && <div className={dock ? 'qb-architect-dock-tools' : undefined} style={{ padding: dock ? '8px 10px 0' : '12px 16px 0' }}><Tabs label="Ferramentas do Arquiteto" items={tools} value={tool} onChange={setTool} /></div>}
      <div style={{ padding: dock ? 10 : 16, minHeight: 0, minWidth: 0, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {tool === 'socratico' && <SocraticChat accountId={accountId} subjects={subjects} subjectId={subj && subj.id} topicId={topic && topic.id} onContextChange={(s, t) => onContextChange && onContextChange({ ...context, subjectId: s, topicId: t })} origin={context.origin} compact={dock} personal={personal} style={{ flex: 1, minHeight: dock ? 320 : 460 }} />}
        {tool === 'feynman' && <FeynmanLab subjects={subjects} subjectName={subj?.name} topicId={topic?.id}
          topicLabel={topic?.title || tLabel} nodeId={context.nodeId} personal={personal} onTopicChange={changeTopic}
          onNodeChange={nodeId => onContextChange?.({ ...context, subjectId: subj?.id, topicId: topic?.id, nodeId })} />}
        {tool === 'cornell' && <CornellNotebook topicId={topic?.id || ''} topicLabel={tLabel} subjects={subjects}
          onTopicChange={changeTopic} />}
        {pilotAllowed && tool === 'visual-lab' && <React.Suspense fallback={<p>Carregando o laboratório…</p>}>
          <AccountPilot accountId={accountId} subjects={subjects} onBack={()=>setTool('socratico')} />
        </React.Suspense>}
        {tool === 'study-clock' && <StudyClock />}
      </div>
    </div>
  );
  if (mode === 'inline') return panel;
  return (
    <div className={modal ? 'qb-studio-frame' : undefined} style={dock
      ? { position: 'fixed', top: 8, right: 8, bottom: 8, zIndex: 70, width: 'min(440px, calc(100% - 16px))' }
      : { position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {modal && <div onClick={onClose} aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,15,.72)', backdropFilter: 'blur(6px)' }} />}
      {panel}
    </div>
  );
}
export { ArchitectStudio };