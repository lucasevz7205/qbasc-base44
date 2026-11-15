import React from 'react';
import { PageHeader } from '@/components/qb/navigation/PageHeader';
import { Panel } from '@/components/qb/core/Panel';
import { Button } from '@/components/qb/core/Button';
import { useRealStudy } from '@/lib/qb-real-data';

export default function TrainScreen({ go, openArchitect }) {
  const { QB_EDITAL, QB_PLAN } = useRealStudy();
  const E = QB_EDITAL;
  const late = Object.values(QB_PLAN.weeks).flat().filter(t => t.status === 'late');
  const weak = E.subjects.flatMap(s => s.topics.filter(t => t.correct + t.wrong >= 10).map(t => ({ s, t, acc: t.correct / (t.correct + t.wrong) * 100, n: t.correct + t.wrong }))).sort((a, b) => a.acc - b.acc).slice(0, 6);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHeader overline="Treinar · questões CEBRASPE (Certo/Errado)" title="Treinar" description="Rodadas de questões com confiança antes do gabarito, correção pela origem do erro e remissão ao mapa." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
        <Panel variant="ornate" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Rodada sugerida</span>
          <h2 style={{ font: 'var(--type-h2)' }}>Processo legislativo · 5 itens</h2>
          <span style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>Até 20 questões do seu banco de estudo.</span>
          <Button iconRight="arrow-right" onClick={() => go('questions')}>Iniciar rodada</Button>
        </Panel>
        <Panel style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="qb-overline">Revisões e pendências</span>
          <span style={{ font: '600 32px/1 var(--font-body)', color: 'var(--text-primary)' }}>{late.length}</span>
          <span style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>atividades atrasadas no planejamento ({late.filter(t => t.auto).length} revisões automáticas).</span>
          <Button variant="secondary" icon="calendar-days" onClick={() => go('plan', 'hoje')}>Ver no planejamento</Button>
        </Panel>
        <Panel style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="qb-overline">Armadilhas da banca</span>
          <span style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>Treine padrões frequentes de pegadinha com O Arquiteto no modo Banca CEBRASPE.</span>
          <Button variant="secondary" icon="sparkles" onClick={() => openArchitect && openArchitect({ subjectId: 'dc', origin: 'Treinar · armadilhas' })}>Abrir O Arquiteto</Button>
        </Panel>
      </div>
      <Panel style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}><h2 style={{ font: 'var(--type-h2)' }}>Tópicos com menor taxa de acertos</h2><span style={{ font: '400 13px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>Somente tópicos com pelo menos 10 respostas válidas.</span></div>
        {weak.map(({ s, t, acc, n }) => (
          <div key={t.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: 12, alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid var(--divider)' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}><span style={{ font: '500 14px/1.3 var(--font-body)', color: 'var(--text-primary)' }}><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--qb-gold)', marginRight: 8 }}>{s.short} {t.num}</span>{t.title || 'Título não disponível'}</span><span style={{ font: '400 12px/1.2 var(--font-body)', color: 'var(--text-muted)' }}>{s.name}</span></span>
            <span style={{ font: '500 13px/1.2 var(--font-mono)', color: acc < 60 ? 'var(--state-incorrect)' : 'var(--text-secondary)', textAlign: 'right' }}>{Math.round(acc)}% · {t.correct}/{n}</span>
            <Button size="sm" variant="secondary" icon="target" onClick={() => go('questions',{topicId:t.id})}>Treinar</Button>
          </div>
        ))}
      </Panel>
    </div>
  );
}
export { TrainScreen };
