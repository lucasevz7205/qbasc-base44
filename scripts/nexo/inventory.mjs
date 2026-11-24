import fs from 'node:fs';
import {URL} from 'node:url';
import process from 'node:process';
import console from 'node:console';
import {createHash} from 'node:crypto';
import {extractMapCandidates} from '../../src/lib/nexo/catalog.js';
const root=new URL('../../',import.meta.url);
const base='src/data/kits/';
const result={status:'candidate-only',sourceApp:'QBAsc',approvedConcepts:[],approvedEdges:[],kits:[],unprocessed:[]};
const digest=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
const read=path=>{const bytes=fs.readFileSync(new URL(path,root));return {version:digest(bytes),value:JSON.parse(bytes)};};
const exists=path=>fs.existsSync(new URL(path,root));
const files=fs.readdirSync(new URL(base,root),{recursive:true,withFileTypes:false}).map(p=>String(p).replaceAll('\\','/')).sort();
for(const path of files.filter(p=>p.endsWith('/mapa.md')))result.unprocessed.push({path:base+path,reason:'markdown-needs-dedicated-parser'});
for(const path of files.filter(p=>p.endsWith('/mapa.json'))){
  const sourceId=base+path, {version,value:map}=read(sourceId);
  if(typeof map?.topico!=='string'||!Array.isArray(map.ramos)){result.unprocessed.push({path:sourceId,reason:'unsupported-map-format'});continue;}
  const extraction=extractMapCandidates({sourceId,version,mapId:map.topico,map});
  const nodes=new Map(extraction.concepts.map(c=>[c.mapNodeId,c]));
  const dir=sourceId.slice(0,sourceId.lastIndexOf('/')+1);
  const kit={topicId:map.topico,mapSource:{sourceId,version},concepts:extraction.concepts.map(c=>({id:c.id,label:c.label,mapNodeId:c.mapNodeId,source:c.source,status:'candidate'})),structuralLinks:extraction.structuralLinks,unresolved:extraction.unresolved,activities:[]};
  for(const [name,kind] of [['itens.json','question'],['cartoes.json','flashcard']]){
    if(!exists(dir+name))continue;
    const a=read(dir+name);
    if(!Array.isArray(a.value)){result.unprocessed.push({path:dir+name,reason:'unsupported-activity-format'});continue;}
    const ids=new Map();
    for(const r of a.value)if(typeof r?.id==='string')ids.set(r.id,(ids.get(r.id)||0)+1);
    for(const [i,r] of a.value.entries()){
      const id=r?.id,node=r?.no??r?.mapaNoId??r?.mapNodeId,ref=r?.fonte??r?.ref??r?.src;
      if(typeof id!=='string'||ids.get(id)!==1||!nodes.has(node)||typeof ref!=='string'||!ref.trim()){
        kit.unresolved.push({locator:name+'/'+i,reason:'missing-unique-id-exact-node-or-reference'});continue;
      }
      kit.activities.push({id,kind,conceptId:nodes.get(node).id,reference:ref,source:{sourceId:dir+name,version:a.version,locator:String(i)},status:'candidate'});
    }
  }
  result.kits.push(kit);
}
const out=JSON.stringify(result,null,2)+'\n', dest=new URL('docs/nexo/source-inventory.json',root);
if(process.argv.includes('--check')){if(fs.readFileSync(dest,'utf8')!==out)throw Error('Inventory mismatch');}
else fs.writeFileSync(dest,out);
console.log(JSON.stringify({kits:result.kits.length,concepts:result.kits.reduce((s,k)=>s+k.concepts.length,0),structuralLinks:result.kits.reduce((s,k)=>s+k.structuralLinks.length,0),activities:result.kits.reduce((s,k)=>s+k.activities.length,0),unresolved:result.kits.reduce((s,k)=>s+k.unresolved.length,0),unprocessed:result.unprocessed.length,approvedEdges:0}));
