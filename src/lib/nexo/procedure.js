// Explicit, source-bound procedural recipes. No generated executable expressions.
const norm=s=>s.trim().toLocaleLowerCase('pt-BR');
const distinct=a=>new Set(a.map(norm)).size===a.length;
export function sequenceLines(source){
 return (source?.lines||[]).flatMap((line,index)=>{
  const steps=line.replace(/\.$/,'').split(' → ').map(s=>s.trim());
  // An explicit uninterrupted chain only; do not interpret conditional or explanatory prose as steps.
  return steps.length>=3&&steps.length<=9&&distinct(steps)&&steps.every(s=>s.length>0&&s.length<=75&&!/[;:!?()[\]]/.test(s))?[{index,steps}]:[];
 });
}
// A bounded exception contract assembled from the three exact related nodes in the existing kit.
// Refuse if the material changes; no inheritance to arbitrary descendants.
export function procurementProcedure(kit){
 if(kit?.topico!=='da-10-1')return null;
 const parents=kit.ramos?.filter(n=>n.id==='r4')||[];
 if(parents.length!==1)return null;
 const p=parents[0],children=p.f||[],orders=children.filter(n=>n.id==='r4.1'),exceptions=children.filter(n=>n.id==='r4.2');
 if(orders.length!==1||exceptions.length!==1)return null;
 const order=orders[0],exception=exceptions[0];
 const expected='Preparatória → divulgação do edital → propostas e lances → julgamento → habilitação → recursal → homologação.';
 const condition='A habilitação pode vir ANTES das propostas, mediante ato motivado e previsão no edital.';
 if(p.x?.src!=='Lei 14.133/2021, art. 17'||!p.x.e?.includes('A habilitação vem DEPOIS do julgamento')||order.x?.e!==expected||exception.x?.e!==condition||exception.x?.src!=='Lei 14.133/2021, art. 17, § 1º')return null;
 return {id:'procurement-phases-v1',order:{nodeId:order.id,text:order.x.e,reference:p.x.src,referenceNodeId:p.id},exception:{nodeId:exception.id,text:exception.x.e,reference:exception.x.src},conditions:['Ato motivado','Previsão no edital'],normal:['Preparatória','divulgação do edital','propostas e lances','julgamento','habilitação','recursal','homologação'],inverted:['Preparatória','divulgação do edital','habilitação','propostas e lances','julgamento','recursal','homologação'],limit:'Recorte didático das duas condições expressas no kit; não é uma verificação integral dos requisitos legais nem decide uma licitação real.'};
}
export function procedureRoute(model,{motivated=false,notice=false,requestInversion=false}={}){
 if(!model||typeof motivated!=='boolean'||typeof notice!=='boolean'||typeof requestInversion!=='boolean')throw Error('Invalid procedure scenario');
 const eligible=motivated&&notice;
 const inverted=requestInversion&&eligible;
 return {eligible,inverted,steps:inverted?model.inverted:model.normal,reason:!requestInversion?'Ordem geral selecionada.':eligible?'Inversão possível segundo as condições descritas no kit; não é obrigatória.':'Inversão não sustentada pelas condições informadas no kit.',reference:requestInversion?model.exception.reference:model.order.reference};
}
export function procedurePuzzle(steps,evidence){
 return {id:'generated-procedure',layout:'trajectory',title:'Ordem das etapas',instruction:'Reconstrua a ordem das fases. Selecione ou arraste cada etapa.',pieces:steps.map((label,i)=>({id:'step-'+i,label})).reverse(),slots:steps.map((label,i)=>({id:'position-'+i,label:'Etapa '+(i+1),expected:'step-'+i,explanation:(i?'Após '+steps[i-1]+': ':'Início: ')+label+'. '+evidence}))};
}
