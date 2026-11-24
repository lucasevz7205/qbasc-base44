import React from 'react';
import NexoVisualTraining from './NexoVisualTraining';
import {STROBE_PARTS,STROBE_SOURCE,strobeState} from '@/lib/nexo/strobe-anatomy';
import {projectStrobe,STROBE_VIEWBOX} from '@/lib/nexo/strobe-projection';
function StrobeScene({angle,exploded,selected,yaw,onSelect}){
 const projected=React.useMemo(()=>projectStrobe({angle,exploded,selected,yaw}),[angle,exploded,selected,yaw]);
 return <div className="nexo-strobe-canvas" data-nexo-renderer="software-3d">
  <svg viewBox={'0 0 '+STROBE_VIEWBOX.width+' '+STROBE_VIEWBOX.height} role="img" aria-label="Projeção de peças tridimensionais da bancada; selecione pelo desenho ou pelos botões abaixo.">
   <defs><radialGradient id="strobe-backdrop"><stop stopColor="#243c56"/><stop offset="1" stopColor="#101c2d"/></radialGradient></defs>
   <rect width="1000" height="540" fill="url(#strobe-backdrop)"/>
   {projected.faces.map(f=><polygon key={f.key} points={f.points} fill={f.fill} stroke={f.fill} strokeWidth=".65" strokeLinejoin="round" onClick={()=>onSelect?.(f.id)} style={{cursor:'pointer'}}/>)}
  </svg>
 </div>;
}
export default function NexoStrobeAnatomy({sourceNode,onPredictionMode,onAssociationContext,guided}){
 const [frequency,setFrequency]=React.useState(3),[rate,setRate]=React.useState(4),[frame,setFrame]=React.useState(0);
 const [exploded,setExploded]=React.useState(1),[yaw,setYaw]=React.useState(35),[part,setPart]=React.useState('wheel');
 const [training,setTraining]=React.useState(false);
 const params=guided?.parameters||{frequency,rate};
 const d=strobeState(params.frequency,params.rate,frame);
 const publish=React.useCallback((id,allow)=>{const p=STROBE_PARTS.find(p=>p.id===id);onAssociationContext?.(allow&&p?{title:p.title,detail:p.detail,reference:sourceNode.x.src+' · Analogia física: TU Delft, Sampling (ver referência no modelo).'}:null);},[sourceNode,onAssociationContext]);
 React.useEffect(()=>{if(!training&&!guided)publish(part,true);},[part,training,guided,publish]);
 const choose=id=>{setPart(id);publish(id,!training&&!guided);};
 const notifyReveal=React.useCallback(v=>{if(training)publish(part,v);},[training,publish,part]);
 return <NexoVisualTraining kind="strobe" guided={guided} parameters={params} onRevealChange={notifyReveal} onPredictionMode={v=>{setTraining(v);publish(part,!v);onPredictionMode?.(v);}}>{({reveal})=><>
  <div className="nexo-instrument"><div className="nexo-instrument-head"><span>ANATOMY · BANCADA ESTROBOSCÓPICA</span><span>MODELO FÍSICO DIDÁTICO</span></div>
   <StrobeScene angle={d.angle} exploded={exploded} selected={part} yaw={yaw} onSelect={choose}/>
   <div className="nexo-controls"><label className="nexo-slider">Desmontagem <input type="range" min="0" max="1" step=".05" value={exploded} onChange={e=>setExploded(Number(e.target.value))}/></label><label className="nexo-slider">Rotacionar vista <input type="range" min="-60" max="75" value={yaw} onChange={e=>setYaw(Number(e.target.value))}/></label></div>
   <div className="qb-seg" role="group" aria-label="Peças da bancada" style={{flexWrap:'wrap'}}>{STROBE_PARTS.map(p=><button key={p.id} type="button" className="qb-seg__opt" aria-pressed={p.id===part} onClick={()=>choose(p.id)}>{p.title}</button>)}</div>
   {reveal&&<p className="nexo-explain">{STROBE_PARTS.find(p=>p.id===part).detail}</p>}
  </div>
  <div className="nexo-controls"><label className="nexo-slider">Rotação real: {params.frequency} voltas/s<input type="range" min="1" max="5" value={params.frequency} onChange={e=>{setFrequency(Number(e.target.value));setFrame(0);}}/></label><label className="nexo-control">Capturas por segundo<div className="qb-seg">{[4,8,12].map(r=><button type="button" key={r} aria-pressed={params.rate===r} className="qb-seg__opt" onClick={()=>{setRate(r);setFrame(0);}}>{r} Hz</button>)}</div></label></div>
  <div className="nexo-instrument"><div className="nexo-instrument-head"><span>FOTOGRAFIAS SUCESSIVAS</span><span>{frame+1}–{frame+5}</span></div>
   <svg viewBox="0 0 520 110" role="img" aria-label="Cinco orientações consecutivas da marca no disco">{d.frames.map((a,i)=><g key={i}><circle cx={52+i*104} cy="45" r="32" fill="#344e70" stroke="#a58a67"/><line x1={52+i*104} y1="45" x2={52+i*104+26*Math.sin(a)} y2={45-26*Math.cos(a)} stroke="#f2c76e" strokeWidth="4" strokeLinecap="round"/><text x={52+i*104} y="96" fill="#c8d9ea" textAnchor="middle" fontSize="11">{frame+i+1}</text></g>)}</svg>
   <button type="button" className="qb-btn qb-btn--secondary" onClick={()=>setFrame(v=>(v+1)%116)}>Próxima captura</button>
   {reveal&&<div className="nexo-plot-feedback">Limite: {d.nyquist} Hz · {d.condition==='boundary'?'Sentido ambíguo no limite':d.condition==='stationary'?'Disco aparentemente parado':d.condition==='reverse'?'Rotação aparente inversa':'Rotação aparente no mesmo sentido'}.</div>}
  </div>
  <p className="nexo-explain">Analogia de amostragem temporal, não anatomia de um conversor de áudio. Capturas instantâneas ideais de uma roda com marca única. Dimensões e peças esquemáticas. <a href={STROBE_SOURCE} target="_blank" rel="noreferrer">Referência: TU Delft, Sampling.</a></p>
 </>}</NexoVisualTraining>;
}
