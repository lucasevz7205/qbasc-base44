import React from 'react';
import {Icon} from '@/components/qb/core/Icon';
import {validateComponentBoard,componentFocus} from '@/lib/nexo/anatomy-model';
const symbols={wave:'activity',acoustic:'audio-lines',lexicon:'book-open',language:'message-square',decoder:'network'};
export default function NexoComponentBoard({model,selected,onSelect,reveal=true,locked=false}){
 const [isolated,setIsolated]=React.useState(false);
 const arrowId=React.useId().replace(/[^a-zA-Z0-9_-]/g,'');
 if(!validateComponentBoard(model))return <p>Modelo indisponível: estrutura não validada.</p>;
 const focus=componentFocus(model,selected);
 const visible=id=>!isolated||id===selected||focus?.neighbors.includes(id);
 const links=model.edges.map(([from,to])=>({from:model.parts.find(p=>p.id===from),to:model.parts.find(p=>p.id===to)}));
 return <div className="nexo-instrument nexo-component-instrument" data-nexo-component-board={model.id}>
  <div className="nexo-instrument-head"><span>ARQUITETURA MODULAR · ESQUEMA FUNCIONAL</span><span>ESQUEMA LÓGICO 2D</span></div>
  <div className="nexo-component-toolbar"><button type="button" className="qb-btn qb-btn--secondary qb-btn--sm" aria-pressed={isolated} onClick={()=>setIsolated(v=>!v)} disabled={locked||!focus}>{isolated?'Mostrar sistema inteiro':'Isolar componente e conexões'}</button><small>Selecione um bloco para consultar sua função.</small></div>
  <div className="nexo-component-board" role="group" aria-label="Cinco componentes lógicos e suas conexões">
   <svg viewBox="0 0 700 380" aria-hidden="true" preserveAspectRatio="none">
    <defs><marker id={arrowId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="context-stroke"/></marker></defs>
    {links.map(({from,to})=>{const active=from.id===selected||to.id===selected;const x1=from.x+180,y1=from.y+43,x2=to.x,y2=to.y+43;return <path key={from.id+to.id} d={'M'+x1+' '+y1+' H'+((x1+x2)/2)+' V'+y2+' H'+x2} fill="none" stroke={active?'var(--qb-gold-bright)':'var(--qb-steel-blue)'} strokeWidth={active?3:2} opacity={visible(from.id)&&visible(to.id)?1:.14} markerEnd={'url(#'+arrowId+')'}/>;})}
   </svg>
   {model.parts.map((p,i)=><button key={p.id} type="button" className="nexo-component-part" data-focused={p.id===selected} data-dimmed={!visible(p.id)} aria-pressed={p.id===selected} disabled={locked} aria-label={reveal?p.title:'Componente '+(i+1)} onClick={()=>onSelect?.(p.id)} style={{left:p.x/7+'%',top:p.y/3.8+'%',width:180/7+'%',height:86/3.8+'%'}}><Icon name={symbols[p.icon]} size={22}/><strong>{reveal?p.title:'Bloco '+(i+1)}</strong>{reveal&&<small>{p.input} → {p.output}</small>}</button>)}
  </div>
  <div className="nexo-component-mobile" role="group" aria-label="Componentes e conexões em lista">
   {model.parts.map((p,i)=><button key={p.id} type="button" aria-pressed={p.id===selected} disabled={locked} onClick={()=>onSelect?.(p.id)} className="nexo-component-mobile-part"><Icon name={symbols[p.icon]} size={19}/><span>{reveal?p.title:'Bloco '+(i+1)}{reveal&&<small>{p.input} → {p.output}</small>}</span></button>)}
   <p>{model.edges.map(([a,b])=>{const i=model.parts.findIndex(p=>p.id===a),j=model.parts.findIndex(p=>p.id===b);return (reveal?model.parts[i].title:'Bloco '+(i+1))+' → '+(reveal?model.parts[j].title:'Bloco '+(j+1));}).join(' · ')}</p>
  </div>
  <p className="nexo-explain">{model.limit}</p>
 </div>;
}
