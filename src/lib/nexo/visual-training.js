import {sampleSignal,quantize,wer} from './experiments.js';
export const STAGES=Object.freeze(['VAD','Segmentação','Embeddings','Agrupamento','Ressegmentação']);
const classification={below:'Abaixo do limite',boundary:'Exatamente no limite',above:'Acima do limite'};
const number=(id,label,expected,unit='',digits=0)=>({id,label,expected,unit,digits,type:'number'});
const choice=(id,label,expected,options)=>({id,label,expected,options,type:'choice'});
const round=(n,d)=>Number(n.toFixed(d));
export function visualExercise(kind,p){
  if(kind==='sampling'){
    const d=sampleSignal(p.frequency,p.rate);
    return {fields:[number('nyquist','Limite de Nyquist',d.nyquist/1000,'kHz',2),choice('classification','Posição do sinal',d.classification,classification),number('alias','Frequência aparente pelo dobramento',d.alias/1000,'kHz',2)],explanation:d.classification==='above'?'A senoide equivalente coincide com as amostras: há aliasing.':d.classification==='boundary'?'Nesta senoide de fase zero, as amostras são nulas; a recuperação não é garantida.':'O sinal está abaixo do limite de Nyquist.'};
  }
  if(kind==='quantization'){
    const d=quantize(p.amplitude,p.bits);
    return {fields:[number('levels','Quantidade de níveis',d.levels),number('code','Código inteiro selecionado',d.code),number('error','Erro absoluto (4 casas decimais)',round(d.error,4),'',4)],explanation:'2 elevado à profundidade dá a quantidade de níveis. O código arredonda a amplitude normalizada para o nível mais próximo; o erro é a diferença absoluta.'};
  }
  if(kind==='wer'){
    const v=wer(p);
    return {fields:[number('rate','WER (até 2 casas decimais)',round(v,2),'%',2),choice('class','Em relação a 100%',v>100?'above':v===100?'equal':'below',{below:'Menor',equal:'Igual',above:'Maior'})],explanation:'('+p.s+' + '+p.d+' + '+p.i+') ÷ '+p.n+' × 100. O denominador é o número de palavras da referência.'};
  }
  if(kind==='diarization'){
    if(!Number.isInteger(p.step)||p.step<0||p.step>=STAGES.length)throw Error('Invalid stage');
    const descriptions=['Detectar atividade de voz','Dividir áudio em trechos','Representar características do locutor','Agrupar representações por locutor','Refinar os segmentos'];
    return {fields:[choice('operation','Qual operação corresponde à etapa selecionada?',String(p.step),Object.fromEntries(descriptions.map((d,i)=>[String(i),d]))),choice('next','Qual etapa vem a seguir?',p.step===4?'end':String(p.step+1),{...Object.fromEntries(STAGES.map((s,i)=>[String(i),s])),end:'Fim do pipeline clássico'})],explanation:STAGES[p.step]+': '+descriptions[p.step]+'. '+(p.step===4?'Última etapa da sequência.':'Próxima etapa: '+STAGES[p.step+1]+'.')};
  }
  throw Error('Model without evaluator');
}
export function evaluateVisual(kind,p,answers){
  const exercise=visualExercise(kind,p);
  const checks=exercise.fields.map(f=>{
    const raw=answers?.[f.id];
    const filled=typeof raw==='string'&&raw.trim()!=='';
    const v=f.type==='number'?Number(String(raw).replace(',','.')):raw;
    const valid=filled&&(f.type==='number'?Number.isFinite(v):Object.hasOwn(f.options,v));
    return {...f,valid,correct:valid&&v===f.expected};
  });
  return {status:checks.some(c=>!c.valid)?'incomplete':checks.every(c=>c.correct)?'correct':'incorrect',checks,explanation:exercise.explanation};
}
export const scenarioKey=(kind,p)=>JSON.stringify([kind,Object.keys(p).sort().map(k=>[k,p[k]])]);
