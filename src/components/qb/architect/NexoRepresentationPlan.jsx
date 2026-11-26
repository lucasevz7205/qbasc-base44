import React from 'react';
import pilot from '@/lib/nexo/representation-pilot.json';
import {resolveEffectiveSource} from '@/lib/nexo/effective-sources';
import {decideCognitive} from '@/lib/nexo/cognitive-decision';
import {sourceVersion} from '@/lib/nexo/generation';
import {decideNexoRepresentation} from '@/lib/server-fns';
import NexoDecisionDetails from './NexoDecisionDetails';
export default function NexoRepresentationPlan({subjectId,topicId,nodeId,sources,initiallyOpen=false}){
 const source=resolveEffectiveSource(sources,nodeId);
 const [decision,setDecision]=React.useState(null),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 const seq=React.useRef(0);
 React.useEffect(()=>{
  const request=++seq.current;setDecision(null);setBusy(false);setError('');
  if(source)decideCognitive(source,pilot).then(d=>{if(seq.current===request)setDecision(d);}).catch(()=>{if(seq.current===request)setError('Falha na triagem local.');});
  return()=>{seq.current++;};
 },[source]);
 async function run(provider){
  if(!source||busy)return;
  const request=++seq.current;setBusy(true);setError('');
  try{
   const version=await sourceVersion(source);
   const d=await decideNexoRepresentation({data:{subjectId,topicId,nodeId:source.nodeId,sourceVersion:version,provider}});
   if(seq.current!==request)return;
   if(d.status==='blocked'){setError(d.reason);return;}
   if(d.sourceVersion!==version||d.scope?.subjectId!==subjectId||d.scope?.topicId!==topicId||d.scope?.nodeId!==source.nodeId)throw Error('Escopo divergente.');
   setDecision(d);
  }catch{if(seq.current===request)setError('Análise semântica não concluída. Confira acesso e cota do provedor.');}
  finally{if(seq.current===request)setBusy(false);}
 }
 return <details className="nexo-exp-context nexo-classifier" data-nexo-planner open={initiallyOpen}><summary>Parecer do Arquiteto · decisão cognitiva</summary>
  {source?<><h3>{source.title}</h3><NexoDecisionDetails decision={decision}/><div className="qb-seg"><button type="button" className="qb-btn qb-btn--secondary" disabled={busy} onClick={()=>run('base44')}>Analisar com Base44 (créditos)</button><button type="button" className="qb-btn qb-btn--secondary" disabled={busy} onClick={()=>run('gemini')}>Analisar com Gemini (cota)</button></div>{busy&&<p role="status">Avaliando as nove estruturas…</p>}{error&&<p role="alert">{error}</p>}</>:<p>Selecione um conceito vinculado para analisar.</p>}
  <small>O parecer não altera modelos já existentes, nem gera dados de estudo.</small>
 </details>;
}
