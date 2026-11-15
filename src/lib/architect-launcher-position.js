export const LAUNCHER_STORAGE_KEY = "qbasc-architect-launcher-position-v1";
export function clampLauncherPosition(position, viewport, size = { width: 170, height: 52 }) {
  const pad = 12;
  const xMax = Math.max(pad, Number(viewport.width || 0) - Number(size.width || 0) - pad);
  const yMin = Math.min(80, Math.max(pad, Number(viewport.height || 0) - Number(size.height || 0) - pad));
  const yMax = Math.max(yMin, Number(viewport.height || 0) - Number(size.height || 0) - pad);
  const x = Number.isFinite(Number(position?.x)) ? Number(position.x) : pad;
  const y = Number.isFinite(Number(position?.y)) ? Number(position.y) : yMin;
  return {
    x: Math.round(Math.min(xMax, Math.max(pad, x))),
    y: Math.round(Math.min(yMax, Math.max(yMin, y))),
  };
}
export function defaultLauncherPosition(viewport, size) {
  return clampLauncherPosition({ x: 16, y: Math.round(Number(viewport.height || 700) * .55) }, viewport, size);
}
