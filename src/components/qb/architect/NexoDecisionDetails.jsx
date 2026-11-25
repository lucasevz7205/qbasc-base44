import React from 'react';
export default function NexoDecisionDetails({decision}){
 if(!decision)return null;
 if(decision.status==='blocked')return <p role="alert">{decision.reason}</p>;
 const show=a=>a&&<><strong>{a.label} · {a.format}</strong><p>{a.reason}</p><small>{a.viability.renderer?"Renderizador disponível: "+a.viability.renderer+". ":""}{a.viability.reason}</small></>;
 return <div className="nexo-cognitive-decision" aria-live="polite">
  <p><strong>Objetivo:</strong> {decision.objective}</p>
  <div className="nexo-stage-facts"><div><span className="qb-overline">Estrutura primária</span>{decision.primary?show(decision.primary):<p>Sem escolha suficientemente fundamentada.</p>}</div><div><span className="qb-overline">Estrutura secundária</span>{decision.secondary?show(decision.secondary):<p>Nenhuma alternativa sustentada nesta análise.</p>}</div></div>
  <p>{decision.reason}</p><p>{decision.backupReason}</p>
  <small>{decision.provider==='local'?'Triagem local por evidência estrutural (não é análise semântica de IA).':'Parecer semântico · '+decision.provider+' (pendente de revisão).'} Nenhum fallback automático autorizado.</small>
  <details><summary>Avaliação das nove estruturas e remissões</summary>{decision.assessments.map(a=><div key={a.structure} className="nexo-cognitive-assessment"><strong>{a.label} · {a.suitability==='strong'?'Sustentada':a.suitability==='possible'?'Indício a revisar':'Não sustentada'}</strong><p>{a.reason}</p>{a.evidence.map(e=><p key={e.id}>{e.excerpt}<small> · {e.reference} · {e.nodeId}</small></p>)}<small>{a.viability.renderer?"Renderizador disponível: "+a.viability.renderer+". ":""}{a.viability.reason}</small></div>)}<small>Versão: {decision.sourceVersion}</small></details>
 </div>;
}
