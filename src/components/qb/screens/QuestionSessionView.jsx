import React from 'react';
import { BrandHeader } from '@/components/qb/navigation/BrandHeader';
import { StudySessionHeader } from '@/components/qb/study/StudySessionHeader';
import EditorialCurator from '@/components/qb/study/EditorialCurator';
import { QuestionCard } from '@/components/qb/questions/QuestionCard';
import { AnswerActionBar } from '@/components/qb/questions/AnswerActionBar';
import { ConfirmDialog } from '@/components/qb/feedback/ConfirmDialog';
import { QuestionFeedback } from '@/components/qb/questions/QuestionFeedback';
import { CognitiveAlertBanner } from '@/components/qb/study/CognitiveAlertBanner';
import { Panel } from '@/components/qb/core/Panel';
import { Badge } from '@/components/qb/core/Badge';
import { Button } from '@/components/qb/core/Button';
import { buildAnswerRecord } from '@/lib/study-store';
import { buildErrorReflection, findErrorReflection, questionTrap } from '@/lib/question-feedback';
import { useRealStudy } from '@/lib/qb-real-data';
import { nextQuestionIndex, questionRoundProgress } from '@/lib/study-session-rules';
import { mechanismOptionList } from '@/lib/cebraspe-v1-taxonomy';
import { QuestionFilters } from '@/components/qb/questions/QuestionFilters';
import { useStudyActivity, useStudyCompletion } from '@/lib/StudyClockContext';

function SessionSummary({ answers, go, qs, ganBatch, scheduledReview }) {
  const [showItems, setShowItems] = React.useState(false);
  const answered = qs.filter(q => answers[q.id]?.revealed);
  const right = answered.filter(q => answers[q.id].answer === (answers[q.id].keyAtAnswer || q.key)).length;
  const blocked = ganBatch?.blocked || [];
  return (
    <Panel variant="ornate" style={{ display: 'flex', flexDirection: 'column', gap: 18 }} padding={32}>
      <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>
        {ganBatch ? `Confronto GAN concluído · ${ganBatch.originNodeLabel}` : 'Sessão concluída'}
      </span>
      <h1 style={{ font: 'var(--type-h1)' }}>{right} de {answered.length} respostas corretas</h1>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{answered.length} confirmadas · {qs.length - answered.length} puladas</p>
      {ganBatch?.summary && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Number.isFinite(ganBatch.summary.mediaScoreGan) && <Badge tone="gold">Score médio GAN: {ganBatch.summary.mediaScoreGan}%</Badge>}
          {ganBatch.summary.aprovadasManual > 0 && <Badge tone="correct">Aprovadas em revisão manual: {ganBatch.summary.aprovadasManual}</Badge>}
          {ganBatch.summary.aprovadasDireto > 0 && <Badge tone="correct">Aprovadas no teste cego: {ganBatch.summary.aprovadasDireto}</Badge>}
          {ganBatch.summary.refinadasGan > 0 && <Badge tone="attention">Refinadas pela GAN: {ganBatch.summary.refinadasGan}</Badge>}
          {blocked.length > 0 && <Badge tone="incorrect">Bloqueadas por divergência: {blocked.length}</Badge>}
        </div>
      )}
      <div><Button variant="secondary" size="sm" aria-expanded={showItems} onClick={() => setShowItems(open => !open)}>{showItems ? 'Recolher resultados' : 'Ver resultados por questão'}</Button></div>
      {showItems && <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {qs.map(q => {
          const a = answers[q.id]?.revealed ? answers[q.id] : null;
          const ok = a && a.answer === (a.keyAtAnswer || q.key);
          return (
            <li key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
              <span style={{ font: '500 13px/1 var(--font-mono)', color: 'var(--text-muted)', width: 64 }}>{q.code}</span>
              <span style={{ flex: 1, font: '400 14px/1.4 var(--font-body)', color: 'var(--text-secondary)' }}>{q.chapter || q.subject || ''}</span>
              <Badge tone={!a ? 'no-evidence' : ok ? 'correct' : 'incorrect'}>{!a ? 'Pulada' : ok ? 'Acertou' : 'Errou'}</Badge>
            </li>
          );
        })}
      </ul>}
      {blocked.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, borderRadius: 12, background: 'var(--surface-sunken)', border: '1px solid var(--divider)' }}>
          <span className="qb-overline" style={{ color: 'var(--state-incorrect)' }}>
            Questões bloqueadas por divergência (não apresentadas para resolução)
          </span>
          {blocked.map(b => (
            <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 6, borderTop: '1px solid var(--divider)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Badge tone="incorrect">Não aprovada · Divergência bloqueada</Badge>
                <span style={{ font: '500 12px/1.2 var(--font-mono)', color: 'var(--text-muted)' }}>
                  {b.code} · {b.mecanismo} · Gerador: {b.gabaritoGerador} × Discriminador Cego: {b.gabaritoDiscriminador}
                </span>
              </div>
              <span style={{ font: '400 13px/1.45 var(--font-body)', color: 'var(--text-secondary)' }}>{b.enunciado}</span>
              <span style={{ font: '400 12px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>{b.criticaAdversaria}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {ganBatch?.originNodeId && (
          <Button icon="network" onClick={() => go('map', { node: ganBatch.originNodeId, topicId: ganBatch.topicId })}>
            Voltar ao nó no mapa mental
          </Button>
        )}
        {!scheduledReview && <Button variant={ganBatch?.originNodeId ? 'secondary' : 'primary'} iconRight="arrow-right" onClick={() => go('flashcards', { topicId: ganBatch?.topicId })}>
          Seguir para flashcards
        </Button>}
        <Button variant="secondary" icon="chart-column" onClick={() => go('performance', 'diaria')}>Ver desempenho diário</Button>
        <Button variant="secondary" icon="target" onClick={() => go('train')}>Voltar a Treinar</Button>
      </div>
    </Panel>
  );
}

export default function QuestionSessionView({ session, setSession, go, backTo }) {
  const { QB_DATA, records, save, isAdmin, questionEditorialAccess } = useRealStudy();
  const qs = React.useMemo(() => {
    if (!session.questionIds?.length) return [];
    const bank = new Map(QB_DATA.questions.map(q => [q.id, q]));
    return [...new Set(session.questionIds)]
      .map(id => session.customQuestions?.[id] || bank.get(id))
      .filter(q => q && q.statusConfronto !== 'divergencia_bloqueada');
  }, [session.questionIds, session.customQuestions, QB_DATA.questions]);

  const { idx, answers, focus, ganBatch } = session;
  const scheduledReview = !!session.selection?.scheduledReview;
  const concept = session.selection?.concept;
  const origin = concept || (ganBatch?.originNodeId ? { nodeId: ganBatch.originNodeId, topicId: ganBatch.topicId } : null);
  const returnFromQuestions = () => origin ? go('map', { node: origin.nodeId, topicId: origin.topicId }) : go(backTo || 'dashboard');
  const [ganBannerDismissed, setGanBannerDismissed] = React.useState(false);
  React.useEffect(() => {
    setGanBannerDismissed(false);
  }, [session.sessionId]);

  const done = session.finished || idx >= qs.length;
  const roundProgress = questionRoundProgress(qs, idx, answers, QB_DATA.excludedQuestionIds);
  const q = qs[idx];
  const excluded = q && QB_DATA.excludedQuestionIds.has(q.id);
  useStudyActivity('questions', !q || excluded ? null : session.sessionId || 'round');
  const recordCompletion = useStudyCompletion('questions');
  const st = answers[q?.id] || {};
  const keyAtAnswer = st.revealed ? (st.keyAtAnswer || q?.key) : q?.key;
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const deletingCurrent = !!q && deleteTarget?.id === q.id;
  const lock = React.useRef(false);
  const reflectionAnchor = React.useRef(null);
  const reflectionDraft = React.useRef(null);
  const [reflectionError, setReflectionError] = React.useState('');
  const [reflectionSaving, setReflectionSaving] = React.useState(false);
  const needsReflection = st.revealed && st.answer !== keyAtAnswer && !excluded;
  const savedReflection = needsReflection
    ? (st.savedReflection?.tentativaEm === st.attemptAt ? st.savedReflection : undefined)
      || findErrorReflection(records.justificativas, q?.id, st.attemptAt, QB_DATA.answers[q?.id])
    : undefined;
  const patch = p => setSession(s => s.sessionId === session.sessionId && s.idx === idx ? { ...s, ...p } : s);
  const setAns = p => setSession(s => {
    if (s.sessionId !== session.sessionId || s.idx !== idx) return s;
    return { ...s, answers: { ...s.answers, [q.id]: { ...s.answers[q.id], ...p } } };
  });
  const chooseAnswer = p => {
    if (lock.current || st.revealed) return;
    setAns(p.answer && p.answer !== st.answer ? { ...p, mechanism: '', clue: '' } : p);
  };
  const options = mechanismOptionList(st.answer).sort((a, b) => Number(a.value.slice(1)) - Number(b.value.slice(1)));
  const markedMechanism = options.find(option => option.value === st.mechanism);

  const confirm = async () => {
    if (!q || excluded || !st.answer || st.revealed || lock.current) return;
    lock.current = true;
    setLoading(true);
    setError('');
    try {
      const confMap = { baixa: 1, media: 2, alta: 3 };
      const numericConf = confMap[st.confidence] || Number(st.confidence) || null;
      const rawQuestion = { ...(q.raw || { id: q.id, cap: q.topicId || '' }), gabarito: q.key };
      const previous = QB_DATA.answers[q.id] || q.response;
      const record = buildAnswerRecord({
        question: rawQuestion,
        prev: previous,
        marked: st.answer,
        confidence: numericConf,
      }).record;
      const attempt = { ...record.hist.at(-1), sessionId: session.sessionId, gabarito: q.key };
      if (scheduledReview) attempt.rev = true;
      if (markedMechanism) attempt.mecanismoIdentificado = markedMechanism.value;
      if (st.clue?.trim()) attempt.trechoIdentificado = st.clue.trim();
      record.hist = [...(Array.isArray(previous?.hist) ? previous.hist : []), attempt];
      record.gabaritoUsado = q.key;
      if (q.editorial?.version) record.versaoEditorial = q.editorial.version;
      await save('respostas', q.id, record);
      recordCompletion();
      setAns({ revealed: true, answer: st.answer, confidence: st.confidence, keyAtAnswer: q.key, attemptAt: record.atualizadoEm, nextReviewDate: record.proxRevisao });
    } catch {
      setError('Não foi possível salvar a resposta. Tente novamente.');
    } finally {
      lock.current = false;
      setLoading(false);
    }
  };

  const saveReflection = async draft => {
    if (!needsReflection || savedReflection || lock.current) return;
    lock.current = true;
    setReflectionSaving(true);
    setReflectionError('');
    try {
      const note = buildErrorReflection({ ...draft, questionId: q.id, sessionId: session.sessionId, attemptAt: st.attemptAt, marked: st.answer });
      const saved = await save('justificativas', note.id, note);
      setAns({ savedReflection: saved, reflectionDraft: undefined });
    } catch {
      setReflectionError('Não foi possível salvar a justificativa. Seu texto está nesta questão. Tente novamente.');
    } finally {
      lock.current = false;
      setReflectionSaving(false);
    }
  };

  const advance = async ({ deletingId } = {}) => {
    if (lock.current || done) return;
    const nextIdx = nextQuestionIndex(qs, idx + 1, QB_DATA.excludedQuestionIds, deletingId);
    if (needsReflection && !deletingId && !savedReflection) {
      reflectionAnchor.current?.focus();
      return;
    }
    lock.current = true;
    setLoading(true);
    setError('');
    try {
      const finished = nextIdx >= qs.length;
      if (finished) {
        const items = qs.filter(x => answers[x.id]?.revealed).map(x => ({ qid: x.id, marcada: answers[x.id].answer, gabarito: answers[x.id].keyAtAnswer || x.key, em: answers[x.id].attemptAt }));
        if (items.length) {
          const certos = items.filter(x => x.marcada === x.gabarito).length;
          const brancos = items.filter(x => x.marcada === 'B').length;
          await save('rodadas', 'qbasc-' + (session.sessionId || items[0].qid + '-' + Date.now()), {
            inicio: session.startedAt || new Date().toISOString(),
            fim: new Date().toISOString(),
            modo: scheduledReview ? 'revisao-qbasc' : ganBatch ? 'gan-mapa-qbasc' : 'treino-qbasc',
            itens: items,
            total: items.length,
            certos,
            brancos,
            errados: items.length - certos - brancos,
          });
        }
      }
      patch({ idx: nextIdx, finished });
    } catch {
      setError('Não foi possível salvar a rodada. Tente novamente.');
    } finally {
      lock.current = false;
      setLoading(false);
    }
  };
  const next = () => advance();

  const excludeQuestion = async () => {
    if (!deletingCurrent || lock.current) return;
    lock.current = true;
    setLoading(true);
    setError('');
    try {
      await save('questoes_excluidas', q.id, { excluidaEm: new Date().toISOString() });
      setDeleteTarget(null);
    } catch {
      setError('Não foi possível excluir a questão. Tente novamente.');
      return;
    } finally {
      lock.current = false;
      setLoading(false);
    }
    await advance({ deletingId: q.id });
  };

  const openConcept = () => {
    if (needsReflection && !savedReflection && reflectionDraft.current?.questionId === q.id) {
      setAns({ reflectionDraft: reflectionDraft.current.value });
    }
    go('map', { node: q.node, topicId: q.topicId, returnTo: { label: `questão ${q.code}`, view: 'questions' } });
  };
  const stageRef = React.useRef(null);
  const correctionRef = React.useRef(null);
  const showCorrection = !!st.revealed && !excluded;
  const questionId = q?.id;
  const stageKey = session.sessionId + ':' + (done ? 'summary' : questionId || 'empty');
  React.useEffect(() => {
    setReflectionError('');
    stageRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [stageKey]);

  React.useEffect(() => {
    if (questionId && showCorrection) correctionRef.current?.scrollIntoView({ block: 'nearest' });
  }, [questionId, showCorrection]);

  React.useEffect(() => {
    const onKey = e => {
      if (done || excluded || deletingCurrent || e.repeat || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.target?.isContentEditable || e.target?.closest?.('[data-qb-editorial], [data-qb-architect], input, textarea, select, button, a, summary')) return;
      const k = e.key.toLowerCase();
      if (k === 'c' || k === 'e') chooseAnswer({ answer: k.toUpperCase() });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!focus && (
        <BrandHeader variant="compact" floating={false} onExit={returnFromQuestions}>
          <span className="qb-overline">{ganBatch ? 'Sessão GAN · Mapa Mental' : scheduledReview ? 'Revisão espaçada · Questões' : session.selection?.randomOrder ? 'Treino aleatório' : 'Sessão de questões'}</span>
          <span style={{ font: '400 16px/1.2 var(--font-heading)', color: 'var(--text-primary)' }}>{concept?.label || q?.chapter || 'Treinar'}</span>
        </BrandHeader>
      )}
      <StudySessionHeader
        subject={q?.subject || 'Questões'}
        topic={concept?.label || q?.chapter || ''}
        current={done ? 0 : roundProgress.position}
        total={roundProgress.total}
        completed={roundProgress.completed}
        focusMode={focus}
        onToggleFocus={() => patch({ focus: !focus })}
        onBack={returnFromQuestions}
      />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <main key={stageKey} ref={stageRef} tabIndex={-1} data-current-question={done ? undefined : questionId} style={{ width: '100%', maxWidth: 820, margin: '0 auto', padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <p role="alert">{error}</p>}
          {!ganBatch && !scheduledReview && (!done && idx === 0 && !st.revealed || !qs.length) && session.questionIds && (
            <QuestionFilters value={session.selection?.filter} disabled={loading} onChange={filter => {
              setError('');
              go('questions', { ...session.selection, filter });
            }} />
          )}
          {!session.questionIds ? <p role="status">Preparando questões…</p> : !qs.length ? (
            <Panel>
              <p>{session.selection?.filter === 'wrong' ? 'Nenhuma questão errada nesta seleção.' : session.selection?.filter === 'unseen' ? 'Nenhuma questão inédita nesta seleção.' : 'Sem questões para esta seleção.'}</p>
              <Button onClick={concept ? returnFromQuestions : () => go('train')}>{concept ? 'Voltar ao conceito' : 'Voltar a Treinar'}</Button>
            </Panel>
          ) : done ? (
            <SessionSummary key={session.sessionId} answers={answers} go={go} qs={qs.filter(item => answers[item.id]?.revealed || !QB_DATA.excludedQuestionIds.has(item.id))} ganBatch={ganBatch} scheduledReview={scheduledReview} />
          ) : excluded ? (
            <Panel>
              <p>Esta questão foi excluída do banco ativo.</p>
              <Button disabled={loading} onClick={next}>{nextQuestionIndex(qs, idx + 1, QB_DATA.excludedQuestionIds) === qs.length ? 'Concluir rodada' : 'Continuar'}</Button>
            </Panel>
          ) : (
            <>
              {!focus && ganBatch && !ganBannerDismissed && (
                <CognitiveAlertBanner
                  tone={ganBatch.blocked?.length ? 'attention' : 'info'}
                  title={`Questões GAN · ${ganBatch.originNodeLabel}`}
                  onDismiss={() => setGanBannerDismissed(true)}
                  actions={
                    <Button size="sm" variant="secondary" icon="network" onClick={openConcept}>
                      Voltar ao nó no mapa mental
                    </Button>
                  }
                >
                  {ganBatch.blocked?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      <span>
                        {ganBatch.blocked.length} {ganBatch.blocked.length > 1 ? 'itens foram identificados como não aprovados' : 'item foi identificado como não aprovado'} por divergência no teste cego e não {ganBatch.blocked.length > 1 ? 'foram incluídos' : 'foi incluído'} nesta sessão:
                      </span>
                      {ganBatch.blocked.map(b => (
                        <div key={b.id} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--surface-sunken)', border: '1px solid var(--divider)', font: '400 12px/1.4 var(--font-body)' }}>
                          <Badge tone="incorrect">Não aprovada · {b.code}</Badge>{' '}
                          <span style={{ color: 'var(--text-primary)' }}>
                            Gerador: {b.gabaritoGerador} × Discriminador Cego: {b.gabaritoDiscriminador}
                          </span>{' '}
                          — {b.criticaAdversaria}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span>{ganBatch.summary?.aprovadasManual > 0
                      ? 'Esta sessão usa as questões gravadas após sua revisão.'
                      : 'Os itens desta sessão passaram pelo confronto cego.'}</span>
                  )}
                </CognitiveAlertBanner>
              )}
              <QuestionCard
                code={q.code}
                year={q.year}
                exam={QB_DATA.exam}
                tags={st.revealed ? q.tags : q.tags?.filter(tag => !/^(?:F(?:10|[1-9])|V[1-4])(?:$|[\s·:–—-])/i.test(tag))}
                statement={q.statement}
                editorial={q.editorial}
                answer={st.answer || null}
                onAnswer={a => chooseAnswer({ answer: a })}
                answerDetails={
                  <fieldset disabled={loading} style={{ display: 'grid', gap: 10, minWidth: 0, border: 0, margin: 0, padding: 0 }}>
                    <legend className="qb-overline" style={{ marginBottom: 10 }}>Identificar mecanismo da banca (opcional)</legend>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 205px), 1fr))', gap: 10 }}>
                      {options.map(option => (
                        <Button key={option.value} type="button" variant={st.mechanism === option.value ? 'primary' : 'secondary'}
                          aria-pressed={st.mechanism === option.value} onClick={() => chooseAnswer({ mechanism: st.mechanism === option.value ? '' : option.value })}
                          style={{ minHeight: 48, justifyContent: 'flex-start', padding: '9px 12px', textAlign: 'left', whiteSpace: 'normal' }}>
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span className="qb-overline">Trecho que chamou sua atenção (opcional)</span>
                      <input className="qb-input" value={st.clue || ''} maxLength={240} onChange={event => chooseAnswer({ clue: event.target.value })} />
                    </label>
                  </fieldset>
                }
                confidence={st.confidence || null}
                onConfidence={c => chooseAnswer({ confidence: c })}
                answerKey={showCorrection ? keyAtAnswer : null}
                correctionRef={correctionRef}
                feedback={showCorrection && (
                  <QuestionFeedback
                    key={q.id + ':' + (q.editorial?.version || q.raw?.editorialVersion || '')}
                    statement={q.statement}
                    answerKey={keyAtAnswer}
                    generatorName={(ganBatch || /^GAN\b/i.test(q.origin || '')) ? q.raw?.mecanismoNome : undefined}
                    generatorReference={!!ganBatch || /^GAN\b/i.test(q.origin || '')}
                    explanation={q.explanation}
                    legalBasis={q.basis}
                    trap={ganBatch && q.raw ? questionTrap(q.raw, undefined, keyAtAnswer) : q.trap}
                    identifiedMechanism={markedMechanism}
                    identifiedClue={st.clue?.trim()}
                    reflection={needsReflection ? {
                      saved: savedReflection,
                      initialDraft: st.reflectionDraft,
                      onDraftChange: value => { reflectionDraft.current = { questionId: q.id, value }; },
                      busy: reflectionSaving,
                      error: reflectionError,
                      anchor: reflectionAnchor,
                      onSave: saveReflection,
                    } : null}
                    onFlashcards={q.topicId ? () => go('flashcards', { topicId: q.topicId }) : undefined}
                  />
                )}
                bookmarked={!!st.bookmarked}
                onBookmark={() => setAns({ bookmarked: !st.bookmarked })}
                deleteDisabled={loading || reflectionSaving}
                onDelete={isAdmin ? () => {
                  setError('');
                  setDeleteTarget({ id: q.id, code: q.code || q.id });
                } : undefined}
                conceptLink={q.node ? { label: `Ver no mapa: ${QB_DATA.mapNodes.find(n => n.id === q.node)?.label || q.chapter}`, onClick: openConcept } : undefined}
              />
              {showCorrection && st.nextReviewDate && <Badge tone="neutral" icon="calendar-days">Próxima revisão · {st.nextReviewDate.split('-').reverse().join('/')}</Badge>}
              {questionEditorialAccess && st.revealed && QB_DATA.questionBank.some(item => item.id === q.id) && (
                <EditorialCurator key={q.id} kind="question" item={q} topicLabel={q.chapter || q.topicId || q.subject} />
              )}
            </>
          )}
        </main>
      </div>
      {!done && !excluded && (
        <AnswerActionBar
          sticky
          state={st.revealed ? 'answered' : loading ? 'loading' : st.answer ? 'ready' : 'idle'}
          onConfirm={confirm}
          onNext={next}
          nextDisabled={loading || reflectionSaving}
          lastQuestion={nextQuestionIndex(qs, idx + 1, QB_DATA.excludedQuestionIds) === qs.length}
          onSkip={next}
          onReview={() => setAns({ bookmarked: !st.bookmarked })}
          reviewMarked={!!st.bookmarked}
        />
      )}
      <ConfirmDialog
        open={deletingCurrent}
        tone="danger"
        title={`Excluir questão ${deleteTarget?.code || ''}?`}
        description="A questão sai dos novos treinos e simulados. As respostas e as rodadas já registradas ficam no histórico."
        confirmLabel={loading ? 'Excluindo…' : 'Excluir questão'}
        onConfirm={excludeQuestion}
        onCancel={() => { if (!lock.current) setDeleteTarget(null); }}
      >
        {error && <p role="alert">{error}</p>}
      </ConfirmDialog>
    </div>
  );
}
export { QuestionSessionView, QuestionSessionView as QuestionSession };