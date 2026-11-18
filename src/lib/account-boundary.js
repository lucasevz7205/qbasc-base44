export const ACCOUNT_COLLECTION = 'qbasc-contas';
export const IMPORTABLE = ['edital', 'questoes', 'revisao', 'planejamento', 'materiais', 'pontos', 'pegadinhas'];
export const PERSONAL_WRITE = ['respostas', 'justificativas', 'cartoes_aval', 'planejamento', 'rodadas', 'simulados', 'diario'];
export const READABLE = [...new Set([...IMPORTABLE, ...PERSONAL_WRITE, 'config', 'curadoria'])];

export function canUseArchitect(user, profile) {
  return user?.role === 'admin' || Boolean(
    user?.role === 'user' && user.id && profile?.id === user.id &&
    profile.status === 'active' && profile.architectEnabled === true
  );
}

export function canReformulateQuestions(user, profile) {
  return user?.role === 'admin' || Boolean(
    user?.role === 'user' && user.id && profile?.id === user.id && profile.status === 'active'
  );
}

export function workspaceCollection(userId, collection) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(userId) || !READABLE.includes(collection)) throw new Error('Coleção inválida.');
  return 'qbasc-conta:' + userId + ':' + collection;
}

export function bankQuestion(question, topic) {
  const fields = ['code', 'ano', 'enunciado', 'comentario', 'justificativa', 'explicacao', 'ref', 'origem',
    'gabarito', 'mecanismo', 'mecanismoNome', 'tema', 'alternativas', 'evidencia', 'vacina'];
  const clean = Object.fromEntries(fields.flatMap(key => {
    const value = question[key];
    return typeof value === 'string' || typeof value === 'number' ? [[key, value]] : [];
  }));
  if (Array.isArray(question.alternativas)) clean.alternativas = question.alternativas.map(item =>
    typeof item === 'string' ? item : {
      letra: String(item?.letra || ''),
      texto: String(item?.texto || item?.enunciado || ''),
    });
  return { ...clean, id: 'banco-' + question.id, topico: topic.id, cap: topic.caps?.[0] || topic.id };
}

export function resetImportedDocument(collection, row) {
  if (collection === 'edital') return Object.fromEntries(
    ['id', 'materia', 'materiaOrdem', 'ordem', 'sigla', 'prova', 'num', 'titulo', 'caps', 'foraEdital']
      .filter(key => Object.hasOwn(row, key)).map(key => [key, row[key]])
  );
  if (collection === 'planejamento') return { ...row, status: 'planejada', segundos: 0, concluidaEm: null, iniciadoEm: null };
  return row;
}
