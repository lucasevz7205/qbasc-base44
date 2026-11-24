import React from 'react';
import {Icon} from '@/components/qb/core/Icon';
import NexoAssociationPuzzle from './NexoAssociationPuzzle';
import {procedureRoute,procedurePuzzle} from '@/lib/nexo/procedure';
export default function NexoProcedure({candidate,mode,onFocus}){
 const [motivated,setMotivated]=React.useState(false),[notice,setNotice]=React.useState(false),[requestInversion,setRequest]=React.useState(false);
 const [prediction,setPrediction]=React.useState(''),[checked,setChecked]=React.useState(false),[focus,setFocus]=React.useState(null);
 const model=candidate.procedure;
 const route=model?procedureRoute(model,{motivated,notice,requestInversion}):null;
 const reveal=mode==='explore'||checked||!model;
 const evidence=model?(route.inverted?model.exception.text:model.order.text):'';
 const puzzle=model?procedurePuzzle(route.steps,evidence):candidate.puzzle;
 const stateKey=JSON.stringify([motivated,notice,requestInversion,mode,prediction]);
 const change=(set,value)=>{set(value);setPrediction('');setChecked(false);setFocus(null);onFocus?.(null);};
 const show=id=>{const slot=puzzle.slots.find(s=>s.id===id);setFocus(id);if(mode==='explore')onFocus?.(slot?{title:slot.label,detail:slot.explanation,reference:route?.reference||candidate.reference}:null);};
 return <div className="nexo-procedure">
  {model&&<>
   <div className="nexo-instrument nexo-procedure-controls">
    <span className="qb-overline">Decisão sobre a inversão de fases</span>
    <label className="nexo-check"><input type="checkbox" checked={requestInversion} onChange={e=>change(setRequest,e.target.checked)}/> Pretende inverter a habilitação</label>
    <label className="nexo-check"><input type="checkbox" checked={motivated} onChange={e=>change(setMotivated,e.target.checked)}/> Ato motivado</label>
    <label className="nexo-check"><input type="checkbox" checked={notice} onChange={e=>change(setNotice,e.target.checked)}/> Previsão no edital</label>
    {mode==='train'&&<><label className="nexo-control">Qual ordem se aplica neste cenário?<select className="qb-input" value={prediction} onChange={e=>{setPrediction(e.target.value);setChecked(false);onFocus?.(null);}}><option value="">Selecione</option><option value="normal">Ordem geral</option><option value="inverted">Habilitação antes das propostas</option></select></label><button type="button" className="qb-btn qb-btn--secondary" disabled={!prediction} onClick={()=>{setChecked(true);onFocus?.({title:prediction===(route.inverted?'inverted':'normal')?'Predição correta':'Reveja a condição',detail:route.reason+' '+model.exception.text,reference:route.reference});}}>Conferir decisão</button></>}
    {reveal&&<p className="nexo-plot-feedback" aria-live="polite">{mode==='train'?(prediction===(route.inverted?'inverted':'normal')?'Correto. ':'Incorreto. '):''}{route.reason}</p>}
   </div>
   <p className="nexo-exp-limit">{model.limit}</p>
  </>}
  {reveal&&<>{mode==='explore'?<div className="nexo-procedure-flow" role="group" aria-label="Fluxo das fases">
   {puzzle.slots.map((slot,i)=><React.Fragment key={slot.id}><button type="button" className="nexo-procedure-step" aria-pressed={focus===slot.id} onClick={()=>show(slot.id)}><small>{i+1}</small><strong>{puzzle.pieces.find(p=>p.id===slot.expected).label}</strong></button>{i<puzzle.slots.length-1&&<Icon name="arrow-down" size={17}/>}</React.Fragment>)}
  </div>:<NexoAssociationPuzzle key={stateKey} puzzle={puzzle} mode="train" onFeedback={c=>onFocus?.(c?{title:c.correct?'Etapa correta':'Reveja a ordem',detail:c.explanation,reference:route?.reference||candidate.reference}:null)}/>}</>}
  {model&&mode==='explore'&&<details><summary>Remissões exatas das condições e da ordem</summary><p>{model.order.text}</p><small>{model.order.reference} · nó {model.order.nodeId}, referência do nó {model.order.referenceNodeId}</small><p>{model.exception.text}</p><small>{model.exception.reference} · nó {model.exception.nodeId}</small></details>}
 </div>;
}
