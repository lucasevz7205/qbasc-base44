import React from 'react';
import { HeroAscension } from '@/components/qb/brand/HeroAscension';
import { RadialNavigation } from '@/components/qb/navigation/RadialNavigation';
import { Panel } from '@/components/qb/core/Panel';
import { AchievementEmblem } from '@/components/qb/brand/AchievementEmblem';
import { Button } from '@/components/qb/core/Button';
import { Badge } from '@/components/qb/core/Badge';
import { StatCard } from '@/components/qb/data/StatCard';
import { TaskCard } from '@/components/qb/planning/TaskCard';
import { QB_METRICS } from '@/lib/qb-data';
import { useRealStudy } from '@/lib/qb-real-data';

export default function DashboardView({ go, openArchitect }) {
  const { QB_EDITAL, QB_PLAN, QB_SIM, QB_DATA, isAdmin } = useRealStudy();
  const M = QB_METRICS, P = QB_PLAN;
  const tot = M.totals(QB_EDITAL.subjects);
  const todayTasks = P.weeks[0].filter(t => t.date === P.today);
  const done = todayTasks.filter(t => t.status === 'done').length;
  const usingCycle = P.mode === 'cycle';
  const currentBlock = P.cycle.find(block => block.subjectId === P.currentSubjectId);
  const late = Object.values(P.weeks).flat().filter(t => t.status === 'late').length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <HeroAscension scene="day" height={220} focal="right" eyebrow={QB_DATA.exam} title="Sua preparação continua"
        quote={{ text: 'A memória é a mãe de toda a sabedoria', author: 'Ésquilo' }}
        subtitle={(usingCycle ? 'Ciclo: ' + (currentBlock?.name || 'sem matérias') : 'Hoje: ' + todayTasks.length + ' tarefas planejadas') + ' · Simulado: ' + QB_SIM.next.label + '.'}>
        <Button iconRight="arrow-right" onClick={() => go('plan', 'hoje')}>Ver o plano de hoje</Button>
        <Button variant="secondary" icon="target" onClick={() => go('train')}>Treinar agora</Button>
      </HeroAscension>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Badge tone="neutral" icon="info">{isAdmin ? 'Versão de teste · dados importados' : 'Projeto individual'}</Badge><span style={{ font: '400 12px/1.3 var(--font-body)', color: 'var(--text-muted)' }}>Métricas acumuladas do edital (treino). Simulados ficam separados.</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <StatCard label="Taxa de acertos" icon="target" tone="correct" value={M.pct(tot.accuracy)} detail={tot.correct + ' de ' + tot.valid + ' respostas válidas'} note="acertos ÷ (acertos + erros). Brancos fora." onClick={() => go('performance')} />
        <StatCard label="Cobertura do edital" icon="scroll-text" value={M.pct(tot.coverage)} detail={tot.studied + ' de ' + tot.total + ' tópicos com estudo iniciado'} note="Tópico coberto = status diferente de Não iniciado." onClick={() => go('edital')} />
        <StatCard label="Questões respondidas" icon="list-checks" value={tot.answered} detail={tot.blank + ' em branco incluídas'} onClick={() => go('performance')} />
        {usingCycle ? <StatCard label="Bloco atual" icon="repeat" value={currentBlock ? currentBlock.minutes + ' min' : '—'} detail={currentBlock?.name || 'Sem matérias no ciclo'} onClick={() => go('plan', 'hoje')} />
          : <StatCard label="Tarefas de hoje" icon="calendar" value={done + '/' + todayTasks.length} detail={late ? late + ' atrasadas (últimos 14 dias)' : 'Nenhuma atrasada'} warning={late ? 'Há tarefas atrasadas' : null} onClick={() => go('plan', 'hoje')} />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,460px),1fr))', gap: 20, alignItems: 'start' }}>
        <Panel padding="20px 16px 24px" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <h2 style={{ font: 'var(--type-h2)', alignSelf: 'flex-start', padding: '0 8px' }}>Atalhos</h2>
          <RadialNavigation size={480} onSelect={id => id === 'architect' ? openArchitect() : go(id)}
            center={{ value: tot.coverage / 100, overline: 'Cobertura', label: tot.studied + ' de ' + tot.total + ' tópicos' }}
            items={[
              { id: 'train', label: 'Treinar', icon: 'target', meta: late + ' pendências' },
              { id: 'edital', label: 'Edital', icon: 'scroll-text', meta: tot.total + ' tópicos' },
              { id: 'study', label: 'Estudo', icon: 'book-open', meta: 'Mapas e cartões' },
              { id: 'simulado', label: 'Simulado', icon: 'graduation-cap', meta: QB_SIM.next.date ? M.fmtDate(QB_SIM.next.date) : 'Sem data' },
              { id: 'performance', label: 'Desempenho', icon: 'chart-column', meta: M.pct(tot.accuracy) + ' acertos' },
              ...(isAdmin ? [{ id: 'architect', label: 'O Arquiteto', icon: 'sparkles', meta: 'Simulação' }] : []),
            ]} />
        </Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Panel style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><h2 style={{ font: 'var(--type-h2)' }}>Hoje</h2><button className="qb-linkbtn" onClick={() => go('plan', 'hoje')}>Planejamento completo</button></div>
            {usingCycle ? <Button variant="secondary" onClick={() => go('plan', 'hoje')}>{currentBlock ? currentBlock.name + ' · ' + currentBlock.minutes + ' min' : 'Configurar ciclo'}</Button> : <>
              {todayTasks.slice(0, 4).map(t => <TaskCard key={t.id} task={t} onClick={() => go('plan', 'hoje')} />)}
              {todayTasks.length > 4 && <span style={{ font: '400 13px/1 var(--font-body)', color: 'var(--text-muted)' }}>+ {todayTasks.length - 4} tarefas</span>}
            </>}
          </Panel>
          <Panel variant="ornate" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ font: '600 14px/1.2 var(--font-display)', letterSpacing: '.12em', color: 'var(--qb-gold)' }}>MARCOS</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <AchievementEmblem variant="soldado" state={isAdmin ? 'earned' : 'in-progress'} size={76} rule="7 dias seguidos" style={{ width: 110 }} />
              <AchievementEmblem variant="sabio" state="in-progress" progress={Math.min(Object.keys(QB_DATA.reviews).length / 200,1)} size={76} rule="200 flashcards" style={{ width: 110 }} />
              <AchievementEmblem variant="estrategista" state="in-progress" progress={Math.min(QB_SIM.history.length / 3,1)} size={76} rule="3 simulados completos" style={{ width: 110 }} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
export { DashboardView, DashboardView as Dashboard };
