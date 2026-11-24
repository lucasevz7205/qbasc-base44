import React from 'react';
import * as THREE from 'three';
import NexoVisualTraining from './NexoVisualTraining';
import {STROBE_PARTS,STROBE_SOURCE,strobeState} from '@/lib/nexo/strobe-anatomy';
const metal=0xa58a67,blue=0x344e70,gold=0xf2c76e,light=0xc8d9ea;
const material=(color)=>new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.35});
function StrobeScene({angle,exploded,selected,yaw,onSelect}){
 const host=React.useRef(null),sceneRef=React.useRef(null),pick=React.useRef(onSelect);
 const [fallback,setFallback]=React.useState(false);
 React.useEffect(()=>{pick.current=onSelect;},[onSelect]);
 React.useEffect(()=>{
  let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setFallback(true);return;}
  const el=host.current;if(!el){renderer.dispose();return;}
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,100);
  const groups={};const meshes=[];
  function group(id,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);g.userData.home=g.position.clone();g.userData.id=id;scene.add(g);groups[id]=g;return g;}
  function mesh(g,geometry,color,x=0,y=0,z=0,rotation=0){const m=new THREE.Mesh(geometry,material(color));m.position.set(x,y,z);m.rotation.z=rotation;m.userData.id=g.userData.id;g.add(m);meshes.push(m);return m;}
  const base=group('base',0,-1.15,0);mesh(base,new THREE.BoxGeometry(7,.24,3.15),blue);for(const x of [-2.85,2.85])for(const z of [-1.1,1.1])mesh(base,new THREE.CylinderGeometry(.18,.2,.18,20),metal,x,-.18,z);
  const motor=group('motor',-2.35,0,0);mesh(motor,new THREE.CylinderGeometry(.72,.72,1.15,40),blue,0,0,0,Math.PI/2);mesh(motor,new THREE.BoxGeometry(1.1,.56,1),metal,0,-.78,0);for(let j=0;j<5;j++)mesh(motor,new THREE.CylinderGeometry(.76,.76,.06,40),metal,-.42+j*.21,0,0,Math.PI/2);
  const shaft=group('shaft',-1.43,0,0);mesh(shaft,new THREE.CylinderGeometry(.13,.13,.95,24),light,0,0,0,Math.PI/2);
  const wheel=group('wheel',-.86,0,0);mesh(wheel,new THREE.CylinderGeometry(1.02,1.02,.18,64),metal,0,0,0,Math.PI/2);mesh(wheel,new THREE.CylinderGeometry(.24,.24,.24,32),blue,0,0,0,Math.PI/2);mesh(wheel,new THREE.BoxGeometry(.035,.57,.105),gold,.105,.59,0);
  const lens=group('lens',1.05,0,0);mesh(lens,new THREE.CylinderGeometry(.57,.57,.42,40),metal,0,0,0,Math.PI/2);mesh(lens,new THREE.CylinderGeometry(.44,.44,.025,40),light,-.22,0,0,Math.PI/2);
  const sensor=group('sensor',1.45,0,0);mesh(sensor,new THREE.BoxGeometry(.08,.76,.76),gold);mesh(sensor,new THREE.BoxGeometry(.12,.96,.96),blue,.08,0,0);
  const body=group('body',2.13,0,0);mesh(body,new THREE.BoxGeometry(1.18,1.32,1.38),blue);mesh(body,new THREE.BoxGeometry(1.08,.35,1.0),metal,0,-.82,0);
  scene.add(new THREE.AmbientLight(0xffffff,1.7));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(2,6,5);scene.add(key);const rim=new THREE.DirectionalLight(0x9bbfee,1.6);rim.position.set(-4,2,-3);scene.add(rim);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));el.appendChild(renderer.domElement);
  const render=()=>renderer.render(scene,camera);
  const resize=()=>{const width=Math.max(el.clientWidth,1);renderer.setSize(width,Math.max(250,width*.58));camera.aspect=width/Math.max(250,width*.58);camera.updateProjectionMatrix();render();};
  const observer=new ResizeObserver(resize);observer.observe(el);
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const click=e=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(meshes)[0];if(hit)pick.current?.(hit.object.userData.id);};
  renderer.domElement.addEventListener('click',click);sceneRef.current={camera,groups,meshes,render};resize();
  return()=>{observer.disconnect();renderer.domElement.removeEventListener('click',click);for(const m of meshes){m.geometry.dispose();m.material.dispose();}renderer.dispose();renderer.domElement.remove();sceneRef.current=null;};
 },[]);
 React.useEffect(()=>{const s=sceneRef.current;if(!s)return;
  const spread={base:0,motor:-.9,shaft:-.35,wheel:0,lens:.25,sensor:.8,body:1.5};
  for(const [id,g] of Object.entries(s.groups)){g.position.copy(g.userData.home);g.position.x+=exploded*spread[id];if(id==='base')g.position.y-=exploded*.6;g.rotation.x=id==='wheel'||id==='shaft'?angle:0;}
  for(const m of s.meshes){m.material.emissive.setHex(m.userData.id===selected?0x68501b:0x000000);m.material.emissiveIntensity=.55;}
  const a=yaw*Math.PI/180;s.camera.position.set(Math.sin(a)*11,5.8,Math.cos(a)*11);s.camera.lookAt(0,-.1,0);s.render();
 },[angle,exploded,selected,yaw]);
 return <><div ref={host} className="nexo-strobe-canvas" role="img" aria-label="Bancada 3D com motor, eixo, disco e câmera; controles de seleção abaixo."/>
 {fallback&&<div className="nexo-stage-facts"><p>WebGL indisponível. A sequência de imagens e os controles continuam funcionando.</p><p>Motor → eixo → disco marcado → lente → sensor → carcaça.</p></div>}</>;
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
 return <NexoVisualTraining kind="strobe" guided={guided} parameters={params} onPredictionMode={v=>{setTraining(v);publish(part,!v);onPredictionMode?.(v);}}>{({reveal})=><>
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
