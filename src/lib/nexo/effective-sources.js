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
 if(!map.length)return [];
 const nodes=map.flatMap(m=>m.nodes||[]),counts=new Map(),mapByNode=new Map();
 for(const m of map)for(const n of m.nodes||[])mapByNode.set(n.id,m);
 for(const n of nodes){const k=data.concepts?.[n.id]?.nexo?.rawId;if(k)counts.set(k,(counts.get(k)||0)+1);}
 const out=[];
 for(const n of nodes){
  const m=mapByNode.get(n.id),d=data.concepts?.[n.id]?.nexo;
  if(!good(d?.summary)||!good(n.label,300)||!good(n.id,250)||nodes.filter(c=>c.id===n.id).length!==1)continue;
  const raw=d.rawId&&counts.get(d.rawId)===1?d.rawId:null;
  // A stored copy may reuse a reviewed contract only if its current source is identical.
  let original=raw?central.find(s=>s.nodeId===raw&&s.lines[0]===d.summary&&s.reference===d.direct&&JSON.stringify(s.lines.slice(1))===JSON.stringify(d.extraLines)&&JSON.stringify(s.table||null)===JSON.stringify(d.table||null)):null;
  if(original?.procedure){
   const p=original.procedure;
   const child=id=>nodes.filter(c=>c.parent===n.id&&data.concepts?.[c.id]?.nexo?.rawId===id);
   const order=child(p.order.nodeId),exception=child(p.exception.nodeId);
   if(order.length!==1||exception.length!==1||data.concepts[order[0].id].nexo.summary!==p.order.text||data.concepts[exception[0].id].nexo.summary!==p.exception.text||data.concepts[exception[0].id].nexo.direct!==p.exception.reference)original=null;
  }
  const reference=d.direct|| (d.general?'Referências gerais do mapa: '+d.general:'Mapa de estudo '+m.title+' · nó '+n.label+' (sem referência bibliográfica individual)');
  const base={subjectId,topicId,nodeId:n.id,mapNodeId:n.id,legacyNodeId:raw,title:n.label,reference,lines:[d.summary,...d.extraLines],sourcePath:'mapa-efetivo:'+m.id,referenceLevel:d.direct?'node':d.general?'map':'internal',...(d.table?{table:d.table}:{})};
  if(original)out.push({...original,mapNodeId:n.id,legacyNodeId:raw,sourcePath:base.sourcePath,referenceLevel:'node',central:true,origin:d.central?'kit':'mapa-armazenado'});
  else out.push(base);
 }
 // Do not expose obsolete aliases or duplicate node ids.
 const unique=out.filter(s=>out.filter(t=>t.nodeId===s.nodeId).length===1);
 const byMapId=new Map(unique.map(s=>[s.mapNodeId,s]));
 const exactCentralNodes=new Set(unique.filter(s=>s.central).map(s=>s.nodeId));
 for(const source of unique){
  if(source.learningRoute?.requiredNodes.some(id=>!exactCentralNodes.has(id)))delete source.learningRoute;
 }
 // An explicit comparison/classification heading and its direct children are grounded structure.
 // Do not turn arbitrary lists or procedure steps into a comparison.
 for(const parent of unique){
  const direct=nodes.filter(n=>n.parent===parent.mapNodeId).map(n=>byMapId.get(n.id));
  if(direct.length>=2&&direct.length<=8&&direct.every(c=>c&&good(c.lines[0],1500)))parent.children=direct.map(c=>({nodeId:c.mapNodeId,title:c.title,text:c.lines[0],reference:c.reference}));
  if(parent.table||parent.procedure||!/×|\bversus\b|\bvs\.?\s|diferen[çc]|distin[çc]|classifica[çc]|\btipos\b|\bespécies\b|\bmodalidades\b|\bcategorias\b|\bprincípios\b/i.test(parent.title))continue;
  const children=nodes.filter(n=>n.parent===parent.mapNodeId);
  const rows=children.map(n=>byMapId.get(n.id));
  if(rows.length<2||rows.length>6||rows.some(s=>!s||!good(s.lines[0],600)))continue;
  const norm=v=>v.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
  if(new Set(rows.map(s=>norm(s.title))).size!==rows.length||new Set(rows.map(s=>norm(s.lines[0]))).size!==rows.length)continue;
  parent.table={headers:['Conceito','Descrição registrada'],rows:rows.map(s=>[s.title,s.lines[0]])};
  parent.rowSources=rows.map(s=>({nodeId:s.mapNodeId,reference:s.reference}));
 }
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
