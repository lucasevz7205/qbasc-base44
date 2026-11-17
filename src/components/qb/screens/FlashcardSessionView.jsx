import React from 'react';
import { BrandHeader } from '@/components/qb/navigation/BrandHeader';
import { StudySessionHeader } from '@/components/qb/study/StudySessionHeader';
import { Flashcard } from '@/components/qb/flashcards/Flashcard';
import { FlashcardCorrection } from '@/components/qb/flashcards/FlashcardCorrection';
import EditorialCurator from '@/components/qb/study/EditorialCurator';
import { Panel } from '@/components/qb/core/Panel';
import { AchievementEmblem } from '@/components/qb/brand/AchievementEmblem';
import { Button } from '@/components/qb/core/Button';
import { useRealStudy } from '@/lib/qb-real-data';
import { studyDate } from '@/lib/qb-real-model';
import { flashcardWasRated, reviewDay } from '@/lib/spaced-review';
import { flashcardOptions } from '@/lib/study-session-rules';
import { FLASHCARD_FILTERS, advanceFlashcardSession, filterFlashcardDeck } from '@/lib/flashcard-review';
import { ChatMarkdown } from '@/components/qb/tutor/ChatMarkdown';
import { stripFlashcardContext } from '@/lib/flashcard-standard';
import FlashcardStandardPanel from '@/components/qb/study/FlashcardStandardPanel';

import { useStudyActivity, useStudyCompletion } from '@/lib/StudyClockContext';

export default function FlashcardSessionView({ cards, setCards, go, backTo }) {
  const {QB_DATA:D,QB_PLAN,save,isAdmin}=useRealStudy();
  const fullDeck = D.flashcards.filter(f => !cards.topicId || f.topicId === cards.topicId);
  const mode = cards.filter || 'all';
  const byId = new Map(fullDeck.map(c => [c.id, c]));
  const deck = cards.queue ? cards.queue.map(id => byId.get(id)).filter(Boolean) : fullDeck;
  const { idx, flipped, ratings } = cards;
  const done = idx >= deck.length;
  useStudyActivity('flashcards', done ? null : cards.sessionId || cards.topicId || 'deck');
  const recordCompletion = useStudyCompletion('flashcards');
  const card = deck[Math.min(idx, deck.length - 1)];
  const topicId = cards.topicId || card?.topicId;
  const subject = D.studySubjects?.find(item => item.topics.some(topic => topic.id === topicId));
  const topic = subject?.topics.find(item => item.id === topicId);
  const topicLabel = topic ? [topic.num, topic.title].filter(Boolean).join(' · ') : 'Seus cartões';
  const node = D.mapNodes.find(n => n.id === card?.node);
  const parent = node && D.mapNodes.find(n => n.id === node.parent);
  const [error,setError]=React.useState('');
  const [suggestion, setSuggestion] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const lock=React.useRef(false);
  const pickFilter = (filter) => {
    if (lock.current) return;
    const queue = filterFlashcardDeck(fullDeck, D.reviews, filter, QB_PLAN.today, studyDate).map(c => c.id);
    setError('');
    setSuggestion(null);
    setCards(c => ({ ...c, idx: 0, flipped: false, ratings: [], filter, queue }));
  };
  const previousReview = card ? D.reviews[card.id] || {} : {};
  const options = flashcardOptions(previousReview, reviewDay(new Date()));
  const intervals = Object.fromEntries(Object.entries(options).map(([rating, option]) => [rating, option.label]));
  const rate=async r=>{
    if (!card || !options[r] || lock.current) return;
    const prev = previousReview, at = new Date().toISOString();
    const option = flashcardOptions(prev, reviewDay(at))[r];
    lock.current=true;setSaving(true);setError('');
    const { level: nextLevel, days: interval, date } = option;
    try{
      await save('cartoes_aval',card.id,{...prev,k:card.id,atualizadoEm:at,nivel:nextLevel,intervalo:interval,prox:date,ult:r,hist:[...(Array.isArray(prev.hist)?prev.hist:[]),{em:at,v:r,int:interval,rev:flashcardWasRated(prev)}]});
      recordCompletion();
      setSuggestion(null);
      setCards(c => c.sessionId === cards.sessionId ? advanceFlashcardSession(c, deck.map(item => item.id), r, option.repeat) : c);
    }catch{setError('Falha ao salvar avaliação. Vire o cartão e tente novamente.');}
    finally{lock.current=false;setSaving(false);}
  };


  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <BrandHeader variant="compact" floating={false} onExit={() => go(backTo || 'dashboard')}>
        <span className="qb-overline">Revisão espaçada</span>
        <span style={{ font: '600 20px/1.25 var(--font-serif)', color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{topicLabel}</span>
      </BrandHeader>
      <StudySessionHeader subject={subject?.name || 'Flashcards'} topic={topicLabel} unit="Cartão" current={Math.min(idx + 1, deck.length)} total={deck.length} onBack={() => go(backTo || 'dashboard')} />
      <main style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '40px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!cards.scheduledReview && <div>
          <div className="qb-seg" role="group" aria-label="Filtrar flashcards" style={{ flexWrap: 'wrap' }}>
            {FLASHCARD_FILTERS.map(({ id, label }) => (
              <button key={id} type="button" className="qb-seg__opt" aria-pressed={mode === id} disabled={saving}
                onClick={() => { if (mode !== id) pickFilter(id); }}>{label}</button>
            ))}
          </div>
          {mode !== 'all' && <p style={{ color: 'var(--text-muted)', margin: '8px 0 0' }}>{FLASHCARD_FILTERS.find(f => f.id === mode)?.hint}</p>}
        </div>}
        {error&&<p role="alert">{error}</p>}
        {!done && ratings.at(-1) === 'errei' && <p role="status" style={{ color: 'var(--text-muted)', margin: 0 }}>O cartão marcado como Errei voltou ao fim da fila e ficou marcado para amanhã.</p>}
        {!deck.length ? <Panel>{fullDeck.length ? 'Nenhum cartão neste filtro.' : 'Sem cartões para este tópico.'}{cards.scheduledReview ? <Button onClick={() => go('train')}>Voltar a Treinar</Button> : fullDeck.length ? <Button onClick={()=>pickFilter('all')}>Ver todos</Button> : <Button onClick={()=>go('edital')}>Voltar ao edital</Button>}</Panel> : done ? (
          <Panel variant="ornate" padding={32} style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <AchievementEmblem variant="sabio" state="in-progress" progress={Math.min(Object.keys(D.reviews).length/200,1)} size={110} rule="Rumo a 200 flashcards revisados" />
            <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Revisão concluída</span>
              <h1 style={{ font: 'var(--type-h1)' }}>{deck.length} {deck.length === 1 ? 'cartão revisado' : 'cartões revisados'}</h1>
              <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>{ratings.filter(r => r === 'errei').length} marcações “Errei” geraram repetições nesta sessão.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                {cards.scheduledReview ? <Button icon="target" onClick={() => go('train')}>Voltar a Treinar</Button> : <>
                  <Button icon="house" onClick={() => go('dashboard')}>Voltar ao início</Button>
                  <Button variant="secondary" icon="rotate-ccw" onClick={() => pickFilter(mode)}>Revisar de novo</Button>
                </>}
              </div>
            </div>
          </Panel>
        ) : (
          <>
            <Flashcard key={mode + ':' + card.id + ':' + ratings.length} deck={[subject?.name, topic?.title].filter(Boolean).join(' · ') || 'Flashcards'} demo={false} intervals={intervals} height={380} front={stripFlashcardContext(card.front, subject?.name, [topic?.title, topicLabel])}
              back={<><div style={{ color: 'var(--text-primary)', fontSize: 19, lineHeight: 1.5 }}><ChatMarkdown text={card.back} /></div><p style={{ margin: '14px 0 0', font: '400 13px/1.4 var(--font-mono)', color: 'var(--text-muted)' }}>{card.basis}</p></>}
              origin={node && `${parent ? parent.label + ' › ' : ''}${node.label}`} onOpenOrigin={() => go('map', { node: card.node, topicId: card.topicId, returnTo: { label: 'revisão de flashcards', view: 'flashcards' } })}
              flipped={flipped} onFlip={() => setCards(c => ({ ...c, flipped: !c.flipped }))} onRate={rate}
              ratingDisabled={saving} suggestedRating={suggestion?.cardId === card.id ? suggestion.rating : null}
              correction={<React.Fragment key={card.id}>
                <FlashcardCorrection card={card} topicLabel={topicLabel} onSuggestion={rating => setSuggestion({ cardId: card.id, rating })} />
                {isAdmin && <EditorialCurator kind="flashcard" item={card} topicLabel={topic?.title || topicLabel} subjectName={subject?.name} />}
              </React.Fragment>} />
          </>
        )}
        {isAdmin && !cards.scheduledReview && <FlashcardStandardPanel />}
      </main>
    </div>
  );
}
export { FlashcardSessionView, FlashcardSessionView as FlashcardSession };