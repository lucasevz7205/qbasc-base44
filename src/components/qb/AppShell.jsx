import React from 'react';
import { GlobalToolbar } from '@/components/qb/navigation/GlobalToolbar';
import { MainNav } from '@/components/qb/navigation/MainNav';
import { Button } from '@/components/qb/core/Button';
import { BrandLogo } from '@/components/qb/brand/BrandLogo';
import { ArchitectLauncher } from '@/components/qb/architect/ArchitectLauncher';
import { ArchitectStudio } from '@/components/qb/architect/ArchitectStudio';
import { ToastStack } from '@/components/qb/feedback/ToastStack';
import { useRealStudy } from '@/lib/qb-real-data';
import { studioResume } from '@/lib/studio-resume';
import { NavegadorAviso } from '@/components/qb/performance/NavegadorAviso';

export const NAV = (late = 0) => [
  { id: 'dashboard', label: 'Menu principal', icon: 'house' },
  { id: 'plan', label: 'Planejamento', icon: 'calendar-days', quick: { id: 'hoje', label: 'Hoje' } },
  { id: 'edital', label: 'Edital', icon: 'scroll-text' },
  { id: 'train', label: 'Treinar', icon: 'target', count: late },
  { id: 'study', label: 'Estudo', icon: 'book-open' },
  { id: 'simulado', label: 'Simulado', icon: 'graduation-cap' },
  { id: 'performance', label: 'Desempenho', icon: 'chart-column' },
];

export const TOOLS = [
  { id: 'socratico', label: 'O Arquiteto', icon: 'astrolabe' },
  { id: 'study-clock', label: 'Sessão de estudo', icon: 'timer' },
  { id: 'cornell', label: 'Caderno Cornell', icon: 'notebook-pen' },
  { id: 'keys', label: 'Atalhos de teclado', icon: 'monitor' },
];

function Backdrop() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1 }}>
      <div className="qb-img qb-scene-night-ascensao" style={{ position: 'absolute', inset: 0, backgroundPosition: '70% 30%' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(10,30,52,.55) 0%,rgba(10,30,52,.88) 280px,rgba(10,30,52,.94) 100%)' }} />
    </div>
  );
}

const RESUMABLE_TOOLS = ['socratico', 'feynman', 'cornell', 'visual-lab', 'study-clock'];

// Abre o estúdio no ponto em que foi deixado (aba e tópico), guardado só neste navegador.
function useOpenStudio(ui, setUi) {
  const { QB_EDITAL, accountId } = useRealStudy();
  return React.useCallback(() => {
    const saved = studioResume.read(accountId);
    const tool = RESUMABLE_TOOLS.includes(saved.tool) ? saved.tool : 'socratico';
    const ctxUsed = ui.ctx?.topicId || ui.ctx?.subjectId;
    const subject = QB_EDITAL.subjects.find(s => s.id === saved.subjectId);
    const topic = subject?.topics.find(t => t.id === saved.topicId);
    const patch = { studio: { open: true, mode: 'modal', tool } };
    if (!ctxUsed && topic) patch.ctx = { subjectId: subject.id, topicId: topic.id, nodeId: saved.nodeId || undefined };
    setUi(patch);
  }, [accountId, QB_EDITAL, ui.ctx, setUi]);
}

export default function AppShell({ ui, setUi, view, quick, go, mapReturn, children, wide }) {
  const { QB_DATA, QB_PLAN, refresh, logout, isAdmin, architectAccess } = useRealStudy();
  const openStudio = useOpenStudio(ui, setUi);
  const compact = !!ui.focus;
  const scene = ui.bg === 'dynamic' && !ui.focus;
  const isWide = wide ?? (view === 'study' || view === 'plan' || view === 'train');
  return (
    <div data-qb-theme={ui.theme} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', isolation: 'isolate' }}>
      {scene && <Backdrop />}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto' }}>
          {!ui.collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {!compact && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BrandLogo variant="mark" mark="q-sword" size={34} />
                  <span style={{ font: '600 22px/1 var(--font-serif)', color: 'var(--qb-ivory)' }}>Quebrando a Banca</span>
                </span>
              )}
              <GlobalToolbar
                style={{ flex: 1 }}
                sync={ui.sync}
                onSync={async () => {
                  setUi({ sync: 'syncing' });
                  try {
                    await refresh();
                    setUi({ sync: 'ok' });
                  } catch {
                    setUi({ sync: 'offline' });
                  }
                }}
                focusMode={!!ui.focus}
                onFocusMode={v => setUi({ focus: v })}
                background={ui.bg}
                onBackground={v => setUi({ bg: v })}
                theme={ui.theme}
                onTheme={v => setUi({ theme: v })}
                showAdministration={isAdmin}
                tools={isAdmin ? TOOLS : TOOLS.filter(t => ['study-clock', 'keys'].includes(t.id) || (architectAccess && t.id === 'socratico'))}
                onTool={id =>
                  id === 'keys'
                    ? setUi({ toast: { tone: 'info', title: 'Atalhos', message: 'C / E responder · Esc fechar O Arquiteto' } })
                    : setUi({ studio: { open: true, mode: 'modal', tool: id } })
                }
                collapsed={ui.collapsed}
                onCollapse={() => setUi({ collapsed: !ui.collapsed })}
                onArchitect={architectAccess ? openStudio : undefined}
              />
            </div>
          )}
        </div>
      </div>
      <div style={{ position: 'sticky', top: 0, zIndex: 'var(--z-header)', padding: '8px 16px', background: scene ? 'linear-gradient(180deg,rgba(10,30,52,.92) 60%,rgba(10,30,52,0))' : 'var(--canvas)' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto' }}>
          <MainNav
            items={NAV(QB_PLAN.tasks.filter(t => t.status === 'late').length)}
            activeId={view}
            activeQuick={quick}
            onNavigate={go}
            compact={compact}
            collapsed={ui.collapsed}
            onExpand={() => setUi({ collapsed: false })}
            leading={compact || ui.collapsed ? <BrandLogo variant="mark" mark="q-sword" size={26} /> : null}
            trailing={
              <button className="qb-iconbtn qb-iconbtn--round" aria-label="Perfil e sair" title="Perfil" onClick={logout}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid var(--qb-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 13px/1 var(--font-display)', color: 'var(--qb-gold)' }}>
                  {QB_DATA.user.initials}
                </span>
              </button>
            }
          />
          {mapReturn && <Button variant="secondary" icon="corner-up-left" onClick={mapReturn.onReturn} style={{ marginTop: 8 }}>
            {mapReturn.label}
          </Button>}
        </div>
      </div>
      <NavegadorAviso go={go} />
      <main style={{ flex: 1, width: '100%', maxWidth: isWide ? 1360 : 1280, margin: '0 auto', padding: '20px 16px 96px' }}>{children}</main>
    </div>
  );
}

export function ArchitectLayer({ ui, setUi, studioPage }) {
  const { QB_EDITAL, isAdmin, architectAccess, accountId } = useRealStudy();
  const openStudio = useOpenStudio(ui, setUi);
  const E = QB_EDITAL;
  const ctx = ui.ctx || {};
  const mode = !architectAccess && ui.studio.mode !== 'modal' ? 'dock' : 'modal';
  return (
    <>
      {architectAccess && <ArchitectLauncher
        hidden={ui.studio.open || studioPage}
        onOpen={openStudio}
      />}
      {(architectAccess || ui.studio.tool === 'study-clock') && <ArchitectStudio
        open={ui.studio.open}
        mode={mode}
        clockOnly={!architectAccess}
        personal={!isAdmin}
        tool={ui.studio.tool || 'socratico'}
        onToolChange={tool => { studioResume.write(accountId, { tool }); setUi({ studio: { open: true, mode, tool } }); }}
        onExpand={() => setUi({ studio: { open: true, mode: 'modal', tool: ui.studio.tool || 'socratico' } })}
        onClose={() => setUi({ studio: { open: false } })}
        subjects={E.subjects}
        context={ctx}
        onContextChange={c => { studioResume.write(accountId, { subjectId: c?.subjectId, topicId: c?.topicId, nodeId: c?.nodeId }); setUi({ ctx: c }); }}
      />}
      <ToastStack toasts={ui.toasts} onDismiss={id => setUi({ toasts: ui.toasts.filter(x => x.id !== id) })} />
    </>
  );
}

export { AppShell, AppShell as Shell };