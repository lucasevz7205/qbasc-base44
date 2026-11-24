import React from 'react';
import {selectNexoAnatomy} from '@/lib/server-fns';
import pilot from '@/lib/nexo/representation-pilot.json';
import {getGenerationSources} from '@/lib/nexo/generation-sources';
import {planRepresentation,chooseNewRepresentation} from '@/lib/nexo/representation-planner';
export default function NexoRepresentationPlan({subjectId,topicId,nodeId,initiallyOpen=false}){
 const [plan,setPlan]=React.useState(null);
 const [anatomy,setAnatomy]=React.useState(null);
 const [busy,setBusy]=React.useState(false);
 const [failure,setFailure]=React.useState(false);
 async function select(provider){if(busy)return;setBusy(true);setFailure(false);setAnatomy(null);try{setAnatomy(await selectNexoAnatomy({data:{provider}}));}catch{setFailure(true);}finally{setBusy(false);}}
 React.useEffect(()=>{
  let active=true;
  const sources=getGenerationSources(subjectId,topicId,nodeId);
  const request=nodeId?planRepresentation(sources[0],pilot):chooseNewRepresentation(sources,pilot);
  request.then(p=>{if(active)setPlan(p);}).catch(()=>{if(active)setPlan(null);});
  return()=>{active=false;};
 },[subjectId,topicId,nodeId]);

 return <details className="nexo-exp-context nexo-classifier" data-nexo-planner open={initiallyOpen}><summary>Parecer do Arquiteto · representação recomendada</summary>
  {plan&&<><h3>{plan.title}</h3><strong>{plan.label}</strong><p>{plan.objective}</p><p>{plan.reason}</p>
  {plan.action&&<p>{plan.action}</p>}<p>{plan.anatomyReason}</p>
  <details><summary>Remissão ao kit</summary>{plan.evidence.map((e,i)=><p key={i}>{e}</p>)}<p>{plan.reference}</p><small>{plan.sourceVersion}</small></details>
  <small>Seleção local fundamentada ({plan.method}). Proposta pendente de homologação; nenhum novo modelo construído por este parecer.</small></>}
  <details><summary>Homologação · procurar candidato Anatomy no acervo</summary>
   <p>Seleção semântica entre fontes físicas recuperadas dos kits. O resultado não constrói nem publica um modelo. Pode consumir créditos ou cota.</p>
   <div className="qb-seg"><button type="button" className="qb-btn qb-btn--secondary" disabled={busy} onClick={()=>select('base44')}>Analisar com Base44</button><button type="button" className="qb-btn qb-btn--secondary" disabled={busy} onClick={()=>select('gemini')}>Analisar com Gemini</button></div>
   {busy&&<p role="status">Analisando candidatos…</p>}
   {failure&&<p role="alert">Não foi possível concluir a chamada. Confira provedor, acesso e cota. Sem troca automática.</p>}
   {anatomy&&<div aria-live="polite"><p>Provedor: {anatomy.provider} · {anatomy.examined??0} candidatos</p>{anatomy.status==='candidate'?<><h3>{anatomy.object}</h3><p>{anatomy.scope.topicId} · {anatomy.title}</p><p>{anatomy.objective}</p><p>{anatomy.reason}</p><p>{anatomy.providerAssessment==='needs-source'?'Fonte complementar necessária':'Proposta direta, ainda não homologada'}: {anatomy.missing||'Revisão humana obrigatória.'}</p><p>{anatomy.evidence}</p><small>{anatomy.reference}</small><p>Construção bloqueada até homologação.</p></>:<p>{anatomy.reason}</p>}</div>}
  </details>
 </details>;
}
