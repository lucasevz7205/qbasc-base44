import { mechanismDetail, mechanismForKey } from './cebraspe-v1-taxonomy.js';

export function recordedMechanism(trap, key, generatorName) {
  if (!mechanismForKey(trap?.code, key)) return null;
  const mechanism = mechanismDetail(trap.code);
  // Older GAN items used different definitions for some of the same codes.
  if (generatorName && generatorName.trim() !== mechanism.n) return null;
  return { code: mechanism.code, label: mechanism.n };
}

export function parseMechanismAssessment(reply, key) {
  let value;
  try {
    value = JSON.parse(String(reply ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  } catch {
    throw new Error('O Arquiteto retornou uma avaliação inválida. Tente novamente.');
  }
  const code = typeof value?.code === 'string' ? value.code.trim().toUpperCase() : value?.code;
  const reason = typeof value?.reason === 'string' ? value.reason.trim().slice(0, 900) : '';
  if (!reason || (code !== null && !mechanismForKey(code, key))) {
    throw new Error('O Arquiteto retornou uma classificação incompatível. Tente novamente.');
  }
  return { code, label: code ? mechanismDetail(code).n : null, reason };
}
