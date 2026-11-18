import React,{useRef,useState} from 'react';
import {Button} from '@/components/qb/core/Button';
import {parseImport,modelPrompt,importResult} from '@/lib/map-import';

export function MapImport({topics,maps,initial,onSave,onOpen}){
 const dialog=useRef(null),lock=useRef(false);
 const [topic,T]=useState(''),[target,A]=useState(''),[source,S]=useState(''),[mode,M]=useState(''),[choices,C]=useState({}),[error,E]=useState(''),[busy,B]=useState(false);
 const [entry,I]=useState(''),[showPrompt,P]=useState(false);
 const candidates=maps.filter(m=>m.topicId===topic), current=candidates.find(m=>m.id===target)||candidates[0];
 let tree,problem;
 try{tree=parseImport(source)}catch(e){problem=e.message}
 const action=current?mode:'new';
 const result=tree && action && importResult(current,tree,{id:entry,mode:action,choices},{},v=>v.x);
 function select(id){T(id);A('');M('');C({})}
 function open(){select(initial||topics[0]?.id||'');A(maps.find(m=>m.topicId===initial&&m.active)?.id||'');S('');E('');P(false);I('import-'+crypto.randomUUID());dialog.current.showModal()}
 async function submit(){
  if(lock.current||!result||!topic)return;
  lock.current=true;B(true);
  try{await onSave({id:entry,topico:topic,mode:action,target:current?.id||'',markdown:source,choices});onOpen(topic,result.id);dialog.current?.close()}catch(e){E(e.message)}finally{lock.current=false;B(false)}
 }
 function preview(nodes,parent){
  return <ul style={{paddingLeft:18}}>{nodes.map(n=>{
   const matched=current?.nodes.filter(v=>v.parent===parent && v.label===n.t);
   const existing=matched?.length===1?matched[0]:null;
   return <li key={n.id}><details open><summary>{n.t}</summary><p>{n.x?.e}</p>{[n.x?.ex,n.x?.trap,n.x?.src].filter(Boolean).map((v,i)=><p key={i}>{v}</p>)}
   {mode==='merge' && existing && <label>Conteúdo deste nó <select value={choices[n.id]||'existing'} onChange={e=>C({...choices,[n.id]:e.target.value})}><option value="existing">Manter atual</option><option value="incoming">Usar importado</option></select></label>}
   {n.f?.length>0 && preview(n.f,existing?.id||'')}</details></li>})}</ul>
 }
 return <><Button onClick={open}>Importar mapa</Button><dialog ref={dialog} aria-label="Importar mapa mental" onCancel={e=>{if(busy)e.preventDefault()}} style={{margin:'auto',width:'min(680px,94vw)',maxHeight:'88vh',padding:24,background:'var(--surface, #172131)',color:'var(--text, #fff)',borderRadius:12}}>
 <fieldset disabled={busy} style={{display:'grid',gap:12}}><h2>Importar mapa mental</h2>
 <label>Assunto <select value={topic} onChange={e=>select(e.target.value)}>{topics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
 <Button onClick={async()=>{try{await navigator.clipboard.writeText(modelPrompt);E('Modelo copiado.')}catch{P(true)}}}>Copiar modelo para IA</Button>{showPrompt&&<textarea readOnly value={modelPrompt}/>}
 <label>Enviar Markdown <input type="file" accept=".md,.markdown" onChange={async e=>{const f=e.target.files[0];if(f)try{if(f.size>110000)throw Error('Arquivo muito grande.');S(await f.text());C({});E('')}catch(err){E(err.message)}}}/></label>
 <label>Colar ou editar Markdown<textarea style={{width:'100%'}} rows={7} value={source} onChange={e=>{S(e.target.value);C({})}}/></label>
 {current&&<><label>Mapa de destino <select value={current.id} onChange={e=>{A(e.target.value);C({});M('')}}>{candidates.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
 <label>Como salvar <select value={mode} onChange={e=>M(e.target.value)}><option value="">Escolha uma opção</option><option value="merge">Mesclar</option><option value="replace">Salvar por cima</option><option value="new">Criar novo mapa</option></select></label></>}
 {tree?<section><h3>Prévia · {tree.centro}</h3>{preview(tree.ramos,current?.id)}</section>:source&&<p>{problem}</p>}
 {mode==='replace'&&result?.removed.length>0&&<p>Nós que sairão do mapa e cujas remissões precisam de revisão: {result.removed.join(', ')}.</p>}
 <p role="status">{error}</p><div><Button onClick={()=>dialog.current.close()}>Cancelar</Button> <Button disabled={!result||!topic||busy} onClick={submit}>{busy?'Salvando…':mode==='replace'?'Confirmar substituição':'Salvar mapa'}</Button></div></fieldset></dialog></>
}
