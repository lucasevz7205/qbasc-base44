import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {generationSources} from '../../src/lib/nexo/generation.js';
import {STRUCTURE_IDS,decideCognitive,buildDecidedCandidate} from '../../src/lib/nexo/cognitive-decision.js';
import {validPuzzle,evaluatePuzzle} from '../../src/lib/nexo/association-puzzle.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const maps={};
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name==='mapa.json')maps[p]=JSON.parse(fs.readFileSync(p,'utf8'));}}
walk(path.join(root,'src/data/kits'));
const pilot=JSON.parse(fs.readFileSync(path.join(root,'src/lib/nexo/representation-pilot.json'),'utf8'));
const sources=Object.values(maps).flatMap(m=>generationSources(maps,m.topico.split('-')[0],m.topico));
const bySubject={},primaries=Object.fromEntries(STRUCTURE_IDS.map(k=>[k,0])),errors=[],examples={},all=[];
for(const s of sources){
 const d=await decideCognitive(s,pilot);
 const row=bySubject[s.subjectId]??={sources:0,decided:0,abstained:0,blocked:0,backup:0,existing:0,localRecipe:0,semanticRecipe:0,unavailable:0,built:0};
 row.sources++;
 if(d.status==='decided'){
  row.decided++;primaries[d.primary.structure]++;if(d.secondary)row.backup++;
  const key={'existing':'existing','local-recipe':'localRecipe','semantic-recipe':'semanticRecipe','unavailable':'unavailable'}[d.primary.viability.status];
  row[key]++;
  examples[d.primary.structure]??={topic:s.topicId,title:s.title,secondary:d.secondary?.structure||null,viability:d.primary.viability.status};
  if(key==='localRecipe'){
   const r=await buildDecidedCandidate(s,d);
   if(r.status!=='candidate'||!validPuzzle(r.puzzle)||evaluatePuzzle(r.puzzle,Object.fromEntries(r.puzzle.slots.map(v=>[v.id,v.expected]))).status!=='correct'||r.publicationAllowed!==false)errors.push({node:s.nodeId,status:r.status,reason:r.reason});
   else row.built++;
  }
 }else if(d.status==='abstained')row.abstained++;else{row.blocked++;errors.push({node:s.nodeId,status:d.status,reason:d.reason});}
 if(d.assessments?.length!==9)errors.push({node:s.nodeId,reason:'incomplete assessments'});
 all.push({subject:s.subjectId,topic:s.topicId,node:s.nodeId,title:s.title,status:d.status,primary:d.primary?.structure||null,secondary:d.secondary?.structure||null,viability:d.primary?.viability.status||null});
}
const seed='QBAsc-2026-11-24-215911',rank=r=>createHash('sha256').update(seed+'|'+r.topic+'/'+r.node).digest('hex');
const sample=Object.keys(bySubject).sort().flatMap(subject=>all.filter(r=>r.subject===subject).sort((a,b)=>rank(a).localeCompare(rank(b))).slice(0,2));
const total=Object.values(bySubject).reduce((a,r)=>{for(const [k,v] of Object.entries(r))a[k]=(a[k]||0)+v;return a;},{});
console.log(JSON.stringify({scope:'bundled JSON kits only; not database or real providers',seed,total,bySubject,primaries,examples,sample,errors},null,2));
if(errors.length)process.exitCode=1;
