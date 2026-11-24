const prefix='kit-arr-cp-1-regimes-politicos-2026-11-22-';
export const DAHL_NODES=Object.freeze(['r3.2','r3.3','r3.3a','r3.3b'].map(s=>prefix+s));
export const REGIMES=Object.freeze([
  {id:'oligarchy',label:'Oligarquia competitiva',row:0,col:0,description:'Alta contestação e baixa inclusividade.',detail:'Há disputa aberta entre elites, mas grande parte da população é excluída do voto.'},
  {id:'polyarchy',label:'Poliarquia',row:0,col:1,description:'Alta contestação e alta inclusividade.',detail:'Regime real que se aproxima do ideal democrático, sem se confundir com a democracia plenamente realizada.'},
  {id:'closed',label:'Hegemonia fechada',row:1,col:0,description:'Baixa contestação e baixa inclusividade.',detail:'Faltam competição política e participação ampla.'},
  {id:'inclusive',label:'Hegemonia inclusiva',row:1,col:1,description:'Baixa contestação e alta inclusividade.',detail:'Sufrágio amplo sem competição livre nem direito efetivo de oposição.'}
]);
export const AXES=Object.freeze([
  {id:'contestation',label:'Contestação pública',detail:'Grau em que grupos de oposição podem disputar o poder em eleições livres e justas.'},
  {id:'inclusion',label:'Inclusividade',detail:'Proporção da população com direito igualitário de participar do processo político.'}
]);
export const TRAJECTORIES=Object.freeze([
  {from:'closed',direction:'up',to:'oligarchy'},
  {from:'closed',direction:'right',to:'inclusive'},
  {from:'oligarchy',direction:'right',to:'polyarchy'},
  {from:'inclusive',direction:'up',to:'polyarchy'}
]);
const text=(n,s)=>n?.x?.e?.includes(s);
export function getDahlSource(kit){
  if(kit?.topico!=='cp-1'||kit.materia!=='cp')return null;
  const root=kit.ramos.find(n=>n.id===prefix+'r3');
  const axis=root?.f?.find(n=>n.id===DAHL_NODES[0]),matrix=root?.f?.find(n=>n.id===DAHL_NODES[1]),contrast=matrix?.f?.find(n=>n.id===DAHL_NODES[2]),trajectory=matrix?.f?.find(n=>n.id===DAHL_NODES[3]);
  const ideal=root?.f?.find(n=>n.id===prefix+'r3.1');
  if(![axis,matrix,contrast,trajectory,ideal].every(n=>n?.x?.src&&n.x.e))return null;
  const table=matrix.tabela;
  if(table?.linhas?.length!==2||table.cab?.[1]!=='Inclusividade baixa'||table.cab?.[2]!=='Inclusividade alta'||!table.linhas[0]?.[0]?.startsWith('Alta')||!table.linhas[1]?.[0]?.startsWith('Baixa'))return null;
  if(!REGIMES.every(r=>table.linhas[r.row]?.[r.col+1]?.startsWith(r.label)))return null;
  if(!text(axis,'dois eixos independentes')||!text(trajectory,'aumento da contestação pública')||!text(trajectory,'ampliação do direito de participação')||!trajectory.n?.includes('Subir = liberalizar')||!trajectory.n?.includes('Ir à direita = incluir'))return null;
  return {axis,matrix,contrast,trajectory,ideal};
}
export function dahlPuzzle(stage,scenario=0){
  const pieces=REGIMES.map(r=>({id:r.id,label:r.label}));
  if(stage===0)return {id:'axes',layout:'axes',title:'Monte os eixos',instruction:'Encaixe cada dimensão no eixo correspondente do diagrama.',pieces:[{id:'inclusion',label:'Inclusividade'},{id:'contestation',label:'Contestação pública'}],slots:[{id:'vertical',label:'Eixo vertical ↑',expected:'contestation',explanation:'Subir representa maior contestação pública (liberalização).'}, {id:'horizontal',label:'Eixo horizontal →',expected:'inclusion',explanation:'Avançar à direita representa maior inclusividade (participação).'}]};
  if(stage===1)return {id:'regimes',layout:'matrix',title:'Encaixe os regimes',instruction:'Associe os quatro regimes às combinações dos eixos.',pieces:[pieces[3],pieces[0],pieces[2],pieces[1]],slots:REGIMES.map(r=>({id:r.id,label:r.description,expected:r.id,explanation:r.detail}))};
  if(stage===2)return {id:'characteristics',layout:'matrix',title:'Associe as características',instruction:'Encaixe uma descrição no regime correspondente.',pieces:[2,1,3,0].map(i=>({id:REGIMES[i].id,label:REGIMES[i].description})),slots:REGIMES.map(r=>({id:r.id,label:r.label,expected:r.id,explanation:r.detail}))};
  if(stage===3){
    const t=TRAJECTORIES[scenario];
    if(!t)throw Error('Unknown trajectory');
    const from=REGIMES.find(r=>r.id===t.from),to=REGIMES.find(r=>r.id===t.to);
    return {id:'trajectory-'+scenario,layout:'trajectory',title:'Trajetórias de mudança',instruction:'Partindo de '+from.label+', '+(t.direction==='up'?'aumente a contestação sem alterar a inclusividade.':'aumente a inclusividade sem alterar a contestação.'),pieces:[pieces[3],pieces[2],pieces[0],pieces[1]],slots:[{id:'destination',label:'Regime de destino',expected:to.id,explanation:(t.direction==='up'?'Liberalização: deslocamento para cima. ':'Inclusão: deslocamento para a direita. ')+to.description}],trajectory:t};
  }
  throw Error('Unknown stage');
}
export function dahlContext(source,stage,slotId){
  if(!source)return null;
  if(stage===0){const a=AXES.find(x=>x.id===(slotId==='vertical'?'contestation':slotId==='horizontal'?'inclusion':null));return a?{title:a.label,detail:a.detail,reference:source.axis.x.src}:null;}
  const r=REGIMES.find(x=>x.id===slotId);
  return r?{title:r.label,detail:r.detail,reference:(r.id==='polyarchy'?source.ideal:source.contrast).x.src}:null;
}
