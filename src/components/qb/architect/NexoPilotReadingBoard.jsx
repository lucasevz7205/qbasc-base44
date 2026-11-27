import React from 'react';
import NexoAssociationPuzzle from './NexoAssociationPuzzle';

export default function NexoPilotReadingBoard({ source, onPredictionMode, onPracticeComplete }) {
  const [mode, setMode] = React.useState('explore');
  const switchMode = next => {
    setMode(next);
    onPredictionMode(next === 'train');
  };
  return <div className="nexo-training">
    <div className="qb-seg" role="group" aria-label="Modo de aprendizagem">
      <button type="button" className="qb-seg__opt" aria-pressed={mode === 'explore'}
        onClick={() => switchMode('explore')}>Exploração livre</button>
      <button type="button" className="qb-seg__opt" aria-pressed={mode === 'train'}
        onClick={() => switchMode('train')}>Treino de encaixe</button>
    </div>
    {source.passage && <blockquote aria-label="Parágrafo fictício para leitura">{source.passage}</blockquote>}
    <section className="nexo-instrument">
      <NexoAssociationPuzzle key={mode} mode={mode} onPracticeComplete={onPracticeComplete}
        puzzle={{ ...source, layout: 'matrix', reviewTogether: true }} />
    </section>
  </div>;
}
