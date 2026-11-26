import {createHash} from 'node:crypto';
import {STRUCTURE_IDS} from '../../src/lib/nexo/cognitive-decision.js';

export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const label = value => value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const categories = [...STRUCTURE_IDS,'abstain'];
const nonempty = value => typeof value === 'string' && Boolean(value.trim());
const uniqueLabels = values => values.map(label).sort();
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const structures = values => Array.isArray(values)&&values.every(v=>STRUCTURE_IDS.includes(v))&&values.length===new Set(values).size;
const forms = values => Array.isArray(values)&&values.every(v=>nonempty(v)&&label(v))&&values.length===new Set(uniqueLabels(values)).size;

export function validateRound(round){
 const {roundHash,...payload}=round;
 if(roundHash!==digest(payload)||!Array.isArray(round.cases)||!round.cases.length||
    new Set(round.cases.map(c=>c.id)).size!==round.cases.length)throw Error('Pacote de casos alterado ou inválido.');
 return round;
}

export function validateReview(round,review){
 if(review?.roundHash!==round.roundHash||!nonempty(review.predictionHash)||!/^[a-f0-9]{64}$/.test(review.predictionHash)||
    !nonempty(review.reviewer)||!label(review.reviewer)||!Array.isArray(review.answers)||review.answers.length!==round.cases.length)
  throw Error('Parecer incompleto ou vinculado a outra rodada.');
 const rows=new Map(review.answers.map(a=>[a.id,a]));
 if(rows.size!==round.cases.length)throw Error('O parecer tem IDs repetidos.');
 return round.cases.map(c=>{
  const a=rows.get(c.id);
  if(!a||!categories.includes(a.primary)||!structures(a.acceptablePrimaries)||!structures(a.equivalentSecondaries)||!forms(a.forms)||
      !nonempty(a.expected)||!nonempty(a.rationale)||!nonempty(a.evidence)||!c.evidence.some(e=>e.text.includes(a.evidence.trim()))||
      [...a.acceptablePrimaries,...a.equivalentSecondaries].includes(a.primary)||
      (a.primary==='abstain'?(a.forms.length||a.acceptablePrimaries.length||a.equivalentSecondaries.length):!a.forms.length))
   throw Error('Revise o caso '+c.id+' de '+review.reviewer+' e confira a evidência literal.');
  return a;
 });
}

export function agreement(round,first,second){
 const a=validateReview(round,first),b=validateReview(round,second);
 if(label(first.reviewer)===label(second.reviewer))throw Error('São necessários dois avaliadores distintos.');
 if(first.predictionHash!==second.predictionHash)throw Error('Os pareceres usam compromissos de predição distintos.');
 const matrix=Object.fromEntries(categories.map(x=>[x,Object.fromEntries(categories.map(y=>[y,0]))]));
 for(const [i,row] of a.entries())matrix[row.primary][b[i].primary]++;
 const n=a.length;
 const observed=categories.reduce((sum,id)=>sum+matrix[id][id],0)/n;
 const distributions=categories.map(id=>({
  category:id, first:Object.values(matrix[id]).reduce((sum,v)=>sum+v,0),
  second:categories.reduce((sum,x)=>sum+matrix[x][id],0)
 }));
 const expected=distributions.reduce((sum,r)=>sum+r.first*r.second,0)/(n*n);
 const fields=['primary','acceptablePrimaries','equivalentSecondaries','forms','expected'];
 const confirmed=(field,x,y)=>Array.isArray(x[field])?same(uniqueLabels(x[field]),uniqueLabels(y[field])):label(x[field])===label(y[field]);
 const cases=a.map((row,i)=>({id:row.id,first:row,second:b[i],disagreements:fields.filter(field=>!confirmed(field,row,b[i]))}));
 const draft={roundHash:round.roundHash,predictionHash:first.predictionHash,reviewer:'Adjudicação',answers:cases.map(c=>
  c.disagreements.length?{id:c.id,primary:'',acceptablePrimaries:[],equivalentSecondaries:[],forms:[],expected:'',rationale:'',evidence:''}:c.first
 )};
 return {roundHash:round.roundHash,total:n,rawAgreement:observed,kappa:expected===1?null:(observed-expected)/(1-expected),matrix,distributions,cases,draft};
}

export function proportion(successes,total){
 if(total===0)return {successes,total,rate:null,wilson95:null};
 const p=successes/total,z=1.959963984540054;
 const denominator=1+z*z/total;
 const center=(p+z*z/(2*total))/denominator;
 const margin=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/denominator;
 return {successes,total,rate:p,wilson95:[Math.max(0,center-margin),Math.min(1,center+margin)]};
}

export function score(round,privateFile,data,first,second,reference){
 const {predictionHash,...payload}=privateFile;
 if(predictionHash!==digest(payload)||predictionHash!==data.predictionHash||privateFile.roundHash!==round.roundHash||
    privateFile.cases.length!==round.cases.length||[first,second,reference].some(r=>r.predictionHash!==predictionHash))
  throw Error('Predições alteradas ou de outra rodada.');
 const {draft}=agreement(round,first,second);
 const ref=validateReview(round,reference);
 if(ref.some((r,i)=>draft.answers[i].primary&& !same(
  [r.primary,uniqueLabels(r.acceptablePrimaries),uniqueLabels(r.equivalentSecondaries),uniqueLabels(r.forms)],
  [draft.answers[i].primary,...['acceptablePrimaries','equivalentSecondaries','forms'].map(k=>uniqueLabels(draft.answers[i][k]))]
 )))throw Error('A referência alterou categorias consensuais da rodada.');
 const rows=privateFile.cases.map((prediction,i)=>{
  const c=round.cases[i],r=ref[i];
  if(prediction.id!==c.id||prediction.sourceVersion!==c.sourceVersion)throw Error('Predição incompatível com a versão do caso '+c.id);
  const answerable=r.primary!=='abstain';
  const acceptable=[r.primary,...r.acceptablePrimaries];
  const decided=prediction.status==='decided';
  const abstained=prediction.status==='abstained';
  const firstForm=prediction.subforms[0];
  const anyForm=r.forms.map(label);
  return {id:c.id,stratum:prediction.stratum,answerable,decided,abstained,
   ideal:decided&&prediction.primary===r.primary,
   acceptable:decided&&acceptable.includes(prediction.primary),
   topTwo:answerable&&prediction.status!=='blocked'&&prediction.candidates.slice(0,2).some(id=>acceptable.includes(id)),
   secondaryOffered:Boolean(prediction.secondary),secondaryOpportunity:r.equivalentSecondaries.length>0,
   secondaryEquivalent:r.equivalentSecondaries.includes(prediction.secondary),
   formOffered:Boolean(firstForm),formMatches:Boolean(firstForm&&anyForm.includes(label(firstForm))),
   correct:answerable?(decided&&acceptable.includes(prediction.primary)):abstained};
 });
 const summarize = subset => {
  const selected=predicate=>subset.filter(predicate).length;
  const answerable=selected(r=>r.answerable);
  const needsAbstention=subset.length-answerable;
  return {
   total:subset.length,
   decisionOrAbstention:proportion(selected(r=>r.correct),subset.length),
   primaryIdeal:proportion(selected(r=>r.answerable&&r.ideal),answerable),
   primaryAcceptable:proportion(selected(r=>r.answerable&&r.acceptable),answerable),
   acceptableInTopTwo:proportion(selected(r=>r.topTwo),answerable),
   correctAbstention:proportion(selected(r=>!r.answerable&&r.abstained),needsAbstention),
   falseAbstention:proportion(selected(r=>r.answerable&&r.abstained),answerable),
   operationalFailures:proportion(selected(r=>!r.decided&&!r.abstained),subset.length),
   secondaryPrecision:proportion(selected(r=>r.secondaryEquivalent),selected(r=>r.secondaryOffered)),
   secondaryCoverage:proportion(selected(r=>r.secondaryEquivalent),selected(r=>r.secondaryOpportunity)),
   subformLabelMatch:proportion(selected(r=>r.acceptable&&r.formMatches),selected(r=>r.acceptable&&r.formOffered))
  };
 };
 return {roundHash:round.roundHash,predictionHash,scope:privateFile.scope,overall:summarize(rows),
  byStratum:Object.fromEntries([...new Set(rows.map(r=>r.stratum))].map(s=>[s,summarize(rows.filter(r=>r.stratum===s))])),cases:rows};
}
