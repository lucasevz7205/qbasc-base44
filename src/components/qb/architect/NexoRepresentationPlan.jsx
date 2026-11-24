import React from 'react';
import pilot from '@/lib/nexo/representation-pilot.json';
import {resolveEffectiveSource} from '@/lib/nexo/effective-sources';
import {planRepresentation,chooseNewRepresentation} from '@/lib/nexo/representation-planner';
export default function NexoRepresentationPlan({subjectId,topicId,nodeId,sources,initiallyOpen=false}){
 const [plan,setPlan]=React.useState(null);
 React.useEffect(()=>{
  let active=true;
  const request=nodeId?planRepresentation(resolveEffectiveSource(sources,nodeId),pilot):chooseNewRepresentation(sources,pilot);
  request.then(p=>{if(active)setPlan(p);}).catch(()=>{if(active)setPlan(null);});
  return()=>{active=false;};
 },[subjectId,topicId,nodeId,sources]);

 return <details className="nexo-exp-context nexo-classifier" data-nexo-planner open={initiallyOpen}><summary>Parecer do Arquiteto · representação recomendada</summary>
  {plan&&<><h3>{plan.title}</h3><strong>{plan.label}</strong><p>{plan.objective}</p><p>{plan.reason}</p>
  {plan.action&&<p>{plan.action}</p>}
  <details><summary>Remissão ao kit</summary>{plan.evidence.map((e,i)=><p key={i}>{e}</p>)}<p>{plan.reference}</p><small>{plan.sourceVersion}</small></details>
  <small>Seleção local fundamentada ({plan.method}). Proposta pendente de homologação; nenhum novo modelo construído por este parecer.</small></>}
 </details>;
}
