import React from 'react';
const suitabilityLabels={strong:'Sustentada',possible:'Indício a revisar',unsupported:'Sem evidência suficiente'};
const formStatus={existing:'Modelo disponível','local-recipe':'Receita local','semantic-recipe':'Proposta a validar',unavailable:'Renderizador pendente','design-reference':'Referência de formato'};
function DecisionChoice({assessment}){
 return <>
  <strong>{assessment.label}</strong>
  <p>{assessment.reason}</p>
  <ol aria-label="Subformas em ordem de preferência">{assessment.subforms.map(form=><li key={form.format}>{form.format} <small>· {formStatus[form.status]}</small></li>)}</ol>
  <small>{assessment.viability.reason}</small>
 </>;
}
export default function NexoDecisionDetails({decision}){
 if(!decision)return null;
 if(decision.status==='blocked')return <p role="alert">{decision.reason}</p>;
 return <div className="nexo-cognitive-decision" aria-live="polite">
  <p style={{whiteSpace:'pre-line'}}><strong>{decision.task?'Tarefa':'Objetivo inferido'}:</strong> {decision.objective}</p>
  {decision.taskCoverage?.length>0&&<section aria-label="Suficiência da fonte">
   <strong>Suficiência da fonte</strong>
   <ol>{decision.taskCoverage.map(part=><li key={part.part}>
    <strong>{part.requirement}</strong> · {part.status==='supported'?'Sustentada':'Falta evidência'}
    <p>{part.reason}</p>
    {part.evidence.map(e=><p key={e.id}>{e.excerpt}<small> · {e.reference} · {e.nodeId}</small></p>)}
   </li>)}</ol>
  </section>}
  {decision.assessments.length?<>
  <div className="nexo-stage-facts"><div><span className="qb-overline">Estrutura primária</span>{decision.primary?<DecisionChoice assessment={decision.primary}/>:<p>Sem escolha suficientemente fundamentada.</p>}{decision.primary?.viability.status==='unavailable'&&<p>Visual indisponível para este conceito. Continue pelo nó no mapa de estudo.</p>}</div><div><span className="qb-overline">Estrutura secundária</span>{decision.secondary?<><DecisionChoice assessment={decision.secondary}/><p>Equivalência pendente de revisão.</p></>:<p>Nenhuma alternativa equivalente confirmada.</p>}</div></div>
  <p>{decision.reason}</p><p>{decision.backupReason}</p>
  <small>{decision.provider==='local'?'Triagem local por evidência estrutural (não é análise semântica de IA).':'Parecer semântico · '+decision.provider+' (pendente de revisão).'} Nenhum fallback automático autorizado.</small>
  <details><summary>Ordem de adequação e fontes</summary>{decision.assessments.map(a=><div key={a.structure} className="nexo-cognitive-assessment"><strong>{a.structureRank&&a.structureRank+'º · '}{a.label} · {suitabilityLabels[a.suitability]}</strong>{a.secondaryRank&&<p>{a.secondaryRank}ª candidata a secundária · equivalência a revisar</p>}{a.secondaryFit==='different-objective'&&<p>Esta estrutura treina outra ação.</p>}<p>{a.reason}</p>{a.evidence.map(e=><p key={e.id}>{e.excerpt}<small> · {e.reference} · {e.nodeId}</small></p>)}</div>)}<small>Versão: {decision.sourceVersion}</small></details>
  </>:<p>{decision.reason} {decision.provider!=='local'&&<small>Parecer {decision.provider} · pendente de revisão.</small>}</p>}
 </div>;
}
