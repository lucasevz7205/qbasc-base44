import React from 'react';
import {Icon} from '@/components/qb/core/Icon';
import {scopedRecommendations} from '@/lib/nexo/representation-classifier';
import pilot from '@/lib/nexo/representation-pilot.json';
import {VISUAL_BINDINGS} from '@/lib/nexo/visual-catalog';
import {representationEvidence} from '@/lib/nexo/representation-evidence';
export default function NexoRepresentationReview({subjects,subjectId,topicId,nodeId}){
  const rows=scopedRecommendations({subjects,subjectId,topicId,nodeId},pilot.profiles,pilot.sources);
  const [selection,setSelection]=React.useState('');
  const [tested,setTested]=React.useState(false);
  const row=rows.find(r=>r.profile.nodeId===selection)||rows[0];
  const r=row?.result;
  const existing=row&&VISUAL_BINDINGS.some(b=>b.subjectId===subjectId&&b.topicId===topicId&&b.nodeId===row.profile.nodeId);
  return <details className="nexo-exp-context nexo-classifier">
    <summary><Icon name="drafting-compass" size={16}/> Seleção de representação · Prévia da etapa 02</summary>
    <p>Teste de planejamento do Arquiteto. Não gera nem adiciona modelos ao assunto.</p>
    {!row?<p>Não há descritores revisados para este recorte. Nenhuma recomendação será inferida de outro assunto.</p>:<>
      <label className="nexo-control">Conceito para análise<select className="qb-input" value={row.profile.nodeId} onChange={e=>{setSelection(e.target.value);setTested(false);}}>{rows.map(x=><option key={x.profile.nodeId} value={x.profile.nodeId}>{x.title}</option>)}</select></label>
      <p>{row.profile.objective}</p>
      <button className="qb-btn qb-btn--secondary" type="button" onClick={()=>setTested(true)}>Classificar representação</button>
      {tested&&<div aria-live="polite" className="nexo-training-result">
        {r.status!=='recommendation'?<p>{r.reason}</p>:<>
          <span className="qb-overline">RECOMENDAÇÃO · NÃO HOMOLOGADA</span><h3>{r.label}</h3><p>{r.reason}</p>
          <p>{existing?'Há modelo vinculado a este conceito.':'Ainda não existe modelo vinculado. A recomendação não aumenta a contagem do laboratório.'}</p>
          {r.kind!=='text'&&<div className="nexo-stage-facts">{[['Manipulação',r.action],['Consequência observável',r.observable],['Correção contextual',r.assessment],['Painel contextual',r.contextualExplanation]].map(([label,value])=><div key={label}><span className="qb-overline">{label}</span><p>{value}</p></div>)}</div>}
          {r.dimensionality&&<p>{r.dimensionality==='logical-2d'?'Arquitetura lógica: preferir 2D; não forçar 3D.':'Estrutura espacial apenas se necessária.'}</p>}
          <p><strong>Limites: </strong>{r.limits}</p>
          <details><summary>Alternativas não prioritárias</summary>{r.alternatives.map(a=><p key={a.kind}><strong>{a.label}: </strong>{a.reason}</p>)}</details>
          <details><summary>Trecho e referência do kit</summary><p>{r.evidence}</p><p>{r.reference}</p><small>{r.version}</small></details>
          <details><summary>Fundamentação pedagógica e limites da evidência</summary>{representationEvidence(r.kind).map(ref=><div key={ref.id} style={{marginTop:10}}><a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.title}</a><p>{ref.application}</p><small>{ref.limit}</small></div>)}</details>
          <p>Descritores curados para este piloto, não extraídos automaticamente por IA. A correspondência literal do trecho não é validação semântica. Conferência primária pendente. A recomendação não comprova eficácia pedagógica.</p>
        </>}
      </div>}
    </>}
  </details>;
}
