// NEXO pedagogical contract v1.0. Structural preflight, NOT semantic or scientific approval.
export const CONTRACT_VERSION='1.0.0';
export const RULES=Object.freeze([
  {id:'fidelity',label:'Fidelidade conceitual',why:'Preservar a regra, suas condições e limites.'},
  {id:'economy',label:'Economia cognitiva',why:'Cada elemento visual precisa ter uma função instrucional.'},
  {id:'interaction',label:'Interação significativa',why:'Uma ação deve evidenciar uma mudança pertinente ao objetivo.'},
  {id:'contiguity',label:'Integração multimodal',why:'Relacionar as explicações aos elementos que elas descrevem.'},
  {id:'traceability',label:'Rastreabilidade',why:'Cada afirmação deve apontar para a versão e o trecho da fonte.'},
  {id:'transfer',label:'Transferência',why:'Prever uma tarefa independente, sem as pistas do modelo.'}
]);
const str=(v,max=1000)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const arr=(v,max=30)=>Array.isArray(v)&&v.length>0&&v.length<=max;
const fields=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const distinct=a=>new Set(a).size===a.length;
const kinds=['simulation','anatomy','timeline','chart','comparison','analogy','text'];
const origins=['calculated','illustrative','observed','not-applicable'];
const purposes=['explain','signal','compare','locate','measure','navigate'];
export function assessPedagogy(proposal,sourceRegistry=[]){
  const results=RULES.map(r=>({...r,issues:[]}));
  const fail=(id,message)=>results.find(r=>r.id===id).issues.push(message);
  if(!fields(proposal,['contractVersion','id','kind','objective','claims','elements','interactions','transfer','limits','dataOrigin','accessibility'])||
    proposal.contractVersion!==CONTRACT_VERSION||!str(proposal.id,200)||!kinds.includes(proposal.kind)){
    return {version:CONTRACT_VERSION,status:'blocked',checks:results.map(r=>({...r,passed:false,issues:['Especificação inválida ou campos não permitidos.']})),publicationAllowed:false};
  }
  const p=proposal, visual=p.kind!=='text';
  if(!str(p.objective)||!str(p.limits)||!origins.includes(p.dataOrigin))fail('fidelity','Defina objetivo, limites e origem dos dados.');
  if(p.kind==='analogy'&&!str(p.limits))fail('fidelity','Explicite onde a analogia deixa de valer.');
  const registry=new Map();
  if(Array.isArray(sourceRegistry)&&sourceRegistry.length<=200)for(const s of sourceRegistry){
    if(!s||!str(s.id,200)||registry.has(s.id))continue;
    registry.set(s.id,s);
  }
  const claimIds=new Set();
  let allVerified=true;
  if(!arr(p.claims))fail('traceability','Informe afirmações e suas fontes.');
  else for(const c of p.claims){
    if(!fields(c,['id','text','sourceId','sourceVersion','excerpt'])||!str(c.id,200)||claimIds.has(c.id)||!str(c.text)||!str(c.excerpt,8000)){
      fail('traceability','Afirmação ou trecho inválido/duplicado.');continue;
    }
    claimIds.add(c.id);
    const s=registry.get(c.sourceId);
    if(!s||!str(c.sourceVersion,200)||s.version!==c.sourceVersion||typeof s.text!=='string'||!s.text.includes(c.excerpt)){
      fail('traceability','Fonte ausente, versão divergente ou trecho inexistente.');continue;
    }
    if(s.status!=='primary-reviewed')allVerified=false;
  }
  const elements=new Map();
  if(visual){
    if(!arr(p.elements))fail('economy','Identifique elementos com função instrucional.');
    else for(const e of p.elements){
      if(!fields(e,['id','purpose','claimIds','annotation'])||!str(e.id,200)||elements.has(e.id)||!purposes.includes(e.purpose)){
        fail('economy','Elemento sem função pedagógica reconhecida ou duplicado.');continue;
      }
      elements.set(e.id,e);
      if(!arr(e.claimIds)||!distinct(e.claimIds)||!e.claimIds.every(id=>claimIds.has(id)))fail('economy','Elemento não vinculado a afirmação do objetivo.');
      if(!str(e.annotation))fail('contiguity','Falta explicação localizada no elemento.');
    }
    if(!arr(p.interactions))fail('interaction','Declare uma ação e sua consequência observável.');
    else for(const x of p.interactions){
      if(!fields(x,['action','effect','claimId','elementId'])||!str(x.action)||!str(x.effect)||x.action.trim()===x.effect.trim()||!claimIds.has(x.claimId)||!elements.get(x.elementId)?.claimIds?.includes(x.claimId)){
        fail('interaction','Interação sem ação, efeito distinto e vínculo com a regra/elemento.');
      }
    }
    if(!fields(p.accessibility,['altText','keyboard','staticFallback','reducedMotion'])||!str(p.accessibility.altText)||p.accessibility.keyboard!==true||p.accessibility.staticFallback!==true||p.accessibility.reducedMotion!==true)fail('contiguity','Exija alternativa textual, teclado, fallback e movimento reduzido.');
  }else{
    if(!same(p.elements,[])||!same(p.interactions,[]))fail('economy','Explicação textual não deve exigir elementos ou controles artificiais.');
  }
  const t=p.transfer;
  if(!fields(t,['prompt','expected','claimIds','withoutVisual','scenario'])||!str(t.prompt)||!str(t.expected)||!str(t.scenario)||t.withoutVisual!==true||!arr(t.claimIds)||!t.claimIds.every(id=>claimIds.has(id))||t.prompt===t.expected||t.prompt===p.objective){
    fail('transfer','Defina cenário distinto, resposta esperada e tarefa sem pistas visuais.');
  }
  const checks=results.map(r=>({...r,passed:r.issues.length===0}));
  return {version:CONTRACT_VERSION,status:checks.every(r=>r.passed)?'eligible-for-human-review':'blocked',checks,sourceStatus:allVerified?'primary-review-recorded':'primary-review-pending',publicationAllowed:false};
}
