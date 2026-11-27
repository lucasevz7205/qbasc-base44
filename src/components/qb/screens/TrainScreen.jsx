import React from 'react';
import { PageHeader } from '@/components/qb/navigation/PageHeader';
import { Panel } from '@/components/qb/core/Panel';
import { StatCard } from '@/components/qb/data/StatCard';
import { Button } from '@/components/qb/core/Button';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { QuestionFilters } from '@/components/qb/questions/QuestionFilters';
import { SelectField } from '@/components/qb/data/SelectField';
import { TrainingRadial } from '@/components/qb/navigation/TrainingRadial';
import PegadinhasLab from '@/components/qb/study/PegadinhasLab';
import AcervoPegadinhasV1 from '@/components/qb/study/AcervoPegadinhasV1';
import ErrorNotebook from '@/components/qb/study/ErrorNotebook';
import { useRealStudy } from '@/lib/qb-real-data';
import { reviewDay, scheduledReviewQueues } from '@/lib/spaced-review';
import { questionTrainingProgress } from '@/lib/study-session-rules';
import { buildErrorNotebook } from '@/lib/error-notebook';
import { errorTrainingPool, pickErrorTrainingRound, ERROR_TRAINING_LIMIT } from '@/lib/error-training';
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
  const { QB_EDITAL, QB_PLAN, QB_DATA, records, isAdmin } = useRealStudy();
  const ctx = useQBStudy();
  const E = QB_EDITAL;
  const sel = selProp || ctx.trainSel;
  const setSel = setSelProp || ctx.setTrainSel;
  const dispatch = dispatchProp || ctx.dispatch;
  const { pendingByTopic, resolveIntent, missing, clearMissing } = ctx;
  const [filter, setFilter] = React.useState('all');
  const [errorSubjectId, setErrorSubjectId] = React.useState('');
  const [errorTopicId, setErrorTopicId] = React.useState('');
  const reviewRef = React.useRef(null);
  const labRef = React.useRef(null);
  const radialRef = React.useRef(null);
  const errorNotebook = React.useMemo(
    () => buildErrorNotebook(QB_DATA.questionBank, QB_DATA.studySubjects?.length ? QB_DATA.studySubjects : E.subjects),
    [QB_DATA.questionBank, QB_DATA.studySubjects, E.subjects],
  );
  const availableErrorSubjects = E.subjects.filter(s => errorTrainingPool(QB_DATA.questionBank, { subjectId: s.id }).length);
  const errorSubject = E.subjects.find(s => s.id === errorSubjectId);
  const availableErrorTopics = (errorSubject?.topics || []).filter(t => errorTrainingPool(QB_DATA.questionBank, { subjectId: errorSubjectId, topicId: t.id }).length);
  const errorPool = errorTrainingPool(QB_DATA.questionBank, { subjectId: errorSubjectId || undefined, topicId: errorTopicId || undefined });
  const startErrorTraining = (subjectId = errorSubjectId, topicId = errorTopicId) => {
    if (!subjectId || !topicId) return;
    const questionIds = pickErrorTrainingRound(QB_DATA.questionBank, { subjectId, topicId, rounds: records.rodadas });
    if (questionIds.length) go('questions', { subjectId, topicId, questionIds, filter: 'all', errorTraining: true });
  };
  const openAndScroll = ref => {
    const target = ref.current;
    if (!target) return;
    for (let el = target; el; el = el.parentElement) if (el.tagName === 'DETAILS') el.open = true;
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
    if (action === 'errors') {
      const count = errorTrainingPool(QB_DATA.questionBank, { subjectId, topicId }).length;
      return { available: count > 0, note: count ? `${Math.min(count, ERROR_TRAINING_LIMIT)} de ${count} com erro` : 'Sem erros' };
    }
    if (action === 'review' && topicId === topic?.id && (reviews.questions.due || reviews.flashcards.due)) {
      return { available: true, note: reviews.questions.due + ' questões · ' + reviews.flashcards.due + ' flashcards a revisar' };
    }
    const r = resolveIntent({ action, subjectId, topicId });
    return {
      available: r.ok,
      nodeId: r.nodeId,
      note: r.ok ? r.note : 'Indisponível',
    };
  };

  const dueTotal = reviews.questions.ids.length + reviews.flashcards.ids.length;
  const weakTop = weak.slice(0, 3);

  return (
    <div className="qb-train">
      <PageHeader emblema="target" overline="CEBRASPE · Certo/Errado" title="Treinar" />

      <section className="qb-train__stats" aria-label={'Resumo · ' + scopeLabel}>
        <StatCard icon="calendar-days" label="A revisar" value={dueTotal} unit={dueTotal === 1 ? 'item' : 'itens'}
          detail={reviews.questions.ids.length + ' questões · ' + reviews.flashcards.ids.length + ' flashcards'} />
        <StatCard icon="target" label="Acertos" value={accuracy === null ? '—' : Math.round(100 * accuracy)} unit={accuracy === null ? undefined : '%'}
          detail={accuracy === null ? 'Sem respostas válidas' : correct + ' de ' + stats.valid + ' válidas'} />
        <StatCard icon="list-checks" label="Concluídas" value={stats.completed} unit={'de ' + stats.total} detail={scopeLabel} />
        <StatCard icon="calendar-clock" label="Atrasadas" value={late.length} tone={late.length ? 'incorrect' : undefined}
          detail={late.length ? late.filter(t => t.auto).length + ' revisões automáticas' : 'Nada atrasado'}
          onClick={() => go('plan', 'hoje')} />
      </section>

      <div className="qb-train__main">
        <div ref={radialRef} className="qb-panel qb-panel--ornate qb-train__radial">
          <TrainingRadial
            subjects={E.subjects}
            value={sel}
            onChange={setSel}
            allowRandomTraining
            pending={pendingByTopic}
            linkInfo={linkInfo}
            onAction={i => {
              if (i.action === 'errors') { startErrorTraining(i.subjectId, i.topicId); return; }
              if (i.action === 'review' && (reviews.questions.due || reviews.flashcards.due)) {
                openAndScroll(reviewRef);
              } else dispatch(i.action === 'train' || (i.action === 'flashcards' && filter === 'unseen') ? { ...i, filter } : i, 'train');
            }}
          />
        </div>

        <aside className="qb-train__side">
          <Panel ref={reviewRef} id="qb-scheduled-review" className="qb-train__card">
            <h2 className="nv-title qb-train__h">Revisão espaçada</h2>
            {[
              ['Questões', 'target', reviews.questions, () => go('questions', { filter: 'all', questionIds: reviews.questions.ids, scheduledReview: true })],
              ['Flashcards', 'layers', reviews.flashcards, () => go('flashcards', { topicId: topic?.id, cardIds: reviews.flashcards.ids, scheduledReview: true })],
            ].map(([label, icon, queue, start]) => (
              <div key={label} className="qb-train__row">
                <span className="qb-train__rowtext">
                  <span className="qb-train__num">{queue.ids.length}</span>
                  <span>{label}</span>
                  {queue.postponed > 0 && <small>{queue.postponed} no limite diário</small>}
                </span>
                <Button size="sm" variant="secondary" icon={icon} disabled={!queue.ids.length} onClick={start}>Revisar</Button>
              </div>
            ))}
          </Panel>

          <Panel className="qb-train__card">
            <h2 className="nv-title qb-train__h">Treino de erros</h2>
            <div className="qb-train__fields">
              <SelectField label="Matéria" value={errorSubjectId} options={[{ value: '', label: 'Selecione' }, ...availableErrorSubjects.map(s => ({ value: s.id, label: s.name }))]}
                onChange={value => { setErrorSubjectId(value); setErrorTopicId(''); }} />
              <SelectField label="Assunto" value={errorTopicId} options={[{ value: '', label: 'Selecione' }, ...availableErrorTopics.map(t => ({ value: t.id, label: [t.num, t.title].filter(Boolean).join(' · ') || t.id }))]}
                onChange={setErrorTopicId} />
            </div>
            <div className="qb-train__row">
              <span className="qb-train__rowtext" aria-live="polite">
                <span className="qb-train__num">{errorTopicId ? Math.min(errorPool.length, ERROR_TRAINING_LIMIT) : '—'}</span>
                <span>{errorTopicId ? 'de ' + errorPool.length + ' com erro' : 'Escolha um assunto'}</span>
              </span>
              <Button size="sm" icon="rotate-ccw" disabled={!errorSubjectId || !errorTopicId || !errorPool.length} onClick={() => startErrorTraining()}>Treinar</Button>
            </div>
          </Panel>

          {weakTop.length > 0 && (
            <Panel className="qb-train__card">
              <h2 className="nv-title qb-train__h">Para reforçar</h2>
              <ul className="qb-train__list">
                {weakTop.map(({ s, t, acc }) => (
                  <li key={s.id + t.id}>
                    <button type="button" className="qb-train__link" onClick={() => selectTopic(s.id, t.id)}>
                      <span className="qb-train__linktext">{s.short || s.name} {t.num}{t.title ? ' · ' + t.title : ''}</span>
                      <span className="qb-train__num">{Math.round(acc)}%</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>

      <details className="qb-panel qb-train-fold">
        <summary>Mais ferramentas</summary>
        <div className="qb-train-fold__body">
          <details className="qb-train-fold qb-train-fold--nested">
            <summary>Filtros da rodada</summary>
            <div className="qb-train-fold__body"><QuestionFilters value={filter} onChange={setFilter} /></div>
          </details>
          <details className="qb-train-fold qb-train-fold--nested">
            <summary>
              Caderno de erros{' '}
              <small>{errorNotebook.totalQuestions ? errorNotebook.totalQuestions + ' questões · ' + errorNotebook.totalErrors + ' erros' : 'Vazio'}</small>
            </summary>
            <div className="qb-train-fold__body"><ErrorNotebook notebook={errorNotebook} go={go} /></div>
          </details>
          <details className="qb-train-fold qb-train-fold--nested">
            <summary>Armadilhas da banca</summary>
            <div className="qb-train-fold__body">
              <Button size="sm" variant="secondary" icon="astrolabe"
                onClick={() => openArchitect && openArchitect({ subjectId: subject?.id || 'dc', topicId: topic?.id, origin: 'Treinar · armadilhas' })}>
                Abrir O Arquiteto
              </Button>
            </div>
          </details>
          <details ref={labRef} className="qb-train-fold qb-train-fold--nested">
            <summary>Laboratório de mecanismos</summary>
            <div className="qb-train-fold__body"><PegadinhasLab questions={QB_DATA.questionBank} subjects={E.subjects} go={go} /></div>
          </details>
          {isAdmin && (
            <details className="qb-train-fold qb-train-fold--nested">
              <summary>Acervo de pegadinhas</summary>
              <div className="qb-train-fold__body"><AcervoPegadinhasV1 questions={QB_DATA.questionBank} subjects={E.subjects} go={go} /></div>
            </details>
          )}
        </div>
      </details>
    </div>
  );
}
export { TrainScreen };