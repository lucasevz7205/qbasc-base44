export const PLAN_SETTINGS_ID = 'qbasc-preferencias-planejamento';

const bounded = (value, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(0, Number(value))) : 0;

export function planSettings(raw = {}) {
  const cycle = Array.isArray(raw.cycle) ? raw.cycle.filter(block =>
    typeof block?.subjectId === 'string' && block.subjectId && typeof block.name === 'string'
  ).map(block => ({ subjectId: block.subjectId, name: block.name, minutes: Math.max(15, Math.round(bounded(block.minutes, 1440))) })) : [];
  return {
    mode: raw.mode === 'cycle' ? 'cycle' : 'weekly',
    hours: Array.from({ length: 7 }, (_, index) => bounded(raw.hours?.[index], 24)),
    cycle,
    currentSubjectId: cycle.find(block => block.subjectId === raw.currentSubjectId)?.subjectId || cycle[0]?.subjectId || null,
  };
}

export function advanceCycle(settings) {
  const { cycle, currentSubjectId } = settings;
  if (!cycle.length) return settings;
  const current = cycle.findIndex(block => block.subjectId === currentSubjectId);
  return { ...settings, currentSubjectId: cycle[(current + 1) % cycle.length].subjectId };
}

export function taskRecord(task, fields, timestamp) {
  const raw = task?.raw || { status: 'planejada', origem: 'qbasc', criadoEm: timestamp };
  const result = { ...raw, ...fields, atualizadoEm: timestamp };
  if (fields.materia !== undefined && fields.materia !== raw.materia) {
    delete result.topico;
    delete result.topicId;
  }
  return result;
}
