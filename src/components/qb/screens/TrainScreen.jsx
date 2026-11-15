import React from 'react';
import { PageHeader } from '@/components/qb/navigation/PageHeader';
import { ProgressBar } from '@/components/qb/core/ProgressBar';
import { Panel } from '@/components/qb/core/Panel';
import { Button } from '@/components/qb/core/Button';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { QuestionFilters } from '@/components/qb/questions/QuestionFilters';
import { TrainingRadial } from '@/components/qb/navigation/TrainingRadial';
import PegadinhasLab from '@/components/qb/study/PegadinhasLab';
import AcervoPegadinhasV1 from '@/components/qb/study/AcervoPegadinhasV1';
import { useRealStudy } from '@/lib/qb-real-data';
import { questionTrainingProgress } from '@/lib/study-session-rules';
import { useQBStudy, QB_VIEW_LABEL, QB_NAV_REASONS } from '@/lib/QBStudyContext';

export function MissingLink({ missing, onBack, go }) {
  const { topicLabel } = useQBStudy();
  const i = missing.intent;
  const label = topicLabel(i.subjectId, i.topicId);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720, margin: '0 auto' }}>
      <PageHeader overline="Remissão" title="Sem vínculo para esta ação" />
      <Panel style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <EmptyState
          tone="unavailable"
          icon="link"
          title={label || 'Assunto não encontrado'}
          description={QB_NAV_REASONS[missing.reason] || QB_NAV_REASONS['unknown-action']}
        />
        <code style={{ font: '400 12px/1.6 var(--font-mono)', color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
          action: {i.action} · subjectId: {String(i.subjectId)} · topicId: {String(i.topicId)}
          {i.nodeId ? ' · nodeId: ' + i.nodeId : ''} · motivo: {missing.reason}
        </code>
        <span style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
          Nenhum outro assunto foi aberto no lugar. Seu progresso e a seleção anterior foram mantidos.
        </span>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button icon="arrow-left" onClick={onBack}>
            Voltar para {QB_VIEW_LABEL[missing.back] || 'a tela anterior'}
          </Button>
          {label && (
            <Button variant="secondary" icon="scroll-text" onClick={() => go('edital', 'lista')}>
              Ver no edital
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}

export default function TrainScreen({ go, openArchitect, dispatch: dispatchProp, sel: selProp, setSel: setSelProp }) {
  const { QB_EDITAL, QB_PLAN, QB_DATA } = useRealStudy();
  const ctx = useQBStudy();
  const E = QB_EDITAL;
  const sel = selProp || ctx.trainSel;
  const setSel = setSelProp || ctx.setTrainSel;
  const dispatch = dispatchProp || ctx.dispatch;
  const { pendingByTopic, resolveIntent, missing, clearMissing } = ctx;
  const [filter, setFilter] = React.useState('all');

  if (missing && missing.back === 'train') {
    return <MissingLink missing={missing} go={go} onBack={clearMissing} />;
  }

  const late = Object.values(QB_PLAN.weeks).flat().filter(t => t.status === 'late');
  const weak = E.subjects
    .flatMap(s =>
      s.topics
        .filter(t => t.correct + t.wrong >= 10)
        .map(t => ({ s, t, acc: (t.correct / (t.correct + t.wrong)) * 100, n: t.correct + t.wrong })),
    )
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 6);

  const subject = E.subjects.find(item => item.id === sel.subjectId);
  const topic = subject?.topics.find(item => item.id === sel.topicId);
  const stats = questionTrainingProgress(QB_DATA.questionBank, { subjectId: subject?.id, topicId: topic?.id });

  const linkInfo = (subjectId, topicId, action) => {
    const r = resolveIntent({ action, subjectId, topicId });
    return {
      available: r.ok,
      nodeId: r.nodeId,
      note: r.ok ? r.note : 'Sem vínculo na base atual',
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHeader
        overline="Treinar · questões CEBRASPE (Certo/Errado)"
        title="Treinar"
        description="Escolha a matéria e o assunto no anel; cada assunto abre quatro ações com o contexto preservado."
      />
      <QuestionFilters value={filter} onChange={setFilter} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <Panel variant="ornate" style={{ flex: '1 1 600px', minWidth: 0 }}>
          <TrainingRadial
            subjects={E.subjects}
            value={sel}
            onChange={setSel}
            pending={pendingByTopic}
            linkInfo={linkInfo}
            onAction={i => dispatch(i.action === 'train' ? { ...i, filter } : i, 'train')}
          />
        </Panel>
        <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Panel variant="ornate" style={{ display: 'grid', gap: 14 }}>
            <h2 style={{ font: 'var(--type-h2)', margin: 0 }}>Progresso das questões</h2>
            <span style={{ color: 'var(--text-secondary)' }}>{topic ? [topic.num, topic.title].filter(Boolean).join(' · ') : subject?.name || 'Todas as matérias'}</span>
            <ProgressBar tone="gold" size="lg" label="Questões concluídas"
              value={stats.total ? stats.completed / stats.total : 0}
              valueText={`${stats.completed} de ${stats.total}`} />
            <ProgressBar tone="incorrect" size="lg" label="Taxa de erro"
              value={stats.valid ? stats.errors / stats.valid : 0}
              valueText={stats.valid ? `${Math.round(100 * stats.errors / stats.valid)}%` : 'Sem respostas válidas'} />
            {stats.valid > 0 && <small style={{ color: 'var(--text-muted)' }}>{stats.errors} erros em {stats.valid} respostas válidas. Questões concluídas são contadas uma vez.</small>}
          </Panel>
          <Panel style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="qb-overline">Revisões e pendências</span>
            <span style={{ font: '600 32px/1 var(--font-body)', color: 'var(--text-primary)' }}>{late.length}</span>
            <span style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
              atividades atrasadas no planejamento ({late.filter(t => t.auto).length} revisões automáticas).
            </span>
            <Button variant="secondary" icon="calendar-days" onClick={() => go('plan', 'hoje')}>
              Ver no planejamento
            </Button>
          </Panel>
          <Panel style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="qb-overline">Armadilhas da banca</span>
            <span style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
              Treine padrões frequentes de pegadinha com O Arquiteto no modo Banca CEBRASPE.
            </span>
            <Button
              variant="secondary"
              icon="sparkles"
              onClick={() => openArchitect && openArchitect({ subjectId: subject?.id || 'dc', topicId: topic?.id, origin: 'Treinar · armadilhas' })}
            >
              Abrir O Arquiteto
            </Button>
            <a className="qb-btn qb-btn--secondary" href="#qb-pegadinhas-lab"
              style={{ display: 'inline-flex', minHeight: 44, alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              Explorar os 14 mecanismos
            </a>
          </Panel>
        </div>
      </div>
      <Panel style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ font: 'var(--type-h2)' }}>Assuntos com menor taxa de acertos</h2>
          <span style={{ font: '400 13px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>
            Somente assuntos com pelo menos 10 respostas válidas.
          </span>
        </div>
        {weak.map(({ s, t, acc, n }) => (
          <div key={t.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid var(--divider)' }}>
            <span style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ font: '500 14px/1.3 var(--font-body)', color: 'var(--text-primary)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--qb-gold)', marginRight: 8 }}>{s.short} {t.num}</span>
                {t.title || 'Título não disponível'}
              </span>
              <span style={{ font: '400 12px/1.2 var(--font-body)', color: 'var(--text-muted)' }}>{s.name}</span>
            </span>
            <span style={{ font: '500 13px/1.2 var(--font-mono)', color: acc < 60 ? 'var(--state-incorrect)' : 'var(--text-secondary)' }}>
              {Math.round(acc)}% · {t.correct}/{n}
            </span>
            <Button
              size="sm"
              variant="secondary"
              icon="locate-fixed"
              onClick={() => {
                setSel({ subjectId: s.id, topicId: t.id });
                window.scrollTo(0, 0);
              }}
            >
              Ver ações
            </Button>
          </div>
        ))}
      </Panel>
      <PegadinhasLab questions={QB_DATA.questionBank} subjects={E.subjects} go={go} />
      <AcervoPegadinhasV1 questions={QB_DATA.questionBank} subjects={E.subjects} go={go} />
    </div>
  );
}
export { TrainScreen };