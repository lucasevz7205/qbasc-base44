import React from 'react';
import NexoVisualTraining from './NexoVisualTraining';
import NexoComponentBoard from './NexoComponentBoard';
import {componentFocus} from '@/lib/nexo/functional-architecture';
export default function NexoAsrArchitecture({source,onPredictionMode,onAssociationContext,guided}){
 const [localPart,setPart]=React.useState('features');
 const part=guided?.parameters.part||localPart;
 const [training,setTraining]=React.useState(false);
 const focus=componentFocus(source,part);
 const publish=React.useCallback((id,allow)=>{const p=componentFocus(source,id);onAssociationContext?.(allow&&p?{title:p.title,detail:p.role,reference:p.reference,input:p.input,output:p.output,origin:p.origin}:null);},[source,onAssociationContext]);
 React.useEffect(()=>{if(!guided&&!training)publish(part,true);},[part,training,guided,publish]);
 const notifyReveal=React.useCallback(v=>{if(training)publish(part,v);},[training,part,publish]);
 if(!focus)return <p>Componente sem fonte vinculada.</p>;
 return <NexoVisualTraining kind="asr" guided={guided} parameters={{part}} onPredictionMode={v=>{setTraining(v);publish(part,!v);onPredictionMode?.(v);}} onRevealChange={notifyReveal}>{({reveal})=><>
  <NexoComponentBoard model={source} selected={part} reveal={reveal} locked={Boolean(guided)} onSelect={id=>{if(id!==part){setPart(id);publish(id,!training);}}}/>
  {reveal&&<div className="nexo-plot-feedback"><strong>{focus.title}</strong><span>{focus.input} → {focus.output}</span><p>{focus.role} · {focus.origin}.</p></div>}
 </>}</NexoVisualTraining>;
}
