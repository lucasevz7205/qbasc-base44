import { CEBRASPE_MECHANISMS } from './mindmap-gan.js';

export const ERROR_ORIGINS = {
  recuperacao: 'Não lembrei',
  interferencia: 'Confundi com outra regra',
  leitura: 'Li rápido demais',
  compreensao: 'Não entendi o conceito',
};

const LEGACY_MECHANISMS = {
  F1: ['Generalização', 'Procure a exceção que a palavra absoluta apaga.'],
  F2: ['Restrição indevida', 'Pergunte se a fonte admite outro caso.'],
  F3: ['Troca de conceito', 'Confirme se o termo-chave é exatamente o da regra.'],
  F4: ['Detalhe alterado', 'Confira números, prazos e detalhes diretamente na fonte.'],
  F5: ['Regra × exceção', 'Enuncie a regra e confira se o item respeita a ressalva.'],
  F6: ['Relação lógica alterada', 'Confira a ligação entre as partes da frase.'],
  F7: ['Extrapolação', 'Verifique se a conclusão decorre necessariamente da fonte.'],
  F8: ['Fonte superada', 'Confira a fonte e se ela ainda vale.'],
  F9: ['Composição', 'Julgue cada parte da assertiva separadamente.'],
  F10: ['Reescrita', 'Teste sentido e gramática separadamente.'],
  V1: ['Paráfrase fiel', 'Compare o sentido e a equivalência dos termos.'],
  V2: ['Incompleto não é errado', 'Verifique se o item afirma que o caso citado é o único.'],
  V3: ['Alcance verdadeiro', 'Confira se a regra admite exceções.'],
  V4: ['Exceção real', 'Verifique se o caso está previsto como ressalva.'],
};

const clean = value => typeof value === 'string' ? value.trim() : '';

export function mechanismOptions(answer, gan = false) {
  const prefix = answer === 'C' ? 'V' : answer === 'E' ? 'F' : null;
  if (!prefix) return [];
  return Object.keys(LEGACY_MECHANISMS).filter(code => code.startsWith(prefix)).map(code => ({
    value: code,
    label: code + ' · ' + (gan ? CEBRASPE_MECHANISMS[code] : LEGACY_MECHANISMS[code][0]),
  }));
}

export function questionTrap(question, legacy) {
  const direct = question.mecanismo;
  const code = clean(direct || legacy?.mecanismo).toUpperCase();
  const explicitName = clean(question.mecanismoNome);
  const legacyDefinition = explicitName ? undefined : LEGACY_MECHANISMS[code];
  const name = [code, explicitName || legacyDefinition?.[0]].filter(Boolean).join(' · ') || clean(question.trap?.name);
  if (!name) return undefined;
  return {
    name,
    code: LEGACY_MECHANISMS[code] ? code : undefined,
    description: clean(question.trap?.description) || clean(question.correcaoMinima),
    vaccine: clean(question.vacina) || (!direct ? clean(legacy?.vacina) : '') || legacyDefinition?.[1],
    evidence: clean(question.evidencia) || (!direct ? clean(legacy?.evidencia) : ''),
  };
}

export function recordErrorReflection(response, { text, origin, marked, attemptAt }) {
  const note = clean(text);
  if (!response || !attemptAt || !note || !Object.hasOwn(ERROR_ORIGINS, origin)) return response;
  const previous = Array.isArray(response.justificativas) ? response.justificativas : [];
  if (previous.some(entry => entry?.tentativaEm === attemptAt)) return response;
  return {
    ...response,
    ...(response.atualizadoEm === attemptAt ? { origem: origin } : {}),
    nota: clean(response.nota) ? response.nota : note,
    justificativas: [...previous, { em: new Date().toISOString(), texto: note, origem: origin, marcada: marked, tentativaEm: attemptAt }],
  };
}
