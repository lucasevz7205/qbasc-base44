import React from 'react';
import { MindMapCanvas } from '@/components/qb/mindmap/MindMapCanvas';
import { ConceptPanel } from '@/components/qb/mindmap/ConceptPanel';
import { useRealStudy } from '@/lib/qb-real-data';

export default function MindMapView({ selected, setSelected, returnTo, onReturn, go }) {
  const {QB_DATA:D}=useRealStudy();
  const chosen = D.mindMaps.find(m=>m.nodes.some(n=>n.id===selected)) || (selected==='__no_map__'?null:D.mindMaps[0]);
  const nodes=chosen?.nodes || [];
  const node = nodes.find(n => n.id === selected) || nodes[0];
  if(!node)return <section><p>Este tópico ainda não tem mapa mental.</p>{returnTo&&<button onClick={onReturn}>Voltar</button>}<select aria-label="Escolher mapa" value="" onChange={e=>setSelected(e.target.value)}><option value="" disabled>Escolher outro mapa</option>{D.mindMaps.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></section>;
  const c = D.concepts[node.id] || { summary: 'Nenhuma descrição registrada para este nó.' };
  const path = []; let p = nodes.find(n => n.id === node.parent);
  while (p) { path.unshift(p.label); p = nodes.find(n => n.id === p.parent); }
  const card = D.flashcards.filter(f => f.node === node.id).length;
  const expanded = nodes.filter(n=>!n.parent||n.parent===chosen.id).map(n=>n.id);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="qb-overline">Mapa mental</span>
          <h1 style={{ font: 'var(--type-h1)' }}>{chosen.title}</h1>
        </div>
        <select aria-label="Escolher mapa" value={chosen.id} onChange={e=>setSelected(e.target.value)}>{D.mindMaps.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 20, alignItems: 'stretch' }}>
        <MindMapCanvas key={chosen.id} nodes={nodes} selectedId={node.id} onSelect={setSelected} defaultExpanded={expanded} height={620} />
        <ConceptPanel key={node.id} title={node.label} path={path}
          mastery={node.mastery ? { state: node.mastery, text: D.masteryText[node.mastery] } : undefined}
          summary={c.summary} example={c.example} connections={c.connections || []} sources={c.sources || []}
          onNavigate={setSelected} reviewCount={card || undefined} onReview={() => go('flashcards',{topicId:chosen.topicId})}
          returnTo={returnTo && returnTo.label} onReturn={onReturn} style={{ height: 620 }} />
      </div>
    </div>
  );
}
export { MindMapView, MindMapView as MindMapScreen };
