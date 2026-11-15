import React from 'react';
import { BrandHeader } from '@/components/qb/navigation/BrandHeader';
import { StudySessionHeader } from '@/components/qb/study/StudySessionHeader';
import EditorialCurator from '@/components/qb/study/EditorialCurator';
import { QuestionCard } from '@/components/qb/questions/QuestionCard';
import { AnswerActionBar } from '@/components/qb/questions/AnswerActionBar';
import { FeedbackDrawer } from '@/components/qb/questions/FeedbackDrawer';
import { CognitiveAlertBanner } from '@/components/qb/study/CognitiveAlertBanner';
import { Panel } from '@/components/qb/core/Panel';
import { Badge } from '@/components/qb/core/Badge';
import { Button } from '@/components/qb/core/Button';
import { buildAnswerRecord } from '@/lib/study-store';
import { useRealStudy } from '@/lib/qb-real-data';
import { pickQuestionRound } from '@/lib/study-session-rules';

function SessionSummary({ answers, go, qs, ganBatch }) {
  const right = qs.filter(q => answers[q.id] && answers[q.id].answer === (answers[q.id].keyAtAnswer || q.key)).length;
  const blocked = ganBatch?.blocked || [];
  return (
    <Panel variant="ornate" style={{ display: 'flex', flexDirection: 'column', gap: 18 }} padding={32}>
      <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>
        {ganBatch ? `Confronto GAN concluído · ${ganBatch.originNodeLabel}` : 'Sessão concluída'}
      </span>
      <h1 style={{ font: 'var(--type-h1)' }}>{right} de {qs.length} acertos</h1>
      {ganBatch?.summary && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone="gold">Score médio GAN: {ganBatch.summary.mediaScoreGan}%</Badge>
          <Badge tone="correct">Aprovadas no teste cego: {ganBatch.summary.aprovadasDireto}</Badge>
          {ganBatch.summary.refinadasGan > 0 && <Badge tone="attention">Refinadas pela GAN: {ganBatch.summary.refinadasGan}</Badge>}
          {blocked.length > 0 && <Badge tone="incorrect">Bloqueadas por divergência: {blocked.length}</Badge>}
        </div>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {qs.map(q => {
          const a = answers[q.id];
          const ok = a && a.answer === (a.keyAtAnswer || q.key);
          return (
            <li key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
              <span style={{ font: '500 13px/1 var(--font-mono)', color: 'var(--text-muted)', width: 64 }}>{q.code}</span>
              <span style={{ flex: 1, font: '400 14px/1.4 var(--font-body)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.statement}</span>
              <Badge tone={!a ? 'no-evidence' : ok ? 'correct' : 'incorrect'}>{!a ? 'Pulada' : ok ? 'Acertou' : 'Errou'}</Badge>
            </li>
          );
        })}
      </ul>
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
        <Button variant={ganBatch?.originNodeId ? 'secondary' : 'primary'} iconRight="arrow-right" onClick={() => go('flashcards', { topicId: ganBatch?.topicId })}>
          Seguir para flashcards
        </Button>
        <Button variant="secondary" icon="house" onClick={() => go('dashboard')}>
          Voltar ao início
        </Button>
      </div>
    </Panel>
  );
}

export default function QuestionSessionView({ session, setSession, elapsed, paused, onTogglePause, go, backTo }) {
  const { QB_DATA, save } = useRealStudy();
  const qs = session.questionIds
    ? session.questionIds
        .map(id => session.customQuestions?.[id] || QB_DATA.questionBank.find(q => q.id === id))
        .filter(q => q && q.statusConfronto !== 'divergencia_bloqueada')
    : pickQuestionRound(QB_DATA.questionBank);

  const { idx, answers, drawer, focus, bannerDismissed, ganBatch } = session;
  const [ganBannerDismissed, setGanBannerDismissed] = React.useState(false);
  React.useEffect(() => {
    setGanBannerDismissed(false);
  }, [session.sessionId]);

  const done = idx >= qs.length;
  const q = qs[Math.min(idx, Math.max(qs.length - 1, 0))];
  const st = answers[q?.id] || {};
  const keyAtAnswer = st.revealed ? (st.keyAtAnswer || q?.key) : q?.key;
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const lock = React.useRef(false);
  const patch = p => setSession(s => ({ ...s, ...p }));
  const setAns = p => setSession(s => ({ ...s, answers: { ...s.answers, [q.id]: { ...(s.answers[q.id] || {}), ...p } } }));

  const confirm = async () => {
    if (!q || !st.answer || st.revealed || lock.current) return;
    lock.current = true;
    setLoading(true);
    setError('');
    try {
      const confMap = { baixa: 1, media: 2, alta: 3 };
      const numericConf = confMap[st.confidence] || Number(st.confidence) || null;
      const rawQuestion = { ...(q.raw || { id: q.id, cap: q.topicId || '' }), gabarito: q.key };
      const record = buildAnswerRecord({
        question: rawQuestion,
        prev: q.response,
        marked: st.answer,
        confidence: numericConf,
      }).record;
      if (q.response?.hist) record.hist = [...q.response.hist, ...record.hist.slice(-1)];
      record.gabaritoUsado = q.key;
      if (q.editorial?.version) record.versaoEditorial = q.editorial.version;
      await save('respostas', q.id, record);
      setAns({ revealed: true, keyAtAnswer: q.key });
      patch({ drawer: true });
    } catch {
      setError('Não foi possível salvar a resposta. Tente novamente.');
    } finally {
      lock.current = false;
      setLoading(false);
    }
  };

  const next = async () => {
    if (lock.current || done) return;
    if (idx + 1 === qs.length) {
      const items = qs.filter(x => answers[x.id]?.revealed).map(x => ({ qid: x.id, marcada: answers[x.id].answer, gabarito: answers[x.id].keyAtAnswer || x.key }));
      if (items.length) {
        lock.current = true;
        setLoading(true);
        try {
          const certos = items.filter(x => x.marcada === x.gabarito).length;
          const brancos = items.filter(x => x.marcada === 'B').length;
          await save('rodadas', 'qbasc-' + (session.sessionId || items[0].qid + '-' + Date.now()), {
            inicio: session.startedAt || new Date().toISOString(),
            fim: new Date().toISOString(),
            modo: ganBatch ? 'gan-mapa-qbasc' : 'treino-qbasc',
            itens: items,
            total: items.length,
            certos,
            brancos,
            errados: items.length - certos - brancos,
          });
        } catch {
          setError('Não foi possível salvar a rodada. Tente novamente.');
          return;
        } finally {
          lock.current = false;
          setLoading(false);
        }
      }
    }
    patch({ idx: idx + 1, drawer: false });
  };

  const openConcept = () => go('map', { node: q.node, topicId: q.topicId, returnTo: { label: `questão ${q.code}`, view: 'questions' } });
  const wrong = qs.filter(x => answers[x.id] && answers[x.id].revealed && answers[x.id].answer !== (answers[x.id].keyAtAnswer || x.key));

  React.useEffect(() => {
    const onKey = e => {
      if (done || e.target?.isContentEditable || e.target?.closest?.('[data-qb-editorial]') || ['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (!st.revealed && (k === 'c' || k === 'e')) setAns({ answer: k.toUpperCase() });
      if (e.key === 'Enter') {
        st.revealed ? next() : confirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!focus && (
        <BrandHeader variant="compact" floating={false} onExit={() => (ganBatch?.originNodeId ? go('map', { node: ganBatch.originNodeId, topicId: ganBatch.topicId }) : go(backTo || 'dashboard'))}>
          <span className="qb-overline">{ganBatch ? 'Sessão GAN · Mapa Mental' : 'Sessão de questões'}</span>
          <span style={{ font: '400 16px/1.2 var(--font-heading)', color: 'var(--text-primary)' }}>{q?.chapter || 'Treinar'}</span>
        </BrandHeader>
      )}
      <StudySessionHeader
        subject={q?.subject || 'Questões'}
        topic={q?.chapter || ''}
        current={Math.min(idx + 1, qs.length)}
        total={qs.length}
        elapsed={elapsed}
        paused={paused}
        onTogglePause={onTogglePause}
        focusMode={focus}
        onToggleFocus={() => patch({ focus: !focus })}
        onBack={() => (ganBatch?.originNodeId ? go('map', { node: ganBatch.originNodeId, topicId: ganBatch.topicId }) : go(backTo || 'dashboard'))}
      />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <main style={{ width: '100%', maxWidth: 820, margin: '0 auto', padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <p role="alert">{error}</p>}
          {!qs.length ? (
            <Panel>
              Sem questões para este tópico. <Button onClick={() => go('train')}>Voltar a Treinar</Button>
            </Panel>
          ) : done ? (
            <SessionSummary answers={answers} go={go} qs={qs} ganBatch={ganBatch} />
          ) : (
            <>
              {!focus && ganBatch && !ganBannerDismissed && (
                <CognitiveAlertBanner
                  tone={ganBatch.blocked?.length ? 'attention' : 'info'}
                  title={`Confronto GAN · Nó “${ganBatch.originNodeLabel}” (${ganBatch.summary?.aprovadasDireto || 0} aprovadas · ${ganBatch.summary?.refinadasGan || 0} refinadas · Score ${ganBatch.summary?.mediaScoreGan || 85}%)`}
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
                    <span>Todos os itens desta sessão superaram o confronto cego Gerador × Discriminador no padrão CEBRASPE.</span>
                  )}
                </CognitiveAlertBanner>
              )}
              {!focus && wrong.length > 0 && !bannerDismissed && (
                <CognitiveAlertBanner
                  tone="attention"
                  title={`${wrong.length} ${wrong.length > 1 ? 'erros' : 'erro'} nesta sessão`}
                  onDismiss={() => patch({ bannerDismissed: true })}
                  actions={
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="network"
                      onClick={() => go('map', { node: wrong[wrong.length - 1].node, returnTo: { label: `questão ${q.code}`, view: 'questions' } })}
                    >
                      Revisar o conceito no mapa
                    </Button>
                  }
                >
                  O último erro foi em “{QB_DATA.mapNodes.find(n => n.id === wrong[wrong.length - 1].node)?.label || wrong[wrong.length - 1].chapter}”.
                </CognitiveAlertBanner>
              )}
              <QuestionCard
                key={q.id}
                code={q.code}
                year={q.year}
                exam={QB_DATA.exam}
                tags={q.tags}
                statement={q.statement}
                editorial={q.editorial}
                answer={st.answer || null}
                onAnswer={a => setAns({ answer: a })}
                confidence={st.confidence || null}
                onConfidence={c => setAns({ confidence: c })}
                answerKey={st.revealed ? keyAtAnswer : null}
                bookmarked={!!st.bookmarked}
                onBookmark={() => setAns({ bookmarked: !st.bookmarked })}
                conceptLink={q.node ? { label: `Ver no mapa: ${QB_DATA.mapNodes.find(n => n.id === q.node)?.label || q.chapter}`, onClick: openConcept } : undefined}
              />
              {st.revealed && QB_DATA.questionBank.some(item => item.id === q.id) && (
                <EditorialCurator key={q.id} kind="question" item={q} topicLabel={q.chapter || q.topicId || q.subject} />
              )}
            </>
          )}
        </main>
        {!done && (
          <FeedbackDrawer
            open={drawer && st.revealed}
            onClose={() => patch({ drawer: false })}
            result={st.answer === keyAtAnswer ? 'correct' : 'incorrect'}
            answerKey={keyAtAnswer}
            explanation={q.explanation}
            legalBasis={q.basis}
            trap={q.trap}
            concept={{
              path: (() => {
                const p = [];
                let n = QB_DATA.mapNodes.find(x => x.id === q.node);
                while (n) {
                  p.unshift(n.label);
                  n = QB_DATA.mapNodes.find(x => x.id === n.parent);
                }
                return p.length ? p : [q.chapter || 'Conceito'];
              })(),
            }}
            onOpenConcept={openConcept}
            onFlashcards={() => go('flashcards', { topicId: q.topicId })}
          />
        )}
      </div>
      {!done && (
        <AnswerActionBar
          sticky
          state={st.revealed ? 'answered' : loading ? 'loading' : st.answer ? 'ready' : 'idle'}
          onConfirm={confirm}
          onNext={next}
          onSkip={next}
          onReview={() => setAns({ bookmarked: !st.bookmarked })}
          reviewMarked={!!st.bookmarked}
          onOpenFeedback={() => patch({ drawer: true })}
        />
      )}
    </div>
  );
}
export { QuestionSessionView, QuestionSessionView as QuestionSession };