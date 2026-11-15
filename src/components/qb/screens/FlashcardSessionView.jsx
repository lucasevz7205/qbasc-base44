import React from 'react';
import { BrandHeader } from '@/components/qb/navigation/BrandHeader';
import { StudySessionHeader } from '@/components/qb/study/StudySessionHeader';
import { Flashcard } from '@/components/qb/flashcards/Flashcard';
import { Panel } from '@/components/qb/core/Panel';
import { AchievementEmblem } from '@/components/qb/brand/AchievementEmblem';
import { Button } from '@/components/qb/core/Button';
import { useRealStudy } from '@/lib/qb-real-data';

export default function FlashcardSessionView({ cards, setCards, elapsed, paused, onTogglePause, go, backTo }) {
  const {QB_DATA:D,QB_PLAN,save}=useRealStudy();
  const deck=D.flashcards.filter(f=>!cards.topicId||f.topicId===cards.topicId);
  const { idx, flipped, ratings } = cards;
  const done = idx >= deck.length;
  const card = deck[Math.min(idx, deck.length - 1)];
  const node = D.mapNodes.find(n => n.id === card?.node);
  const parent = node && D.mapNodes.find(n => n.id === node.parent);
  const [error,setError]=React.useState('');
  const lock=React.useRef(false);
  const rate=async r=>{
    if(!card||lock.current)return;
    lock.current=true;setError('');
    const prev=D.reviews[card.id]||{}, at=new Date().toISOString(), easy=r==='facil', hard=r==='dificil';
    const nextLevel=r==='errei'?0:Math.min(4,(Number(prev.nivel)||0)+(easy?2:hard?0:1));
    const interval=[1,3,7,15,30][nextLevel];
    try{
      await save('cartoes_aval',card.id,{...prev,k:card.id,atualizadoEm:at,nivel:nextLevel,intervalo:interval,prox:QB_PLAN.addDays(QB_PLAN.today,interval),ult:r,hist:[...(Array.isArray(prev.hist)?prev.hist:[]),{em:at,v:r,int:interval}]});
      setCards(c=>({...c,idx:c.idx+1,flipped:false,ratings:[...c.ratings,r]}));
    }catch{setError('Falha ao salvar avaliação. Vire o cartão e tente novamente.');}
    finally{lock.current=false;}
  };

  React.useEffect(() => {
    const onKey = e => { if (!done && e.key === ' ') { e.preventDefault(); setCards(c => ({ ...c, flipped: !c.flipped })); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <BrandHeader variant="compact" floating={false} onExit={() => go(backTo || 'dashboard')}>
        <span className="qb-overline">Revisão espaçada</span>
        <span style={{ font: '400 16px/1.2 var(--font-heading)', color: 'var(--text-primary)' }}>{card?.topicId||'Seus cartões'}</span>
      </BrandHeader>
      <StudySessionHeader subject="Flashcards" topic={card?.topicId||""} unit="Cartão" current={Math.min(idx + 1, deck.length)} total={deck.length} elapsed={elapsed} paused={paused} onTogglePause={onTogglePause} onBack={() => go(backTo || 'dashboard')} />
      <main style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '40px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error&&<p role="alert">{error}</p>}
        {!deck.length?<Panel>Sem cartões para este tópico. <Button onClick={()=>go('edital')}>Voltar ao edital</Button></Panel>:done ? (
          <Panel variant="ornate" padding={32} style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <AchievementEmblem variant="sabio" state="in-progress" progress={Math.min(Object.keys(D.reviews).length/200,1)} size={110} rule="Rumo a 200 flashcards revisados" />
            <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Revisão concluída</span>
              <h1 style={{ font: 'var(--type-h1)' }}>{ratings.length} cartões revisados</h1>
              <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>{ratings.filter(r => r === 'errei').length} marcados como “Errei” e agendados para nova revisão.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                <Button icon="house" onClick={() => go('dashboard')}>Voltar ao início</Button>
                <Button variant="secondary" icon="rotate-ccw" onClick={() => setCards(c=>({...c,idx:0,flipped:false,ratings:[]}))}>Revisar de novo</Button>
              </div>
            </div>
          </Panel>
        ) : (
          <>
            <Flashcard key={idx} deck={card.topicId} demo={false} height={380} front={card.front}
              back={<><p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 19, lineHeight: 1.5 }}>{card.back}</p><p style={{ margin: '14px 0 0', font: '400 13px/1.4 var(--font-mono)', color: 'var(--text-muted)' }}>{card.basis}</p></>}
              origin={node && `${parent ? parent.label + ' › ' : ''}${node.label}`} onOpenOrigin={() => go('map', { node: card.node, returnTo: { label: 'revisão de flashcards', view: 'flashcards' } })}
              flipped={flipped} onFlip={() => setCards(c => ({ ...c, flipped: !c.flipped }))} onRate={rate} />
            {!flipped && <span style={{ textAlign: 'center', font: '400 12px/1 var(--font-mono)', color: 'var(--text-muted)' }}>Espaço · virar cartão</span>}
          </>
        )}
      </main>
    </div>
  );
}
export { FlashcardSessionView, FlashcardSessionView as FlashcardSession };