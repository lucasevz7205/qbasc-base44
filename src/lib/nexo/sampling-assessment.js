import {sampleSignal} from './experiments.js';
// The observed graph and the assessment share a single mathematical model.
export function samplingAssessment(frequency,rate,answer){
  const d=sampleSignal(frequency,rate);
  const expected={nyquist:d.nyquist,classification:d.classification,alias:d.alias};
  const valid=answer&&Number.isFinite(answer.nyquist)&&['below','boundary','above'].includes(answer.classification)&&Number.isFinite(answer.alias);
  if(!valid)return {status:'incomplete'};
  const checks={nyquist:answer.nyquist===expected.nyquist,classification:answer.classification===expected.classification,alias:answer.alias===expected.alias};
  return {status:Object.values(checks).every(Boolean)?'correct':'incorrect',expected,checks,frequency,rate};
}
