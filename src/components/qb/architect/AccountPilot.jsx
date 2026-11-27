import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import rfKit from '@/data/kits/rf/rf-1/mapa.json';
import {sampleSignal,signal} from '@/lib/nexo/experiments';
import NexoVisualTraining from './NexoVisualTraining';
import {scopedVisualModels} from '@/lib/nexo/visual-catalog';
import NexoAsrArchitecture from './NexoAsrArchitecture';
import {getAsrBoard} from '@/lib/nexo/functional-architecture';
import {getEffectiveSources} from '@/lib/nexo/generation-sources';
import {useRealStudy} from '@/lib/qb-real-data';
import asrKit from '@/data/kits/rf/rf-1-1/mapa.json';
import cp7Kit from '@/data/kits/cp/cp-7/mapa.json';
import ti53Kit from '@/data/kits/ti/ti-5-3/mapa.json';
import {kitVisualSources} from '@/lib/nexo/kit-visuals';
import NexoKitPuzzle from './NexoKitPuzzle';
import cp8Kit from '@/data/kits/cp/cp-8/mapa.json';
import { PILOT_BINDINGS } from '@/lib/nexo/controlled-pilot';
import { LG_LESSON, PILOT_BOARDS } from '@/lib/nexo/pilot-lessons';
import NexoPilotReadingBoard from './NexoPilotReadingBoard';
import { recommendPilotTask } from '@/lib/nexo/pilot-recommendation';
import NexoControlledPilot from './NexoControlledPilot';
import './nexo-experiments.css';
const fmt=(v,d=0)=>v.toLocaleString('pt-BR',{maximumFractionDigits:d});
const X=t=>48+584*t, Y=y=>120-82*y;
function WaveGrid(){return <g aria-hidden="true">
  {Array.from({length:9},(_,i)=><line key={'x'+i} x1={X(i/8)} y1="32" x2={X(i/8)} y2="208" stroke="var(--qb-steel-blue)" strokeOpacity=".4"/>)}
  {[-1,-.5,0,.5,1].map(y=><g key={y}><line x1="48" y1={Y(y)} x2="632" y2={Y(y)} stroke="var(--qb-steel-blue)" strokeOpacity={y===0?.9:.4}/><text x="36" y={Y(y)+4} textAnchor="end" fill="var(--qb-ivory-muted)" fontSize="13">{fmt(y,1)}</text></g>)}
  {[0,.25,.5,.75,1].map(t=><text key={t} x={X(t)} y="229" textAnchor="middle" fill="var(--qb-ivory-muted)" fontSize="13">{fmt(t,2)}</text>)}
  <text x="340" y="249" fill="var(--qb-ivory-muted)" textAnchor="middle" fontSize="13">Tempo (ms)</text>
</g>;}
function wave(f){return Array.from({length:301},(_,i)=>[X(i/300),Y(signal(f,i/300))].map(v=>v.toFixed(2)).join(',')).join(' ');}
function arrowKeys(event){
  const k=event.key;if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(k))return;
  const opts=[...event.currentTarget.querySelectorAll('button')],i=opts.indexOf(document.activeElement);if(i<0)return;
  event.preventDefault();opts[(i+(k==='ArrowRight'||k==='ArrowDown'?1:opts.length-1))%opts.length].focus();
}
function Choice({label,values,value,onChange,format=v=>v}){return <div className="nexo-control"><span>{label}</span><div className="qb-seg" role="group" aria-label={label} onKeyDown={arrowKeys}>{values.map(v=><button type="button" key={v} className="qb-seg__opt" aria-pressed={value===v} onClick={()=>onChange(v)}>{format(v)}</button>)}</div></div>;}
function Sampling({onPredictionMode,onPracticeComplete,guided}){
  const [localFrequency,setFrequency]=React.useState(5000),[localRate,setRate]=React.useState(8000);
  const {frequency,rate}=guided?.parameters||{frequency:localFrequency,rate:localRate};
  const data=sampleSignal(frequency,rate);
  return <NexoVisualTraining kind="sampling" guided={guided} onPracticeComplete={onPracticeComplete} parameters={{frequency,rate}} onPredictionMode={onPredictionMode}>{({reveal})=><>
    <div className="nexo-controls"><Choice label="Frequência da onda" values={[1000,3000,4000,5000,7000]} value={frequency} onChange={setFrequency} format={v=>fmt(v/1000)+' kHz'}/><Choice label="Taxa de amostragem" values={[8000,16000,44100]} value={rate} onChange={setRate} format={v=>fmt(v/1000,1)+' kHz'}/></div>
    <div className="nexo-instrument"><div className="nexo-instrument-head"><span>OSCILOSCÓPIO · SINAL MATEMÁTICO</span><span>{reveal?data.classification==='boundary'?'NO LIMITE':data.undersampled?'ALIASING':'ABAIXO DE NYQUIST':'OBSERVAÇÃO ATIVA'}</span></div>
      <svg viewBox="0 0 680 260" role="img" aria-label={'Sinal de '+frequency+' Hz; taxa '+rate+' Hz'}>
        <WaveGrid/><polyline points={wave(frequency)} fill="none" stroke="var(--qb-moonlight)" strokeWidth="3"/>
        {reveal&&data.classification==='above'&&<polyline points={wave(data.signedAlias)} fill="none" stroke="var(--qb-ember)" strokeWidth="2.6" strokeDasharray="6 5"/>}
        {data.samples.map((s,i)=><g key={i}><line x1={X(s.t)} y1={Y(0)} x2={X(s.t)} y2={Y(s.y)} stroke="var(--qb-gold)" strokeOpacity=".6"/><circle cx={X(s.t)} cy={Y(s.y)} r="6" fill="var(--qb-gold-bright)"/></g>)}
      </svg><div className="nexo-legend"><span>— Onda original</span><span className="nexo-gold">● Amostras</span>{reveal&&data.classification==='above'&&<span className="nexo-ember">– – Senoide equivalente</span>}</div>
      {reveal&&<div className="nexo-plot-feedback">Limite: {fmt(data.nyquist/1000,2)} kHz · frequência dobrada teórica: {fmt(data.alias/1000,2)} kHz{data.classification==='boundary'?' · amostras nulas nesta fase; frequência não recuperável':''}</div>}
    </div>
    <p className="nexo-explain">Cada ponto é uma amostra no tempo. Alterar a taxa aqui simula uma nova aquisição, não recupera informação de uma gravação anterior.</p>
  </>}</NexoVisualTraining>;
}

const pilotKits = [rfKit, asrKit, cp7Kit, cp8Kit, ti53Kit];
const pilotSources = { ...kitVisualSources([cp7Kit,ti53Kit]), asr:getAsrBoard(asrKit), ...PILOT_BOARDS };
const pilotRenderers = { sampling:Sampling, asr:NexoAsrArchitecture, 'cp7-consulta':NexoKitPuzzle,
  'ti53-gendisc':NexoKitPuzzle, 'cp8-influencia':NexoPilotReadingBoard, 'lg32-leitura':NexoPilotReadingBoard };
const pilotModels = [
  { id:'sampling', title:'Osciloscópio de amostragem' }, { id:'asr', title:'Arquitetura modular do ASR' },
  ...['cp7-consulta','ti53-gendisc'].flatMap(id=>pilotSources[id]?[pilotSources[id].model]:[]),
  { id:'cp8-influencia', title:PILOT_BOARDS['cp8-influencia'].title },
];
export default function AccountPilot({accountId,subjects,onBack}) {
  const { QB_DATA } = useRealStudy();
  return <NexoControlledPilot key={accountId} accountId={accountId}
    recommend={(task,activity)=>{
      if(activity.modelId === 'lg32-leitura') {
        const available = subjects.some(s=>s.id===activity.subjectId && s.topics.some(t=>t.id===activity.topicId));
        const lesson = { id: activity.modelId, title: PILOT_BOARDS[activity.modelId].title,
          source: { id: LG_LESSON.nodeId }, binding: activity };
        return recommendPilotTask(task.id, available ? [LG_LESSON] : [], [lesson]);
      }
      return recommendPilotTask(task.id, getEffectiveSources(QB_DATA,activity.subjectId,activity.topicId),
        scopedVisualModels({subjects,...activity},pilotKits,pilotModels,PILOT_BINDINGS));
    }} renderers={pilotRenderers} sources={pilotSources} onBack={onBack}/>;
}
