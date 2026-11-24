import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import StudyTopicPicker from '@/components/qb/study/StudyTopicPicker';
import rfKit from '@/data/kits/rf/rf-1/mapa.json';
import {sampleSignal,signal} from '@/lib/nexo/experiments';
import './nexo-experiments.css';
import NexoVisualTraining from './NexoVisualTraining';
import {scopedVisualModels} from '@/lib/nexo/visual-catalog';
import {STAGES} from '@/lib/nexo/visual-training';
import {quantizationWindow,werComposition,diarizationFrame} from '@/lib/nexo/experiment-refinements';
import {diarizationStageContext} from '@/lib/nexo/diarization-context';
import NexoDahlPuzzle from './NexoDahlPuzzle';
import NexoGuidedCycle from './NexoGuidedCycle';
import {getDahlSource} from '@/lib/nexo/dahl-puzzle';
import cpKit from '@/data/kits/cp/cp-1/mapa.json';
import asrKit from '@/data/kits/rf/rf-1-1/mapa.json';

const dahlSource=getDahlSource(cpKit);
const models=[
  ...(dahlSource?[{id:'dahl',type:'Quebra-cabeça conceitual',title:'Mapa dos regimes políticos',desc:'Encaixe conceitos, características e trajetórias no diagrama de Dahl.',icon:'puzzle'}]:[]),
  {id:'sampling',type:'Simulação',title:'Osciloscópio de amostragem',desc:'Altere frequência e taxa de amostragem e observe o aliasing.',icon:'chart-column'},
  {id:'quantization',type:'Modelo interativo',title:'Bancada de quantização',desc:'Explore a transformação de amplitudes em níveis discretos.',icon:'layers'},
  {id:'wer',type:'Gráfico interativo',title:'Medidor de erro de palavras',desc:'Manipule as parcelas da WER e veja por que pode superar 100%.',icon:'chart-column'},
  {id:'diarization',type:'Sequência de processo',title:'Linha de processamento da diarização',desc:'Percorra as etapas do processo na ordem descrita pelo material.',icon:'timer'}
];
const kits=[rfKit,asrKit,cpKit];
const fmt=(v,d=0)=>v.toLocaleString('pt-BR',{maximumFractionDigits:d});
const X=t=>48+584*t, Y=y=>120-82*y;
function WaveGrid(){return <g aria-hidden="true">
  {Array.from({length:9},(_,i)=><line key={'x'+i} x1={X(i/8)} y1="32" x2={X(i/8)} y2="208" stroke="var(--qb-steel-blue)" strokeOpacity=".4"/>)}
  {[-1,-.5,0,.5,1].map(y=><g key={y}><line x1="48" y1={Y(y)} x2="632" y2={Y(y)} stroke="var(--qb-steel-blue)" strokeOpacity={y===0?.9:.4}/><text x="36" y={Y(y)+4} textAnchor="end" fill="var(--qb-ivory-muted)" fontSize="11">{fmt(y,1)}</text></g>)}
  {[0,.25,.5,.75,1].map(t=><text key={t} x={X(t)} y="229" textAnchor="middle" fill="var(--qb-ivory-muted)" fontSize="11">{fmt(t,2)}</text>)}
  <text x="340" y="249" fill="var(--qb-ivory-muted)" textAnchor="middle" fontSize="11">Tempo (ms)</text>
</g>;}
function wave(f){return Array.from({length:301},(_,i)=>[X(i/300),Y(signal(f,i/300))].map(v=>v.toFixed(2)).join(',')).join(' ');}
function Choice({label,values,value,onChange,format=v=>v}){return <div className="nexo-control"><span>{label}</span><div className="qb-seg" role="group" aria-label={label}>{values.map(v=><button type="button" key={v} className="qb-seg__opt" aria-pressed={value===v} onClick={()=>onChange(v)}>{format(v)}</button>)}</div></div>;}
function Readout({items}){return <div className="nexo-readouts">{items.map(i=><div key={i.label}><span>{i.label}</span><strong>{i.value}</strong></div>)}</div>;}
function Sampling({onPredictionMode,guided}){
  const [localFrequency,setFrequency]=React.useState(5000),[localRate,setRate]=React.useState(8000);
  const {frequency,rate}=guided?.parameters||{frequency:localFrequency,rate:localRate};
  const data=sampleSignal(frequency,rate);
  return <NexoVisualTraining kind="sampling" guided={guided} parameters={{frequency,rate}} onPredictionMode={onPredictionMode}>{({reveal})=><>
    <div className="nexo-controls"><Choice label="Frequência da onda" values={[1000,3000,4000,5000,7000]} value={frequency} onChange={setFrequency} format={v=>fmt(v/1000)+' kHz'}/><Choice label="Taxa de amostragem" values={[8000,16000,44100]} value={rate} onChange={setRate} format={v=>fmt(v/1000,1)+' kHz'}/></div>
    <div className="nexo-instrument"><div className="nexo-instrument-head"><span>OSCILOSCÓPIO · SINAL MATEMÁTICO</span><span>{reveal?data.classification==='boundary'?'NO LIMITE':data.undersampled?'ALIASING':'ABAIXO DE NYQUIST':'OBSERVAÇÃO ATIVA'}</span></div>
      <svg viewBox="0 0 680 260" role="img" aria-label={'Sinal de '+frequency+' Hz; taxa '+rate+' Hz'}>
        <WaveGrid/><polyline points={wave(frequency)} fill="none" stroke="var(--qb-moonlight)" strokeWidth="2"/>
        {reveal&&data.classification==='above'&&<polyline points={wave(data.signedAlias)} fill="none" stroke="var(--qb-ember)" strokeWidth="1.8" strokeDasharray="5 4"/>}
        {data.samples.map((s,i)=><g key={i}><line x1={X(s.t)} y1={Y(0)} x2={X(s.t)} y2={Y(s.y)} stroke="var(--qb-gold)" strokeOpacity=".6"/><circle cx={X(s.t)} cy={Y(s.y)} r="4" fill="var(--qb-gold-bright)"/></g>)}
      </svg><div className="nexo-legend"><span>— Onda original</span><span className="nexo-gold">● Amostras</span>{reveal&&data.classification==='above'&&<span className="nexo-ember">– – Senoide equivalente</span>}</div>
      {reveal&&<div className="nexo-plot-feedback">Limite: {fmt(data.nyquist/1000,2)} kHz · frequência dobrada teórica: {fmt(data.alias/1000,2)} kHz{data.classification==='boundary'?' · amostras nulas nesta fase; frequência não recuperável':''}</div>}
    </div>
    <p className="nexo-explain">Cada ponto é uma amostra no tempo. Alterar a taxa aqui simula uma nova aquisição, não recupera informação de uma gravação anterior.</p>
  </>}</NexoVisualTraining>;
}
function Quantization({onPredictionMode,guided}){
  const [localBits,setBits]=React.useState(3),[localAmplitude,setAmplitude]=React.useState(.37);
  const {bits,amplitude}=guided?.parameters||{bits:localBits,amplitude:localAmplitude};
  const data=quantizationWindow(amplitude,bits);
  const y=v=>220-180*(v-data.min)/(data.max-data.min);
  const globalY=v=>220-90*(v+1);
  return <NexoVisualTraining kind="quantization" guided={guided} parameters={{bits,amplitude}} onPredictionMode={onPredictionMode}>{({reveal})=><>
    <Choice label="Profundidade" values={[2,3,4,8,16]} value={bits} onChange={setBits} format={v=>v+' bits'}/>
    <label className="nexo-slider">Amplitude de entrada <strong>{fmt(amplitude,2)}</strong><input type="range" min="-1" max="1" step=".01" value={amplitude} onChange={e=>setAmplitude(Number(e.target.value))}/></label>
    <div className="nexo-instrument"><div className="nexo-instrument-head"><span>QUANTIZAÇÃO UNIFORME · AMPLITUDE −1 A +1</span><span>{reveal?fmt(data.levels)+' NÍVEIS':'OBSERVAÇÃO ATIVA'}</span></div>
      <svg viewBox="0 0 620 284" role="img" aria-label={'Amplitude '+fmt(amplitude,2)+'; profundidade '+bits+' bits. Escala completa e ampliação dos níveis próximos.'}>
        <text x="105" y="20" textAnchor="middle" fill="var(--qb-gold)" fontSize="12">ESCALA COMPLETA</text><text x="396" y="20" textAnchor="middle" fill="var(--qb-gold)" fontSize="12">AMPLIAÇÃO LOCAL</text>
        <line x1="104" y1="40" x2="104" y2="220" stroke="var(--qb-steel-blue)" strokeWidth="5"/>
        {[-1,0,1].map(v=><g key={v}><line x1="92" x2="115" y1={globalY(v)} y2={globalY(v)} stroke="var(--qb-moonlight)"/><text x="82" y={globalY(v)+4} textAnchor="end" fontSize="12" fill="var(--qb-moonlight)">{v}</text></g>)}
        <rect x="95" y={globalY(data.max)} width="18" height={Math.max(2,globalY(data.min)-globalY(data.max))} fill="var(--qb-gold)" opacity=".65"/>
        <circle cx="104" cy={globalY(amplitude)} r="5" fill="var(--qb-moonlight)"/>
        <path d={'M115 '+globalY(data.max)+' L230 40 M115 '+globalY(data.min)+' L230 220'} stroke="var(--qb-bronze)" strokeDasharray="4 3" fill="none"/>
        {data.levels.map(l=><g key={l.code}><line x1="240" x2="510" y1={y(l.value)} y2={y(l.value)} stroke="var(--qb-steel-blue)" strokeWidth="1.5"/>{reveal&&<text x="520" y={y(l.value)+4} fill="var(--qb-moonlight)" fontSize="11">cód. {l.code}</text>}</g>)}
        <line x1="230" x2="510" y1={y(amplitude)} y2={y(amplitude)} stroke="var(--qb-moonlight)" strokeWidth="2" strokeDasharray="5 3"/>
        {reveal&&<><line x1="240" x2="510" y1={y(data.output)} y2={y(data.output)} stroke="var(--qb-gold-bright)" strokeWidth="3"/><line x1="478" x2="478" y1={y(amplitude)} y2={y(data.output)} stroke="var(--qb-ember)" strokeWidth="4"/><circle cx="478" cy={y(data.output)} r="4" fill="var(--qb-gold-bright)"/></>}
        <text x="375" y="248" textAnchor="middle" fontSize="11" fill="var(--qb-ivory-muted)">Cada linha local é um nível real do modelo.</text>
        <text x="375" y="266" textAnchor="middle" fontSize="11" fill="var(--qb-ivory-muted)">A escala ampliada muda com a profundidade.</text>
      </svg>
      <div className="nexo-legend"><span>– – Entrada {fmt(amplitude,2)}</span>{reveal&&<><span className="nexo-gold">— Nível escolhido</span><span className="nexo-ember">│ Erro de arredondamento</span></>}</div>
    </div>
    {reveal&&<><Readout items={[{label:'Níveis (2ᴺ)',value:fmt(data.levels)},{label:'Código inteiro',value:fmt(data.code)},{label:'Erro absoluto',value:fmt(data.error,6)}]}/><Readout items={[{label:'Amplitude de saída',value:fmt(data.output,6)},{label:'Passo entre níveis',value:fmt(data.step,6)},{label:'Erro máximo',value:fmt(data.maxError,6)}]}/><p className="nexo-explain">Mais bits reduzem o limite do erro, não garantem erro menor em cada amplitude isolada. A escala local é ampliada; compare os valores numéricos. Modelo uniforme normalizado, não um codec PCM completo.</p></>}
  </>}</NexoVisualTraining>;
}
function Wer({onPredictionMode,guided}){
  const [ln,setN]=React.useState(4),[ls,setS]=React.useState(0),[ld,setD]=React.useState(0),[li,setI]=React.useState(6);
  const {n,s,d,i}=guided?.parameters||{n:ln,s:ls,d:ld,i:li};
  const composition=werComposition({n,s,d,i}),val=composition.rate,max=Math.max(n,composition.errors,composition.hypothesis,1);
  const changeN=v=>{setN(v);setS(Math.min(s,v));setD(Math.min(d,Math.max(0,v-Math.min(s,v))));};
  return <NexoVisualTraining kind="wer" guided={guided} parameters={{n,s,d,i}} onPredictionMode={onPredictionMode}>{({reveal})=><>
    <div className="nexo-instrument nexo-wer"><div className="nexo-instrument-head"><span>ANALISADOR · WER</span><span>CENÁRIO DIDÁTICO</span></div>
      <div className="nexo-big-readout"><span>WER</span><strong>{reveal?fmt(val,2)+"%":"?"}</strong>{reveal&&<small>({s} + {d} + {i}) / {n} × 100</small>}</div>
      <div className="nexo-bars"><div><span>Palavras da referência (N)</span><div className="nexo-bar-track"><div style={{width:100*n/max+'%',background:'var(--qb-moonlight)'}}/></div><b>{n}</b></div>
      <div><span>Total de erros (S + D + I)</span><div className="nexo-bar-track">{[[s,'var(--qb-gold)'],[d,'var(--qb-ember)'],[i,'var(--qb-patina)']].map(([count,color],j)=><div key={j} style={{width:100*count/max+'%',background:color}}/>)}</div><b>{s+d+i}</b></div></div>
      <div className="nexo-bars"><div><span>Palavras da hipótese</span><div className="nexo-bar-track"><div style={{width:100*composition.hypothesis/max+'%',background:'var(--qb-bronze)'}}/></div><b>{composition.hypothesis}</b></div></div><div className="nexo-legend"><span className="nexo-gold">S · substituições</span><span className="nexo-ember">D · deleções</span><span style={{color:'var(--qb-patina)'}}>I · inserções</span></div>
    </div>
    <div className="nexo-controls nexo-four">{[{label:'N · referência',v:n,max:20,min:1,fn:changeN},{label:'S · substituições',v:s,max:n-d,min:0,fn:setS},{label:'D · deleções',v:d,max:n-s,min:0,fn:setD},{label:'I · inserções',v:i,max:40,min:0,fn:setI}].map(r=><label className="nexo-slider" key={r.label}>{r.label}<strong>{r.v}</strong><input type="range" min={r.min} max={r.max} value={r.v} onChange={e=>r.fn(Number(e.target.value))}/></label>)}</div>
    <button className="qb-btn qb-btn--secondary" type="button" onClick={()=>{setN(4);setS(0);setD(0);setI(6);}}>Restaurar exemplo do material</button>
    {reveal&&<p className="nexo-explain">{val>100?'A WER ultrapassa 100%: as inserções elevam o numerador sem alterar o total de palavras de referência.':'A WER usa o total da referência no denominador, não o total da hipótese.'} A hipótese tem N − D + I palavras, mas não é o denominador. Os controles simulam contagens de erros já alinhados; não medem uma transcrição real.</p>}
  </>}</NexoVisualTraining>;
}
function Diarization({onPredictionMode,onStageChange,onRevealChange,guided}){
  const [localStep,setStep]=React.useState(0);
  const step=guided?.parameters.step??localStep;
  const [localExample,setExample]=React.useState(0);
  const example=guided?.parameters.example??localExample;
  const frame=diarizationFrame(step,example);
  const spans=frame.spans.map(v=>[v.start,v.end,v.speaker]);
  return <NexoVisualTraining kind="diarization" guided={guided} parameters={{step,example}} onPredictionMode={onPredictionMode} onRevealChange={onRevealChange}>{({reveal})=><>
    <Choice label="Sinal sintético" values={[0,1]} value={example} onChange={setExample} format={v=>"Exemplo "+(v+1)}/>
    <Choice label="Etapa do pipeline clássico" values={[0,1,2,3,4]} value={step} onChange={v=>{if(v!==step){setStep(v);onStageChange?.(v);}}} format={v=>reveal?(v+1)+' · '+STAGES[v]:String(v+1)}/>
    <div className="nexo-instrument"><div className="nexo-instrument-head"><span>DIARIZAÇÃO · SINAL SINTÉTICO</span><span>{reveal?STAGES[step]:'ETAPA '+(step+1)}</span></div>
      <svg viewBox="0 0 680 250" role="img" aria-label={'Demonstração didática da etapa '+(step+1)+' de cinco'}>
        <text x="24" y="22" fill="var(--qb-moonlight)" fontSize="13">Sinal de entrada ilustrativo</text>
        {Array.from({length:160},(_,j)=>{const t=j/160;const speaking=frame.input.some(s=>t>=s.start&&t<=s.end);const h=speaking?4+26*Math.abs(Math.sin(j*1.7)*Math.cos(j*.23)):1;return <line key={j} x1={48+t*584} x2={48+t*584} y1={65-h} y2={65+h} stroke="var(--qb-moonlight)"/>;})}
        <text x="24" y="115" fill="var(--qb-gold)" fontSize="13">{reveal?STAGES[step]:'Representação da etapa'}</text>
        {step<=1?spans.map(([a,b],j)=><g key={j}><rect x={48+a*584} y="130" width={(b-a)*584} height="38" rx="3" fill="var(--qb-gold)" opacity=".8"/>{step===1&&<text x={48+(a+b)/2*584} y="154" textAnchor="middle" fontSize="13" fill="#101C2D">{j+1}</text>}</g>):step===2?spans.map((_,j)=><g key={j}>{[0,1,2,3,4].map(k=><rect key={k} x={65+j*200+k*20} y={180-(frame.vectors[j])[k]*12} width="14" height={(frame.vectors[j])[k]*12} fill="var(--qb-gold)"/>)}</g>):spans.map(([a,b,id],j)=><g key={j}><rect x={48+a*584} y={id==='A'?132:178} width={(b-a)*584} height="28" fill={id==='A'?'var(--qb-moonlight)':'var(--qb-gold)'} rx="2"/><text x={48+(a+b)/2*584} y={id==='A'?151:197} textAnchor="middle" fontSize="13" fill="#101C2D">{id}</text></g>)}
        {step===4&&frame.input.map((s,j)=><rect key={"before-"+j} x={48+s.start*584} y={s.speaker==="A"?132:178} width={(s.end-s.start)*584} height="28" fill="none" stroke="var(--qb-ember)" strokeDasharray="3 2"/>)}
        <text x="340" y="234" textAnchor="middle" fill="var(--qb-ivory-muted)" fontSize="12">Exemplo esquemático, sem análise real de áudio</text>
      </svg>
      {reveal&&<div className="nexo-plot-feedback">{STAGES[step]}{step<4?' · próxima etapa: '+STAGES[step+1]:' · final do pipeline'}</div>}
    </div>
    <p className="nexo-explain">Alterne as etapas para observar uma representação ilustrativa do processamento. Segmentos e vetores são sintéticos; não são resultados de um modelo de diarização. Na etapa final, a linha tracejada indica a fronteira anterior; o ajuste é pré-definido, não calculado por IA.</p>
  </>}</NexoVisualTraining>;
}
const RENDERERS={sampling:Sampling,quantization:Quantization,wer:Wer,diarization:Diarization,dahl:NexoDahlPuzzle};
export default function NexoVisualLab({subjects=[],subjectId,topicId,topicLabel,nodeId,onTopicChange,onNodeChange}){
  const scoped=scopedVisualModels({subjects,subjectId,topicId,nodeId},kits,models);
  const topicModels=scopedVisualModels({subjects,subjectId,topicId},kits,models);
  const contextual=scoped.length>0;
  const [modelId,setModelId]=React.useState(null);
  const [predictionMode,setPredictionMode]=React.useState(false);
  const [stage,setStage]=React.useState(0);
  const [stageRevealed,setStageRevealed]=React.useState(false);
  const [associationContext,setAssociationContext]=React.useState(null);
  const [guidedMode,setGuidedMode]=React.useState(false);
  const model=scoped.find(m=>m.id===modelId)||scoped[0];
  const Renderer=RENDERERS[model?.id];
  const stageContext=model?.id==='diarization'?diarizationStageContext(model.source,stage):null;
  const showStage=stageContext&&(!predictionMode||stageRevealed);
  return <section className="nexo-exp" aria-label="Laboratório Visual">
    <header className="nexo-exp-head"><div className="nexo-exp-emblem"><Icon name="astrolabe" size={30}/></div><div><span className="qb-overline">O ARQUITETO · LABORATÓRIO VISUAL</span><h2>Conhecimento em movimento</h2><p>Manipule um modelo, observe o efeito e compreenda o mecanismo.</p></div><span className="qb-badge qb-badge--gold">Prévia privada</span></header>
    <StudyTopicPicker label="Matéria e assunto" subjects={subjects} value={topicId} onSelect={onTopicChange}/>
    {topicModels.length>0&&<label className="nexo-control">Conceito vinculado<select className="qb-input" value={nodeId||''} onChange={e=>onNodeChange?.(e.target.value||undefined)}><option value="">Todos os modelos deste assunto</option>{nodeId&&!topicModels.some(m=>m.sources.some(n=>n.id===nodeId))&&<option value={nodeId}>Conceito atual (sem modelo)</option>}{topicModels.flatMap(m=>m.sources).map(n=><option key={n.id} value={n.id}>{n.t}</option>)}</select></label>}
    {!contextual?<div className="nexo-exp-empty"><Icon name="astrolabe" size={42}/><h3>Nenhum modelo disponível neste recorte</h3><p>Não há modelo vinculado exatamente a {topicLabel||'este assunto'}{nodeId?' e ao conceito atual':''}. Nenhum modelo de outro tópico será exibido.</p></div>:<>
      <span className="qb-overline">{scoped.length} {scoped.length===1?'modelo vinculado':'modelos vinculados'}</span>
      {scoped.length>1&&<div className="nexo-exp-gallery" role="group" aria-label="Experimentos deste assunto">{scoped.map(m=><button key={m.id} type="button" aria-pressed={model.id===m.id} onClick={()=>{if(m.id!==model.id){setModelId(m.id);setGuidedMode(false);setPredictionMode(false);setStage(0);setStageRevealed(false);setAssociationContext(null);}}}><Icon name={m.icon} size={21}/><span><small>{m.type}</small><strong>{m.title}</strong></span></button>)}</div>}
      <div className="nexo-exp-workbench"><main className="nexo-exp-main"><div><span className="qb-overline">{model.type}</span><h3>{model.title}</h3><p>{model.desc}</p></div><div className="qb-seg" role="group" aria-label="Percurso de aprendizagem"><button type="button" className="qb-seg__opt" aria-pressed={!guidedMode} onClick={()=>{if(guidedMode){setGuidedMode(false);setPredictionMode(false);setStage(0);setStageRevealed(false);setAssociationContext(null);}}}>Consulta e treino</button><button type="button" className="qb-seg__opt" aria-pressed={guidedMode} onClick={()=>{if(!guidedMode){setGuidedMode(true);setPredictionMode(false);setAssociationContext(null);}}}>Percurso orientado</button></div>{guidedMode?<NexoGuidedCycle key={model.id} kind={model.id} nodeId={nodeId}>{guided=><Renderer guided={guided} source={model.id==='dahl'?dahlSource:undefined} nodeId={nodeId}/>}</NexoGuidedCycle>:<Renderer key={model.id} onPredictionMode={v=>{setPredictionMode(v);setStageRevealed(false);}} onStageChange={v=>{setStage(v);setStageRevealed(false);}} onRevealChange={setStageRevealed} source={model.id==='dahl'?dahlSource:undefined} nodeId={nodeId} onAssociationContext={setAssociationContext}/>}</main>
       {guidedMode?<aside className="nexo-exp-context"><span className="qb-overline">PERCURSO ORIENTADO</span><p>O modelo acompanha o cenário de cada etapa. A teoria e as respostas de referência aparecem no momento da correção. A recuperação e a aplicação final são realizadas sem o gráfico.</p><div className="nexo-exp-source"><Icon name="book-open" size={17}/><div><strong>Fonte do percurso</strong>{model.sources.map(n=><p key={n.id}>{n.x.src}</p>)}</div></div></aside>:model.id==='dahl'&&associationContext?<aside className="nexo-exp-context" aria-live="polite"><span className="qb-overline">ASSOCIAÇÃO EM FOCO</span><h3>{associationContext.title}</h3>{associationContext.correction&&<strong>{associationContext.correction}</strong>}<p>{associationContext.detail}</p><div className="nexo-exp-source"><Icon name="book-open" size={17}/><div><strong>Fonte do kit</strong><p>{associationContext.reference}</p></div></div></aside>:showStage?<aside className="nexo-exp-context" aria-live="polite" aria-label="Características da etapa selecionada"><span className="qb-overline">ETAPA {stageContext.stage} DE {stageContext.total} · EM FOCO</span><h3>{stageContext.title}</h3><p className="nexo-context-label">Função no pipeline</p><p>{stageContext.function}</p><div className="nexo-stage-facts"><div><span className="qb-overline">ENTRADA ILUSTRATIVA</span><p>{stageContext.input}</p></div><div><span className="qb-overline">SAÍDA ILUSTRATIVA</span><p>{stageContext.output}</p></div></div><div className="nexo-plot-feedback"><strong>O que observar</strong><p>{stageContext.association}</p></div><details><summary>Resumo geral da diarização</summary><p>{model.source.x.e}</p></details><details><summary>Armadilha do material</summary><p>{model.source.x.trap}</p></details><div className="nexo-exp-source"><Icon name="book-open" size={17}/><div><strong>Fonte registrada</strong><p>{stageContext.reference}</p><small>Trecho associado: {stageContext.anchor}. A descrição do desenho é didática; transformação visual sujeita a homologação.</small></div></div></aside>:predictionMode?<aside className="nexo-exp-context"><span className="qb-overline">MODO PREDIÇÃO</span><p>Selecione e responda no modelo. A explicação correspondente aparece após a correção.</p></aside>:<aside className="nexo-exp-context"><span className="qb-overline">CADERNO DE REFERÊNCIA</span><h3>{model.source.t}</h3><p className="nexo-context-label">Extraído do kit existente</p><p>{model.source.x.e}</p><details><summary>Exemplo do material</summary><p>{model.source.x.ex||'Não registrado no nó.'}</p></details><details><summary>Armadilha indicada pelo material</summary><p>{model.source.x.trap||'Não registrada no nó.'}</p></details><div className="nexo-exp-source"><Icon name="book-open" size={17}/><div><strong>Fonte registrada</strong>{model.sources.map(n=><p key={n.id}>{n.x.src}</p>)}<small>Kit aceito como base validada; representação sujeita a homologação.</small></div></div><p className="nexo-exp-limit"><Icon name="info" size={15}/>Modelo de demonstração. Dados calculados ou contagens didáticas, não medições nem desempenho. Nada é salvo.</p></aside>}</div>
    </>}
    
    <footer className="nexo-exp-footer"><Icon name="lock" size={15}/><span>Geração contextual pelo Arquiteto e novos modelos dependem de validação e integração posteriores. A evocação permanece reservada ao mapa mental original.</span></footer>
  </section>;
}
export {NexoVisualLab};
