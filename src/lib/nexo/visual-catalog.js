// Explicit exact topic and node bindings, no prefix matching or inherited topic content.
const root='kit-arr-rf-1-reconhecimento-de-fala-e-transcricao-de-2026-11-22-';
import {DAHL_NODES} from './dahl-puzzle.js';
import {ASR_NODE} from './functional-architecture.js';
const asr='kit-arr-rf-1.1-reconhecimento-automatico-de-fala-asr-au-2026-11-22-';
export const VISUAL_BINDINGS=Object.freeze([
  {subjectId:'rf',topicId:'rf-1-1',modelId:'asr',nodeId:ASR_NODE},
  ...DAHL_NODES.map(nodeId=>({subjectId:'cp',topicId:'cp-1',modelId:'dahl',nodeId})),
  {subjectId:'rf',topicId:'rf-1',modelId:'sampling',nodeId:root+'r1.1'},
  {subjectId:'rf',topicId:'rf-1',modelId:'quantization',nodeId:root+'r1.2'},
  {subjectId:'rf',topicId:'rf-1',modelId:'wer',nodeId:root+'r5.1'},
  {subjectId:'rf',topicId:'rf-1',modelId:'diarization',nodeId:root+'r4.2'},
  {subjectId:'rf',topicId:'rf-1-1',modelId:'wer',nodeId:asr+'r5.1'},
  {subjectId:'rf',topicId:'rf-1-1',modelId:'wer',nodeId:asr+'r5.2'}
]);
export function scopedVisualModels({subjects,subjectId,topicId,nodeId},kits,definitions){
  if(!subjects?.some(s=>s.id===subjectId&&s.topics?.some(t=>t.id===topicId)))return [];
  const kit=kits.find(k=>k.topico===topicId);
  if(!kit)return [];
  const nodes=new Map();
  function walk(n){nodes.set(n.id,n);(n.f||[]).forEach(walk);}
  (kit.ramos||[]).forEach(walk);
  const results=new Map();
  for(const b of VISUAL_BINDINGS){
    if(b.subjectId!==subjectId||b.topicId!==topicId||(nodeId&&b.nodeId!==nodeId))continue;
    const source=nodes.get(b.nodeId),definition=definitions.find(m=>m.id===b.modelId);
    if(!source?.x?.src||!source?.x?.e||!definition)continue;
    if(results.has(b.modelId)){results.get(b.modelId).sources.push(source);continue;}
    results.set(b.modelId,{...definition,source,sources:[source],binding:b});
  }
  return [...results.values()];
}
