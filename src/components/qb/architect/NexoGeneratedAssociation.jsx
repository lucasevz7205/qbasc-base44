import React from 'react';
import NexoAssociationPuzzle from './NexoAssociationPuzzle';
import {generateNexoAssociation} from '@/lib/server-fns';
import {getGenerationSources} from '@/lib/nexo/generation-sources';
import {generateAssociation,sourceVersion,validateGeneration,extractExplicitPairs} from '@/lib/nexo/generation';
export default function NexoGeneratedAssociation({subjectId,topicId,nodeId}){
 const sources=React.useMemo(()=>getGenerationSources(subjectId,topicId,nodeId),[subjectId,topicId,nodeId]);
 const [selection,setSelection]=React.useState(()=>sources.find(s=>extractExplicitPairs(s).kind==='association')?.nodeId||sources[0]?.nodeId||'');
 const [candidate,setCandidate]=React.useState(null);
 const [busy,setBusy]=React.useState(false);
 const [message,setMessage]=React.useState('');
 const [mode,setMode]=React.useState('explore');
 const [focus,setFocus]=React.useState(null);
 const [approved,setApproved]=React.useState(false);
 const seq=React.useRef(0);
 const source=sources.find(s=>s.nodeId===selection);
 const clear=()=>{seq.current++;setCandidate(null);setApproved(false);setFocus(null);setMode('explore');setMessage('');setBusy(false);};
 React.useEffect(()=>()=>{seq.current++;},[]);
 // Local generation is automatic on selection, only explicit structured source relations.
 React.useEffect(()=>{
  if(!source)return;
  const request=++seq.current;
  generateAssociation(source).then(r=>{if(seq.current===request&&r.status==='candidate')setCandidate(r);}).catch(()=>{if(seq.current===request)setMessage('Não foi possível preparar a prévia local.');});
 },[source]);
 async function run(provider){
  if(!source||busy)return;
  clear();const request=++seq.current;setBusy(true);
  try{
   const r=await generateNexoAssociation({data:{subjectId,topicId,nodeId:source.nodeId,provider}});
   if(seq.current!==request)return;
   if(r.status!=='candidate'){setMessage(r.reason||'Não foi gerado um modelo.');return;}
   if(r.scope?.nodeId!==source.nodeId||r.scope?.subjectId!==subjectId||r.scope?.topicId!==topicId||r.sourceVersion!==await sourceVersion(source))throw Error('Versão ou escopo divergente');
   const rebuilt=validateGeneration(source,{kind:'association',pairs:r.pairs.map(({line,cue,answer})=>({line,cue,answer})),reason:'Validação local'});
   if(rebuilt.status!=='candidate')throw Error('Contrato rejeitado');
   if(seq.current===request)setCandidate({...r,...rebuilt});
  }catch{if(seq.current===request)setMessage('Geração não concluída. Confira acesso, provedor e cota. Nenhum outro provedor foi acionado automaticamente.');}
  finally{if(seq.current===request)setBusy(false);}
 }
 if(!sources.length)return <p>Não há nó de kit com fonte registrada neste recorte.</p>;
 const puzzle=candidate?.puzzle;
 const show=slot=>{const s=puzzle?.slots.find(s=>s.id===slot);setFocus(s?{title:s.label,detail:s.explanation}:null);};
 return <section className="nexo-exp-context nexo-generation">
  <span className="qb-overline">O ARQUITETO · GERAÇÃO DE MODELO</span>
  <h3>Atividade associativa contextual</h3>
  <p>O Arquiteto usa o nó exato do kit. As propostas são prévias privadas e não entram automaticamente no catálogo de treino.</p>
  <label className="nexo-control">Conceito<select className="qb-input" disabled={busy} value={selection} onChange={e=>{clear();setSelection(e.target.value);}}>{sources.map(s=><option key={s.nodeId} value={s.nodeId}>{s.title}</option>)}</select></label>
  {source&&<p className="nexo-explain">{source.reference}</p>}
  {!candidate&&<><p>Sem encaixe automático suficiente? Solicite ao Arquiteto uma proposta restrita às relações literais deste nó.</p><div className="qb-seg" role="group" aria-label="Provedor de geração"><button type="button" className="qb-btn qb-btn--secondary" disabled={busy} onClick={()=>run('base44')}>Gerar com Base44 (créditos)</button><button type="button" className="qb-btn qb-btn--secondary" disabled={busy} onClick={()=>run('gemini')}>Gerar com Gemini (cota da chave)</button></div></>}
  {busy&&<p role="status">Preparando proposta a partir do kit…</p>}{message&&<p role="alert">{message}</p>}
  {puzzle&&<><div className="nexo-instrument-head"><span>{candidate.provider==='local'?'Extração automática sem IA':candidate.provider==='base44'?'Proposta Base44':'Proposta Gemini'}</span><span>PREVIEW · NÃO PUBLICADA</span></div>
   {!approved?<><p>Confira se os encaixes e as condições estão corretos. A correspondência literal não comprova a correção semântica.</p><NexoAssociationPuzzle key={candidate.sourceVersion+'review'} puzzle={puzzle} mode="explore" onFocus={show}/><details><summary>Remissões exatas</summary>{candidate.pairs.map((p,i)=><p key={i}>{p.evidence}</p>)}<small>{candidate.sourceVersion}</small></details><button type="button" className="qb-btn qb-btn--secondary" onClick={()=>{setApproved(true);setFocus(null);}}>Aceitar para testar nesta sessão</button></>:<>
    <div className="qb-seg" role="group" aria-label="Modo da atividade"><button type="button" className="qb-seg__opt" aria-pressed={mode==='explore'} onClick={()=>{setMode('explore');setFocus(null);}}>Exploração livre</button><button type="button" className="qb-seg__opt" aria-pressed={mode==='train'} onClick={()=>{setMode('train');setFocus(null);}}>Treino de encaixe</button></div>
    <NexoAssociationPuzzle key={candidate.sourceVersion+mode} puzzle={puzzle} mode={mode} onFocus={id=>{if(mode==='explore')show(id);else setFocus(null);}} onFeedback={c=>{if(mode==='train'&&c)setFocus({title:c.correct?'Encaixe correto':'Reveja o encaixe',detail:c.explanation});}}/>
   </>}
   {focus&&<div className="nexo-stage-facts" aria-live="polite"><div><strong>{focus.title}</strong><p>{focus.detail}</p><small>{source.reference}</small></div></div>}
   <small>Prévia temporária. Não salva resultados nem aprova conteúdo para publicação. O percurso completo e outros renderizadores gerados ainda estão pendentes.</small>
   <button type="button" className="qb-btn qb-btn--secondary qb-btn--sm" onClick={clear}>Descartar proposta</button>
  </>}
 </section>;
}
