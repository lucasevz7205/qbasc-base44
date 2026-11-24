import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import StudyTopicPicker from '@/components/qb/study/StudyTopicPicker';
import rfKit from '@/data/kits/rf/rf-1/mapa.json';
import {sampleSignal,signal,quantize,wer} from '@/lib/nexo/experiments';
import './nexo-experiments.css';

const prefix='kit-arr-rf-1-reconhecimento-de-fala-e-transcricao-de-2026-11-22-';
const nodes=new Map();
function collect(n){nodes.set(n.id,n);(n.f||[]).forEach(collect);}
rfKit.ramos.forEach(collect);
const models=[
  {id:'sampling',type:'Simulação',title:'Osciloscópio de amostragem',desc:'Altere frequência e taxa de amostragem e observe o aliasing.',icon:'chart-column',node:'r1.1'},
  {id:'quantization',type:'Modelo interativo',title:'Bancada de quantização',desc:'Explore a transformação de amplitudes em níveis discretos.',icon:'layers',node:'r1.2'},
  {id:'wer',type:'Gráfico interativo',title:'Medidor de erro de palavras',desc:'Manipule as parcelas da WER e veja por que pode superar 100%.',icon:'chart-column',node:'r5.1'},
  {id:'diarization',type:'Sequência de processo',title:'Linha de processamento da diarização',desc:'Percorra as etapas do processo na ordem descrita pelo material.',icon:'timer',node:'r4.2'}
].map(m=>({...m,source:nodes.get(prefix+m.node)})).filter(m=>m.source?.x?.e&&m.source?.x?.src);
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
function Sampling(){
  const [frequency,setFrequency]=React.useState(5000),[rate,setRate]=React.useState(8000);
  const [showAlias,setShowAlias]=React.useState(true);
  const data=sampleSignal(frequency,rate);
  return <>
    <div className="nexo-instrument"><div className="nexo-instrument-head"><span>OSCILOSCÓPIO · SINAL MATEMÁTICO</span><span>{data.undersampled?'ALIASING':'ABAIXO DE NYQUIST'}</span></div>
      <svg viewBox="0 0 680 260" role="img" aria-label={'Onda de '+frequency+' Hz, amostrada a '+rate+' Hz. Frequência de Nyquist: '+data.nyquist+' Hz.'}>
        <WaveGrid/><polyline points={wave(frequency)} fill="none" stroke="var(--qb-moonlight)" strokeWidth="2"/>
        {showAlias&&data.undersampled&&<polyline points={data.samples.map(s=>X(s.t)+','+Y(s.y)).join(' ')} fill="none" stroke="var(--qb-ember)" strokeWidth="1.8" strokeDasharray="5 4"/>}
        {data.samples.map((s,i)=><g key={i}><line x1={X(s.t)} y1={Y(0)} x2={X(s.t)} y2={Y(s.y)} stroke="var(--qb-gold)" strokeOpacity=".6"/><circle cx={X(s.t)} cy={Y(s.y)} r="4" fill="var(--qb-gold-bright)"/></g>)}
      </svg><div className="nexo-legend"><span>— Onda contínua</span><span className="nexo-gold">● Amostras</span>{showAlias&&data.undersampled&&<span className="nexo-ember">– – Ligação das amostras (não reconstrução exata)</span>}</div>
    </div>
    <div className="nexo-controls"><Choice label="Frequência da onda" values={[1000,3000,5000,7000]} value={frequency} onChange={setFrequency} format={v=>fmt(v/1000)+' kHz'}/><Choice label="Taxa de amostragem" values={[8000,16000,44100]} value={rate} onChange={setRate} format={v=>fmt(v/1000,1)+' kHz'}/></div>
    <label className="nexo-check"><input type="checkbox" checked={showAlias} onChange={e=>setShowAlias(e.target.checked)}/> Mostrar ligação entre amostras quando houver aliasing</label>
    <Readout items={[{label:'Limite de Nyquist',value:fmt(data.nyquist/1000,2)+' kHz'},{label:'Frequência aparente (alias)',value:fmt(data.alias/1000,2)+' kHz'},{label:'Amostras na janela',value:fmt(data.samples.length)}]}/>
    <p className="nexo-explain">{data.undersampled?'A frequência do sinal ultrapassa ou atinge o limite de Nyquist. As amostras não distinguem unicamente a frequência original.':'A frequência do sinal está abaixo de metade da taxa de amostragem.'} Experimente manter a onda e trocar a taxa de 8 para 16 kHz.</p>
  </>;
}
function Quantization(){
  const [bits,setBits]=React.useState(3),[amplitude,setAmplitude]=React.useState(.37);
  const data=quantize(amplitude,bits),vals=sampleSignal(1000,16000).samples;
  return <>
    <div className="nexo-instrument"><div className="nexo-instrument-head"><span>CONVERSOR · AMPLITUDE NORMALIZADA</span><span>{fmt(data.levels)} NÍVEIS</span></div>
      <svg viewBox="0 0 680 280" role="img" aria-label={'Amplitude '+fmt(amplitude,2)+' convertida ao nível '+data.code+' de '+data.levels+' níveis.'}>
        <defs><linearGradient id="nexo-metal" x2="0" y2="1"><stop stopColor="#344E70"/><stop offset="1" stopColor="#101C2D"/></linearGradient></defs>
        <g transform="translate(40 34)">
          <polygon points="0,24 113,0 193,40 80,65" fill="#344E70" stroke="var(--qb-bronze)"/>
          <polygon points="0,24 80,65 80,179 0,138" fill="#173653" stroke="var(--qb-bronze)"/>
          <polygon points="80,65 193,40 193,154 80,179" fill="url(#nexo-metal)" stroke="var(--qb-bronze)"/>
          <text x="96" y="30" fill="var(--qb-ivory)" fontSize="13" textAnchor="middle">ENTRADA</text>
          <rect x="93" y="78" width="87" height="62" rx="5" fill="#080A0F" stroke="var(--qb-bronze)"/>
          <text x="136" y="103" textAnchor="middle" fontSize="13" fill="var(--qb-moonlight)">{fmt(amplitude,2)}</text>
          <text x="136" y="124" textAnchor="middle" fontSize="10" fill="var(--qb-ivory-muted)">amplitude</text>
        </g>
        <path d="M233 144H274" stroke="var(--qb-gold)" strokeWidth="3"/><path d="M266 137l8 7-8 7" fill="none" stroke="var(--qb-gold)" strokeWidth="2"/>
        <rect x="278" y="42" width="144" height="180" rx="12" fill="#173653" stroke="var(--qb-bronze)"/>
        <text x="350" y="65" textAnchor="middle" fontSize="12" fill="var(--qb-gold)">QUANTIZADOR</text>
        {Array.from({length:Math.min(data.levels,16)},(_,i)=>{const y=194-108*i/(Math.min(data.levels,16)-1);return <line key={i} x1="302" x2="398" y1={y} y2={y} stroke="var(--qb-steel-blue)" strokeWidth="2"/>;})}
        <line x1="294" x2="406" y1={140-54*amplitude} y2={140-54*amplitude} stroke="var(--qb-moonlight)" strokeWidth="2" strokeDasharray="4 3"/>
        <line x1="294" x2="406" y1={140-54*data.output} y2={140-54*data.output} stroke="var(--qb-gold-bright)" strokeWidth="3"/>
        <path d="M422 144H459" stroke="var(--qb-gold)" strokeWidth="3"/><path d="M451 137l8 7-8 7" fill="none" stroke="var(--qb-gold)" strokeWidth="2"/>
        <rect x="464" y="76" width="176" height="133" rx="12" fill="#101C2D" stroke="var(--qb-bronze)"/>
        <text x="552" y="100" textAnchor="middle" fontSize="12" fill="var(--qb-gold)">CÓDIGO DISCRETO</text>
        <text x="552" y="139" textAnchor="middle" fontSize="25" fill="var(--qb-ivory)">{fmt(data.code)}</text>
        <text x="552" y="166" textAnchor="middle" fontSize="12" fill="var(--qb-moonlight)">nível {fmt(data.output,4)}</text>
        <text x="350" y="242" textAnchor="middle" fontSize="11" fill="var(--qb-ivory-muted)">Modelo didático de bancada · níveis densos abreviados</text>
      </svg>
      <div className="nexo-legend"><span>– – Entrada</span><span className="nexo-gold">— Nível escolhido</span></div>
    </div>
    <Choice label="Profundidade" values={[2,3,4,8,16]} value={bits} onChange={setBits} format={v=>v+' bits'}/>
    <label className="nexo-slider">Amplitude de entrada <strong>{fmt(amplitude,2)}</strong><input type="range" min="-1" max="1" step=".01" value={amplitude} onChange={e=>setAmplitude(Number(e.target.value))}/></label>
    <Readout items={[{label:'Níveis (2ᴺ)',value:fmt(data.levels)},{label:'Código inteiro',value:fmt(data.code)},{label:'Erro absoluto',value:fmt(data.error,5)}]}/>
    <div className="nexo-instrument"><div className="nexo-instrument-head"><span>VISÃO DA ONDA QUANTIZADA</span><span>{bits} BITS</span></div><svg viewBox="0 0 680 260" role="img" aria-label="Onda de demonstração e níveis quantizados das amostras"><WaveGrid/><polyline points={wave(1000)} fill="none" stroke="var(--qb-moonlight)" strokeWidth="2"/>{vals.map((v,i)=><g key={i}><line x1={X(v.t)} y1={Y(v.y)} x2={X(v.t)} y2={Y(quantize(v.y,bits).output)} stroke="var(--qb-ember)" strokeWidth="2"/><circle cx={X(v.t)} cy={Y(quantize(v.y,bits).output)} r="4" fill="var(--qb-gold-bright)"/></g>)}</svg></div>
    <p className="nexo-explain">Aumentar os bits aumenta os níveis disponíveis e reduz o limite do erro de arredondamento. A bancada usa quantização uniforme normalizada, não implementa um codec PCM completo.</p>
  </>;
}
function Wer(){
  const [n,setN]=React.useState(4),[s,setS]=React.useState(0),[d,setD]=React.useState(0),[i,setI]=React.useState(6);
  const val=wer({n,s,d,i}),max=Math.max(n,s+d+i,1);
  const changeN=v=>{setN(v);setS(Math.min(s,v));setD(Math.min(d,Math.max(0,v-Math.min(s,v))));};
  return <>
    <div className="nexo-instrument nexo-wer"><div className="nexo-instrument-head"><span>ANALISADOR · WER</span><span>CENÁRIO DIDÁTICO</span></div>
      <div className="nexo-big-readout"><span>WER = (S + D + I) / N</span><strong>{fmt(val,2)}%</strong><small>({s} + {d} + {i}) / {n} × 100</small></div>
      <div className="nexo-bars"><div><span>Palavras da referência (N)</span><div className="nexo-bar-track"><div style={{width:100*n/max+'%',background:'var(--qb-moonlight)'}}/></div><b>{n}</b></div>
      <div><span>Total de erros (S + D + I)</span><div className="nexo-bar-track">{[[s,'var(--qb-gold)'],[d,'var(--qb-ember)'],[i,'var(--qb-patina)']].map(([count,color],j)=><div key={j} style={{width:100*count/max+'%',background:color}}/>)}</div><b>{s+d+i}</b></div></div>
      <div className="nexo-legend"><span className="nexo-gold">S · substituições</span><span className="nexo-ember">D · deleções</span><span style={{color:'var(--qb-patina)'}}>I · inserções</span></div>
    </div>
    <div className="nexo-controls nexo-four">{[{label:'N · referência',v:n,max:20,min:1,fn:changeN},{label:'S · substituições',v:s,max:n-d,min:0,fn:setS},{label:'D · deleções',v:d,max:n-s,min:0,fn:setD},{label:'I · inserções',v:i,max:40,min:0,fn:setI}].map(r=><label className="nexo-slider" key={r.label}>{r.label}<strong>{r.v}</strong><input type="range" min={r.min} max={r.max} value={r.v} onChange={e=>r.fn(Number(e.target.value))}/></label>)}</div>
    <button className="qb-btn qb-btn--secondary" type="button" onClick={()=>{setN(4);setS(0);setD(0);setI(6);}}>Restaurar exemplo do material</button>
    <p className="nexo-explain">{val>100?'A WER ultrapassa 100%: as inserções elevam o numerador sem alterar o total de palavras de referência.':'A WER usa o total da referência no denominador, não o total da hipótese.'} Os controles simulam contagens de erros já alinhados; não medem uma transcrição real.</p>
  </>;
}
const stages=[['VAD','Detecção de atividade de voz'],['Segmentação','Separação do áudio em trechos'],['Embeddings','Representações de locutor'],['Agrupamento','Clustering'],['Ressegmentação','Etapa final do pipeline clássico']];
function Diarization(){
  const [step,setStep]=React.useState(0);
  return <>
    <div className="nexo-instrument nexo-process"><div className="nexo-instrument-head"><span>DIARIZAÇÃO · SEQUÊNCIA DO KIT</span><span>ETAPA {step+1} / {stages.length}</span></div>
      <div className="nexo-process-art" aria-hidden="true"><Icon name={['mic','layers','target','network','repeat'][step]} size={76}/></div>
      <div className="nexo-process-heading"><span className="qb-overline">ETAPA {step+1}</span><h3>{stages[step][0]}</h3><p>{stages[step][1]}</p></div>
      <div className="nexo-track" role="group" aria-label="Etapas do processo">{stages.map((st,j)=><button type="button" key={st[0]} aria-current={j===step?'step':undefined} onClick={()=>setStep(j)}><span>{j+1}</span><small>{st[0]}</small></button>)}</div>
    </div>
    <div className="nexo-step-actions"><button type="button" className="qb-btn qb-btn--secondary" disabled={step===0} onClick={()=>setStep(step-1)}><Icon name="arrow-left" size={16}/>Anterior</button><button type="button" className="qb-btn qb-btn--secondary" disabled={step===4} onClick={()=>setStep(step+1)}>Próxima<Icon name="arrow-right" size={16}/></button></div>
    <p className="nexo-explain">Sequência clássica explicitada no material, não uma execução real do algoritmo. A posição das etapas é ordinal; não representa duração.</p>
  </>;
}
const RENDERERS={sampling:Sampling,quantization:Quantization,wer:Wer,diarization:Diarization};
export default function NexoVisualLab({subjects=[],topicId,topicLabel,nodeId,onTopicChange}){
  const targetSubject=subjects.find(s=>s.topics?.some(t=>t.id===rfKit.topico));
  const available=Boolean(targetSubject);
  const contextual=topicId===rfKit.topico&&available;
  const [modelId,setModelId]=React.useState(()=>models.find(m=>m.source.id===nodeId)?.id||'sampling');
  const model=models.find(m=>m.id===modelId)||models[0];
  const Renderer=RENDERERS[model?.id];
  return <section className="nexo-exp" aria-label="Laboratório Visual">
    <header className="nexo-exp-head"><div className="nexo-exp-emblem"><Icon name="astrolabe" size={30}/></div><div><span className="qb-overline">O ARQUITETO · LABORATÓRIO VISUAL</span><h2>Conhecimento em movimento</h2><p>Manipule um modelo, observe o efeito e compreenda o mecanismo.</p></div><span className="qb-badge qb-badge--gold">Prévia privada</span></header>
    <StudyTopicPicker label="Matéria e assunto" subjects={subjects} value={topicId} onSelect={onTopicChange}/>
    {!contextual?<div className="nexo-exp-empty"><Icon name="astrolabe" size={42}/><h3>Nenhum modelo disponível para este recorte</h3><p>Os modelos desta prévia estão vinculados ao kit RF 1. Não há geração automática de representações para {topicLabel||'este assunto'} ainda.</p>{available&&<button type="button" className="qb-btn qb-btn--secondary" onClick={()=>onTopicChange?.({subjectId:targetSubject.id,topicId:rfKit.topico})}>Abrir bancada de Reconhecimento de Fala<Icon name="arrow-right" size={16}/></button>}</div>:<>
      <div className="nexo-exp-gallery" role="group" aria-label="Experimentos disponíveis">{models.map(m=><button key={m.id} type="button" aria-pressed={model.id===m.id} onClick={()=>setModelId(m.id)}><Icon name={m.icon} size={21}/><span><small>{m.type}</small><strong>{m.title}</strong></span></button>)}</div>
      <div className="nexo-exp-workbench"><main className="nexo-exp-main"><div><span className="qb-overline">{model.type}</span><h3>{model.title}</h3><p>{model.desc}</p></div><Renderer key={model.id}/></main>
      <aside className="nexo-exp-context"><span className="qb-overline">CADERNO DE REFERÊNCIA</span><h3>{model.source.t}</h3><p className="nexo-context-label">Extraído do kit existente</p><p>{model.source.x.e}</p><details><summary>Exemplo do material</summary><p>{model.source.x.ex||'Não registrado no nó.'}</p></details><details><summary>Armadilha indicada pelo material</summary><p>{model.source.x.trap||'Não registrada no nó.'}</p></details><div className="nexo-exp-source"><Icon name="book-open" size={17}/><div><strong>Fonte registrada</strong><p>{model.source.x.src}</p><small>Referência do kit, conferência primária pendente.</small></div></div><p className="nexo-exp-limit"><Icon name="info" size={15}/>Modelo de demonstração. Dados calculados ou contagens didáticas, não medições nem desempenho. Nada é salvo.</p></aside></div>
    </>}
    <footer className="nexo-exp-footer"><Icon name="lock" size={15}/><span>Geração contextual pelo Arquiteto e novos modelos dependem de validação e integração posteriores. A evocação permanece reservada ao mapa mental original.</span></footer>
  </section>;
}
export {NexoVisualLab};
