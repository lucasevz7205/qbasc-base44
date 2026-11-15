import React from 'react';
import { GlobalToolbar } from '@/components/qb/navigation/GlobalToolbar';
import { MainNav } from '@/components/qb/navigation/MainNav';
import { BrandLogo } from '@/components/qb/brand/BrandLogo';
import { ArchitectLauncher } from '@/components/qb/architect/ArchitectLauncher';
import { ArchitectStudio } from '@/components/qb/architect/ArchitectStudio';
import { ToastStack } from '@/components/qb/feedback/ToastStack';
import { QB_DATA, QB_EDITAL, QB_PLAN } from '@/lib/qb-data';

const lateCount = () => Object.values(QB_PLAN.weeks).flat().filter(t => t.status === 'late').length;

export const NAV = () => [
  { id: 'dashboard', label: 'Menu principal', icon: 'house' },
  { id: 'plan', label: 'Planejamento', icon: 'calendar-days', quick: { id: 'hoje', label: 'Hoje' } },
  { id: 'edital', label: 'Edital', icon: 'scroll-text' },
  { id: 'train', label: 'Treinar', icon: 'target', count: lateCount() },
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
  const compact = ui.density === 'compact';
  return (
    <div data-qb-theme={ui.theme} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', isolation: 'isolate' }}>
      <Backdrop bg={ui.bg} />
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto' }}>
          {!ui.collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {!compact && <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><BrandLogo variant="mark" mark="q-sword" size={34} /><span style={{ font: '600 22px/1 var(--font-serif)', color: 'var(--qb-ivory)' }}>Quebrando a Banca</span></span>}
              <GlobalToolbar style={{ flex: 1 }} sync={ui.sync} onSync={() => { setUi({ sync: 'syncing' }); setTimeout(() => setUi({ sync: 'ok' }), 1400); }}
                background={ui.bg} onBackground={v => setUi({ bg: v })} density={ui.density} onDensity={v => setUi({ density: v })} theme={ui.theme} onTheme={v => setUi({ theme: v })}
                tools={TOOLS} onTool={id => id === 'keys' ? setUi({ toast: { tone: 'info', title: 'Atalhos', message: 'C / E responder · Enter confirmar · Espaço virar cartão · Esc fechar O Arquiteto' } }) : setUi({ studio: { open: true, tool: id } })}
                collapsed={ui.collapsed} onCollapse={() => setUi({ collapsed: !ui.collapsed })} onArchitect={() => setUi({ studio: { open: true } })} />
            </div>
          )}
        </div>
      </div>
      <div style={{ position: 'sticky', top: 0, zIndex: 'var(--z-header)', padding: '8px 16px', background: ui.bg === 'dynamic' ? 'linear-gradient(180deg,rgba(10,30,52,.92) 60%,rgba(10,30,52,0))' : 'var(--canvas)' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto' }}>
          <MainNav items={NAV()} activeId={view} activeQuick={quick} onNavigate={go} compact={compact} collapsed={ui.collapsed} onExpand={() => setUi({ collapsed: false })}
            leading={compact || ui.collapsed ? <BrandLogo variant="mark" mark="q-sword" size={26} /> : null}
            trailing={<button className="qb-iconbtn qb-iconbtn--round" aria-label="Perfil e sair" title="Perfil" onClick={() => go('welcome')}><span style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid var(--qb-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 13px/1 var(--font-display)', color: 'var(--qb-gold)' }}>LM</span></button>} />
        </div>
      </div>
      <main style={{ flex: 1, width: '100%', maxWidth: wide ? 1360 : 1280, margin: '0 auto', padding: '20px 16px 96px' }}>{children}</main>
    </div>
  );
}

export function ArchitectLayer({ ui, setUi }) {
  const E = QB_EDITAL;
  const ctx = ui.ctx || {};
  const s = E.subjects.find(x => x.id === ctx.subjectId);
  const t = s && s.topics.find(x => x.id === ctx.topicId);
  const label = (ctx.origin ? ctx.origin + ' · ' : '') + (s ? s.short + ' ' + (t ? t.num + (t.title ? ' ' + t.title : '') : '') : '');
  const deck = QB_DATA.flashcards.map(f => ({ front: f.front, back: f.back }));
  return (
    <>
      {!ui.studio.open && <ArchitectLauncher open={ui.quick} onOpenChange={v => setUi({ quick: v })} contextLabel={label} onExpand={() => setUi({ quick: false, studio: { open: true } })}
        onQuick={id => setUi({ quick: false, studio: { open: true, tool: id === 'retencao' ? 'socratico' : id } })} />}
      <ArchitectStudio open={ui.studio.open} tool={ui.studio.tool} onToolChange={tl => setUi({ studio: { open: true, tool: tl } })} onClose={() => setUi({ studio: { open: false } })}
        subjects={E.subjects} context={{ subjectId: ctx.subjectId || 'da', topicId: ctx.topicId || 'da-10.6', origin: ctx.origin }} onContextChange={c => setUi({ ctx: c })} deck={deck} />
      <ToastStack toasts={ui.toasts} onDismiss={id => setUi({ toasts: ui.toasts.filter(x => x.id !== id) })} />
    </>
  );
}

export { AppShell, AppShell as Shell };