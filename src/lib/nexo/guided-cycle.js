import {visualExercise,evaluateVisual} from './visual-training.js';
import {DAHL_NODES,REGIMES,TRAJECTORIES} from './dahl-puzzle.js';
export const CYCLE_STAGES=['Ancoragem','Predição','Experimentação','Autoexplicação','Abstração','Transferência'];
const copy=o=>({...o});
const choice=(id,label,expected,options)=>({id,label,expected,options,type:'choice'});
const regimes=Object.fromEntries(REGIMES.map(r=>[r.id,r.label]));
const axes={up:'Contestação pública',right:'Inclusividade'};
const scenarios={
  sampling:{initial:{frequency:5000,rate:8000},target:{frequency:5000,rate:16000},transfer:{frequency:7000,rate:8000},change:'Mantenha o sinal de 5 kHz e aumente a taxa de 8 para 16 kHz.',transferPrompt:'Um sinal de 7 kHz é amostrado a 8 kHz. Determine o limite, a posição e a frequência aparente.',anchor:'Observe a onda e os pontos. Distinga a frequência do sinal da taxa de amostragem.',explain:'Por que a alteração da taxa modifica o aliasing, mesmo sem alterar a frequência da onda?',abstract:'Enuncie a relação entre a taxa de amostragem e o limite de Nyquist.',rule:'O limite é metade da taxa. Acima dele há dobramento; no limite exato, a recuperação não é garantida.'},
  quantization:{initial:{bits:3,amplitude:.37},target:{bits:4,amplitude:.37},transfer:{bits:2,amplitude:-.4},change:'Mantenha amplitude 0,37 e aumente a profundidade de 3 para 4 bits.',transferPrompt:'No mesmo quantizador uniforme normalizado de −1 a 1, use 2 bits e amplitude −0,4. Determine níveis, código e erro absoluto (4 casas decimais).',anchor:'Observe a entrada e o nível discreto escolhido. Código e amplitude não são a mesma grandeza.',explain:'Como a profundidade altera os níveis disponíveis e o arredondamento?',abstract:'Recupere a relação entre bits, quantidade de níveis e limite do erro.',rule:'N bits oferecem 2^N níveis. Na quantização uniforme normalizada, o passo é 2/(2^N−1); o erro máximo é metade do passo.'},
  wer:{initial:{n:4,s:0,d:0,i:6},target:{n:4,s:0,d:0,i:2},transfer:{n:8,s:2,d:1,i:6},change:'Reduza as inserções de 6 para 2, mantendo 4 palavras de referência e os demais erros em zero.',transferPrompt:'Uma referência de 8 palavras tem 2 substituições, 1 omissão e 6 inserções já alinhadas. Calcule e interprete a WER.',anchor:'Compare a barra de erros com a quantidade de palavras da referência.',explain:'Por que a WER muda quando as inserções diminuem, sem mudar o denominador?',abstract:'Escreva a fórmula da WER e explique por que ela pode superar 100%.',rule:'WER = (S+D+I)/N × 100. N é a referência; inserções aumentam apenas o numerador.'},
  diarization:{initial:{step:1},target:{step:2},transfer:{step:3},change:'Avance da segmentação para a etapa seguinte do pipeline clássico.',transferPrompt:'Após produzir embeddings dos trechos de fala, qual operação vem a seguir e qual é a etapa posterior?',anchor:'Observe os trechos numerados. Ainda não são identidades de locutor.',explain:'Por que distinguir segmentação de representação do locutor é importante para o agrupamento?',abstract:'Recupere, em ordem, as cinco operações do pipeline clássico.',rule:'VAD → segmentação → embeddings de locutor → agrupamento → ressegmentação. O diagrama é sintético, não executa áudio.'}
};
function dahlConfig(nodeId){
  const axis=nodeId===DAHL_NODES[0];
  const stage=axis?0:nodeId===DAHL_NODES[2]?2:nodeId===DAHL_NODES[3]?3:1;
  return {initial:{stage,scenario:0,regime:'closed'},target:{stage,scenario:0,regime:'oligarchy'},transfer:{stage,scenario:1,regime:'inclusive'},change:'Partindo de baixa contestação e baixa inclusividade, aumente apenas a contestação.',transferPrompt:'Em um regime hipotético com baixa contestação e baixa inclusividade, amplia-se apenas o direito de participação. '+(axis?'Qual dimensão mudou?':'Qual tipo puro resulta?'),anchor:'Observe os eixos qualitativos. O eixo vertical representa contestação; o horizontal, inclusividade.',explain:'Por que ampliar uma dimensão não implica ampliar a outra?',abstract:'Recupere as duas dimensões independentes'+(axis?'.':' e as classificações que resultam do cruzamento.'),rule:axis?'Contestação: disputa política. Inclusividade: extensão do direito de participação. Os eixos são independentes.':'Baixa/baixa: hegemonia fechada; alta contestação/baixa inclusão: oligarquia competitiva; baixa contestação/alta inclusão: hegemonia inclusiva; alta/alta: poliarquia.',axis};
}
// Alternate cases are authored examples using the same mathematical rules and exact kit scope.
const alternatives={
  sampling:[
    {initial:{frequency:3000,rate:8000},target:{frequency:4000,rate:8000},transfer:{frequency:5000,rate:44100},change:'Mantenha a taxa de 8 kHz e eleve o sinal de 3 para 4 kHz.',transferPrompt:'Um sinal de 5 kHz é amostrado a 44,1 kHz. Determine o limite, a posição e a frequência dobrada teórica.',explain:'Por que a igualdade com o limite não garante a recuperação desta senoide de fase zero?'},
    {initial:{frequency:7000,rate:16000},target:{frequency:7000,rate:8000},transfer:{frequency:3000,rate:16000},change:'Mantenha o sinal de 7 kHz e reduza a taxa de 16 para 8 kHz.',transferPrompt:'Um sinal de 3 kHz é amostrado a 16 kHz. Determine limite, posição e frequência dobrada teórica.',explain:'Por que reduzir a taxa pode introduzir dobramento mesmo mantendo a onda original?'}
  ],
  quantization:[
    {initial:{bits:2,amplitude:.2},target:{bits:3,amplitude:.2},transfer:{bits:4,amplitude:-.18},change:'Mantenha amplitude 0,20 e aumente de 2 para 3 bits.',transferPrompt:'No quantizador uniforme normalizado de −1 a 1, use 4 bits e amplitude −0,18. Determine níveis, código e erro absoluto (4 casas decimais).'},
    {initial:{bits:4,amplitude:-.2},target:{bits:8,amplitude:-.2},transfer:{bits:3,amplitude:.63},change:'Mantenha amplitude −0,20 e aumente de 4 para 8 bits.',transferPrompt:'No quantizador uniforme normalizado de −1 a 1, use 3 bits e amplitude 0,63. Determine níveis, código e erro absoluto (4 casas decimais).'}
  ],
  wer:[
    {initial:{n:8,s:2,d:1,i:3},target:{n:8,s:2,d:1,i:5},transfer:{n:12,s:1,d:2,i:3},change:'Aumente as inserções de 3 para 5. Mantenha a referência de 8 palavras, 2 substituições e 1 omissão.',transferPrompt:'Uma referência de 12 palavras tem 1 substituição, 2 omissões e 3 inserções já alinhadas. Calcule e interprete a WER.',explain:'Por que a WER pode ser exatamente 100% sem significar que todas as palavras foram omitidas?'},
    {initial:{n:10,s:2,d:2,i:1},target:{n:5,s:2,d:2,i:1},transfer:{n:10,s:1,d:1,i:12},change:'Reduza a referência de 10 para 5 palavras e mantenha 2 substituições, 2 omissões e 1 inserção (cenários hipotéticos).',transferPrompt:'Uma referência de 10 palavras tem 1 substituição, 1 omissão e 12 inserções já alinhadas. Calcule e interprete a WER.',explain:'Por que mudar a referência altera a WER mesmo com a mesma soma de erros?'}
  ],
  diarization:[
    {initial:{step:2,example:1},target:{step:3,example:1},transfer:{step:4,example:0},anchor:'Observe os vetores de características dos trechos. Eles são representações sintéticas, não identidades.',change:'Avance dos embeddings para a etapa seguinte.',transferPrompt:'Depois de agrupar os segmentos por locutor, identifique a operação final do pipeline clássico e o que vem depois dela.',explain:'Como o agrupamento se diferencia da extração de embeddings?'},
    {initial:{step:3,example:0},target:{step:4,example:0},transfer:{step:1,example:1},anchor:'Observe os rótulos anônimos atribuídos aos segmentos.',change:'Avance do agrupamento para a última etapa.',transferPrompt:'Depois de detectar atividade de voz, identifique a operação seguinte e a posterior.',explain:'Qual a diferença entre agrupar trechos por locutor e refinar seus limites?'}
  ]
};
export const GUIDED_VARIANTS=3;
export function guidedConfig(kind,nodeId,variant=0){
  if(!Number.isInteger(variant)||variant<0||variant>=GUIDED_VARIANTS)return null;
  let c=kind==='dahl'?dahlConfig(nodeId):scenarios[kind];
  if(!c)return null;
  if(variant&&kind==='dahl'){
    const targetIndex=variant===1?1:2,transferIndex=variant===1?3:0;
    const t=TRAJECTORIES[targetIndex],tr=TRAJECTORIES[transferIndex],name=id=>REGIMES.find(r=>r.id===id).label;
    const change=t=>t.direction==='up'?'aumente apenas a contestação':'aumente apenas a inclusividade';
    const from=t=>REGIMES.find(r=>r.id===t.from).description;
    c={...c,initial:{...c.initial,scenario:targetIndex,regime:t.from},target:{...c.target,scenario:targetIndex,regime:t.to},transfer:{...c.transfer,scenario:transferIndex,regime:tr.to},change:'Partindo de '+from(t)+' '+change(t)+'.',transferPrompt:'Um regime hipotético apresenta '+from(tr).toLowerCase()+' Nele, '+change(tr)+'. '+(c.axis?'Qual dimensão mudou?':'Qual tipo puro resulta?'),anchor:c.axis?c.anchor:'Observe '+name(t.from)+' no diagrama e compare as duas dimensões.'};
  }else if(variant)c={...c,...alternatives[kind][variant-1]};
  return {...c,initial:copy(c.initial),target:copy(c.target),transfer:copy(c.transfer)};
}
export function guidedExercise(kind,nodeId,phase,variant=0){
  const c=guidedConfig(kind,nodeId,variant);
  if(!c||!['target','transfer'].includes(phase))throw Error('No guided exercise');
  if(kind==='dahl'){
    const t=TRAJECTORIES[c[phase].scenario],r=REGIMES.find(r=>r.id===t.to);
    return {fields:[c.axis?choice('axis','Qual dimensão aumenta?',t.direction,axes):choice('regime','Qual tipo puro resulta?',r.id,regimes)],explanation:(t.direction==='up'?'A contestação aumenta, sem mudança na inclusividade.':'A inclusividade aumenta, sem mudança na contestação.')+(c.axis?'':' Resultado: '+r.label+'.')};
  }
  return visualExercise(kind,c[phase]);
}
export function gradeGuided(kind,nodeId,phase,answers,variant=0){
  const c=guidedConfig(kind,nodeId,variant),exercise=guidedExercise(kind,nodeId,phase,variant);
  if(kind!=='dahl'){const r=evaluateVisual(kind,c[phase],answers);return {...r,checks:r.checks.map(f=>({...f,submitted:answers?.[f.id]??''}))};}
  const f=exercise.fields[0],v=answers?.[f.id];
  return {status:!Object.hasOwn(f.options,v)?'incomplete':v===f.expected?'correct':'incorrect',checks:[{...f,submitted:v??'',valid:Object.hasOwn(f.options,v),correct:v===f.expected}],explanation:exercise.explanation};
}
export const initialCycle=()=>({stage:0,hypothesis:null,prediction:null,explanation:null,recall:null,transfer:null});
export function advanceCycle(state,event){
  if(!state||!event)return state;
  if(state.stage===0&&event.type==='anchor')return {...state,stage:1};
  if(state.stage===1&&event.type==='commit'&&event.result?.status!=='incomplete'&&['correct','incorrect'].includes(event.result?.status))return {...state,stage:2,hypothesis:copy(event.answers),prediction:event.result};
  if(state.stage===2&&event.type==='observe'&&state.prediction)return {...state,stage:3};
  if(state.stage===3&&event.type==='explain'&&typeof event.text==='string'&&event.text.trim().length>=10)return {...state,stage:4,explanation:event.text.trim()};
  if(state.stage===4&&event.type==='recall'&&typeof event.text==='string'&&event.text.trim().length>=5)return {...state,stage:5,recall:event.text.trim()};
  if(state.stage===5&&event.type==='transfer'&&['correct','incorrect'].includes(event.result?.status))return {...state,transfer:event.result};
  return state;
}
