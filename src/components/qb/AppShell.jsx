import React from 'react';
import { GlobalToolbar } from '@/components/qb/navigation/GlobalToolbar';
import { MainNav } from '@/components/qb/navigation/MainNav';
import { BrandLogo } from '@/components/qb/brand/BrandLogo';
import { ArchitectLauncher } from '@/components/qb/architect/ArchitectLauncher';
import { ArchitectStudio } from '@/components/qb/architect/ArchitectStudio';
import { ToastStack } from '@/components/qb/feedback/ToastStack';
import { useRealStudy } from '@/lib/qb-real-data';

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
  { id: 'pomodoro', label: 'Pomodoro e Áudio Alfa', icon: 'timer' },
  { id: 'cornell', label: 'Caderno Cornell', icon: 'notebook-pen' },
  { id: 'cards', label: 'Scanner de material', icon: 'scan-line' },
  { id: 'keys', label: 'Atalhos de teclado', icon: 'monitor' },
];

function Backdrop({ bg }) {
  if (bg !== 'dynamic') return null;
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1 }}>
      <div className="qb-img qb-scene-night" style={{ position: 'absolute', inset: 0, backgroundPosition: '70% 30%' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(10,30,52,.55) 0%,rgba(10,30,52,.88) 280px,rgba(10,30,52,.94) 100%)' }} />
    </div>
  );
}

export default function AppShell({ ui, setUi, view, quick, go, children, wide }) {
  const { QB_DATA, QB_PLAN, refresh, logout } = useRealStudy();
  const compact = !!ui.focus;
  const scene = ui.bg === 'dynamic' && !ui.focus;
  const isWide = wide ?? (view === 'study' || view === 'plan' || view === 'train');
  return (
    <div data-qb-theme={ui.theme} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', isolation: 'isolate' }}>
      <Backdrop bg={scene ? 'dynamic' : 'static'} />
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
                tools={TOOLS}
                onTool={id =>
                  id === 'keys'
                    ? setUi({ toast: { tone: 'info', title: 'Atalhos', message: 'C / E responder · Enter confirmar · Esc fechar O Arquiteto' } })
                    : setUi({ studio: { open: true, tool: id } })
                }
                collapsed={ui.collapsed}
                onCollapse={() => setUi({ collapsed: !ui.collapsed })}
                onArchitect={() => setUi({ studio: { open: true } })}
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
        </div>
      </div>
      <main style={{ flex: 1, width: '100%', maxWidth: isWide ? 1360 : 1280, margin: '0 auto', padding: '20px 16px 96px' }}>{children}</main>
    </div>
  );
}

export function ArchitectLayer({ ui, setUi }) {
  const { QB_DATA, QB_EDITAL } = useRealStudy();
  const E = QB_EDITAL;
  const ctx = ui.ctx || {};
  const s = E.subjects.find(x => x.id === ctx.subjectId);
  const t = s && s.topics.find(x => x.id === ctx.topicId);
  const label = (ctx.origin ? ctx.origin + ' · ' : '') + (s ? s.short + ' ' + (t ? t.num + (t.title ? ' ' + t.title : '') : '') : '');
  const deck = QB_DATA.flashcards
    .filter(f => !ctx.topicId || f.topicId === ctx.topicId)
    .slice(0, 30)
    .map(f => ({ front: f.front, back: f.back }));
  return (
    <>
      {!ui.studio.open && (
        <ArchitectLauncher
          open={ui.quick}
          onOpenChange={v => setUi({ quick: v })}
          contextLabel={label}
          onExpand={() => setUi({ quick: false, studio: { open: true } })}
          onQuick={id => setUi({ quick: false, studio: { open: true, tool: id === 'retencao' ? 'socratico' : id } })}
        />
      )}
      <ArchitectStudio
        open={ui.studio.open}
        tool={ui.studio.tool}
        onToolChange={tl => setUi({ studio: { open: true, tool: tl } })}
        onClose={() => setUi({ studio: { open: false } })}
        subjects={E.subjects}
        context={{ subjectId: ctx.subjectId || 'da', topicId: ctx.topicId || 'da-10-6', origin: ctx.origin }}
        onContextChange={c => setUi({ ctx: c })}
        deck={deck}
      />
      <ToastStack toasts={ui.toasts} onDismiss={id => setUi({ toasts: ui.toasts.filter(x => x.id !== id) })} />
    </>
  );
}

export { AppShell, AppShell as Shell };