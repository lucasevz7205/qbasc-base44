import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {URL,fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {agreement,digest,proportion,validateReview} from '../scripts/nexo/blind-round-metrics.mjs';

const makeCases=()=>Array.from({length:4},(_,i)=>({id:'C'+i,evidence:[{text:'Texto de referência.'}]}));
const predictionHash='a'.repeat(64);
function review(round,reviewer,labels){
 return {roundHash:round.roundHash,predictionHash,reviewer,answers:labels.map((primary,i)=>({
  id:round.cases[i].id,primary,acceptablePrimaries:[],equivalentSecondaries:[],
  forms:primary==='abstain'?[]:['Matriz comparativa'],expected:'Resposta do teste',rationale:'Critério do teste',evidence:round.cases[i].evidence[0].text
 }))};
}

test('agreement includes abstentions and prevents duplicate reviewers or different prediction commitments',()=>{
 const round={roundHash:'test',cases:makeCases()};
 const first=review(round,'A',['comparative','comparative','abstain','temporal']);
 const second=review(round,'B',['comparative','abstain','abstain','temporal']);
 const result=agreement(round,first,second);
 assert.equal(result.rawAgreement,.75);
 assert.equal(result.kappa,7/11);
 assert.equal(result.matrix.comparative.abstain,1);
 assert.equal(result.draft.answers[1].primary,'');
 assert.equal(result.draft.answers[0].primary,'comparative');
 assert.throws(()=>agreement(round,first,{...second,reviewer:'Á'}),/distintos/);
 assert.throws(()=>agreement(round,first,{...second,predictionHash:'b'.repeat(64)}),/distintos/);
 assert.throws(()=>validateReview(round,{...first,answers:first.answers.slice(1)}),/incompleto/);
 first.answers[0].evidence='Não consta na fonte';
 assert.throws(()=>validateReview(round,first),/evidência literal/);
 assert.deepEqual(proportion(0,0),{successes:0,total:0,rate:null,wilson95:null});
});

test('the CLI freezes a blind package, adjudicates submissions and scores against the original commitment',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'nexo-blind-test-'));
 try{
  const script=fileURLToPath(new URL('../scripts/nexo/blind-round.mjs',import.meta.url));
  const run=(...args)=>execFileSync(process.execPath,[script,...args],{encoding:'utf8',stdio:'pipe'});
  const at=(...parts)=>path.join(dir,...parts);
  const json=async file=>JSON.parse(await readFile(file,'utf8'));
  run('preparar',at('round'));
  const publicPath=(name)=>at('round','avaliadores',name);
  const round=await json(publicPath('casos.json'));
  const commitment=await json(publicPath('compromisso.json'));
  const privatePath=at('round','operador','predicoes.json');
  const predictions=await json(privatePath);
  const html=await readFile(publicPath('avaliacao.html'),'utf8');
  const embedded=JSON.parse(html.match(/<script type="application\/json" id="round">([^]*?)<\/script>/)[1]);
  new Script(html.match(/<script>([^]*?)<\/script>/)[1]);
  assert.deepEqual(embedded,round);
  assert.match(html,new RegExp(commitment.predictionHash));
  assert.ok(embedded.cases.length>=10);
  for(const c of embedded.cases){
   assert.ok(c.task&&c.evidence.length);
   for(const key of ['primary','secondary','candidates','subforms','stratum','objective'])assert.equal(Object.hasOwn(c,key),false);
  }
  const {predictionHash:hash,...payload}=predictions;
  assert.equal(digest(payload),hash);
  const synthetic=review(round,'A',round.cases.map((_,i)=>i%2===0?'comparative':'abstain'));
  synthetic.predictionHash=hash;
  const a=at('a.json'),b=at('b.json');
  await writeFile(a,JSON.stringify(synthetic));
  await writeFile(b,JSON.stringify({...synthetic,reviewer:'B'}));
  run('concordar',publicPath('casos.json'),a,b,at('concord'));
  const ref=at('concord','adjudicacao-rascunho.json');
  const agreementResult=await json(at('concord','concordancia.json'));
  assert.equal(agreementResult.kappa,1);
  const scoreArgs=[publicPath('casos.json'),publicPath('compromisso.json'),privatePath,a,b,ref];
  run('pontuar',...scoreArgs,at('score.json'));
  const report=await json(at('score.json'));
  assert.equal(report.overall.total,round.cases.length);
  assert.equal(report.byStratum.controle.total,2);
  assert.equal(report.overall.primaryIdeal.total+report.overall.correctAbstention.total,round.cases.length);
  await writeFile(privatePath,JSON.stringify({...predictions,decisionVersion:'alterada'}));
  assert.throws(()=>run('pontuar',...scoreArgs,at('tampered.json')),/Predições alteradas/);
 }finally{
  assert.equal(path.dirname(path.resolve(dir)),path.resolve(tmpdir()));
  await rm(dir,{recursive:true,force:true});
 }
});
