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
export function guidedConfig(kind,nodeId){
  const c=kind==='dahl'?dahlConfig(nodeId):scenarios[kind];
  return c?{...c,initial:copy(c.initial),target:copy(c.target),transfer:copy(c.transfer)}:null;
}
export function guidedExercise(kind,nodeId,phase){
  const c=guidedConfig(kind,nodeId);
  if(!c||!['target','transfer'].includes(phase))throw Error('No guided exercise');
  if(kind==='dahl'){
    const t=TRAJECTORIES[phase==='target'?0:1],r=REGIMES.find(r=>r.id===t.to);
    return {fields:[c.axis?choice('axis','Qual dimensão aumenta?',t.direction,axes):choice('regime','Qual tipo puro resulta?',r.id,regimes)],explanation:(t.direction==='up'?'A contestação aumenta, sem mudança na inclusividade.':'A inclusividade aumenta, sem mudança na contestação.')+(c.axis?'':' Resultado: '+r.label+'.')};
  }
  return visualExercise(kind,c[phase]);
}
export function gradeGuided(kind,nodeId,phase,answers){
  const c=guidedConfig(kind,nodeId),exercise=guidedExercise(kind,nodeId,phase);
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
