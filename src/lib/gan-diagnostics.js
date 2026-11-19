import { GeminiUnavailableError } from "./gemini-tutor.js";

const stageLabels = {
  contexto: 'Preparação do nó',
  configuracao: 'Configuração do GAN',
  gemini: 'Gerador Gemini',
  'gemini-discriminador': 'Julgamento cego Gemini',
  confronto: 'Conferência do julgamento',
  gravacao: 'Gravação',
  servidor: 'Comunicação com o servidor',
};

const defaultMessages = {
  contexto: 'Não foi possível preparar este nó para a geração.',
  configuracao: 'Não foi possível ler a configuração do GAN.',
  gemini: 'Não foi possível obter uma resposta válida do Gemini.',
  'gemini-discriminador': 'Não foi possível obter o julgamento cego do Gemini.',
  confronto: 'Não foi possível confirmar o julgamento dos itens.',
  gravacao: 'A gravação das questões aprovadas não foi confirmada.',
  servidor: 'O servidor não devolveu o resultado do GAN. Confira a conexão e tente novamente.',
};

export class GanStepError extends Error {
  constructor(codigo, message) {
    super(message);
    this.codigo = codigo;
  }
}

const geminiErrors = [
  ['Chave Gemini ausente.', 'chave-gemini-ausente', 'A configuração da chave do Gemini não chegou ao servidor. Confira o segredo Arquiteto.'],
  ['Modelo Gemini inválido.', 'modelo-gemini-invalido', 'Confira o identificador do modelo Gemini usado pelo Arquiteto.'],
  ['Gemini recusou a requisição.', 'gemini-recusou', 'O Gemini recusou a chamada. Confira a chave, o modelo e as permissões do projeto.'],
  ['Limite de uso do Gemini', 'gemini-limite', 'O Gemini atingiu o limite de uso (HTTP 429).'],
  ['O Gemini interrompeu a resposta', 'gemini-resposta-incompleta', 'O Gemini atingiu o limite de resposta antes de concluir.'],
  ['O Gemini não retornou texto.', 'gemini-sem-texto', 'O Gemini retornou uma resposta sem texto.'],
  ['Tempo limite do Gemini excedido.', 'gemini-tempo-limite', 'O Gemini excedeu o tempo limite.'],
];

const knownFailure = (etapa, err) => {
  if (err instanceof GanStepError) return [err.codigo, err.message];
  if (err instanceof GeminiUnavailableError) return ['gemini-http-503', err.message];
  if (etapa === 'gemini' || etapa === 'gemini-discriminador') {
    const message = typeof err?.message === 'string' ? err.message : '';
    const match = geminiErrors.find(([prefix]) => message.startsWith(prefix));
    if (match) return [match[1], match[2]];
    const http = /^Falha na API Gemini \(HTTP ([45]\d{2})\)/.exec(message)?.[1];
    if (http) return ['gemini-http-' + http, 'O Gemini retornou HTTP ' + http + '.'];
  }
  return [etapa + '-falhou', defaultMessages[etapa]];
};

export async function withGanDiagnostics(work) {
  let etapa = 'contexto';
  try {
    return await work(next => { etapa = next; });
  } catch (error) {
    const [codigo, mensagem] = knownFailure(etapa, error);
    // Use somente a etapa e o código controlado. As solicitações podem conter notas privadas.
    console.warn('[qbasc-gan]', etapa, codigo);
    return { falha: { etapa, codigo, mensagem } };
  }
}

export function ganFailureLabel(failure) {
  return (stageLabels[failure.etapa] || stageLabels.servidor) + ' · ' + failure.mensagem;
}

export function assertGanJudgments(judgments, count) {
  if (!Array.isArray(judgments) || judgments.length !== count ||
      judgments.some(j => !Number.isInteger(j?.index) || j.index < 0 || j.index >= count) ||
      new Set(judgments.map(j => j.index)).size !== count) {
    throw new GanStepError('julgamentos-incompletos', 'O Gemini não retornou um julgamento único para cada questão. Nenhum item deste nó foi salvo.');
  }
}
