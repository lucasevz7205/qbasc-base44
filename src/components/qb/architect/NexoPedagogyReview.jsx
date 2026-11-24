import React from 'react';
import {Icon} from '@/components/qb/core/Icon';
import {assessPedagogy} from '@/lib/nexo/pedagogy-contract';
import {samplingReviewExamples} from '@/lib/nexo/pedagogy-pilot';
import inventory from '../../../../docs/nexo/source-inventory.json';
import rfKit from '@/data/kits/rf/rf-1/mapa.json';

export default function NexoPedagogyReview(){
  const [variant,setVariant]=React.useState('valid');
  const [show,setShow]=React.useState(false);
  const version=inventory.kits.find(k=>k.topicId===rfKit.topico)?.mapSource?.version;
  const node=rfKit.ramos[0]?.f?.find(n=>n.id.endsWith('-r1.1'));
  if(!version||!node)return null;
  const examples=samplingReviewExamples(node,version);
  const result=assessPedagogy(examples[variant],examples.sources);
  const choose=v=>{setVariant(v);setShow(false);};
  return <section className="nexo-exp-context" aria-label="Amostra do contrato pedagógico">
    <span className="qb-overline">ETAPA 01 · CONTRATO PEDAGÓGICO V{result.version}</span>
    <h3>Teste de adequação de uma representação</h3>
    <p>Compare duas propostas para ensinar o mesmo conceito. O resultado verifica requisitos da especificação, não aprova a veracidade nem comprova aprendizagem.</p>
    <div className="qb-seg" role="group" aria-label="Proposta de modelo">
      <button className="qb-seg__opt" type="button" aria-pressed={variant==='valid'} onClick={()=>choose('valid')}>Modelo funcional</button>
      <button className="qb-seg__opt" type="button" aria-pressed={variant==='invalid'} onClick={()=>choose('invalid')}>Modelo decorativo</button>
    </div>
    <div className="nexo-instrument" style={{padding:12}}>
      <p>{variant==='valid'?'Alterar a taxa de amostragem mantendo a frequência da onda; observar o limite de Nyquist e aplicar a regra em novo cenário.':'Alterar a cor de uma moldura sem demonstrar a regra; responder com as pistas visuais ainda presentes.'}</p>
    </div>
    <button className="qb-btn qb-btn--secondary" type="button" onClick={()=>setShow(true)}><Icon name="list-checks" size={16}/>Executar avaliação</button>
    {show&&<div aria-live="polite" style={{display:'grid',gap:10}}>
      <strong style={{color:result.status==='blocked'?'var(--qb-ember)':'var(--qb-gold)'}}>{result.status==='blocked'?'Bloqueado':'Elegível para revisão humana'}</strong>
      {result.checks.map(c=><div key={c.id} style={{display:'flex',gap:8,alignItems:'flex-start'}}><Icon name={c.passed?'circle-check':'triangle-alert'} size={17} color={c.passed?'var(--qb-patina)':'var(--qb-ember)'}/><div><strong style={{fontSize:12}}>{c.label}</strong><p>{c.passed?c.why:c.issues.join(' ')}</p></div></div>)}
      <p>Fonte primária: conferência pendente. Publicação: bloqueada. O teste é local, sem gravação.</p>
    </div>}
  </section>;
}
