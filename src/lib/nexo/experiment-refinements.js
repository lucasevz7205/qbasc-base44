import {quantize,wer} from './experiments.js';
// All values here are constructed teaching examples, never measured data.
export function quantizationWindow(amplitude,bits){
  const q=quantize(amplitude,bits),step=2/(q.levels-1);
  const first=Math.max(0,Math.min(q.levels-5,q.code-2)),last=Math.min(q.levels-1,first+4);
  const levels=Array.from({length:last-first+1},(_,i)=>({code:first+i,value:-1+(first+i)*step}));
  return {...q,step,maxError:step/2,levels,min:levels[0].value,max:levels.at(-1).value};
}
export function werComposition(p){
  const rate=wer(p),errors=p.s+p.d+p.i;
  return {rate,errors,hypothesis:p.n-p.d+p.i,unchanged:p.n-p.s-p.d,classification:errors>p.n?'above':errors===p.n?'equal':'below'};
}
// Illustrative, scripted intervals (normalized time), not a VAD, embedding model or clustering algorithm.
const recordings=[
  [{start:.08,end:.32,speaker:'A'},{start:.43,end:.68,speaker:'B'},{start:.77,end:.94,speaker:'A'}],
  [{start:.05,end:.25,speaker:'B'},{start:.32,end:.56,speaker:'A'},{start:.64,end:.91,speaker:'B'}]
];
export function diarizationFrame(step,example=0){
  if(!Number.isInteger(step)||step<0||step>4||!recordings[example])throw Error('Invalid illustrative scenario');
  const input=recordings[example].map(x=>({...x}));
  const spans=input.map((s,i)=>step===4?{...s,start:s.start+.012,end:s.end-.012,index:i+1}:{...s,index:i+1});
  return {input,spans,step,example,refined:step===4,vectors:spans.map(s=>s.speaker==='A'?[3,1,4,2,3]:[1,3,2,4,1])};
}
export function rotatePieces(pieces,round){
  if(!pieces.length)return [];
  const n=((round%pieces.length)+pieces.length)%pieces.length;
  return [...pieces.slice(n),...pieces.slice(0,n)];
}

// The RF 1.1 formula node has its own documented example; never label a neighboring example as its source.
export function werKitExample(nodeId){
  if(nodeId==='kit-arr-rf-1.1-reconhecimento-automatico-de-fala-asr-au-2026-11-22-r5.1')return {n:50,s:4,d:1,i:5};
  return {n:4,s:0,d:0,i:6};
}
