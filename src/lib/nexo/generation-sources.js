import {generationSources} from './generation.js';
const maps=import.meta.env?import.meta.glob('../../data/kits/**/mapa.json',{eager:true}):{};
export const getGenerationSources=(subjectId,topicId,nodeId)=>generationSources(maps,subjectId,topicId,nodeId);

export const getAllGenerationSources=()=>Object.entries(maps).flatMap(([,raw])=>{
 const m=raw.default||raw;
 return typeof m.topico==='string'?generationSources(maps,m.topico.split('-')[0],m.topico):[];
});
