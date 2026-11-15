import React from 'react';
import { PageHeader } from '@/components/qb/navigation/PageHeader';
import { Tabs } from '@/components/qb/navigation/Tabs';
import { Panel } from '@/components/qb/core/Panel';
import { Button } from '@/components/qb/core/Button';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { MindMapScreen } from '@/components/qb/screens/MindMapView';

export default function StudyScreen({ tab = 'mapa', setTab, go, mapProps }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader overline="Estudo · teoria, mapas e revisão" title="Estudo" actions={<Tabs label="Ferramentas de estudo" value={tab} onChange={setTab} items={[{ id: 'mapa', label: 'Mapas mentais', icon: 'network' }, { id: 'cards', label: 'Flashcards', icon: 'layers' }]} />} />
      {tab === 'mapa' && <MindMapScreen {...mapProps} go={go} />}
      {tab === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
          {[['Processo legislativo', 5, 'Direito Constitucional', true], ['Licitações e contratos', 0, 'Direito Administrativo', false], ['Emprego de tempos verbais', 0, 'Língua Portuguesa', false]].map(([n, c, s, ok]) => (
            <Panel key={n} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="qb-overline">{s}</span>
              <h3 style={{ font: 'var(--type-h2)' }}>{n}</h3>
              <span style={{ font: '400 14px/1.4 var(--font-body)', color: 'var(--text-secondary)' }}>{ok ? c + ' cartões para revisar hoje' : 'Baralho de exemplo vazio'}</span>
              {ok ? <Button icon="play" onClick={() => go('flashcards')}>Revisar agora</Button> : <EmptyState compact title="Sem cartões" description="Crie cartões pelo Scanner do Arquiteto." />}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
export { StudyScreen };