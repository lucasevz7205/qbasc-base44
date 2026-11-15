import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { listClaudeCollection } from '@/lib/study-store';
import { adaptStudy } from '@/lib/qb-real-model';
import { loadPersonalStudy, writePersonalStudy } from '@/lib/study-accounts';
import { Button } from '@/components/qb/core/Button';

const RealStudyContext = React.createContext(null);
const collections = ['edital','questoes','respostas','revisao','cartoes_aval','planejamento','rodadas','simulados','config','diario','pegadinhas','materiais','pontos','curadoria','questoes_excluidas','analise'];
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
  const payload={...data,id};
  if(collection==='questoes_excluidas' && rows.length) return payload;
  if(rows.length>1)throw new Error('Identificador duplicado. A gravação foi interrompida.');
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
  const queryKey = React.useMemo(() => ['qbasc-study', user?.id, admin], [user?.id, admin]);
  const query = useQuery({
    queryKey,
    queryFn: async () => admin ? { profile: null, records: await loadRealData() } : loadPersonalStudy(),
    enabled: !!user && typeof window !== 'undefined',
    staleTime: 60000,
    refetchInterval: admin ? false : 60000,
    retry: false,
  });
  const refresh=React.useCallback(async()=>{const result=await query.refetch();if(result.error)throw result.error;},[query.refetch]);
  const save=React.useCallback(async (collection,id,data)=>{
    if (!user || !collections.includes(collection)) throw new Error('Acesso restrito.');
    const row = admin ? await persist(collection, id, data) : await writePersonalStudy({ data: { collection, id, value: data } });
    if(collection==='questoes_excluidas') await client.cancelQueries({queryKey,exact:true});
    client.setQueryData(queryKey, before=>{
      if (!before?.records) return before;
      const old = before.records[collection] || [];
      const rows = collection === 'questoes_excluidas' ? [...old.filter(x => x.id !== row.id), row]
        : old.some(x => x.id === row.id) ? old.map(x => x.id === row.id ? row : x) : [...old, row];
      return { ...before, records: { ...before.records, [collection]: rows } };
    });
    return row;
  }, [admin, client, queryKey, user]);
  const { profile, records } = query.data || {};
  const model = React.useMemo(() => records ? adaptStudy(records, user, new Date(), {
    examName: admin ? undefined : profile?.exam || 'Meu projeto de estudo',
  }) : null, [records, user, admin, profile?.exam]);
  if(auth.isLoadingAuth)return <Gate title="Verificando acesso ao QBAsc…" detail="Se a verificação não avançar, abra a tela de entrada." action={<a href="/login">Abrir tela de entrada</a>}/>;
  if(auth.authError?.type==='user_not_registered')return <Gate title="Esta conta não tem acesso ao QBAsc" action={<Button onClick={auth.navigateToLogin}>Entrar com outra conta</Button>}/>;
  if(auth.authError)return <Gate title="Falha ao verificar sua conta" detail="Recarregue para iniciar outra verificação ou volte à tela de entrada." action={<><Button onClick={()=>window.location.reload()}>Tentar novamente</Button><Button variant="secondary" onClick={auth.navigateToLogin}>Ir para o login</Button></>}/>;
  if(!user)return <Gate title="Quebrando a Banca" detail="Entre com sua conta para acessar o ambiente de estudo." action={<Button onClick={auth.navigateToLogin}>Entrar</Button>}/>;
  if(query.isError)return <Gate title="Não foi possível carregar seu progresso" detail="Confira a conexão e tente novamente." action={<Button onClick={()=>query.refetch()}>Tentar novamente</Button>}/>;
  if (!admin && profile && profile.status !== 'active') {
    const suspended = profile.status === 'suspended';
    return <Gate title={suspended ? 'Acesso suspenso' : 'Aguardando ativação'}
      detail={suspended ? 'Fale com a administração para recuperar o acesso.' : 'Sua conta foi cadastrada. O acesso será liberado pela administração.'}
      action={<><Button disabled={query.isFetching} onClick={() => query.refetch()}>Verificar acesso</Button><Button variant="secondary" onClick={auth.logout}>Sair</Button></>} />;
  }
  if(!model)return <Gate title="Carregando seu progresso de estudo…"/>;
  return <RealStudyContext.Provider value={{...model,save,refresh,logout:auth.logout,isAdmin:admin}}>{children}</RealStudyContext.Provider>;
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