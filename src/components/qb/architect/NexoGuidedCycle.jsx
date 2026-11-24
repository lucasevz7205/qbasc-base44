import React from 'react';
import {CYCLE_STAGES,GUIDED_VARIANTS,guidedConfig,guidedExercise,gradeGuided,initialCycle,advanceCycle} from '@/lib/nexo/guided-cycle';
const display=f=>f.type==='number'?f.expected.toLocaleString('pt-BR',{maximumFractionDigits:4})+' '+f.unit:f.options[f.expected];
function Fields({exercise,answers,onChange}){
  return <div className="nexo-training-form">{exercise.fields.map(f=><div className="nexo-control" key={f.id}>
    {f.type==='number'?<label>{f.label}{f.unit?' ('+f.unit+')':''}<input className="qb-input" inputMode="decimal" value={answers[f.id]||''} onChange={e=>onChange(f.id,e.target.value)}/></label>:<><span>{f.label}</span><div className="qb-seg" role="group" aria-label={f.label}>{Object.entries(f.options).map(([id,label])=><button type="button" className="qb-seg__opt" key={id} aria-pressed={answers[f.id]===id} onClick={()=>onChange(f.id,id)}>{label}</button>)}</div></>}
  </div>)}</div>;
}
function Feedback({result}){
  return <div className="nexo-training-result" aria-live="polite"><strong>{result.status==='correct'?'Resposta correta':'Compare sua hipótese com a regra'}</strong>{result.checks.map(c=><p key={c.id}>{c.correct?'Correto':'Rever'} · {c.label}: sua resposta {c.type==='choice'?c.options[c.submitted]:c.submitted} · referência {display(c)}</p>)}<p>{result.explanation}</p></div>;
}
export default function NexoGuidedCycle({kind,nodeId,children}){
  const [variant,setVariant]=React.useState(0);
  const config=guidedConfig(kind,nodeId,variant);
  const [state,setState]=React.useState(initialCycle);
  const [answers,setAnswers]=React.useState({});
  const [draft,setDraft]=React.useState('');
  const [checklist,setChecklist]=React.useState(false);
  const [invalid,setInvalid]=React.useState(false);
  if(!config)return <p>Não há percurso orientado vinculado a este modelo.</p>;
  const s=state.stage;
  const act=event=>{setState(prev=>advanceCycle(prev,event));setDraft('');setAnswers({});setInvalid(false);setChecklist(false);};
  const update=(id,v)=>{setAnswers(a=>({...a,[id]:v}));setInvalid(false);};
  const submit=phase=>{
    const result=gradeGuided(kind,nodeId,phase,answers,variant);
    if(result.status==='incomplete'){setInvalid(true);return;}
    act(phase==='target'?{type:'commit',answers,result}:{type:'transfer',result});
  };
  return <section className="nexo-guided" aria-label="Percurso orientado">
    <div className="nexo-cycle-progress" aria-label={'Etapa '+(s+1)+' de 6'}>{CYCLE_STAGES.map((label,i)=><span key={label} data-current={i===s} data-done={i<s}>{i+1} · {label}</span>)}</div>
    <div className="nexo-cycle-case"><span> Cenário {variant+1} de {GUIDED_VARIANTS}</span>{s===0&&<button type="button" className="qb-btn qb-btn--secondary qb-btn--sm" onClick={()=>{setVariant(v=>(v+1)%GUIDED_VARIANTS);setAnswers({});setDraft('');setInvalid(false);setChecklist(false);}}>Outro cenário</button>}</div>
    <h3>{CYCLE_STAGES[s]}</h3>
    {s===0&&<><p>{config.anchor}</p>{children({parameters:config.initial,reveal:true})}<button type="button" className="qb-btn qb-btn--secondary" onClick={()=>act({type:'anchor'})}>Estou pronto para prever</button></>}
    {s===1&&<><p>Estado atual, antes da mudança:</p>{children({parameters:config.initial,reveal:false})}<p><strong>Alteração proposta: </strong>{config.change}</p><Fields exercise={guidedExercise(kind,nodeId,'target',variant)} answers={answers} onChange={update}/>{invalid&&<p role="alert">Preencha respostas válidas.</p>}<button type="button" className="qb-btn qb-btn--secondary" onClick={()=>submit('target')}>Registrar hipótese e aplicar alteração</button></>}
    {(s===2||s===3)&&<><p>{config.change}</p>{children({parameters:config.target,reveal:true})}{s===2?<><Feedback result={state.prediction}/><button type="button" className="qb-btn qb-btn--secondary" onClick={()=>act({type:'observe'})}>Explicar o que observei</button></>:<>
      <p>{config.explain}</p><textarea className="qb-input" rows={4} value={draft} onChange={e=>{setDraft(e.target.value);setChecklist(false);}} placeholder="Explique com suas próprias palavras."/>
      <button type="button" className="qb-btn qb-btn--secondary" disabled={draft.trim().length<10} onClick={()=>setChecklist(true)}>Comparar com a explicação de referência</button>
      {checklist&&<><p>{config.rule}</p><small>Compare sua explicação com a regra. Não há nota semântica automática.</small><button type="button" className="qb-btn qb-btn--secondary" onClick={()=>act({type:'explain',text:draft})}>Avançar para recuperação</button></>}
    </>}</>}
    {s===4&&<><p>{config.abstract}</p><textarea className="qb-input" rows={4} value={draft} onChange={e=>{setDraft(e.target.value);setChecklist(false);}} placeholder="Recupere a regra sem consultar o modelo."/><button type="button" className="qb-btn qb-btn--secondary" disabled={draft.trim().length<5} onClick={()=>setChecklist(true)}>Conferir minha recuperação</button>{checklist&&<><p>{config.rule}</p><small>Autoconferência, sem pontuação automática.</small><button type="button" className="qb-btn qb-btn--secondary" onClick={()=>act({type:'recall',text:draft})}>Aplicar em outro cenário</button></>}</>}
    {s===5&&<><p>{config.transferPrompt}</p>{!state.transfer?<><Fields exercise={guidedExercise(kind,nodeId,'transfer',variant)} answers={answers} onChange={update}/>{invalid&&<p role="alert">Preencha respostas válidas.</p>}<button type="button" className="qb-btn qb-btn--secondary" onClick={()=>submit('transfer')}>Verificar aplicação</button></>:<><Feedback result={state.transfer}/><p>Percurso concluído. O resultado é uma verificação local, não uma medida de retenção ou domínio.</p><button type="button" className="qb-btn qb-btn--secondary" onClick={()=>{setVariant(v=>(v+1)%GUIDED_VARIANTS);setState(initialCycle());setAnswers({});setDraft('');setChecklist(false);setInvalid(false);}}>Próximo cenário</button></>}</>}
    <small>Sem gravação de nota ou alteração da revisão espaçada. Use exploração livre para consultar o material.</small>
  </section>;
}
