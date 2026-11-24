// Derive context from the same normalized maps the student actually sees.
// No client-supplied source text is accepted by the server.
const good=(s,max=12000)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
const str=v=>typeof v==='string'?v:Array.isArray(v)?v.filter(x=>typeof x==='string').join('\n'):'';
const label=v=>str(v?.titulo||v?.label||v);
export function nodeSourceDetail(node,mapSources){
 const d=node.x&&typeof node.x==='object'&&!Array.isArray(node.x)?node.x:{};
 const summary=[d.e,d.explicacao,d.definicao,node.x,node.explicacao,node.definicao].map(str).find(s=>good(s));
 const direct=[d.src,node.src].flat().map(label).filter(s=>good(s,1500));
 const general=(Array.isArray(mapSources)?mapSources:[]).map(label).filter(s=>good(s,1500));
 const t=node.tabela;
 const table=Array.isArray(t?.cab)&&t.cab.length>=2&&t.cab.length<=6&&t.cab.every(c=>good(c,300))&&Array.isArray(t.linhas)&&t.linhas.length>=2&&t.linhas.length<=12&&t.linhas.every(r=>Array.isArray(r)&&r.length===t.cab.length&&r.every(c=>good(c,1500)))?{headers:t.cab,rows:t.linhas}:undefined;
 return {rawId:good(node.id,250)?node.id:null,summary:summary||null,direct:direct.join(' · '),general:general.join(' · ').slice(0,6000),extraLines:(Array.isArray(node.caixa?.itens)?node.caixa.itens:[]).filter(s=>good(s,1500)).slice(0,30),...(table?{table}:{})};
}
export function resolveEffectiveSource(rows,id){
 const exact=rows.filter(s=>s.nodeId===id||s.mapNodeId===id);
 if(exact.length===1)return exact[0];
 if(exact.length>1)return null;
 const aliases=rows.filter(s=>s.legacyNodeId===id);
 return aliases.length===1?aliases[0]:null;
}
export function effectiveGenerationSources(data,subjectId,topicId,central=[],nodeId){
 if(!data?.studySubjects?.some(s=>s.id===subjectId&&s.topics?.some(t=>t.id===topicId)))return [];
 const map=data.mindMaps?.filter(m=>m.topicId===topicId&&m.subjectId===subjectId)||[];
 if(map.length!==1)return [];
 const m=map[0],nodes=m.nodes||[],counts=new Map();
 for(const n of nodes){const k=data.concepts?.[n.id]?.nexo?.rawId;if(k)counts.set(k,(counts.get(k)||0)+1);}
 const out=[];
 for(const n of nodes){
  const d=data.concepts?.[n.id]?.nexo;
  if(!good(d?.summary)||!good(n.label,300)||!good(n.id,250))continue;
  const raw=d.rawId&&counts.get(d.rawId)===1?d.rawId:null;
  // Only a currently visible, unmodified central node may inherit its curated contract.
  const original=d.central&&raw?central.find(s=>s.nodeId===raw&&s.lines[0]===d.summary&&s.reference===d.direct):null;
  const reference=d.direct|| (d.general?'Referências gerais do mapa: '+d.general:'Mapa de estudo '+m.title+' · nó '+n.label+' (sem referência bibliográfica individual)');
  const base={subjectId,topicId,nodeId:n.id,mapNodeId:n.id,legacyNodeId:raw,title:n.label,reference,lines:[d.summary,...d.extraLines],sourcePath:'mapa-efetivo:'+m.id,referenceLevel:d.direct?'node':d.general?'map':'internal',...(d.table?{table:d.table}:{})};
  if(original)out.push({...original,mapNodeId:n.id,legacyNodeId:raw,referenceLevel:'node',central:true});
  else out.push(base);
 }
 // Do not expose obsolete aliases or duplicate node ids.
 const unique=out.filter(s=>out.filter(t=>t.nodeId===s.nodeId).length===1);
 return nodeId?(resolveEffectiveSource(unique,nodeId)?[resolveEffectiveSource(unique,nodeId)]:[]):unique;
}
export function decodeNexoDocuments(rows,parts){
 const grouped=new Map();
 for(const p of parts||[]){const list=grouped.get(p.legacy_id)||[];list.push(p);grouped.set(p.legacy_id,list);}
 const seen=new Set();
 return rows.map(row=>{
  if(seen.has(row.legacy_id))throw Error('Documento duplicado.');
  seen.add(row.legacy_id);
  let value=JSON.parse(row.payload_json);
  if(value._claudeParts){
   const expected=value._claudeParts;
   const pieces=[...(grouped.get(value.fragmentId||row.legacy_id)||[])].sort((a,b)=>a.part-b.part);
   if(!Number.isInteger(expected)||expected<1||pieces.length!==expected||pieces.some((p,i)=>p.part!==i||typeof p.payload_chunk!=='string'))throw Error('Documento fragmentado incompleto.');
   value=JSON.parse(pieces.map(p=>p.payload_chunk).join(''));
  }
  return {...value,id:row.legacy_id};
 });
}
