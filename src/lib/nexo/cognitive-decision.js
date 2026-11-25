import {planRepresentation} from './representation-planner.js';
import {sourceVersion,extractExplicitPairs} from './generation.js';
import {sequenceLines} from './procedure.js';
import {availableColumns,buildContextual} from './contextual-generation.js';
import {VISUAL_BINDINGS} from './visual-catalog.js';

export const DECISION_VERSION='1.0.0';
export const STRUCTURES=Object.freeze({
 hierarchical:{label:'Hierárquica',criterion:'Classes, espécies, níveis ou relações de inclusão; não confundir qualquer lista com hierarquia.',format:'Árvore interativa'},
 relational:{label:'Relacional',criterion:'Relações semânticas, dependências ou conexões explícitas entre conceitos.',format:'Grafo conceitual'},
 comparative:{label:'Comparativa',criterion:'Contrastes ou critérios comuns que permitem discriminar conceitos.',format:'Matriz comparativa'},
 sequential:{label:'Sequencial',criterion:'Ordem de operações ou etapas, independentemente de datas.',format:'Fluxograma linear'},
 conditional:{label:'Condicional',criterion:'Condições, exceções e consequências que alteram uma decisão.',format:'Árvore decisória'},
 temporal:{label:'Temporal',criterion:'Datas, prazos, duração ou cronologia essenciais à compreensão.',format:'Linha do tempo'},
 architectural:{label:'Arquitetônica / funcional',criterion:'Componentes lógicos, funções e interfaces de um sistema.',format:'Diagrama funcional'},
 quantitative:{label:'Quantitativa',criterion:'Valores, métricas, proporções, distribuição ou relações numéricas.',format:'Gráfico dinâmico'},
 simulation:{label:'Simulacional',criterion:'Regra determinística que permite variar entradas e prever resultados; não basta haver números.',format:'Simulador interativo'}
});
export const STRUCTURE_IDS=Object.freeze(Object.keys(STRUCTURES));
// Only a tie-break among evidence-supported alternatives. Never a source of facts.
export const SUBJECT_PRIORS=Object.freeze({
 dc:['conditional','hierarchical','relational','comparative'],
 da:['conditional','sequential','comparative','hierarchical'],
 pl:['sequential','conditional','temporal','relational'],
 jur:['conditional','relational','temporal','comparative'],
 cp:['comparative','relational','hierarchical','temporal'],
 lp:['hierarchical','comparative','conditional','relational'],
 lg:['relational','architectural','comparative','hierarchical'],
 li:['comparative','conditional','hierarchical','relational'],
 ti:['architectural','sequential','quantitative','simulation'],
 rf:['simulation','architectural','quantitative','sequential']
});
const good=(s,n=800)=>typeof s==='string'&&s.trim().length>0&&s.length<=n;
const own=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const blocked=reason=>({status:'blocked',reason,publicationAllowed:false});
const modelTypes={sampling:'simulation',quantization:'simulation',wer:'quantitative',diarization:'sequential',dahl:'comparative',asr:'architectural'};
export function decisionEvidence(s){
 const refs=[];
 const add=(id,text,reference,nodeId)=>{if(good(text,12000))refs.push({id,text,reference,nodeId});};
 for(const [i,line] of (s.lines||[]).entries())add('line:'+i,line,s.reference,s.mapNodeId||s.nodeId);
 for(const [i,row] of (s.table?.rows||[]).entries())for(const [j,cell] of row.entries())add('table:'+i+':'+j,cell,s.rowSources?.[i]?.reference||s.reference,s.rowSources?.[i]?.nodeId||s.mapNodeId||s.nodeId);
 for(const [i,c] of (s.children||[]).entries()){add('child:'+i+':title',c.title,c.reference,c.nodeId);add('child:'+i+':text',c.text,c.reference,c.nodeId);}
 if(s.procedure){add('procedure:order',s.procedure.order.text,s.procedure.order.reference,s.procedure.order.nodeId);add('procedure:exception',s.procedure.exception.text,s.procedure.exception.reference,s.procedure.exception.nodeId);}
 return refs;
}
export function structureViability(s,id){
 const bound=VISUAL_BINDINGS.find(b=>b.subjectId===s.subjectId&&b.topicId===s.topicId&&b.nodeId===s.nodeId&&modelTypes[b.modelId]===id);
 // Effective sources only reuse exact reviewed contracts; central raw kits are valid for offline audit.
 if(bound&&(s.central||!s.mapNodeId))return {status:'existing',modelId:bound.modelId,reason:'Modelo específico já vinculado a esta versão do conteúdo.'};
 if(id==='conditional'&&s.procedure)return {status:'local-recipe',renderer:'Simulador condicional',recipe:{kind:'procedure'},reason:'Contrato condicional registrado.'};
 if(id==='sequential'&&sequenceLines(s).length)return {status:'local-recipe',renderer:'Fluxograma linear',recipe:{kind:'sequence',line:sequenceLines(s)[0].index},reason:'Cadeia de etapas literal.'};
 if(id==='comparative'&&availableColumns(s).length)return {status:'local-recipe',renderer:'Matriz comparativa',recipe:{kind:'matrix',column:availableColumns(s)[0]},reason:'Tabela com correspondências inequívocas.'};
 if(id==='relational'||id==='comparative'){
  const recipe=extractExplicitPairs(s);
  if(recipe.kind==='association'&&buildContextual(s,recipe).status==='candidate')return {status:'local-recipe',renderer:'Encaixes relacionais',recipe,reason:'Encaixes literais, não um grafo completo.'};
 }
 if(['relational','comparative'].includes(id))return {status:'semantic-recipe',renderer:'Encaixes associativos (tentativa)',reason:'É possível tentar uma associação literal pelo provedor; não é garantia de geração nem um grafo completo.'};
 return {status:'unavailable',reason:'Gerador compatível ainda não registrado para este conceito.'};
}
const legacyMap={simulation:'simulation',chart:'quantitative',timeline:'sequential',comparison:'comparative',architecture:'architectural',procedure:'conditional'};
const goals={hierarchical:'Distinguir níveis e categorias',relational:'Explicar relações entre conceitos',comparative:'Discriminar conceitos próximos',sequential:'Reconstruir a ordem das operações',conditional:'Aplicar condições e exceções',temporal:'Interpretar a cronologia ou os prazos',architectural:'Explicar a função e conexão dos componentes',quantitative:'Interpretar valores e relações numéricas',simulation:'Prever o efeito da alteração de variáveis'};
const rulePatterns={
 hierarchical:/\b(?:classifica(?:ção|ções|m-se)|subdivid\w*|espécies|categorias|tipos|níveis|subclasses|gêneros)\b/i,
 relational:/\b(?:depende|dependem|relaç(?:ão|ões)|interdepend\w*|vínculo|conecta\w*|associa\w*|corresponde\w*)\b/i,
 comparative:/\b(?:distingue\w*|difere\w*|diferentemente|enquanto|contrasta\w*|ao contrário|comparação|distinção|versus)\b|×/i,
 sequential:/\b(?:etapas|fases|sequência|pipeline|ordem|sucessivamente)\b|→/i,
 conditional:/\b(?:se|caso|desde que|salvo|exceto|somente quando|condicionado|condição|exceção)\b/i,
 temporal:/\b(?:prazo|prazos|cronologia|duração|dias úteis|dias corridos|vigência|antes de|após)\b|\b\d+\s*(?:dias|meses|anos|horas)\b/i,
 architectural:/\b(?:componentes|módulos|camadas|interfaces|subsistemas|arquitetura|blocos)\b/i,
 quantitative:/\b(?:frequência|proporção|percentual|métrica|taxa|distribuição|histograma|variância|média|mediana|desvio)\b|\d+(?:[.,]\d+)?\s*%/i,
 simulation:/\b(?:proporcional|calculad[oa]|fórmula|equação|multiplicad[oa]|dividid[oa]|metade da|dobro da)\b|[=×÷]/i
};
const cite=(ref,excerpt=ref.text)=>({id:ref.id,excerpt});
const rank=(s,id)=>(SUBJECT_PRIORS[s.subjectId]||[]).indexOf(id);
async function localAssessment(s,pilot,refs){
 const legacy=await planRepresentation(s,pilot);
 const assessments=STRUCTURE_IDS.map(id=>({structure:id,suitability:'unsupported',reason:'Não foi identificada evidência estrutural suficiente nesta análise local.',evidence:[]}));
 const mark=(id,suitability,reason,evidence,priority)=>{
  const a=assessments.find(a=>a.structure===id);
  if(!a||!evidence.length||evidence.length>3||evidence.some(e=>!good(e.excerpt,1500))||(a.priority||0)>=priority)return;
  Object.assign(a,{suitability,reason,evidence,priority});
 };
 const first=refs.find(r=>r.id==='line:0');
 // Lexical signals are candidates, not semantic verification. Require a complete source excerpt.
 for(const id of STRUCTURE_IDS){
  const ref=refs.find(r=>r.id.startsWith('line:')&&rulePatterns[id].test(r.text)&&r.text.length<=1500);
  if(ref)mark(id,'possible','Há indício textual compatível; a pertinência precisa de avaliação semântica.',[cite(ref)],10);
 }
 const body=first?.text||'';
 const bounded=body.length<=1500&&first;
 if(bounded){
  if(/\b(?:se|caso|desde que|salvo|exceto)\b/i.test(body)&&/\b(?:então|somente|poderá|deverá|não poderá|será|fica|permite|exige)\b/i.test(body))mark('conditional','strong','O trecho contém uma condição e consequência normativa explícitas; a leitura local ainda exige revisão.',[cite(first)],52);
  if(/\b(?:prazo|prazos|duração|vigência|cronologia)\b/i.test(body)&&/\b\d+\s*(?:dias|meses|anos|horas)\b/i.test(body))mark('temporal','strong','O prazo ou duração está expresso no trecho, sem inferir marco inicial ou final.',[cite(first)],58);
  if(/\b(?:histograma|distribuição|frequência|proporção|percentual|métrica|taxa)\b/i.test(body)&&/\b(?:eixo|intervalos|classes|numerador|denominador|variância|desvio|mediana|histograma)\b/i.test(body)&&/\b(?:gráfico|histograma|distribuição|métrica)\b/i.test(s.title+' '+body))mark('quantitative','strong','O material descreve valores, distribuição ou eixos; não há dados de medição inventados.',[cite(first)],58);
 }
 const children=s.children||[];
 if(children.length>=2&&children.length<=8&&rulePatterns.hierarchical.test(s.title+' '+(first?.text||''))&&!rulePatterns.comparative.test(s.title)){
  mark('hierarchical','strong','O ramo classifica conceitos e contém subdivisões diretas explicitamente registradas.',[cite(first),...refs.filter(r=>r.id.startsWith('child:')&&r.id.endsWith(':title')).slice(0,2).map(r=>cite(r))],s.rowSources?92:80);
 }
 if(children.length>=2&&children.length<=8&&bounded&&rulePatterns.architectural.test(body)&&/\b(?:função|entrada|saída|processa|responsável|interface|comunica|conecta)\b/i.test(body))mark('architectural','strong','O trecho descreve componentes e função/interface, com partes explícitas no mapa.',[cite(first),...refs.filter(r=>r.id.startsWith('child:')&&r.id.endsWith(':title')).slice(0,2).map(r=>cite(r))],79);
 if(availableColumns(s).length){
  const rowRefs=refs.filter(r=>r.id.startsWith('table:')).slice(0,3);
  mark('comparative','strong','Correspondências explícitas permitem comparar os conceitos por critérios registrados.',rowRefs.map(r=>cite(r)),85);
 }
 const pairs=extractExplicitPairs(s);
 if(pairs.kind==='association'&&buildContextual(s,pairs).status==='candidate')mark('relational','strong','Relações explícitas no material permitem reconstruir associações.',pairs.pairs.slice(0,3).map(p=>cite(refs.find(r=>r.id==='line:'+p.line))),75);
 const chains=sequenceLines(s);
 if(chains.length&&/ordem|etapas|fases|sequência|pipeline|fluxo|procedimento/i.test(s.title))mark('sequential','strong','O material registra uma cadeia operacional ordenada.',[cite(refs.find(r=>r.id==='line:'+chains[0].index))],90);
 if(s.procedure){
  mark('conditional','strong','A regra e a exceção estão vinculadas a condições explícitas.',refs.filter(r=>r.id==='procedure:exception').map(r=>cite(r)),120);
  mark('sequential','strong','A ordem das fases está registrada e pode ser reconstruída.',refs.filter(r=>r.id==='procedure:order').map(r=>cite(r)),100);
 }
 if(legacy?.method==='descritor curado revalidado'){
  const binding=VISUAL_BINDINGS.find(b=>b.subjectId===s.subjectId&&b.topicId===s.topicId&&b.nodeId===s.nodeId);
  const id=(binding&&modelTypes[binding.modelId])||legacyMap[legacy.kind];
  const ref=refs.find(r=>r.text.includes(legacy.evidence[0]));
  if(id&&ref)mark(id,'strong','Descritor pedagógico curado, revalidado pelo trecho exato do material.',[cite(ref,legacy.evidence[0])],110);
 }
 const supported=assessments.filter(a=>a.suitability==='strong').sort((a,b)=>b.priority-a.priority||(rank(s,a.structure)<0?99:rank(s,a.structure))-(rank(s,b.structure)<0?99:rank(s,b.structure))||a.structure.localeCompare(b.structure));
 const primary=supported[0]?.structure||'none';
 // A lexical clue alone is not a defensible fallback. Do not fill a quota of alternatives.
 const compatible={hierarchical:['comparative','relational'],relational:['hierarchical','comparative','architectural'],comparative:['hierarchical','relational','quantitative'],sequential:['conditional','temporal','architectural'],conditional:['sequential','comparative'],temporal:['sequential','comparative'],architectural:['relational','sequential'],quantitative:['simulation','comparative'],simulation:['quantitative','conditional']};
 const secondary=supported.slice(1).find(a=>compatible[primary]?.includes(a.structure))?.structure||'none';
 return {primary,secondary,objective:primary==='none'?'Compreender o conceito e investigar a adequação visual.':legacy?.method==='descritor curado revalidado'?legacy.objective:goals[primary]+' no contexto do conceito.',
 reason:primary==='none'?'A análise local não identificou estrutura suficientemente sustentada; solicite análise semântica.':'Escolha baseada na estrutura documentada, independentemente do gerador.',
 backupReason:secondary==='none'?'Não há alternativa independente suficientemente sustentada nesta análise.':'Alternativa estrutural potencial para o mesmo recorte; equivalência pedagógica a revisar.',
 assessments:assessments.map(({priority,...a})=>a)};
}
export const DECISION_SCHEMA={type:'object',properties:{
 primary:{type:'string',enum:[...STRUCTURE_IDS,'none']},secondary:{type:'string',enum:[...STRUCTURE_IDS,'none']},objective:{type:'string'},reason:{type:'string'},backupReason:{type:'string'},
 assessments:{type:'array',items:{type:'object',properties:{structure:{type:'string',enum:STRUCTURE_IDS},suitability:{type:'string',enum:['strong','possible','unsupported']},reason:{type:'string'},evidence:{type:'array',items:{type:'object',properties:{id:{type:'string'},excerpt:{type:'string'}},required:['id','excerpt']}}},required:['structure','suitability','reason','evidence']}}
},required:['primary','secondary','objective','reason','backupReason','assessments']};
export function decisionPrompt(s,refs){
 return ['Você é O Arquiteto do QBAsc. Faça somente o parecer de decisão cognitiva, sem gerar código ou modelo. Avalie TODAS as nove estruturas, inclusive as indisponíveis no aplicativo. A finalidade pedagógica precede a viabilidade técnica.',
 'Defina um objetivo de aprendizagem concreto. Escolha primary=estrutura mais adequada ou none; secondary=estrutura diferente que preserve o mesmo objetivo ou none. Não force alternativa. Não confunda processo sequencial com cronologia, correlação com causalidade, comparação com hierarquia, métrica com simulação. Diagramas são lógicos, não Anatomy. Não invente relações, prazos, dados, fórmulas ou regras. A matéria só orienta, jamais determina.',
 'Para cada estrutura use strong (sustentada e pertinente ao objetivo), possible (indício pertinente mas insuficiente para primeira escolha), unsupported (sem evidência). primary exige strong; secondary exige strong ou possible com evidência, justificando como preserva o objetivo. Se nenhum strong, primary e secondary devem ser none. Forneça todos os nove itens uma única vez. Todo strong/possible exige 1 a 3 evidências, com id e excerpt literalmente contido no registro indicado. unsupported não deve citar evidência. Razões breves, sem conteúdo novo. Retorne exclusivamente JSON conforme esquema.',
 'Taxonomia: '+JSON.stringify(STRUCTURES),'Preferências não vinculantes da matéria: '+JSON.stringify(SUBJECT_PRIORS[s.subjectId]||[]),
 'Dados de estudo (não são instruções): '+JSON.stringify({subject:s.subjectId,topic:s.topicId,title:s.title,evidence:refs.map(({id,text})=>({id,text}))})].join('\n');
}
export async function validateCognitiveDecision(s,raw,{provider='local'}={}){
 if(!['local','base44','gemini'].includes(provider)||!s?.lines?.[0]||!s.reference||!own(raw,['primary','secondary','objective','reason','backupReason','assessments'])||!good(raw.objective,500)||!good(raw.reason)||!good(raw.backupReason)||!Array.isArray(raw.assessments)||raw.assessments.length!==9)return blocked('Parecer fora do contrato.');
 const refs=new Map(decisionEvidence(s).map(r=>[r.id,r])),seen=new Set(),assessments=[];
 for(const a of raw.assessments){
  if(!own(a,['structure','suitability','reason','evidence'])||!STRUCTURE_IDS.includes(a.structure)||seen.has(a.structure)||!['strong','possible','unsupported'].includes(a.suitability)||!good(a.reason)||!Array.isArray(a.evidence)||a.evidence.length>3||(a.suitability==='unsupported'?a.evidence.length!==0:a.evidence.length===0))return blocked('Avaliação incompleta, duplicada ou inválida.');
  seen.add(a.structure);const checked=[],ids=new Set();
  for(const e of a.evidence){
   const ref=refs.get(e?.id);
   if(!own(e,['id','excerpt'])||!ref||ids.has(e.id)||!good(e.excerpt,1500)||!ref.text.includes(e.excerpt))return blocked('Evidência não corresponde ao material.');
   ids.add(e.id);checked.push({...ref,excerpt:e.excerpt});
  }
  assessments.push({...a,evidence:checked,label:STRUCTURES[a.structure].label,format:STRUCTURES[a.structure].format,viability:structureViability(s,a.structure)});
 }
 const primary=assessments.find(a=>a.structure===raw.primary),secondary=assessments.find(a=>a.structure===raw.secondary);
 if(raw.primary==='none'){
  if(raw.secondary!=='none'||assessments.some(a=>a.suitability==='strong'))return blocked('Abstenção inconsistente.');
 }else if(!primary||primary.suitability!=='strong'||(raw.secondary!=='none'&&(!secondary||secondary.structure===primary.structure||secondary.suitability==='unsupported')))return blocked('Seleção primária ou secundária inconsistente.');
 return {status:primary?'decided':'abstained',decisionVersion:DECISION_VERSION,provider,scope:{subjectId:s.subjectId,topicId:s.topicId,nodeId:s.nodeId},sourceVersion:await sourceVersion(s),title:s.title,reference:s.reference,objective:raw.objective,reason:raw.reason,backupReason:raw.backupReason,primary:primary||null,secondary:secondary||null,assessments:STRUCTURE_IDS.map(id=>assessments.find(a=>a.structure===id)),requiresReview:true,publicationAllowed:false,constructionAllowed:false};
}
export async function decideCognitive(s,pilot,{provider='local',invoke}={}){
 if(!s?.lines?.[0]||!s.reference||!['local','base44','gemini'].includes(provider))return blocked('Fonte ou provedor indisponível.');
 const refs=decisionEvidence(s);
 const raw=provider==='local'?await localAssessment(s,pilot,refs):await invoke({prompt:decisionPrompt(s,refs),schema:DECISION_SCHEMA});
 return validateCognitiveDecision(s,raw,{provider});
}
// A decision never authorizes automatic fallback or publication. Existing deterministic recipes only.
export async function buildDecidedCandidate(s,decision,{column}={}){
 if(!s||decision?.status!=='decided'||decision.decisionVersion!==DECISION_VERSION||decision.sourceVersion!==await sourceVersion(s)||decision.scope?.subjectId!==s.subjectId||decision.scope?.topicId!==s.topicId||decision.scope?.nodeId!==s.nodeId)return blocked('Decisão ausente ou desatualizada.');
 const raw={primary:decision.primary?.structure,secondary:decision.secondary?.structure||'none',objective:decision.objective,reason:decision.reason,backupReason:decision.backupReason,assessments:decision.assessments?.map(a=>({structure:a.structure,suitability:a.suitability,reason:a.reason,evidence:a.evidence?.map(({id,excerpt})=>({id,excerpt}))}))};
 const checked=await validateCognitiveDecision(s,raw,{provider:decision.provider});
 if(checked.status!=='decided')return blocked('Contrato de decisão inválido.');
 const v=structureViability(s,checked.primary.structure);
 if(v.status!=='local-recipe')return {status:'recommended',reason:v.reason,publicationAllowed:false};
 const recipe=v.recipe.kind==='matrix'&&column!==undefined?{...v.recipe,column}:v.recipe;
 const result=buildContextual(s,recipe);
 return {...result,provider:'local',sourceVersion:decision.sourceVersion,scope:decision.scope,plan:{objective:decision.objective},decisionVersion:decision.decisionVersion};
}

// Topic-level local triage never ranks by renderer availability.
export async function chooseCognitiveSource(sources,pilot){
 const decisions=await Promise.all(sources.map(async s=>({source:s,decision:await decideCognitive(s,pilot)})));
 const decided=decisions.filter(r=>r.decision.status==='decided');
 return decided.sort((a,b)=>Number(Boolean(b.decision.secondary))-Number(Boolean(a.decision.secondary))||a.source.nodeId.localeCompare(b.source.nodeId))[0]?.source||sources[0]||null;
}
