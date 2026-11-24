import React from 'react';
import {dahlPuzzle,REGIMES,TRAJECTORIES,dahlContext,DAHL_NODES} from '@/lib/nexo/dahl-puzzle';
import NexoAssociationPuzzle from './NexoAssociationPuzzle';
const stages=['Eixos','Regimes','Características','Trajetórias'];
export default function NexoDahlPuzzle({source,nodeId,onPredictionMode,onAssociationContext,guided}){
  const [mode,setMode]=React.useState('explore');
  const allowed=nodeId===DAHL_NODES[0]?[0]:nodeId===DAHL_NODES[1]?[1]:nodeId===DAHL_NODES[2]?[2]:nodeId===DAHL_NODES[3]?[3]:[0,1,2,3];
  const [stage,setStage]=React.useState(allowed[0]);
  const [scenario,setScenario]=React.useState(0);
  const puzzle=dahlPuzzle(stage,scenario);
  const clear=()=>onAssociationContext?.(null);
  const onFocus=slot=>{
    if(mode!=='explore'){clear();return;}
    if(stage===3){onAssociationContext?.({title:'Trajetória de mudança',detail:puzzle.slots[0].explanation,reference:source.trajectory.x.src});return;}
    onAssociationContext?.(dahlContext(source,stage,slot));
  };
  const onFeedback=check=>{
    if(mode!=='train')return;
    if(!check){clear();return;}
    // Feedback describes the selected relation without supplying all other answers.
    const expected=puzzle.pieces.find(p=>p.id===check.expected);
    onAssociationContext?.({title:check.correct?'Encaixe correto':'Reveja a associação',detail:check.explanation,correction:expected.label,reference:(stage===0?source.axis:stage===3?source.trajectory:source.matrix).x.src});
  };
  const t=TRAJECTORIES[scenario];
  if(guided)return <div className="nexo-instrument" data-nexo-live-graph><div className="nexo-instrument-head"><span>DIAGRAMA DE DAHL</span><span>↑ Contestação · Inclusividade →</span></div><div className="nexo-trajectory-map" style={{padding:12}}>{REGIMES.map(r=><div key={r.id} className="nexo-trajectory-cell" data-origin={guided.parameters.regime===r.id}><small>{r.description}</small>{guided.parameters.regime===r.id?<strong>{guided.reveal?r.label:'Estado atual'}</strong>:guided.reveal?r.label:'·'}</div>)}</div><p style={{padding:12}}>Dimensões qualitativas; o marcador representa um tipo puro hipotético.</p></div>;
  return <div className="nexo-training">
    <div className="qb-seg" role="group" aria-label="Modo de aprendizagem">{[['explore','Exploração livre'],['train','Treino de encaixe']].map(([v,label])=><button key={v} type="button" className="qb-seg__opt" aria-pressed={mode===v} onClick={()=>{if(mode!==v){setMode(v);clear();onPredictionMode?.(v==='train');}}}>{label}</button>)}</div>
    <div className="qb-seg" role="group" aria-label="Atividade">{stages.map((label,i)=>allowed.includes(i)&&<button key={label} type="button" className="qb-seg__opt" aria-pressed={stage===i} onClick={()=>{if(stage!==i){setStage(i);clear();}}}>{i+1} · {label}</button>)}</div>
    <div className="nexo-instrument" data-nexo-live-graph>
      <div className="nexo-instrument-head"><span>DIAGRAMA DE DAHL</span><span>DIMENSÕES QUALITATIVAS</span></div>
      {stage===3&&<div className="nexo-trajectory-control"><span>Trajetória {scenario+1} de {TRAJECTORIES.length}</span><button className="qb-btn qb-btn--secondary qb-btn--sm" type="button" onClick={()=>{setScenario((scenario+1)%TRAJECTORIES.length);clear();}}>Outra trajetória</button></div>}
      <NexoAssociationPuzzle key={mode+':'+puzzle.id} puzzle={puzzle} mode={mode} onFocus={onFocus} onFeedback={onFeedback}
        boardHeader={stage===3?({placements,result})=><div className="nexo-trajectory-map" role="img" aria-label="Diagrama: origem e sentido da mudança">
          {REGIMES.map(r=><div key={r.id} className="nexo-trajectory-cell" data-origin={r.id===t.from} data-destination={(mode==='explore'||result.status==='correct')&&r.id===t.to} data-wrong={mode==='train'&&result.status==='incorrect'&&r.id===placements.destination}>{r.id===t.from?r.label:(mode==='explore'||result.status==='correct')&&r.id===t.to?r.label:mode==='train'&&result.status==='incorrect'&&r.id===placements.destination?r.label:'·'}{r.id===t.from&&<strong>{t.direction==='up'?' ↑':' →'}</strong>}</div>)}
        </div>:stage===0?<p className="nexo-axis-heading">↑ Eixo vertical · → Eixo horizontal</p>:<div className="nexo-axis-heading">↑ Contestação pública · maior no topo</div>}
        boardFooter={stage===1||stage===2?<div className="nexo-axis-heading">Inclusividade · maior à direita →</div>:null}/>
    </div>
    <p className="nexo-explain">Tipos puros do kit de CP 1, sem atribuir pontuações numéricas a regimes reais. No treino, selecione ou arraste a peça e escolha o encaixe. Para corrigir, selecione outra peça e substitua o encaixe.</p>
  </div>;
}
