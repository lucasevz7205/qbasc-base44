// Deterministic selection using curated, source-bound descriptors. Not an LLM or a factual verifier.
export const CLASSIFIER_VERSION='1.0.0';
export const REPRESENTATIONS=Object.freeze({
  simulation:{label:'Simulação matemática',reason:'A alteração de entradas produz um resultado calculável por uma regra.'},
  chart:{label:'Gráfico interativo',reason:'A posição, proporção ou relação entre eixos comunica a estrutura do conceito.'},
  timeline:{label:'Sequência dinâmica',reason:'A ordem e as transições são essenciais para compreender o processo.'},
  comparison:{label:'Comparação interativa',reason:'A discriminação depende de critérios, condições e contrastes explícitos.'},
  architecture:{label:'Arquitetura funcional',reason:'As relações entre componentes lógicos são centrais.'},
  anatomy:{label:'Anatomy / mecanismo físico',reason:'Uma estrutura tangível e seu funcionamento espacial demonstram a relação.'},
  analogy:{label:'Analogia concreta',reason:'Correspondências explícitas podem ancorar uma abstração sem substituir sua regra.'},
  text:{label:'Explicação textual',reason:'Neste objetivo, o próprio texto preserva melhor o conteúdo sem criar uma representação artificial.'}
});
const kinds=Object.keys(REPRESENTATIONS);
const structures=['deterministic','axes','sequence','contrast','components','analogy-mapped','verbal'];
const goalKinds={calculate:'simulation',interpret:'chart',sequence:'timeline',discriminate:'comparison',inspect:'architecture',assemble:'anatomy',analogize:'analogy',read:'text'};
const required={simulation:'deterministic',chart:'axes',timeline:'sequence',comparison:'contrast',architecture:'components',anatomy:'components',analogy:'analogy-mapped',text:'verbal'};
const good=v=>typeof v==='string'&&v.trim().length>0;
const reject=reason=>({status:'insufficient-evidence',reason,publicationAllowed:false});
export function classifyRepresentation(profile,source){
  if(!profile||!source||profile.subjectId!==source.subjectId||profile.topicId!==source.topicId||profile.nodeId!==source.nodeId||profile.version!==source.version||!good(source.text)||!good(source.reference))return reject('Não há fonte correspondente ao escopo e à versão.');
  if(!Object.hasOwn(goalKinds,profile.goal)||!good(profile.objective)||!Array.isArray(profile.features)||!profile.features.length||profile.features.length>12)return reject('Objetivo ou estrutura não descritos.');
  const featureMap=new Map();
  for(const f of profile.features){
    if(!structures.includes(f.type)||featureMap.has(f.type)||!good(f.excerpt)||!source.text.includes(f.excerpt))return reject('Descritor sem trecho literal correspondente.');
    featureMap.set(f.type,f.excerpt);
  }
  const kind=goalKinds[profile.goal];
  if(!featureMap.has(required[kind]))return reject('A estrutura descrita não sustenta a representação solicitada.');
  if(kind==='analogy'&&(!good(profile.mapping)||!good(profile.limits)))return reject('Analogia sem correspondências ou limites explícitos.');
  if(kind==='architecture'&&profile.spatial!=='logical')return reject('Arquitetura lógica deve ser explícita.');
  if(kind==='anatomy'&&(profile.spatial!=='physical'||!good(profile.mapping)||!good(profile.limits)))return reject('Anatomy exige mecanismo físico e correspondência explícita.');
  if(kind!=='text'&&(!good(profile.action)||!good(profile.observable)||!good(profile.assessment)||!good(profile.contextualExplanation)||!good(profile.limits)))return reject('Falta definir manipulação, consequência, correção, contexto ou limites.');
  return {status:'recommendation',kind,label:REPRESENTATIONS[kind].label,reason:REPRESENTATIONS[kind].reason,
    objective:profile.objective,evidence:featureMap.get(required[kind]),reference:source.reference,version:source.version,
    action:kind==='text'?null:profile.action,observable:kind==='text'?null:profile.observable,assessment:kind==='text'?null:profile.assessment,
    contextualExplanation:kind==='text'?null:profile.contextualExplanation,limits:profile.limits||null,
    dimensionality:kind==='anatomy'?'physical-3d':kind==='architecture'?'logical-2d':null,
    alternatives:kinds.filter(k=>k!==kind).map(k=>({kind:k,label:REPRESENTATIONS[k].label,reason:featureMap.has(required[k])?'Pode servir a outro objetivo, mas não é a primeira escolha para este.':'Não sustentado pelos descritores deste objetivo.'})),
    reviewStatus:'candidate-primary-review-pending',publicationAllowed:false};
}
export function scopedRecommendations({subjects,subjectId,topicId,nodeId},profiles,sources){
  if(!subjects?.some(s=>s.id===subjectId&&s.topics?.some(t=>t.id===topicId)))return [];
  return profiles.filter(p=>p.subjectId===subjectId&&p.topicId===topicId&&(!nodeId||p.nodeId===nodeId)).map(p=>{
    const source=sources.find(s=>s.subjectId===subjectId&&s.topicId===topicId&&s.nodeId===p.nodeId);
    return {profile:p,title:source?.title||p.nodeId,result:classifyRepresentation(p,source)};
  });
}
