import React from 'react';
import NexoAssociationPuzzle from './NexoAssociationPuzzle';
import {kitPuzzleStages,kitPuzzleContext} from '@/lib/nexo/kit-visuals';

const HEADS={ladder:'ESCADA · DE CIMA PARA BAIXO',timeline:'LINHA DO TEMPO · DA ESQUERDA PARA A DIREITA',pipeline:'ESTEIRA · ETAPAS EM SEQUÊNCIA',act:'LINHA DO ATO',matrix:'QUADRO DE ENCAIXE'};

function Header({stage}){
  if(stage.layout==='act')return <div className="nexo-act-line" aria-hidden="true"><span>ANTES</span><strong>ATO LEGISLATIVO OU ADMINISTRATIVO</strong><span>DEPOIS</span></div>;
  if(stage.columns)return <div className="nexo-matrix-columns" aria-hidden="true">{stage.columns.map(c=><strong key={c}>{c}</strong>)}</div>;
  return null;
}

// Generic, source-bound association board for kits without a bespoke instrument.
export default function NexoKitPuzzle({source,nodeId,onPredictionMode,onAssociationContext,onConceptChange,guided}){
  const stages=kitPuzzleStages(source,nodeId);
  const [mode,setMode]=React.useState('explore');
  const [index,setIndex]=React.useState(stages[0]?.index??0);
  const stage=stages.find(s=>s.index===index)||stages[0];
  const conceptNode=stage?source.nodes[stage.node]:null;
  React.useEffect(()=>{if(conceptNode)onConceptChange?.(conceptNode);},[conceptNode,onConceptChange]);
  if(!stage)return <p>Modelo indisponível: fonte do kit não confirmada.</p>;
  const clear=()=>onAssociationContext?.(null);
  const onFocus=slotId=>{if(mode!=='explore'){clear();return;}onAssociationContext?.(kitPuzzleContext(source,stage,slotId));};
  const onFeedback=check=>{
    if(mode!=='train')return;
    if(!check){clear();return;}
    const expected=stage.pieces.find(p=>p.id===check.expected);
    onAssociationContext?.({title:check.correct?'Encaixe correto':'Reveja a associação',detail:check.explanation,correction:expected.label,reference:source.nodes[stage.node].x.src});
  };
  const puzzle={id:source.model.id+'-'+stage.id,layout:stage.layout,instruction:stage.instruction,pieces:stage.pieces,slots:stage.slots};
  if(guided)return <div className="nexo-instrument" data-nexo-live-graph><div className="nexo-instrument-head"><span>{source.model.title.toUpperCase()}</span><span>{HEADS[stage.layout]}</span></div><NexoAssociationPuzzle puzzle={puzzle} mode="explore"/></div>;
  return <div className="nexo-training">
    <div className="qb-seg" role="group" aria-label="Modo de aprendizagem">{[['explore','Exploração livre'],['train','Treino de encaixe']].map(([v,label])=><button key={v} type="button" className="qb-seg__opt" aria-pressed={mode===v} onClick={()=>{if(mode!==v){setMode(v);clear();onPredictionMode?.(v==='train');}}}>{label}</button>)}</div>
    {stages.length>1&&<div className="qb-seg" role="group" aria-label="Atividade" style={{flexWrap:'wrap'}}>{stages.map((s,i)=><button key={s.id} type="button" className="qb-seg__opt" aria-pressed={stage.index===s.index} onClick={()=>{if(stage.index!==s.index){setIndex(s.index);clear();}}}>{i+1} · {s.label}</button>)}</div>}
    <div className="nexo-instrument" data-nexo-live-graph>
      <div className="nexo-instrument-head"><span>{source.model.title.toUpperCase()}</span><span>{HEADS[stage.layout]}</span></div>
      <NexoAssociationPuzzle key={mode+':'+puzzle.id} puzzle={puzzle} mode={mode} onFocus={onFocus} onFeedback={onFeedback} boardHeader={<Header stage={stage}/>}/>
    </div>
    <p className="nexo-explain">Peças e encaixes reescrevem o texto do kit, sem fatos novos. No treino, selecione ou arraste a peça e escolha o encaixe; para corrigir, encaixe outra peça no lugar.</p>
  </div>;
}
