import {STAGES} from './visual-training.js';

const SOURCE_NODE='kit-arr-rf-1-reconhecimento-de-fala-e-transcricao-de-2026-11-22-r4.2';
const details=[
  {anchor:'VAD (detecção de atividade de voz)',function:'Detectar a atividade de voz.',input:'Sinal de entrada ilustrativo.',output:'Faixas destacadas nos intervalos de fala.',association:'As faixas douradas indicam onde há fala; não identificam o locutor.'},
  {anchor:'segmentação',function:'Dividir o áudio em trechos.',input:'Intervalos de fala ilustrativos.',output:'Trechos delimitados e numerados.',association:'Os números distinguem os segmentos; ainda não são rótulos de locutor.'},
  {anchor:'embeddings de locutor',function:'Representar características do locutor por embeddings.',input:'Trechos de fala ilustrativos.',output:'Vetores esquemáticos por trecho.',association:'Os grupos de barras representam vetores sintéticos; barras semelhantes ilustram a associação entre trechos, não medições reais.'},
  {anchor:'agrupamento (clustering)',function:'Agrupar as representações de locutor.',input:'Vetores esquemáticos dos trechos.',output:'Trechos associados a rótulos anônimos A e B.',association:'Trechos com o mesmo rótulo aparecem na mesma faixa. O rótulo não é uma identidade nominal.'},
  {anchor:'ressegmentação',function:'Refinar a segmentação na etapa final do pipeline clássico.',input:'Segmentos já agrupados no exemplo.',output:'Faixas de locutor com fronteiras anteriores tracejadas e novos limites ilustrativos.',association:'O desenho mostra um ajuste pré-definido das fronteiras; não calcula a ressegmentação real nem analisa áudio.'}
];
// Exact source and stage required. No borrowing from other topics.
export function diarizationStageContext(node,step){
  if(node?.id!==SOURCE_NODE||typeof node.x?.e!=='string'||!node.x?.src||!Number.isInteger(step)||!details[step])return null;
  const d=details[step];
  if(!node.x.e.includes(d.anchor))return null;
  return {stage:step+1,total:STAGES.length,title:STAGES[step],function:d.function,input:d.input,output:d.output,association:d.association,anchor:d.anchor,reference:node.x.src,sourceNode:node.id};
}
