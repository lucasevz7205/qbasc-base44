// Reusable one-to-one matching engine. Author-provided mappings, not inferred facts.
export function validPuzzle(p){
  if(!p||!Array.isArray(p.slots)||!Array.isArray(p.pieces)||!p.slots.length||p.slots.length>24||p.pieces.length<p.slots.length||p.pieces.length>24)return false;
  const validId=id=>typeof id==='string'&&/^[a-z0-9_-]+$/.test(id);
  const ids=p.pieces.map(x=>x.id),slots=p.slots.map(x=>x.id),expected=p.slots.map(x=>x.expected);
  return [...ids,...slots].every(validId)&&new Set(ids).size===ids.length&&new Set(slots).size===slots.length&&new Set(expected).size===expected.length&&expected.every(id=>ids.includes(id))&&p.pieces.every(x=>typeof x.label==='string'&&x.label.trim())&&p.slots.every(x=>typeof x.label==='string'&&x.label.trim()&&typeof x.explanation==='string'&&x.explanation.trim());
}
export function placePiece(p,placements,slotId,pieceId){
  if(!validPuzzle(p)||!p.slots.some(s=>s.id===slotId)||!p.pieces.some(x=>x.id===pieceId))return {...placements};
  return {...Object.fromEntries(Object.entries(placements||{}).filter(([s,v])=>p.slots.some(x=>x.id===s)&&p.pieces.some(x=>x.id===v)&&v!==pieceId&&s!==slotId)),[slotId]:pieceId};
}
export function evaluatePuzzle(p,placements){
  if(!validPuzzle(p))throw Error('Invalid association puzzle');
  const seen=new Set();
  const checks=p.slots.map(s=>{
    const piece=placements?.[s.id],valid=p.pieces.some(x=>x.id===piece)&&!seen.has(piece);
    if(valid)seen.add(piece);
    return {slotId:s.id,pieceId:piece||null,correct:valid&&piece===s.expected,filled:valid,expected:s.expected,explanation:s.explanation};
  });
  return {checks,status:checks.every(c=>c.correct)?'correct':checks.every(c=>c.filled)?'incorrect':'incomplete',correctCount:checks.filter(c=>c.correct).length,total:p.slots.length};
}
