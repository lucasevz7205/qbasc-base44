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
import { reviewDay, scheduledReviewQueues } from '@/lib/spaced-review';
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
  const { QB_EDITAL, QB_PLAN, QB_DATA, records } = useRealStudy();
  const ctx = useQBStudy();
  const E = QB_EDITAL;
  const sel = selProp || ctx.trainSel;
  const setSel = setSelProp || ctx.setTrainSel;
  const dispatch = dispatchProp || ctx.dispatch;
  const { pendingByTopic, resolveIntent, missing, clearMissing } = ctx;
  const [filter, setFilter] = React.useState('all');
  const reviewRef = React.useRef(null);
  const labRef = React.useRef(null);
  const radialRef = React.useRef(null);
  const openAndScroll = ref => {
    const target = ref.current;
    if (!target) return;
    if (target.tagName === 'DETAILS') target.open = true;
    target.scrollIntoView({ block: 'start' });
  };
  const selectTopic = (subjectId, topicId) => {
    setSel({ subjectId, topicId });
    openAndScroll(radialRef);
  };

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
  const reviews = scheduledReviewQueues({
    questions: QB_DATA.questionBank, flashcards: QB_DATA.flashcards, reviews: QB_DATA.reviews, rounds: records.rodadas,
    today: reviewDay(new Date()), subjectId: subject?.id, topicId: topic?.id,
    cardTopicIds: subject ? new Set(subject.topics.map(item => item.id)) : null,
  });
  const scopeLabel = topic ? [topic.num, topic.title].filter(Boolean).join(' · ') : subject?.name || 'Todas as matérias';
  const correct = stats.valid - stats.errors;
  const accuracy = stats.valid ? correct / stats.valid : null;

  const linkInfo = (subjectId, topicId, action) => {
    if (action === 'review' && topicId === topic?.id && (reviews.questions.due || reviews.flashcards.due)) {
      return { available: true, note: reviews.questions.due + ' questões · ' + reviews.flashcards.due + ' flashcards a revisar' };
    }
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
      <details ref={reviewRef} id="qb-scheduled-review" className="qb-panel qb-train-fold">
        <summary>Revisão espaçada <small>{reviews.questions.ids.length + reviews.flashcards.ids.length} disponíveis · {scopeLabel}</small></summary>
        <div className="qb-train-fold__body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 245px), 1fr))', gap: 12 }}>
            {[
              ['Questões', 'target', reviews.questions, () => go('questions', { filter: 'all', questionIds: reviews.questions.ids, scheduledReview: true })],
              ['Flashcards', 'layers', reviews.flashcards, () => go('flashcards', { topicId: topic?.id, cardIds: reviews.flashcards.ids, scheduledReview: true })],
            ].map(([label, icon, queue, start]) => (
              <Panel key={label} variant="sunken" padding={12} style={{ display: 'grid', gap: 8 }}>
                <strong style={{ font: 'var(--type-label)' }}>{label} · {queue.ids.length} para revisar</strong>
                {queue.postponed > 0 && <small style={{ color: 'var(--text-muted)' }}>{queue.postponed} aguardando vaga no limite diário</small>}
                <Button size="sm" variant="secondary" icon={icon} disabled={!queue.ids.length} onClick={start}>Revisar {label.toLowerCase()}</Button>
              </Panel>
            ))}
          </div>
        </div>
      </details>
      <details className="qb-panel qb-train-fold">
        <summary>Filtros da rodada</summary>
        <div className="qb-train-fold__body"><QuestionFilters value={filter} onChange={setFilter} /></div>
      </details>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <div ref={radialRef} className="qb-panel qb-panel--ornate" style={{ flex: '1 1 600px', minWidth: 0, padding: 'clamp(12px, 3vw, 24px)', scrollMarginTop: 100 }}>
          <TrainingRadial
            subjects={E.subjects}
            value={sel}
            onChange={setSel}
            pending={pendingByTopic}
            linkInfo={linkInfo}
            onAction={i => {
              if (i.action === 'review' && (reviews.questions.due || reviews.flashcards.due)) {
                openAndScroll(reviewRef);
              } else dispatch(i.action === 'train' ? { ...i, filter } : i, 'train');
            }}
          />
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <details className="qb-panel qb-train-fold">
            <summary>Progresso das questões <small>{scopeLabel}</small></summary>
            <div className="qb-train-fold__body">
            <ProgressBar tone="gold" size="lg" label="Questões concluídas"
              value={stats.total ? stats.completed / stats.total : 0}
              valueText={`${stats.completed} de ${stats.total}`} />
            <ProgressBar tone="correct" size="lg" label="Taxa de acertos"
              trackTone={accuracy === null ? undefined : 'incorrect'}
              value={accuracy ?? 0}
              valueText={accuracy === null ? 'Sem respostas válidas' : `${Math.round(100 * accuracy)}%`} />
            {stats.valid > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', font: 'var(--type-caption)' }}>
                <span style={{ color: 'var(--state-correct)' }}>{correct} {correct === 1 ? 'acerto' : 'acertos'}</span>
                <span style={{ color: 'var(--state-incorrect)' }}>{stats.errors} {stats.errors === 1 ? 'erro' : 'erros'}</span>
                <span style={{ color: 'var(--text-muted)' }}>{stats.valid} respostas válidas</span>
              </div>
            )}
            </div>
          </details>
          <details className="qb-panel qb-train-fold">
            <summary>Pendências do planejamento <small>{late.length} atrasadas</small></summary>
            <div className="qb-train-fold__body">
            <span style={{ font: '600 32px/1 var(--font-body)', color: 'var(--text-primary)' }}>{late.length}</span>
            <span style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
              atividades atrasadas no planejamento ({late.filter(t => t.auto).length} revisões automáticas).
            </span>
            <Button variant="secondary" icon="calendar-days" onClick={() => go('plan', 'hoje')}>
              Ver no planejamento
            </Button>
            </div>
          </details>
          <details className="qb-panel qb-train-fold">
            <summary>Armadilhas da banca</summary>
            <div className="qb-train-fold__body">
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
            <Button variant="secondary" onClick={() => openAndScroll(labRef)}>Explorar os 14 mecanismos</Button>
            </div>
          </details>
        </div>
      </div>
      <details className="qb-panel qb-train-fold">
        <summary>Matérias e assuntos <small>{E.subjects.length} matérias</small></summary>
        <div className="qb-train-fold__body">
          {E.subjects.map(matter => (
            <details key={matter.id} className="qb-train-fold qb-train-fold--nested">
              <summary>{matter.name} <small>{matter.topics.length} assuntos</small></summary>
              <div className="qb-train-fold__body">
                {matter.topics.map(item => (
                  <details key={item.id} className="qb-train-fold qb-train-fold--nested">
                    <summary>{[item.num, item.title].filter(Boolean).join(' · ') || item.id}</summary>
                    <div className="qb-train-fold__body">
                      <Button size="sm" variant="secondary" icon="locate-fixed" onClick={() => selectTopic(matter.id, item.id)}>Ver ações do assunto</Button>
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </div>
      </details>
      <details className="qb-panel qb-train-fold">
        <summary>Assuntos com menor taxa de acertos <small>{weak.length} assuntos</small></summary>
        <div className="qb-train-fold__body">
          <small>Somente assuntos com pelo menos 10 respostas válidas.</small>
          {Array.from(new Set(weak.map(row => row.s.id))).map(id => (
            <details key={id} className="qb-train-fold qb-train-fold--nested">
              <summary>{weak.find(row => row.s.id === id).s.name}</summary>
              <div className="qb-train-fold__body">
                {weak.filter(row => row.s.id === id).map(({ s, t, acc, n }) => (
                  <details key={t.id} className="qb-train-fold qb-train-fold--nested">
                    <summary>{[t.num, t.title].filter(Boolean).join(' · ') || t.id} <small>{Math.round(acc)}% · {t.correct}/{n}</small></summary>
                    <div className="qb-train-fold__body">
                      <Button size="sm" variant="secondary" icon="locate-fixed" onClick={() => selectTopic(s.id, t.id)}>Ver ações do assunto</Button>
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </div>
      </details>
      <details ref={labRef} className="qb-panel qb-train-fold">
        <summary>Laboratório de mecanismos e pegadinhas</summary>
        <div className="qb-train-fold__body"><PegadinhasLab questions={QB_DATA.questionBank} subjects={E.subjects} go={go} /></div>
      </details>
      <details className="qb-panel qb-train-fold">
        <summary>Acervo de pegadinhas</summary>
        <div className="qb-train-fold__body"><AcervoPegadinhasV1 questions={QB_DATA.questionBank} subjects={E.subjects} go={go} /></div>
      </details>
    </div>
  );
}
export { TrainScreen };