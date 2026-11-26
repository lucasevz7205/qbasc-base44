import React from 'react';
import {Icon} from '@/components/qb/core/Icon';
import {nepSum} from '@/lib/nexo/kit-visuals';

const COLORS=['var(--qb-gold)','var(--qb-moonlight)','var(--qb-ember)','var(--qb-patina)','var(--qb-bronze)','var(--qb-steel-blue)'];
const fmt=(v,d=2)=>v.toLocaleString('pt-BR',{maximumFractionDigits:d,minimumFractionDigits:d});
const PRESETS=[
  {id:'material',label:'Exemplo do material',shares:[40,35,15,10]},
  {id:'dois',label:'Dois partidos iguais',shares:[50,50]},
  {id:'dominante',label:'Um partido grande',shares:[70,10,10,10]},
  {id:'fragmentado',label:'Seis partidos iguais',shares:[17,17,17,17,16,16]}
];

// Instrument for CP-6 r4.4. Numbers are didactic seat shares; only the formula and the
// worked example (40/35/15/10 -> ≈3,2) come from the kit.
export default function NexoNepMeter({source,onPredictionMode,onAssociationContext,guided}){
  const [shares,setShares]=React.useState(source.example);
  const [mode,setMode]=React.useState('explore');
  const [guess,setGuess]=React.useState('');
  const [checked,setChecked]=React.useState(false);
  const total=shares.reduce((a,b)=>a+b,0);
  const r=total===100?nepSum(shares):null;
  const reveal=mode==='explore'||checked;
  React.useEffect(()=>{onAssociationContext?.({title:'Número efetivo de partidos',detail:'NEP = 1 ÷ Σ p². Cada partido pesa pelo seu tamanho: p é a proporção de votos (NEP eleitoral) ou de cadeiras (NEP parlamentar). Pegadinha: o NEP é de Laakso e Taagepera, não de Sartori; fusões reduzem o NEP.',reference:source.reference});},[onAssociationContext,source.reference]);
  const change=(i,v)=>{setShares(s=>s.map((x,j)=>j===i?v:x));setChecked(false);};
  const preset=p=>{setShares([...p.shares]);setChecked(false);setGuess('');};
  const parsed=Number(String(guess).replace(',','.'));
  const ok=r&&checked&&Number.isFinite(parsed)&&Math.abs(parsed-r.nep)<=0.1;
  const body=<div className="nexo-instrument nexo-nep">
    <div className="nexo-instrument-head"><span>MEDIDOR · NEP PARLAMENTAR</span><span>{total===100?'100% DAS CADEIRAS':'SOMA '+total+'%'}</span></div>
    <div className="nexo-big-readout"><span>NEP</span><strong>{r&&reveal?fmt(r.nep):'?'}</strong>{r&&reveal&&<small>1 ÷ {fmt(r.sum,4)}</small>}</div>
    <div className="nexo-nep-stack" role="img" aria-label={'Distribuição das cadeiras: '+shares.map((s,i)=>'partido '+(i+1)+' '+s+'%').join(', ')}>{shares.map((s,i)=><div key={i} style={{width:(total?100*s/total:0)+'%',background:COLORS[i%COLORS.length]}}><span>{s}%</span></div>)}</div>
    {reveal&&r&&<div className="nexo-bars">{r.squares.map((q,i)=><div key={i}><span>p² do partido {i+1} ({fmt(r.proportions[i])}²)</span><div className="nexo-bar-track"><div style={{width:100*q/Math.max(...r.squares)+'%',background:COLORS[i%COLORS.length]}}/></div><b>{fmt(q,4)}</b></div>)}</div>}
    {!guided&&<div className="nexo-controls nexo-four">{shares.map((s,i)=><label className="nexo-slider" key={i}>Partido {i+1}<strong>{s}%</strong><input type="range" min="0" max="100" value={s} onChange={e=>change(i,Number(e.target.value))}/></label>)}</div>}
    {total!==100&&<p className="nexo-plot-feedback" role="status">As fatias somam {total}%. Ajuste para 100% para calcular.</p>}
  </div>;
  if(guided)return body;
  return <div className="nexo-training">
    <div className="qb-seg" role="group" aria-label="Modo de aprendizagem">{[['explore','Exploração livre'],['predict','Predição e correção']].map(([v,label])=><button key={v} type="button" className="qb-seg__opt" aria-pressed={mode===v} onClick={()=>{if(mode!==v){setMode(v);setChecked(false);setGuess('');onPredictionMode?.(v==='predict');}}}>{label}</button>)}</div>
    <div className="qb-seg" role="group" aria-label="Cenários" style={{flexWrap:'wrap'}}>{PRESETS.map(p=><button key={p.id} type="button" className="qb-seg__opt" aria-pressed={JSON.stringify(p.shares)===JSON.stringify(shares)} onClick={()=>preset(p)}>{p.label}</button>)}</div>
    {body}
    {mode==='predict'&&<section className="nexo-instrument nexo-training-form" aria-label="Predição do NEP">
      <span className="qb-overline">ESTIME ANTES DE VER</span>
      <label>NEP estimado (uma casa decimal)<input className="qb-input" inputMode="decimal" value={guess} onChange={e=>{setGuess(e.target.value);setChecked(false);}}/></label>
      <button type="button" className="qb-btn qb-btn--secondary" disabled={!r||!guess.trim()} onClick={()=>setChecked(true)}>Verificar no medidor</button>
      {checked&&r&&<div className="nexo-training-result" aria-live="polite"><strong><Icon name={ok?'circle-check':'circle-x'} size={16}/> {ok?'Estimativa correta':'Compare com o cálculo'}</strong><p>Σ p² = {fmt(r.sum,4)}; NEP = 1 ÷ {fmt(r.sum,4)} ≈ {fmt(r.nep)}. Quanto mais concentradas as cadeiras, maior Σ p² e menor o NEP.</p></div>}
    </section>}
    <p className="nexo-explain">Fórmula e exemplo do kit (40%, 35%, 15% e 10% → Σ p² = 0,315 e NEP ≈ 3,2). Os outros cenários são contagens didáticas, não resultados de eleições.</p>
  </div>;
}
