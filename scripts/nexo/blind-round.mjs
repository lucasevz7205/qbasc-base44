import console from 'node:console';
import process from 'node:process';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {URL,fileURLToPath,pathToFileURL} from 'node:url';
import {registerHooks} from 'node:module';
import {decideCognitive,decisionEvidence,DECISION_VERSION,STRUCTURES} from '../../src/lib/nexo/cognitive-decision.js';
import {generationSources,sourceVersion} from '../../src/lib/nexo/generation.js';
import {effectiveGenerationSources} from '../../src/lib/nexo/effective-sources.js';
import {targets} from './blind-round-cases.mjs';
import {agreement,digest,score,validateRound} from './blind-round-metrics.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const json=async file=>JSON.parse((await readFile(file,'utf8')).replace(/^\uFEFF/,''));
const save=(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const signs=Object.fromEntries(Object.entries(STRUCTURES).map(([id,s])=>[id,{label:s.label,criterion:s.criterion}]));

async function buildRound(){
 const kitsRoot=path.join(root,'src/data/kits');
 const paths=(await readdir(kitsRoot,{recursive:true})).filter(file=>path.basename(file)==='mapa.json').sort();
 const maps=Object.fromEntries(await Promise.all(paths.map(async relative=>{
  const file=path.join(kitsRoot,relative);
  return [file.split(path.sep).join('/'),await json(file)];
 })));
 const syllabus=Object.values(maps).map(kit=>({id:kit.topico,materia:kit.topico.split('-')[0],titulo:kit.centro}));
 const hooks=registerHooks({resolve(name,context,nextResolve){
  if(!name.startsWith('@/lib/'))return nextResolve(name,context);
  return nextResolve(pathToFileURL(path.join(root,'src/lib',name.slice(6)+'.js')).href,context);
 }});
 let adaptStudy;
 try{({adaptStudy}=await import('../../src/lib/qb-real-model.js'));}
 finally{hooks.deregister();}
 const {QB_DATA}=adaptStudy({edital:syllabus},{role:'admin'},new Date('2026-11-26T12:00:00Z'),{centralKitModules:maps});
 const sources=syllabus.flatMap(({id,materia})=>effectiveGenerationSources(QB_DATA,materia,id,generationSources(maps,materia,id)));
 const pilot=await json(path.join(root,'src/lib/nexo/representation-pilot.json'));
 const entries=await Promise.all(targets.map(async ([topic,title,task,stratum='dirigido'])=>{
  const matches=sources.filter(s=>s.topicId===topic&&s.title===title);
  if(matches.length!==1)throw Error('Conceito indisponível ou ambíguo: '+topic+' / '+title);
  const source=matches[0];
  const version=await sourceVersion(source);
  const evidence=decisionEvidence(source).map(({text,reference,nodeId})=>({text,reference,nodeId}));
  const blind={topic,title,task,reference:source.reference,sourceVersion:version,evidence};
  const result=await decideCognitive(source,pilot);
  return {blind,decision:{stratum,sourceVersion:version,status:result.status,objective:result.objective||null,
   primary:result.primary?.structure||null,secondary:result.secondary?.structure||null,
   candidates:(result.assessments||[]).filter(a=>a.structureRank!==null).map(a=>a.structure),
   subforms:result.primary?.subforms.map(s=>s.format)||[]
  }};
 }));
 const seed='NEXO-CEGA-01-2026-11-26';
 entries.sort((a,b)=>digest([seed,a.blind.topic,a.blind.task]).localeCompare(digest([seed,b.blind.topic,b.blind.task])));
 const publicData={name:'Nexo · Rodada Cega 01',taxonomy:signs,cases:entries.map(({blind},i)=>({id:idAt(i),...blind}))};
 const round={...publicData,roundHash:digest(publicData)};
 const privateData={roundHash:round.roundHash,decisionVersion:DECISION_VERSION,
  scope:'Piloto dirigido offline com kits efetivos. O motor local escolhe o próprio objetivo a partir da fonte. Os avaliadores julgam uma tarefa prefixada. Os controles são uma bateria separada de alinhamento com a tarefa.',
  cases:entries.map(({decision},i)=>({id:idAt(i),...decision}))
 };
 return {round,predictions:{...privateData,predictionHash:digest(privateData)}};
}

const idAt=i=>'NEXO-'+String(i+1).padStart(2,'0');
const [command,...args]=process.argv.slice(2);
if(command==='preparar'&&args.length===1){
 const [output]=args;
 const {round,predictions}=await buildRound();
 const template=await readFile(new URL('blind-round-form.html',import.meta.url),'utf8');
 const page=template.replace('<!-- ROUND_JSON -->',()=>JSON.stringify(round).replace(/</g,'\\u003c'))
  .replace('<!-- PREDICTION_HASH -->',predictions.predictionHash);
 await mkdir(output);
 await mkdir(path.join(output,'avaliadores'));
 await mkdir(path.join(output,'operador'));
 await Promise.all([
  writeFile(path.join(output,'avaliadores','avaliacao.html'),page,{flag:'wx'}),
  save(path.join(output,'avaliadores','casos.json'),round),
  save(path.join(output,'avaliadores','compromisso.json'),{roundHash:round.roundHash,predictionHash:predictions.predictionHash}),
  save(path.join(output,'operador','predicoes.json'),predictions)
 ]);
 console.log(round.cases.length+' casos congelados. Entregue apenas avaliacao.html aos avaliadores.');
}else if(command==='concordar'&&args.length===4){
 const [round,first,second]=await Promise.all(args.slice(0,3).map(json));
 const {draft,...report}=agreement(validateRound(round),first,second);
 await mkdir(args[3]);
 await Promise.all([save(path.join(args[3],'concordancia.json'),report),save(path.join(args[3],'adjudicacao-rascunho.json'),draft)]);
 console.log('Concordância calculada. Casos com divergência nas categorias: '+report.cases.filter(c=>c.disagreements.length).length+'.');
}else if(command==='pontuar'&&args.length===7){
 const [round,commitment,predictions,first,second,reference]=await Promise.all(args.slice(0,6).map(json));
 validateRound(round);
 if(commitment.roundHash!==round.roundHash)throw Error('Compromisso de outra rodada.');
 await save(args[6],score(round,predictions,commitment,first,second,reference));
 console.log('Comparação concluída para a referência adjudicada.');
}else{
 throw Error('Uso: preparar NOVA_PASTA | concordar CASOS AVALIADOR_A AVALIADOR_B NOVA_PASTA | pontuar CASOS COMPROMISSO PREDICOES AVALIADOR_A AVALIADOR_B REFERENCIA NOVO_RELATORIO');
}
