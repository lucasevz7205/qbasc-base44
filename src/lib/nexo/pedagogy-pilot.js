import {CONTRACT_VERSION} from './pedagogy-contract.js';
export function samplingReviewExamples(node,version){
  if(!node?.id||!node.x?.e||!version)throw Error('Missing exact pilot source');
  const sourceId=node.id;
  const excerpt=node.x.e;
  const sources=[{id:sourceId,version,text:excerpt,status:'kit-unverified'}];
  const valid={
    contractVersion:CONTRACT_VERSION,id:'sampling-preflight',kind:'simulation',
    objective:'Distinguir frequência do sinal de taxa de amostragem e explicar o limite de Nyquist.',
    limits:'Senoide matemática em janela de 1 ms; não é áudio medido nem reconstrução de gravação real.',
    dataOrigin:'calculated',
    claims:[{id:'nyquist',text:'A frequência de Nyquist é metade da taxa de amostragem.',sourceId,sourceVersion:version,excerpt}],
    elements:[
      {id:'wave',purpose:'explain',claimIds:['nyquist'],annotation:'Onda contínua: frequência do sinal.'},
      {id:'samples',purpose:'measure',claimIds:['nyquist'],annotation:'Pontos: medições a intervalos regulares.'},
      {id:'limit',purpose:'signal',claimIds:['nyquist'],annotation:'Limite de Nyquist = taxa / 2.'}
    ],
    interactions:[{action:'Alterar a taxa de 8 para 16 kHz mantendo o sinal em 5 kHz.',effect:'O limite calculado sobe de 4 para 8 kHz e o sinal passa a ficar abaixo dele.',claimId:'nyquist',elementId:'limit'}],
    transfer:{scenario:'Taxa de 12 kHz; sinal de 7 kHz, sem gráfico.',prompt:'Qual é o limite de Nyquist e o sinal está abaixo dele?',expected:'6 kHz; não.',claimIds:['nyquist'],withoutVisual:true},
    accessibility:{altText:'Onda senoidal com pontos de amostragem e valores numéricos.',keyboard:true,staticFallback:true,reducedMotion:true}
  };
  const invalid={...valid,id:'decorative-preflight',elements:[{id:'glow',purpose:'decorative',claimIds:[],annotation:''}],interactions:[{action:'Mudar cor da moldura',effect:'Mudar cor da moldura',claimId:'nyquist',elementId:'glow'}],transfer:{...valid.transfer,withoutVisual:false}};
  return {sources,valid,invalid};
}
