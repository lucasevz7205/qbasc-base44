import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { Button } from '@/components/qb/core/Button';

import { ChatMarkdown } from '@/components/qb/tutor/ChatMarkdown';
import { FLASHCARD_RATINGS } from '@/lib/flashcard-review';

const tones = {
  incorrect: ['var(--state-incorrect)', 'var(--state-incorrect-bg)'],
  attention: ['var(--state-attention)', 'var(--state-attention-bg)'],
  correct: ['var(--state-correct)', 'var(--state-correct-bg)'],
  gold: ['var(--qb-gold)', 'var(--state-no-evidence-bg)'],
};

export default function Flashcard({
  front,
  back,
  deck,
  origin,
  onOpenOrigin,
  flipped: flippedProp,
  onFlip,
  onRate,
  suggestedRating,
  ratingDisabled = false,
  correction,
  intervals = {},
  demo = true,
  height = 360,
  style,
}) {
  const [inner, setInner] = React.useState(false);
  const flipped = flippedProp ?? inner;
  const flip = () => {
    setInner((f) => !f);
    onFlip && onFlip(!flipped);
  };
  const face = { background: 'var(--surface)', border: '1px solid rgba(208,179,134,.28)', boxShadow: 'var(--shadow-raised)', padding: 'clamp(24px,4vw,48px) clamp(24px,4.4vw,56px)', gap: 20 };
  const Head = ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span className="qb-overline">{label}</span>
      {deck && <span style={{ font: '400 13px/1.35 var(--font-body)', color: 'var(--text-muted)', minWidth: 0 }}>{deck}</span>}
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, ...style }}>
      <div className="qb-flash" style={{ minHeight: height }}>
        <div className={`qb-flash__inner ${flipped ? 'is-flipped' : ''}`} style={{ minHeight: height }}>
          <section className="qb-flash__face" style={face} aria-hidden={flipped}>
            <Head label="Frente" />
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflowY: 'auto' }}>
              <div style={{ font: '600 clamp(22px,2.6vw,36px)/1.3 var(--font-serif)', color: 'var(--text-primary)', maxWidth: '34ch', width: '100%' }}>
                {typeof front === 'string' ? <ChatMarkdown text={front} /> : front}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button variant="secondary" icon="repeat" onClick={flip} tabIndex={flipped ? -1 : 0}>
                Mostrar resposta
              </Button>
            </div>
          </section>
          <section className="qb-flash__face qb-flash__face--back" style={face} aria-hidden={!flipped}>
            <Head label="Verso" />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflowY: 'auto' }}>
              <div style={{ font: '400 18px/1.65 var(--font-body)', color: 'var(--text-secondary)', maxWidth: 'var(--measure)', margin: '0 auto' }}>{typeof back === 'string' ? <ChatMarkdown text={back} /> : back}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              {origin ? (
                <button className="qb-linkbtn" onClick={onOpenOrigin} tabIndex={flipped ? 0 : -1}>
                  <Icon name="network" size={15} />
                  Origem: {origin}
                </button>
              ) : (
                <span />
              )}
              <button className="qb-linkbtn" onClick={flip} tabIndex={flipped ? 0 : -1} style={{ color: 'var(--text-muted)' }}>
                <Icon name="repeat" size={15} />
                Ver frente
              </button>
            </div>
          </section>
        </div>
      </div>
      {flipped && onRate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div role="group" aria-label="Autoavaliação" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FLASHCARD_RATINGS.map(({ id, label, tone }, index) => {
              const [color, background] = tones[tone];
              const suggested = suggestedRating === id;
              return (
                <button key={id} type="button" className="qb-rate" disabled={ratingDisabled} onClick={() => onRate(id)}
                  style={{ color, background, borderColor: color, minWidth: 92, boxShadow: suggested ? 'inset 0 0 0 1px currentColor' : undefined }}>
                  {label}
                  {intervals[id] && <small>{intervals[id]}</small>}
                  <kbd aria-hidden="true">{index + 1}</kbd>
                  {suggested && <small style={{ color }}>Sugestão do Arquiteto</small>}
                </button>
              );
            })}
          </div>
          {demo && <span style={{ font: '400 12px/1.4 var(--font-body)', color: 'var(--text-muted)', textAlign: 'center' }}>Intervalos ilustrativos — modo demonstração, sem agendamento real.</span>}
        </div>
      )}
      {correction || null}
    </div>
  );
}
export { Flashcard };