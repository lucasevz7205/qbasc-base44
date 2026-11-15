import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { listClaudeCollection } from '@/lib/study-store';
import { adaptStudy } from '@/lib/qb-real-model';
import { Button } from '@/components/qb/core/Button';

const RealStudyContext = React.createContext(null);
const collections = ['edital','questoes','respostas','revisao','cartoes_aval','planejamento','rodadas','simulados','config','diario','pegadinhas','materiais','pontos'];
async function loadRealData() {
  const results = {};
  for (let i=0;i<collections.length;i+=3) {
    await Promise.all(collections.slice(i,i+3).map(async c => { results[c] = await listClaudeCollection(c); }));
  }
  if (!results.edital.length || !results.questoes.length) throw new Error('O edital ou o banco de questões da migração não está disponível.');
  return results;
}

async function persist(collection, id, data) {
  const docs=base44.entities.ClaudeDocument, parts=base44.entities.ClaudeDocumentPart;
  const match={collection,legacy_id:id};
  const rows=await docs.filter(match,'id',2);
  if(rows.length>1)throw new Error('Identificador duplicado. A gravação foi interrompida.');
  const payload={...data,id};
  const chunks=Array.from(JSON.stringify(payload));
  let payload_json=chunks.join('');
  if(payload_json.length>7000) {
    // Existing oversized documents are kept intact if a write cannot be committed atomically.
    if(rows.length)throw new Error('Este registro grande não pode ser atualizado neste teste.');
    const n=Math.ceil(chunks.length/6900);
    const prior=await parts.filter(match,'part',500);
    for(let i=0;i<n;i++){
      const payload_chunk=chunks.slice(i*6900,(i+1)*6900).join('');
      const same=prior.filter(p=>p.part===i);
      if(same.length>1)throw new Error('Fragmento duplicado.');
      if(same[0])await parts.update(same[0].id,{payload_chunk});
      else await parts.create({...match,part:i,payload_chunk});
    }
    payload_json=JSON.stringify({_claudeParts:n});
  }
  if(rows[0]) await docs.update(rows[0].id,{payload_json});
  else await docs.create({...match,payload_json,source:'qbasc-teste'});
  return payload;
}

export function RealStudyGate({children}) {
  const auth=useAuth(), client=useQueryClient();
  const user=auth.user, admin=user?.role==='admin';
  const queryKey=React.useMemo(()=>['qbasc-study',user?.id], [user?.id]);
  const query=useQuery({queryKey,queryFn:loadRealData,enabled:!!admin&&typeof window!=='undefined',staleTime:60000,retry:false});
  const refresh=React.useCallback(async()=>{const result=await query.refetch();if(result.error)throw result.error;},[query.refetch]);
  const save=React.useCallback(async (collection,id,data)=>{
    if(!admin||!collections.includes(collection))throw new Error('Acesso restrito.');
    const row=await persist(collection,id,data);
    client.setQueryData(queryKey, before=>{
      if(!before)return before;
      const old=before[collection]||[];
      return {...before,[collection]:old.some(x=>x.id===row.id)?old.map(x=>x.id===row.id?row:x):[...old,row]};
    });
    return row;
  },[admin,client,queryKey]);
  const model=React.useMemo(()=>query.data&&admin?adaptStudy(query.data,user):null,[query.data,user,admin]);
  if(auth.isLoadingAuth||typeof window==='undefined')return <Gate title="Verificando acesso ao QBAsc…"/>;
  if(auth.authError)return <Gate title="Falha ao verificar sua conta" action={<Button onClick={()=>auth.refresh().catch(()=>{})}>Tentar novamente</Button>}/>;
  if(!user)return <Gate title="Quebrando a Banca" detail="Versão de teste · entre com sua conta administradora." action={<Button onClick={auth.navigateToLogin}>Entrar</Button>}/>;
  if(!admin)return <Gate title="Acesso reservado à conta administradora" action={<Button onClick={auth.logout}>Sair</Button>}/>;
  if(query.isError)return <Gate title="Não foi possível carregar seu progresso" detail="Confira a conexão e tente novamente." action={<Button onClick={()=>query.refetch()}>Tentar novamente</Button>}/>;
  if(!model)return <Gate title="Carregando seu progresso de estudo…"/>;
  return <RealStudyContext.Provider value={{...model,save,refresh,logout:auth.logout}}>{children}</RealStudyContext.Provider>;
}
function Gate({title,detail,action}) {
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}>
    <div style={{maxWidth:480,display:'grid',gap:14,textAlign:'center'}}><h1 style={{font:'var(--type-h1)'}}>{title}</h1>{detail&&<p>{detail}</p>}{action}</div>
  </main>;
}
export function useRealStudy() {
  const data=React.useContext(RealStudyContext);
  if(!data)throw new Error('Ambiente de estudo indisponível.');
  return data;
}
