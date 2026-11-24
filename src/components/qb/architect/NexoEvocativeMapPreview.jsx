import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import StudyTopicPicker from '@/components/qb/study/StudyTopicPicker';
import inventory from '../../../../docs/nexo/source-inventory.json';
import { visualNeighborhood } from '@/lib/nexo/visual-preview';
import './nexo-visual-lab.css';

const modes=[{id:'map',label:'Explorar',icon:'network'},{id:'recall',label:'Evocar',icon:'brain'},{id:'coverage',label:'Cobertura',icon:'chart-column'}];
const positions=[[13,26],[87,26],[13,73],[87,73],[50,88]];

function AssociationStage({data,hidden,onSelect}) {
  return <div className="nexo-stage">
    <div className="nexo-stage-label"><Icon name="network" size={15}/> ESTRUTURA DO MAPA ORIGINAL</div>
    <svg className="nexo-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <ellipse cx="50" cy="48" rx="39" ry="34" fill="none" stroke="var(--divider)" strokeDasharray="1 2"/>
      <ellipse cx="50" cy="48" rx="26" ry="24" fill="none" stroke="var(--divider)" strokeDasharray="1 3"/>
      {data.neighbors.map((n,i)=><line key={n.id} x1="50" y1="48" x2={positions[i][0]} y2={positions[i][1]} stroke="var(--qb-gold)" strokeOpacity=".6" strokeWidth=".3"/>)}
    </svg>
    <div className="nexo-focus"><Icon name="astrolabe" size={34}/><span>{data.selected.label}</span></div>
    {data.neighbors.map((n,i)=><button type="button" key={n.id} className="nexo-node" style={{left:positions[i][0]+'%',top:positions[i][1]+'%'}} disabled={hidden} onClick={()=>onSelect(n.id)} aria-label={hidden?'Conceito oculto':n.label}>
      <span>{hidden?'?':n.label}</span>
      {!hidden&&<small>{n.relation}</small>}
    </button>)}
    {!data.neighbors.length&&<span className="nexo-no-neighbors">Nenhuma conexão estrutural registrada.</span>}
  </div>;
}

export default function NexoEvocativeMapPreview({subjects=[],topicId,topicLabel,nodeId,onTopicChange}) {
  const allowed=subjects.some(s=>s.topics?.some(t=>t.id===topicId));
  const kit=allowed?inventory.kits.find(k=>k.topicId===topicId):null;
  const [chosen,setChosen]=React.useState(null);
  const [mode,setMode]=React.useState('map');
  const [revealed,setRevealed]=React.useState(false);
  const [attempt,setAttempt]=React.useState('');
  const selected=kit?.concepts.find(c=>c.id===chosen)||kit?.concepts.find(c=>c.mapNodeId===nodeId)||kit?.concepts[0];
  const data=visualNeighborhood(kit,selected?.id);
  const select=id=>{setChosen(id);setRevealed(false);setAttempt('');};
  const changeMode=id=>{setMode(id);setRevealed(false);setAttempt('');};
  const hidden=mode==='recall'&&!revealed;
  return <section className="nexo-lab" aria-label="Laboratório Visual NEXO">
    <header className="nexo-intro">
      <div className="nexo-emblem"><Icon name="network" size={27}/></div>
      <div><span className="qb-overline">O ARQUITETO · NEXO</span><h2>Laboratório Visual</h2><p>Explore o conhecimento, conecte conceitos e pratique a evocação.</p></div>
      <span className="qb-badge qb-badge--gold">Prévia privada</span>
    </header>
    <StudyTopicPicker label="Matéria e assunto" subjects={subjects} value={topicId} onSelect={onTopicChange}/>
    <div className="nexo-notice"><Icon name="info" size={16}/><span>Conteúdo do kit existente, ainda não homologado pelo NEXO. As relações abaixo são estruturais, não pré-requisitos validados. Nenhuma atividade é gravada.</span></div>
    {!data?<div className="nexo-empty"><Icon name="network" size={36}/><h3>Selecione um assunto com kit disponível</h3><p>Não há inventário NEXO para {topicLabel||'este assunto'}. Não serão inventadas relações para preencher a tela.</p><p>Assuntos disponíveis: {subjects.flatMap(s=>s.topics||[]).filter(t=>inventory.kits.some(k=>k.topicId===t.id)).map(t=>t.title||t.id).join(' · ')||'nenhum neste edital'}.</p></div>:<>
      <label className="nexo-select">Conceito em foco<select value={selected.id} onChange={e=>select(e.target.value)}>{kit.concepts.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
      <div className="qb-seg nexo-modes" role="group" aria-label="Modo do laboratório">{modes.map(m=><button type="button" key={m.id} className="qb-seg__opt" aria-pressed={mode===m.id} onClick={()=>changeMode(m.id)}><Icon name={m.icon} size={16}/>{m.label}</button>)}</div>
      <div className="nexo-workbench">
        <div className="nexo-visual">
          {mode==='coverage'?<div className="nexo-chart"><span className="qb-overline">COBERTURA DO CONCEITO</span><h3>{selected.label}</h3><p>Contagens de atividades vinculadas no kit, não desempenho.</p>{[{label:'Questões',value:data.questions},{label:'Flashcards',value:data.cards}].map(row=><div className="nexo-bar-row" key={row.label}><span>{row.label}</span><div className="nexo-bar"><div style={{width:(100*row.value/Math.max(1,data.questions,data.cards))+'%'}}/></div><strong>{row.value}</strong></div>)}</div>:<AssociationStage data={data} hidden={hidden} onSelect={select}/>}
          {mode==='recall'&&<div className="nexo-recall"><label htmlFor="nexo-recall">Quais conceitos estão conectados a este nó no mapa?</label><textarea id="nexo-recall" className="qb-textarea" value={attempt} onChange={e=>setAttempt(e.target.value)} placeholder="Escreva de memória. Esta tentativa não será armazenada." maxLength={2000}/><button type="button" className="qb-btn qb-btn--secondary" disabled={!attempt.trim()&&!revealed} onClick={()=>setRevealed(!revealed)}><Icon name={revealed?'eye-off':'eye'} size={16}/>{revealed?'Ocultar conexões':'Conferir conexões'}</button></div>}
        </div>
        <aside className="nexo-detail">
          <span className="qb-overline">CONCEITO SELECIONADO</span><h3>{selected.label}</h3>
          {!hidden&&<><div className="nexo-metrics"><div><strong>{data.questions}</strong><small>Questões</small></div><div><strong>{data.cards}</strong><small>Flashcards</small></div><div><strong>{data.total}</strong><small>Conexões</small></div></div>
          <span className="qb-overline">CONEXÕES EXISTENTES</span>
          <div className="nexo-related">{data.neighbors.map(n=><button type="button" key={n.id} onClick={()=>select(n.id)}><span>{n.label}<small>{n.relation}</small></span><Icon name="chevron-right" size={15}/></button>)}</div>
          {data.total>data.neighbors.length&&<small>Mostrando {data.neighbors.length} de {data.total} conexões. Use o seletor para navegar.</small>}
          </>}
          <details className="nexo-sources"><summary>Origem e rastreabilidade</summary><p>{selected.source.sourceId}</p><p>Nó: {selected.source.locator}</p>{!hidden&&data.references.slice(0,5).map(ref=><p key={ref}>{ref}</p>)}<small>Referências preservadas do kit; validação primária pendente.</small></details>
        </aside>
      </div>
      <footer className="nexo-future"><Icon name="lock" size={16}/><span>Modelos funcionais, linhas do tempo e comparações fundamentadas serão habilitados após curadoria. O agendamento atual permanece independente.</span></footer>
    </>}
  </section>;
}
export {NexoEvocativeMapPreview};
