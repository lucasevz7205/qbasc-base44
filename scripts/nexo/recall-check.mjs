// Labelled check for conditional and temporal recall (N2) and keyword controls.
// Labels are written by the auditor before running; they are NOT blind adjudicated.
// Local triage only: no provider call.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,URL} from 'node:url';
import console from 'node:console';
import {decideCognitive} from '../../src/lib/nexo/cognitive-decision.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const pilot=JSON.parse(fs.readFileSync(path.join(root,'src/lib/nexo/representation-pilot.json'),'utf8'));
const cases=[
 // legitimate conditional rules -> expected primary 'conditional'
 {id:'C1',kind:'legit',expect:'conditional',subject:'da',topic:'da-10-1',text:'Somente poderá ser dispensada a licitação se o valor estimado não exceder o limite legal; caso contrário, a contratação será precedida de competição.'},
 {id:'C2',kind:'legit',expect:'conditional',subject:'da',topic:'da-10-1',text:'A habilitação poderá anteceder o julgamento desde que haja ato motivado e previsão expressa no edital; salvo essas condições, o julgamento precede a habilitação.'},
 {id:'C3',kind:'legit',expect:'conditional',subject:'dc',topic:'dc-6',text:'Se o recurso for interposto no prazo, o ato fica suspenso; não sendo interposto, a decisão torna-se definitiva e será executada.'},
 {id:'C4',kind:'legit',expect:'conditional',subject:'da',topic:'da-8-1',text:'Exceto nas hipóteses previstas em lei, a inexigibilidade não se aplica quando houver mais de um fornecedor; nesse caso deverá ser realizada competição.'},
 // legitimate temporal rules -> expected primary 'temporal'
 {id:'T1',kind:'legit',expect:'temporal',subject:'da',topic:'da-10-1',text:'O prazo para interposição de recurso é de 3 dias úteis, contados da intimação do ato.'},
 {id:'T2',kind:'legit',expect:'temporal',subject:'da',topic:'da-10-1',text:'A vigência do contrato é de 12 meses, contados da assinatura, prorrogável por até 60 meses.'},
 {id:'T3',kind:'legit',expect:'temporal',subject:'cp',topic:'cp-1',text:'O mandato dos membros da mesa é de 2 anos, vedada a recondução imediata.'},
 {id:'T4',kind:'legit',expect:'temporal',subject:'da',topic:'da-8-1',text:'A intervenção deverá ser decretada no prazo de 10 dias, a contar da requisição, sob pena de caducidade.'},
 // keyword controls: trigger words present, correct structure is NOT conditional/temporal
 {id:'K1',kind:'control',expect:'sequential',subject:'da',topic:'da-10-1',text:'Etapas do procedimento: 1) receber o pedido; 2) conferir os documentos; 3) registrar a conclusão. Se houver pendência, o servidor poderá complementar o registro.'},
 {id:'K2',kind:'control',expect:'sequential',subject:'lp',topic:'lp-2',text:'O objetivo é ordenar os passos: primeiro o protocolo, depois a análise, por último a publicação. O prazo de estudo é flexível, então será ajustado.'},
 {id:'K3',kind:'control',expect:'none',subject:'cp',topic:'cp-1',text:'Este trecho apresenta uma visão geral do tema. Se você quiser, leia com calma, pois o prazo de leitura é livre e deverá ser ajustado ao seu ritmo.'},
 {id:'K4',kind:'control',expect:'none',subject:'rf',topic:'rf-1',text:'O material trata de conceitos gerais. Se houver dúvida, então consulte a aula; o prazo para dúvidas é de 5 dias, a critério do professor.'},
];
const rows=[];
for(const c of cases){
 const s={subjectId:c.subject,topicId:c.topic,nodeId:'recall-'+c.id,title:c.id,reference:'Fixture labelled by auditor',lines:[c.text]};
 const d=await decideCognitive(s,pilot);
 const get=st=>d.assessments?.find(a=>a.structure===st)?.suitability??'n/a';
 rows.push({id:c.id,kind:c.kind,expect:c.expect,primary:d.primary?.structure??'none',
   suitConditional:get('conditional'),suitTemporal:get('temporal'),suitSequential:get('sequential'),
   status:d.status});
}
const legit=rows.filter(r=>r.kind==='legit');
const ctrl=rows.filter(r=>r.kind==='control');
const indicator=legit.filter(r=>[r.expect==='conditional'?r.suitConditional:r.suitTemporal].some(v=>v==='strong'||v==='possible')).length;
const primaryOk=legit.filter(r=>r.primary===r.expect).length;
const abstainWrong=legit.filter(r=>r.primary==='none').length;
const falsePromotion=ctrl.filter(r=>r.primary==='conditional'||r.primary==='temporal').length;
const controlCorrect=ctrl.filter(r=>r.primary===r.expect).length;
console.table(rows);
console.log(JSON.stringify({legitN:legit.length,indicatorDetected:indicator,primaryCorrect:primaryOk,abstainWrong,controlsN:ctrl.length,falsePromotion,controlCorrect}));
