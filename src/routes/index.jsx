import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/qb/AppShell';
import { WelcomeView } from '@/components/qb/screens/WelcomeView';
import { DashboardView } from '@/components/qb/screens/DashboardView';
import { Panel } from '@/components/qb/core/Panel';
import { Button } from '@/components/qb/core/Button';
import { Badge } from '@/components/qb/core/Badge';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Quebrando a Banca — A Ascensão' },
      {
        name: 'description',
        content: 'Plataforma estratégica de aprendizagem para concursos públicos · Câmara dos Deputados — Analista Legislativo.',
      },
    ],
  }),
  component: QuebrandoABancaHome,
});

const VIEW_LABELS = {
  questions: 'Sessão de Questões (CEBRASPE Certo/Errado)',
  map: 'Mapa Mental Interativo + Painel de Conceito',
  flashcards: 'Sessão de Flashcards e Revisão Espaçada',
  tutor: 'Tutor Estratégico (Demonstração)',
};

function QuebrandoABancaHome() {
  const [view, setView] = React.useState('dashboard');
  const [progress] = React.useState({ answered: 0, cards: 0 });

  const go = (nextView) => {
    setView(nextView);
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  };

  if (view === 'welcome') {
    return <WelcomeView onEnter={() => go('dashboard')} />;
  }

  return (
    <AppShell active={view} onNavigate={go} onProfile={() => go('welcome')} wide={view === 'map'}>
      {view === 'dashboard' ? (
        <DashboardView go={go} progress={progress} />
      ) : (
        <Panel padding={32} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, margin: '32px auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>PRÓXIMA ETAPA DO DESIGN SYSTEM</span>
            <Badge tone="gold" icon="sparkles">Parte 2</Badge>
          </div>
          <h1 style={{ font: 'var(--type-h1)' }}>{VIEW_LABELS[view] || view}</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>
            A Parte 1 (Tokens, Fontes, Assets Oficiais, Cabeçalho, Navegação Radial, Boas-vindas e Dashboard) já está ativa. Confirme no chat para implementarmos esta tela na Parte 2 seguindo fielmente o Claude Design.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Button icon="arrow-left" onClick={() => go('dashboard')}>
              Voltar ao Início
            </Button>
            <Button variant="secondary" onClick={() => go('welcome')}>
              Ver tela de Boas-vindas
            </Button>
          </div>
        </Panel>
      )}
    </AppShell>
  );
}