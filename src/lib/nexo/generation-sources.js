import {generationSources} from './generation.js';
const maps=import.meta.env?import.meta.glob('../../data/kits/**/mapa.json',{eager:true}):{};
export const getGenerationSources=(subjectId,topicId,nodeId)=>generationSources(maps,subjectId,topicId,nodeId);

