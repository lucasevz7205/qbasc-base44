// Regras do arrasto (pan) do canvas do mapa mental, sem dependência de React.
// O arrasto só começa com o botão primário e termina sempre que o ponteiro
// deixa de estar pressionado (pointerup, pointercancel, perda de captura,
// menu de contexto ou pointermove sem botão), para o cursor nunca ficar preso.

export function startDrag(e, pan) {
  if (e.button !== undefined && e.button !== 0) return null;
  return { x: e.clientX - pan.x, y: e.clientY - pan.y };
}

// Retorna { drag, pan }: drag null encerra o arrasto; pan só vem quando há movimento válido.
export function moveDrag(drag, e) {
  if (!drag) return { drag: null, pan: null };
  if (e.buttons === 0) return { drag: null, pan: null };
  return { drag, pan: { x: e.clientX - drag.x, y: e.clientY - drag.y } };
}
