import React from 'react';
import {Icon} from '@/components/qb/core/Icon';
import {visualExercise,evaluateVisual,scenarioKey} from '@/lib/nexo/visual-training';
const fmt=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:4});
export default function NexoVisualTraining({kind,parameters,onPredictionMode,onRevealChange,onPracticeComplete,guided,children}){
  const [mode,setMode]=React.useState('explore');
  const key=scenarioKey(kind,parameters);
  const [attempt,setAttempt]=React.useState({key,answers:{},result:null});
  const current=attempt.key===key?attempt:{key,answers:{},result:null};
  // Reset permanently on every scenario change, including returning to an earlier scenario.
  if(attempt.key!==key)setAttempt(current);
  const exercise=visualExercise(kind,parameters);
  const reveal=mode==='explore'||Boolean(current.result&&current.result.status!=='incomplete');
  React.useEffect(()=>{onRevealChange?.(mode==='predict'&&reveal);},[mode,reveal,key,onRevealChange]);
  const clear=()=>setAttempt({key,answers:{},result:null});
  const changeMode=v=>{if(v!==mode){setMode(v);clear();onPredictionMode?.(v==='predict');}};
  const update=(id,value)=>setAttempt({key,answers:{...current.answers,[id]:value},result:null});
  const grade=()=>{
    const result=evaluateVisual(kind,parameters,current.answers);
    setAttempt({...current,result});
    if(result.status!=='incomplete')onPracticeComplete?.();
  };
  if(guided)return <div className="nexo-training-visual" data-nexo-live-graph><fieldset disabled style={{border:0,padding:0,margin:0,minWidth:0}} aria-label="Modelo com parâmetros do percurso">{children({reveal:guided.reveal,mode:'guided',result:null})}</fieldset></div>;
  return <div className="nexo-training" data-nexo-training={kind}>
    <div className="qb-seg" role="group" aria-label="Modo de aprendizagem">
      <button type="button" className="qb-seg__opt" aria-pressed={mode==='explore'} onClick={()=>changeMode('explore')}>Exploração livre</button>
      <button type="button" className="qb-seg__opt" aria-pressed={mode==='predict'} onClick={()=>changeMode('predict')}>Predição e correção</button>
    </div>
    <div className="nexo-training-visual" data-nexo-live-graph>{children({reveal,mode,result:current.result})}</div>
    {mode==='predict'&&<section className="nexo-instrument nexo-training-form" aria-label="Avaliação contextual">
      <span className="qb-overline">INTERPRETE O MODELO VISUAL</span>
      <p>Observe a estrutura e responda para os parâmetros atuais. Alterá-los invalida a avaliação anterior.</p>
      {exercise.fields.map(f=><div className="nexo-control" key={f.id}>
        {f.type==='number'?<label>{f.label}{f.unit?' ('+f.unit+')':''}<input className="qb-input" type="text" inputMode="decimal" value={current.answers[f.id]||''} onChange={e=>update(f.id,e.target.value)}/></label>:<><span>{f.label}</span><div className="qb-seg" role="group" aria-label={f.label} style={{flexWrap:'wrap'}}>{Object.entries(f.options).map(([id,label])=><button type="button" key={id} className="qb-seg__opt" aria-pressed={current.answers[f.id]===id} onClick={()=>update(f.id,id)}>{label}</button>)}</div></>}
      </div>)}
      <button type="button" className="qb-btn qb-btn--secondary" disabled={exercise.fields.some(f=>!current.answers[f.id]?.trim())} onClick={grade}>Verificar no modelo</button>
      {current.result&&<div aria-live="polite" className="nexo-training-result">
        <strong>{current.result.status==='correct'?'Predição correta':current.result.status==='incomplete'?'Preencha respostas válidas':'Revise sua predição'}</strong>
        {current.result.status!=='incomplete'&&<>{current.result.checks.map(c=><div key={c.id} style={{display:'flex',gap:8,alignItems:'center'}}><Icon name={c.correct?'circle-check':'circle-x'} size={16} color={c.correct?'var(--qb-patina)':'var(--qb-ember)'}/><span>{c.label}: {c.type==='number'?fmt(c.expected)+' '+c.unit:c.options[c.expected]}</span></div>)}<p>{current.result.explanation}</p></>}
        <button type="button" className="qb-btn qb-btn--secondary" onClick={clear}>Nova tentativa</button>
      </div>}
    </section>}
  </div>;
}
