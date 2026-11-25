import React from 'react';
import NexoAssociationPuzzle from './NexoAssociationPuzzle';
import NexoProcedure from './NexoProcedure';
import {decideNexoRepresentation} from '@/lib/server-fns';
import NexoDecisionDetails from './NexoDecisionDetails';
import {decideCognitive,buildDecidedCandidate} from '@/lib/nexo/cognitive-decision';
import {resolveEffectiveSource} from '@/lib/nexo/effective-sources';
import {sourceVersion} from '@/lib/nexo/generation';
import {availableColumns} from '@/lib/nexo/contextual-generation';
import {chooseNewRepresentation} from '@/lib/nexo/representation-planner';
import pilot from '@/lib/nexo/representation-pilot.json';
export default function NexoGeneratedAssociation({subjectId,topicId,nodeId,sources:allSources}){
 const sources=React.useMemo(()=>nodeId?(resolveEffectiveSource(allSources,nodeId)?[resolveEffectiveSource(allSources,nodeId)]:[]):allSources,[allSources,nodeId]);
 const [selection,setSelection]=React.useState(nodeId||'');
 const [candidate,setCandidate]=React.useState(null);
 const [busy,setBusy]=React.useState(false);
 const [message,setMessage]=React.useState('');
 const [mode,setMode]=React.useState('explore');
 const [focus,setFocus]=React.useState(null);
 const [approved,setApproved]=React.useState(false);
 const [decision,setDecision]=React.useState(null);
 const seq=React.useRef(0);
 const source=sources.find(s=>s.nodeId===selection);
 const clear=()=>{seq.current++;setCandidate(null);setDecision(null);setApproved(false);setFocus(null);setMode('explore');setMessage('');setBusy(false);};
 React.useEffect(()=>()=>{seq.current++;},[]);
 React.useEffect(()=>{
  if(nodeId)return;
  let active=true;const request=seq.current;
  chooseNewRepresentation(sources,pilot).then(p=>{if(active&&seq.current===request)setSelection(p?.nodeId||sources[0]?.nodeId||'');}).catch(()=>{if(active&&seq.current===request)setSelection(sources[0]?.nodeId||'');});
  return()=>{active=false;};
 },[sources,nodeId]);
 // Local decision first. Existing deterministic construction is gated by the primary structure.
 React.useEffect(()=>{
  if(!source)return;
  const request=++seq.current;setCandidate(null);setApproved(false);setFocus(null);setDecision(null);setBusy(false);
  decideCognitive(source,pilot).then(async d=>{
   if(seq.current!==request)return;setDecision(d);
   if(d.status!=='decided'||d.primary.viability.status!=='local-recipe')return;
   const r=await buildDecidedCandidate(source,d);
   if(seq.current===request)setCandidate(r.status==='candidate'?r:null);
  }).catch(()=>{if(seq.current===request)setMessage('Não foi possível preparar a decisão local.');});
  return()=>{seq.current++;};
 },[source]);
 async function run(provider){
  if(!source||busy)return;
  clear();const request=++seq.current;setBusy(true);
  try{
   const version=await sourceVersion(source);
   const d=await decideNexoRepresentation({data:{subjectId,topicId,nodeId:source.nodeId,sourceVersion:version,provider}});
   if(seq.current!==request)return;
   if(d.status==='blocked'){setMessage(d.reason);return;}
   if(d.scope?.nodeId!==source.nodeId||d.scope?.subjectId!==subjectId||d.scope?.topicId!==topicId||d.sourceVersion!==version)throw Error('Versão ou escopo divergente');
   setDecision(d);
  }catch{if(seq.current===request)setMessage('Análise não concluída. Confira acesso, provedor e cota. Nenhum outro provedor foi acionado automaticamente.');}
  finally{if(seq.current===request)setBusy(false);}
 }
 async function construct(){
  if(!source||!decision||busy)return;
  const request=++seq.current;setBusy(true);setMessage('');
  try{const r=await buildDecidedCandidate(source,decision);if(seq.current===request){setCandidate(r.status==='candidate'?r:null);setApproved(false);setFocus(null);if(r.status!=='candidate')setMessage(r.reason);}}
  catch{if(seq.current===request)setMessage('Não foi possível construir a representação escolhida.');}
  finally{if(seq.current===request)setBusy(false);}
 }
 if(!sources.length)return <p>Não há mapa de estudo com explicação recuperável neste recorte. O Arquiteto não inventará uma fonte.</p>;
 const puzzle=candidate?.puzzle;
 const isProcedure=['procedure','sequence'].includes(candidate?.kind);
 const modeLabel=candidate?.kind==='procedure'?'Fluxograma condicional':candidate?.kind==='sequence'?'Sequência operacional':candidate?.kind==='matrix'?'Matriz comparativa com encaixes':'Quebra-cabeça conceitual';
 const show=slot=>{const s=puzzle?.slots.find(s=>s.id===slot);setFocus(s?{title:s.label,detail:s.explanation}:null);};
 return <section className="nexo-exp-context nexo-generation">
  <span className="qb-overline">O ARQUITETO · GERAÇÃO DE MODELO</span>
  <h3>Representação contextual</h3>
  <p>O Arquiteto usa o nó exato do mapa de estudo atual. As propostas são prévias privadas e não entram automaticamente no catálogo de treino.</p>
  <label className="nexo-control">Conceito<select className="qb-input" disabled={busy} value={selection} onChange={e=>{clear();setSelection(e.target.value);}}>{!selection&&<option value="">Selecionando conceito…</option>}{sources.map(s=><option key={s.nodeId} value={s.nodeId}>{s.title}</option>)}</select></label>
  {source&&<p className="nexo-explain">{source.reference}</p>}
  <NexoDecisionDetails decision={decision}/>
  {candidate?.kind==='matrix'&&<label className="nexo-control">Critério da matriz<select className="qb-input" value={candidate.recipe.column} onChange={async e=>{const value=Number(e.target.value),request=++seq.current;setBusy(true);setApproved(false);setFocus(null);try{const r=await buildDecidedCandidate(source,decision,{column:value});if(seq.current===request){setCandidate(r.status==="candidate"?r:null);if(r.status!=="candidate")setMessage(r.reason);}}finally{if(seq.current===request)setBusy(false);}}}>{availableColumns(source).map(i=><option key={i} value={i}>{source.table.headers[i]}</option>)}</select></label>}
  <div className="qb-seg" role="group" aria-label="Provedor da decisão"><button type="button" className="qb-btn qb-btn--secondary" disabled={busy||!source} onClick={()=>run('base44')}>Analisar com Base44 (créditos)</button><button type="button" className="qb-btn qb-btn--secondary" disabled={busy||!source} onClick={()=>run('gemini')}>Analisar com Gemini (cota)</button></div>
  {!candidate&&decision?.primary?.viability.status==='local-recipe'&&<button type="button" className="qb-btn qb-btn--secondary" disabled={busy} onClick={construct}>Construir estrutura primária</button>}
  {!candidate&&decision?.primary?.viability.status==='unavailable'&&<p>A estrutura primária ainda não possui gerador compatível. A recomendação foi preservada, sem substituição automática.</p>}
  {busy&&<p role="status">Avaliando o conceito…</p>}{message&&<p role="alert">{message}</p>}
  {puzzle&&<div className="nexo-exp-workbench"><main className="nexo-exp-main"><div className="nexo-instrument-head"><span>{candidate.provider==='local'?'Extração automática sem IA':candidate.provider==='base44'?'Proposta Base44':'Proposta Gemini'}</span><span>PREVIEW · NÃO PUBLICADA</span></div>
   {!approved?<><p><strong>{modeLabel}</strong> · {candidate.plan?.objective}</p><p>Confira se os encaixes e as condições estão corretos. A correspondência literal não comprova a correção semântica.</p>{isProcedure?<NexoProcedure key={candidate.sourceVersion+"review"} candidate={candidate} mode="explore" onFocus={setFocus}/>:<NexoAssociationPuzzle key={candidate.sourceVersion+puzzle.id+"review"} puzzle={puzzle} mode="explore" onFocus={show}/>}<details><summary>Remissões exatas</summary>{puzzle.slots.map(s=><p key={s.id}>{s.explanation}</p>)}<small>{candidate.sourceVersion}</small></details><button type="button" className="qb-btn qb-btn--secondary" onClick={()=>{setApproved(true);setFocus(null);}}>Aceitar para testar nesta sessão</button></>:<>
    <div className="qb-seg" role="group" aria-label="Modo da atividade"><button type="button" className="qb-seg__opt" aria-pressed={mode==='explore'} onClick={()=>{setMode('explore');setFocus(null);}}>Exploração livre</button><button type="button" className="qb-seg__opt" aria-pressed={mode==='train'} onClick={()=>{setMode('train');setFocus(null);}}>{isProcedure?"Treino de procedimento":"Treino de encaixe"}</button></div>
    {isProcedure?<NexoProcedure key={candidate.sourceVersion+mode} candidate={candidate} mode={mode} onFocus={setFocus}/>: <NexoAssociationPuzzle key={candidate.sourceVersion+puzzle.id+mode} puzzle={puzzle} mode={mode} onFocus={id=>{if(mode==='explore')show(id);else setFocus(null);}} onFeedback={c=>{if(mode==='train')setFocus(c?{title:c.correct?'Encaixe correto':'Reveja o encaixe',detail:c.explanation}:null);}}/>}
   </>}
   <small>Prévia temporária. Não salva resultados nem aprova conteúdo para publicação. O percurso completo e outros renderizadores gerados ainda estão pendentes.</small>
   <button type="button" className="qb-btn qb-btn--secondary qb-btn--sm" onClick={()=>{seq.current++;setCandidate(null);setApproved(false);setFocus(null);setBusy(false);}}>Descartar proposta</button>
  </main><aside className="nexo-exp-context" aria-live="polite"><span className="qb-overline">EXPLICAÇÃO CONTEXTUAL</span>{focus?<><h3>{focus.title}</h3><p>{focus.detail}</p></>:<p>Selecione um encaixe para consultar a explicação. No treino, a explicação só aparece após a tentativa.</p>}<small>{focus?.reference||source.reference}</small></aside></div>}
 </section>;
}
