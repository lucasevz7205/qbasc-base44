import React from 'react';
import {Icon} from '@/components/qb/core/Icon';
import {evaluatePuzzle,placePiece,validPuzzle} from '@/lib/nexo/association-puzzle';
import {rotatePieces} from '@/lib/nexo/experiment-refinements';
export default function NexoAssociationPuzzle({puzzle,mode,onFocus,onFeedback,boardHeader,boardFooter}){
  const [placements,setPlacements]=React.useState({});
  const [selected,setSelected]=React.useState(null);
  const [focus,setFocus]=React.useState(null);
  const [round,setRound]=React.useState(0);
  if(!validPuzzle(puzzle))return <p>Atividade indisponível: vínculo de peças inválido.</p>;
  const result=evaluatePuzzle(puzzle,placements);
  const complete=result.status==='correct';
  const place=(slotId,pieceId)=>{
    if(mode!=='train'||!puzzle.pieces.some(p=>p.id===pieceId))return;
    const next=placePiece(puzzle,placements,slotId,pieceId);
    setPlacements(next);setSelected(null);setFocus(slotId);
    const check=evaluatePuzzle(puzzle,next).checks.find(c=>c.slotId===slotId);
    onFocus?.(slotId);onFeedback?.(check);
  };
  const reset=()=>{setRound(r=>r+1);setPlacements({});setSelected(null);setFocus(null);onFocus?.(null);onFeedback?.(null);};
  const used=new Set(Object.values(placements));
  return <div className="nexo-association" data-nexo-puzzle={puzzle.id}>
    <p>{mode==='train'?puzzle.instruction:'Selecione um encaixe para consultar a explicação correspondente.'}</p>
    {typeof boardHeader==='function'?boardHeader({placements,result}):boardHeader}
    <div className={'nexo-puzzle-board nexo-puzzle-'+puzzle.layout} role="group" aria-label="Tabuleiro de associações">
      {puzzle.slots.map(slot=>{
        const check=result.checks.find(c=>c.slotId===slot.id);
        const piece=puzzle.pieces.find(p=>p.id===(mode==='explore'?slot.expected:placements[slot.id]));
        const state=mode==='train'&&check.filled?(check.correct?'correct':'incorrect'):'neutral';
        return <button key={slot.id} type="button" className="nexo-puzzle-slot" data-state={state} aria-pressed={focus===slot.id}
          onDragOver={e=>{if(mode==='train')e.preventDefault();}} onDrop={e=>{e.preventDefault();place(slot.id,e.dataTransfer.getData('text/plain'));}}
          onClick={()=>{if(mode==='train'&&selected){place(slot.id,selected);return;}setFocus(slot.id);onFocus?.(slot.id);onFeedback?.(mode==='train'&&check.filled?check:null);}}>
          <small>{slot.label}</small>
          <strong>{piece?.label||'Encaixar peça'}</strong>
          {state!=='neutral'&&<span className="nexo-puzzle-status"><Icon name={state==='correct'?'circle-check':'circle-x'} size={15}/>{state==='correct'?'Correto':'Rever encaixe'}</span>}
        </button>;
      })}
    </div>
    {boardFooter}
    {mode==='train'&&<>
      <div className="nexo-puzzle-pieces" role="group" aria-label="Peças disponíveis">
        {rotatePieces(puzzle.pieces,round).map(piece=><button key={piece.id} type="button" draggable={true} aria-pressed={selected===piece.id} className="nexo-puzzle-piece" onDragEnd={()=>setSelected(null)} onDragStart={e=>{e.dataTransfer.setData('text/plain',piece.id);setSelected(piece.id);}} onClick={()=>setSelected(selected===piece.id?null:piece.id)}><Icon name="puzzle" size={16}/>{piece.label}{used.has(piece.id)&&' · encaixada'}</button>)}
      </div>
      <div className="nexo-puzzle-progress" aria-live="polite"><span>{result.correctCount}/{result.total} associações corretas{complete?' · atividade concluída':''}</span><button type="button" className="qb-btn qb-btn--secondary qb-btn--sm" onClick={reset}>Recomeçar</button></div>
    </>}
  </div>;
}
