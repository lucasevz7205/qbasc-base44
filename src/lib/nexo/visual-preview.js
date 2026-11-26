// Read-only preview of existing structural relationships; no learning state or inference.
export function visualNeighborhood(kit, selectedId, limit=5) {
  if(!kit||!Array.isArray(kit.concepts)||!Array.isArray(kit.structuralLinks))return null;
  const ids=new Map(kit.concepts.map(c=>[c.id,c]));
  const selected=ids.get(selectedId);
  if(!selected)return null;
  const related=new Map();
  for(const link of kit.structuralLinks) {
    if(!['tree-placement','existing-crosslink'].includes(link.kind))continue;
    const other=link.from===selectedId?link.to:link.to===selectedId?link.from:null;
    if(!other||other===selectedId||!ids.has(other)||related.has(other))continue;
    related.set(other,{...ids.get(other),relation:link.kind==='tree-placement'?(link.from===selectedId?'Subramo existente':'Ramo superior'):'Ligação transversal existente'});
  }
  const activities=(kit.activities||[]).filter(a=>a.conceptId===selectedId);
  return {selected,neighbors:[...related.values()].slice(0,Math.max(1,Math.min(5,limit))),total:related.size,
    questions:activities.filter(a=>a.kind==='question').length,cards:activities.filter(a=>a.kind==='flashcard').length,
    references:[...new Set(activities.map(a=>a.reference).filter(Boolean))]};
}
