import React from 'react';
import { PageHeader } from '@/components/qb/navigation/PageHeader';
import { Tabs } from '@/components/qb/navigation/Tabs';
import { Panel } from '@/components/qb/core/Panel';
import { Button } from '@/components/qb/core/Button';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { MindMapScreen } from '@/components/qb/screens/MindMapView';
import { useRealStudy } from '@/lib/qb-real-data';

const txt = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(txt).filter(Boolean).join('\n') : '';
const safeUrl = value => typeof value === 'string' && /^https?:\/\//i.test(value) ? value : undefined;
const hasResource = ({resources:r}) => r.questions || r.maps.length || r.cards || r.revision.length || r.materials.length;

function SourceRecord({ source }) {
  const href = safeUrl(source.url);
  const parts = [txt(source.descricao),txt(source.conteudo),txt(source.resumo),txt(source.referenceText)].filter(Boolean);
  return (
    <details>
      <summary>{source.titulo || source.tipo || 'Material de estudo'}</summary>
      {parts.map((body,index)=><p key={index} style={{whiteSpace:'pre-wrap'}}>{body}</p>)}
      {href && <a href={href} target="_blank" rel="noreferrer">Abrir referência</a>}
    </details>
  );
}

function ReviewRecord({ item }) {
  if(!item)return null;
  if(typeof item==='string')return <p>{item}</p>;
  const main=txt(item.regra||item.explicacao||item.texto||item.resposta||item.a);
  const example=txt(item.ex||item.exemplo);
  const trap=txt(item.trap||item.pegadinha);
  const title=txt(item.k||item.titulo||item.conceito||item.q||item.pergunta)||'Revisão';
  return (
    <details style={{padding:'8px 0',borderBottom:'1px solid var(--divider)'}}>
      <summary>{title}</summary>
      {main&&<p style={{whiteSpace:'pre-wrap'}}>{main}</p>}
      {example&&<p style={{whiteSpace:'pre-wrap'}}><strong>Exemplo</strong> · {example}</p>}
      {trap&&<p><strong>Pegadinha</strong> · {trap}</p>}
      {item.src&&<small>{txt(item.src)}</small>}
    </details>
  );
}

export default function StudyScreen({ tab = 'mapa', setTab, go, mapProps }) {
  const { QB_EDITAL, QB_DATA, QB_PLAN }=useRealStudy();
  const topics = QB_EDITAL.subjects.flatMap(s=>s.topics.map(t=>({...t,subject:s.name})));
  const selected = topics.find(t=>t.id===mapProps?.studyTopicId);
  const [filter,setFilter]=React.useState('');
  const normalized = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const search=normalized(filter.trim());
  const matching=topics.filter(t=>normalized(t.num+' '+t.title+' '+t.subject).includes(search));
  const byTopic = new Map();
  for(const card of QB_DATA.flashcards){if(!byTopic.has(card.topicId))byTopic.set(card.topicId,[]);byTopic.get(card.topicId).push(card);}
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <PageHeader overline="Estudo · teoria, mapas e revisão" title="Estudo" actions={<Tabs label="Ferramentas de estudo" value={tab} onChange={setTab} items={[{id:'mapa',label:'Mapas mentais',icon:'network'},{id:'recursos',label:'Materiais e revisão',icon:'book-open'},{id:'cards',label:'Flashcards',icon:'layers'}]} />} />
      {tab==='mapa' && <MindMapScreen {...mapProps} go={go} />}
      {tab==='recursos' && <>
        <Panel style={{display:'grid',gap:8}}>
          <label htmlFor="qb-topic-resources">Tópico do edital</label>
          <select id="qb-topic-resources" className="qb-input" value={selected?.id||''} onChange={e=>go('study',{topicId:e.target.value})}>
            <option value="" disabled>Escolher tópico</option>
            {topics.filter(t=>hasResource(t)||t.id===selected?.id).map(t=><option key={t.id} value={t.id}>{t.subject} · {t.num} {t.title}</option>)}
          </select>
        </Panel>
        {!selected ? <EmptyState title="Escolha um tópico" description="Veja os materiais e os itens de revisão importados para o seu edital."/> : <>
          <Panel style={{display:'grid',gap:12}}>
            <span className="qb-overline">{selected.subject}</span>
            <h2 style={{font:'var(--type-h2)'}}>{selected.num} {selected.title}</h2>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {selected.resources.questions>0&&<Button icon="target" onClick={()=>go('questions',{topicId:selected.id})}>{selected.resources.questions} questões</Button>}
              {selected.resources.cards>0&&<Button icon="layers" variant="secondary" onClick={()=>go('flashcards',{topicId:selected.id})}>{selected.resources.cards} flashcards</Button>}
              {selected.resources.maps.map(map=><Button key={map.id} icon="network" variant="secondary" onClick={()=>go('map',{topicId:selected.id,node:map.id})}>Mapa · {map.title}</Button>)}
            </div>
          </Panel>
          {selected.resources.revision.length>0&&<Panel><h3 style={{font:'var(--type-h2)'}}>Revisão ativa · {selected.resources.revision.length} itens</h3>{selected.resources.revision.map((item,i)=><ReviewRecord key={i} item={item}/>)}</Panel>}
          {selected.resources.materials.length>0&&<Panel><h3 style={{font:'var(--type-h2)'}}>Materiais e referências</h3>{selected.resources.materials.map(source=><SourceRecord key={source.id} source={source}/>)}</Panel>}
          {!hasResource(selected)&&<EmptyState title="Nenhum recurso vinculado a este tópico"/>}
        </>}
      </>}
      {tab==='cards' && <>
        <label style={{display:'grid',gap:6}}>Buscar baralho no edital<input className="qb-input" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Matéria, número ou assunto"/></label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:14}}>
          {matching.filter(t=>t.resources.cards>0).map(t=>{
            const deck=byTopic.get(t.id)||[];
            const available=deck.filter(c=>{const next=QB_DATA.reviews[c.id]?.prox;return !next||next<=QB_PLAN.today;}).length;
            return <Panel key={t.id} style={{display:'grid',gap:10,alignContent:'start'}}>
              <span className="qb-overline">{t.subject}</span>
              <h3 style={{font:'var(--type-h2)'}}>{t.num} {t.title}</h3>
              <span>{deck.length} flashcards · {available} disponíveis para revisar</span>
              <Button icon="play" onClick={()=>go('flashcards',{topicId:t.id})}>Abrir baralho</Button>
            </Panel>;
          })}
        </div>
        {!matching.some(t=>t.resources.cards>0)&&<EmptyState title="Nenhum baralho encontrado"/>}
      </>}
    </div>
  );
}
export { StudyScreen };
