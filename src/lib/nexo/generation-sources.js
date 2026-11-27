import {generationSources} from './generation.js';
const maps=import.meta.env?import.meta.glob('../../data/kits/**/mapa.json',{eager:true}):{};
export const getGenerationSources=(subjectId,topicId,nodeId)=>generationSources(maps,subjectId,topicId,nodeId);


import {effectiveGenerationSources} from './effective-sources.js';
export const getEffectiveSources=(data,subjectId,topicId,nodeId)=>effectiveGenerationSources(data,subjectId,topicId,getGenerationSources(subjectId,topicId),nodeId);
