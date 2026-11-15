import React from 'react';
import { BrandHeader } from '@/components/qb/navigation/BrandHeader';
import { StudySessionHeader } from '@/components/qb/study/StudySessionHeader';
import { QuestionCard } from '@/components/qb/questions/QuestionCard';
import { AnswerActionBar } from '@/components/qb/questions/AnswerActionBar';
import { FeedbackDrawer } from '@/components/qb/questions/FeedbackDrawer';
import { CognitiveAlertBanner } from '@/components/qb/study/CognitiveAlertBanner';
import { Panel } from '@/components/qb/core/Panel';
import { Badge } from '@/components/qb/core/Badge';
import { Button } from '@/components/qb/core/Button';
import { buildAnswerRecord } from '@/lib/study-store';
import { useRealStudy } from '@/lib/qb-real-data';

function SessionSummary({ answers, go, qs }) {
  const right = qs.filter(q => answers[q.id] && answers[q.id].answer === q.key).length;
  return (
    <Panel variant="ornate" style={{ display: 'flex', flexDirection: 'column', gap: 18 }} padding={32}>
      <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Sessão concluída</span>
      <h1 style={{ font: 'var(--type-h1)' }}>{right} de {qs.length} acertos</h1>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {qs.map(q => { const a = answers[q.id]; const ok = a && a.answer === q.key; return (
          <li key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
            <span style={{ font: '500 13px/1 var(--font-mono)', color: 'var(--text-muted)', width: 56 }}>{q.code}</span>
            <span style={{ flex: 1, font: '400 14px/1.4 var(--font-body)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.statement}</span>
            <Badge tone={!a ? 'no-evidence' : ok ? 'correct' : 'incorrect'}>{!a ? 'Pulada' : ok ? 'Acertou' : 'Errou'}</Badge>
          </li>); })}
      </ul>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Button iconRight="arrow-right" onClick={() => go('flashcards')}>Seguir para flashcards</Button>
        <Button variant="secondary" icon="house" onClick={() => go('dashboard')}>Voltar ao início</Button>
      </div>
    </Panel>
  );
}

export default function QuestionSessionView({ session, setSession, elapsed, paused, onTogglePause, go }) {
  const {QB_DATA,save}=useRealStudy();
  const qs=session.questionIds ? session.questionIds.map(id=>QB_DATA.questionBank.find(q=>q.id===id)).filter(Boolean):QB_DATA.questionBank.slice(0,20);
  const { idx, answers, drawer, focus, bannerDismissed } = session;
  const done = idx >= qs.length;
  const q = qs[Math.min(idx, qs.length - 1)];
  const st = answers[q?.id] || {};
  const [loading, setLoading] = React.useState(false);
  const [error,setError]=React.useState('');
  const lock=React.useRef(false);
  const patch = p => setSession(s => ({ ...s, ...p }));
  const setAns = p => setSession(s => ({ ...s, answers: { ...s.answers, [q.id]: { ...(s.answers[q.id] || {}), ...p } } }));
  const confirm = async () => {
    if (!q || !st.answer || st.revealed || lock.current) return;
    lock.current=true;setLoading(true);setError('');
    try {
      const record=buildAnswerRecord({question:q.raw,prev:q.response,marked:st.answer,confidence:Number(st.confidence)||null}).record;
      if (q.response?.hist) record.hist=[...q.response.hist,...record.hist.slice(-1)];
      await save('respostas',q.id,record);
      setAns({revealed:true});patch({drawer:true});
    }catch{setError('Não foi possível salvar a resposta. Tente novamente.');}
    finally{lock.current=false;setLoading(false);}
  };
  const next = async () => {
    if(lock.current||done)return;
    if(idx+1===qs.length){
      const items=qs.filter(x=>answers[x.id]?.revealed).map(x=>({qid:x.id,marcada:answers[x.id].answer,gabarito:x.key}));
      if(items.length){
        lock.current=true;setLoading(true);
        try{const certos=items.filter(x=>x.marcada===x.gabarito).length,brancos=items.filter(x=>x.marcada==='B').length;
          await save('rodadas','qbasc-'+(session.sessionId||items[0].qid+'-'+Date.now()),{inicio:session.startedAt||new Date().toISOString(),fim:new Date().toISOString(),modo:'treino-qbasc',itens:items,total:items.length,certos,brancos,errados:items.length-certos-brancos});
        }catch{setError('Não foi possível salvar a rodada. Tente novamente.');return;}finally{lock.current=false;setLoading(false);}
      }
    }
    patch({idx:idx+1,drawer:false});
  };
  const openConcept = () => go('map', { node: q.node, topicId:q.topicId, returnTo: { label: `questão ${q.code}`, view: 'questions' } });
  const wrong = qs.filter(x => answers[x.id] && answers[x.id].revealed && answers[x.id].answer !== x.key);

  React.useEffect(() => {
    const onKey = e => {
      if (done || e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (!st.revealed && (k === 'c' || k === 'e')) setAns({ answer: k.toUpperCase() });
      if (e.key === 'Enter') { st.revealed ? next() : confirm(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!focus && (
        <BrandHeader variant="compact" floating={false} onExit={() => go('dashboard')}>
          <span className="qb-overline">Sessão de questões</span>
          <span style={{ font: '400 16px/1.2 var(--font-heading)', color: 'var(--text-primary)' }}>{q?.chapter || 'Treinar'}</span>
        </BrandHeader>
      )}
      <StudySessionHeader subject={q?.subject || "Questões"} topic={q?.chapter || ""} current={Math.min(idx + 1, qs.length)} total={qs.length} elapsed={elapsed} paused={paused} onTogglePause={onTogglePause} focusMode={focus} onToggleFocus={() => patch({ focus: !focus })} onBack={() => go('dashboard')} />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <main style={{ width: '100%', maxWidth: 820, margin: '0 auto', padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <p role="alert">{error}</p>}
          {!qs.length?<Panel>Sem questões para este tópico. <Button onClick={()=>go('train')}>Voltar a Treinar</Button></Panel>:done ? <SessionSummary answers={answers} go={go} qs={qs} /> : (
            <>
              {!focus && wrong.length > 0 && !bannerDismissed && (
                <CognitiveAlertBanner tone="attention" title={`${wrong.length} ${wrong.length > 1 ? 'erros' : 'erro'} nesta sessão`} onDismiss={() => patch({ bannerDismissed: true })}
                  actions={<Button size="sm" variant="secondary" icon="network" onClick={() => go('map', { node: wrong[wrong.length - 1].node, returnTo: { label: `questão ${q.code}`, view: 'questions' } })}>Revisar o conceito no mapa</Button>}>
                  O último erro foi em “{QB_DATA.mapNodes.find(n => n.id === wrong[wrong.length - 1].node)?.label || wrong[wrong.length - 1].chapter}”.
                </CognitiveAlertBanner>
              )}
              <QuestionCard key={q.id} code={q.code} year={q.year} exam={QB_DATA.exam} tags={q.tags} statement={q.statement}
                answer={st.answer || null} onAnswer={a => setAns({ answer: a })} confidence={st.confidence || null} onConfidence={c => setAns({ confidence: c })}
                answerKey={st.revealed ? q.key : null} bookmarked={!!st.bookmarked} onBookmark={() => setAns({ bookmarked: !st.bookmarked })}
                conceptLink={q.node ? { label: `Ver no mapa: ${QB_DATA.mapNodes.find(n => n.id === q.node)?.label || q.chapter}`, onClick: openConcept } : undefined} />
            </>
          )}
        </main>
        {!done && (
          <FeedbackDrawer open={drawer && st.revealed} onClose={() => patch({ drawer: false })} result={st.answer === q.key ? 'correct' : 'incorrect'} answerKey={q.key}
            explanation={q.explanation} legalBasis={q.basis} trap={q.trap}
            concept={{ path: (() => { const p = []; let n = QB_DATA.mapNodes.find(x => x.id === q.node); while (n) { p.unshift(n.label); n = QB_DATA.mapNodes.find(x => x.id === n.parent); } return p; })() }}
            onOpenConcept={openConcept} onFlashcards={() => go('flashcards',{topicId:q.topicId})} />
        )}
      </div>
      {!done && (
        <AnswerActionBar sticky state={st.revealed ? 'answered' : loading ? 'loading' : st.answer ? 'ready' : 'idle'}
          onConfirm={confirm} onNext={next} onSkip={next} onReview={() => setAns({ bookmarked: !st.bookmarked })} reviewMarked={!!st.bookmarked}
          onOpenFeedback={() => patch({ drawer: true })} />
      )}
    </div>
  );
}
export { QuestionSessionView, QuestionSessionView as QuestionSession };
