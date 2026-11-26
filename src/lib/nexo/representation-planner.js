import {classifyRepresentation} from './representation-classifier.js';
import {extractExplicitPairs,sourceVersion} from './generation.js';
import {VISUAL_BINDINGS} from './visual-catalog.js';
import {sequenceLines} from './procedure.js';
export const PLANNER_VERSION='1.0.0';
const scope=s=>({subjectId:s.subjectId,topicId:s.topicId,nodeId:s.nodeId});
const distinct=values=>new Set(values.map(v=>v.trim().toLocaleLowerCase('pt-BR'))).size===values.length;
export async function planRepresentation(s,pilot={profiles:[],sources:[]}){
 if(!s?.lines?.[0]||!s.reference)return null;
 const version=await sourceVersion(s);
 const base={...scope(s),title:s.title,reference:s.reference,sourceVersion:version,plannerVersion:PLANNER_VERSION,publicationAllowed:false,requiresReview:true};
 if(s.procedure)return {...base,kind:"procedure",label:"Fluxograma condicional",objective:"Distinguir a ordem geral e a inversão das fases sob as condições do kit.",reason:"O procedimento tem uma ordem explícita e uma exceção motivada com previsão no edital.",evidence:[s.procedure.order.text,s.procedure.exception.text],score:100,method:"contrato procedimental com remissões exatas",action:"Alterar condições, prever a consequência e ordenar as fases."};
 // Reuse reviewed descriptors only when the exact underlying text and reference agree.
 const old=pilot.sources.find(p=>p.nodeId===s.nodeId&&p.topicId===s.topicId&&p.subjectId===s.subjectId&&p.text===s.lines[0]&&p.reference===s.reference);
 const profile=old&&pilot.profiles.find(p=>p.nodeId===old.nodeId&&p.topicId===old.topicId&&p.subjectId===old.subjectId&&p.version===old.version);
 if(profile){
  const result=classifyRepresentation(profile,old);
  if(result.status==='recommendation'&&result.kind!=='analogy')return {...base,kind:result.kind,label:result.label,objective:result.objective,reason:result.reason,evidence:[result.evidence],score:40,method:'descritor curado revalidado',action:result.action};
 }
 const chains=sequenceLines(s);
 if(chains.length&&/ordem|etapas|fases|sequência|pipeline|fluxo|procedimento/i.test(s.title))return {...base,kind:"timeline",label:"Sequência operacional",objective:"Reconstruir a ordem explícita das etapas.",reason:"O kit registra uma cadeia ordenada; não há inferência de ramificações.",evidence:[s.lines[chains[0].index]],score:75,method:"sequência literal do kit",action:"Ordenar as etapas e conferir a fonte."};
 const t=s.table;
 // Literal structured evidence, not a guess from the topic label.
 if(t&&t.rows.length>=2&&t.rows.length<=6&&distinct(t.rows.map(r=>r[0]))&&t.headers.length>=2&&t.rows.every(r=>r.every(v=>typeof v==='string'&&v.trim()))){
  const definitional=/^(conceito|tarefa|estágio da nap|forma de aprendizado)$/i.test(t.headers[0]);
  const score=60+(definitional?20:0)+(t.headers.length===3?10:0)+(t.rows.length===4?5:0);
  return {...base,kind:'comparison',label:'Matriz comparativa com encaixe',objective:'Distinguir os conceitos pelas características registradas na tabela.',reason:s.rowSources?'O mapa distingue conceitos sob um mesmo ramo de comparação ou classificação; cada descrição vem de um filho direto.':'O kit contém critérios comparáveis e correspondências explícitas por linha.',evidence:[t.headers.join(' | '),...t.rows.map(r=>r.join(' | '))],score,method:s.rowSources?'filhos diretos do mapa efetivo':'estrutura literal do kit',action:'Associar cada conceito às características e conferir a linha da fonte.'};
 }
 const pairs=extractExplicitPairs(s);
 if(pairs.kind==='association')return {...base,kind:'comparison',label:'Quebra-cabeça de associações',objective:'Relacionar afirmações e explicações do kit.',reason:'A fonte contém relações explícitas separadas por setas.',evidence:pairs.pairs.map(p=>s.lines[p.line]),score:55,method:'estrutura literal do kit',action:'Encaixar a explicação correspondente.'};
 return {...base,kind:'text',label:'Explicação textual / análise adicional',objective:'Compreender a explicação do nó sem criar uma representação não sustentada.',reason:'Não há estrutura suficiente para recomendar automaticamente outra modalidade neste piloto.',evidence:[s.lines[0]],score:0,method:'abstenção conservadora',action:null};
}
export async function chooseNewRepresentation(sources,pilot){
 const plans=await Promise.all(sources.filter(s=>!VISUAL_BINDINGS.some(b=>b.subjectId===s.subjectId&&b.topicId===s.topicId&&b.nodeId===s.nodeId)).map(s=>planRepresentation(s,pilot)));
 return plans.filter(p=>p&&p.kind!=='text').sort((a,b)=>b.score-a.score||a.nodeId.localeCompare(b.nodeId))[0]||null;
}
