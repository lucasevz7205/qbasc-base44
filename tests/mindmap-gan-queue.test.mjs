import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { URL } from 'node:url';
import { buildGanSource, findNodesWithoutQuestions, runGanQueue } from '../src/lib/gan-queue.js';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@/lib/auth-middleware') return { shortCircuit: true, url: 'data:text/javascript,export const requireUser = null;' };
    if (specifier === '@tanstack/react-start') {
      const stub = 'export const createServerFn = () => ({ middleware() { return this; }, validator() { return this; }, handler(fn) { return fn; } });';
      return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(stub) };
    }
    if (specifier.startsWith('@/lib/')) return next(new URL('../src/' + specifier.slice(2) + (specifier.endsWith('.js') ? '' : '.js'), import.meta.url).href, context);
    if (specifier === './account-boundary' && context.parentURL?.endsWith('/study-accounts.js')) return next(specifier + '.js', context);
    return next(specifier, context);
  },
});
const { preparePersonalMapGan, prepareGanSourcePassages, approvePersonalMapGan, savePersonalNodeFlashcard } = await import('../src/lib/study-accounts.js');
const { adaptStudy } = await import('../src/lib/qb-real-model.js');
hooks.deregister();

function fixture() {
  const db = [];
  const add = (collection, legacy_id, value) => db.push({ collection, legacy_id, payload_json: JSON.stringify(value) });
  for (const id of ['lucas', 'outro']) {
    add('qbasc-contas', id, { status: 'active' });
    add('qbasc-conta:' + id + ':edital', id + '-t', { materia: 'Matéria de ' + id, titulo: 'Assunto' });
    add('qbasc-conta:' + id + ':revisao', 'importacao', {
      topico: id + '-t',
      mapa: { centro: 'Mapa', ramos: [{ t: 'Nó de ' + id, x: 'Conceito registrado no mapa da conta ' + id }] },
    });
  }
  const entities = {
    ClaudeDocument: {
      async filter(query) { return db.filter(row => Object.entries(query).every(([k, v]) => row[k] === v)); },
      async create(row) { db.push(row); },
    },
  };
  const context = { user: { role: 'user', id: 'lucas' }, getBase44: () => ({ asServiceRole: { entities } }) };
  return { db, context, add };
}

test('GAN individual usa o nó da própria conta e guarda propostas até a aprovação humana', async () => {
  const { db, context } = fixture();
  const input = { topicId: 'lucas-t', targetNodeId: 'lucas-t::importacao::0.0', targetNodeLabel: 'falsificado', sourceContext: 'falsificado' };
  const gan = await preparePersonalMapGan(context, input);
  assert.equal(gan.data.targetNodeLabel, 'Nó de lucas');
  assert.equal(gan.data.mapa.nodes[0].id, input.targetNodeId);
  assert.match(gan.data.sourceContext, /mapa da conta lucas/);
  assert.doesNotMatch(JSON.stringify(gan.data), /falsificado|outro/);
  await assert.rejects(preparePersonalMapGan(context, { ...input, topicId: 'outro-t' }), /não pertence/);
  await assert.rejects(preparePersonalMapGan(context, { ...input, targetNodeId: 'outro-t::importacao::0.0' }), /não pertence/);
  const questionId = 'gan-00000000-0000-4000-8000-000000000001';
  const reviewId = await gan.stage([
    { id: questionId, statusConfronto: 'divergencia_bloqueada', enunciado: 'Versão automática', gabarito: 'E', mapaNoId: input.targetNodeId },
  ]);
  assert.equal(db.filter(row => row.collection.endsWith('questoes')).length, 0);
  const draft = {
    statement: 'A administração deve observar as normas que regem seus atos.',
    key: 'C', mecanismo: 'V1', explanation: 'Essa é a regra geral.', trechoDecisivo: 'A administração observa as normas.',
    correcaoMinima: '',
  };
  const data = { topicId: input.topicId, targetNodeId: input.targetNodeId, questionId, reviewId, draft };
  await assert.rejects(approvePersonalMapGan({ context: { ...context, user: { role: 'user', id: 'outro' } },
    data: { ...data, topicId: 'outro-t', targetNodeId: 'outro-t::importacao::0.0' } }), /não pertence/);
  const record = await approvePersonalMapGan({ context, data });
  assert.deepEqual(await approvePersonalMapGan({ context, data }), JSON.parse(JSON.stringify(record)));
  assert.equal(record.id, questionId);
  assert.equal(record.mapaNoId, input.targetNodeId);
  assert.equal(record.statusConfronto, 'aprovada_manual');
  assert.equal(record.correcaoMinima, '');
  assert.deepEqual(db.filter(row => row.collection.endsWith('questoes')).map(row => [row.collection, row.legacy_id]), [
    ['qbasc-conta:lucas:questoes', questionId],
  ]);
});

test('flashcard aprovado pertence ao nó e à conta, com gravação idempotente', async () => {
  const { db, context } = fixture();
  const targetNodeId = 'lucas-t::importacao::0.0';
  const input = {
    topicId: 'lucas-t', targetNodeId, cardId: 'node-card-00000000-0000-4000-8000-000000000001',
    front: 'Que regra o nó apresenta?', back: 'A regra documentada no resumo.',
  };
  await assert.rejects(savePersonalNodeFlashcard({ context, data: { ...input, targetNodeId: 'outro-t::importacao::0.0' } }), /não pertence/);
  const record = await savePersonalNodeFlashcard({ context, data: input });
  assert.deepEqual(await savePersonalNodeFlashcard({ context, data: input }), record);
  const own = collection => db.filter(row => row.collection === 'qbasc-conta:lucas:' + collection)
    .map(row => ({ ...JSON.parse(row.payload_json), id: row.legacy_id }));
  const { QB_DATA } = adaptStudy({ edital: own('edital'), revisao: own('revisao') });
  assert.equal(QB_DATA.flashcards[0].node, targetNodeId);
  assert.equal(QB_DATA.flashcards[0].id, input.cardId);
  assert.equal(db.filter(row => row.legacy_id === input.cardId).length, 1);
});

test('GAN individual recusa conta suspensa', async () => {
  const { db, context } = fixture();
  db.find(row => row.collection === 'qbasc-contas' && row.legacy_id === 'lucas').payload_json = '{"status":"suspended"}';
  await assert.rejects(preparePersonalMapGan(context, { topicId: 'lucas-t', targetNodeId: 'lucas-t::importacao::0.0' }), /indisponível/);
});

test('fila seleciona apenas folhas elegíveis, pausa entre nós e nunca grava itens bloqueados', async () => {
  const root = { id: 'root', label: 'Mapa' };
  const nodes = [root, ...Array.from({ length: 7 }, (_, i) => ({ id: 'n' + i, label: 'Nó ' + i, parent: 'root' }))];
  const concepts = Object.fromEntries(nodes.map(node => [node.id, { summary: 'Explicação extensa o bastante para ser usada na geração dos itens.' }]));
  const pending = findNodesWithoutQuestions({
    rootId: root.id, nodes, concepts, questionBank: [{ node: 'n0' }, { mapaNoId: 'n0' }],
  });
  assert.deepEqual(pending.map(node => node.id), ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
  const writes = [];
  const report = await runGanQueue({
    chosen: { id: root.id, title: 'Mapa', topicId: 'topico' },
    pending,
    generate: async node => ({
      aprovadas: [{ id: node.id, statusConfronto: 'refinada_gan' }, { id: 'incoerente', statusConfronto: 'divergencia_bloqueada' }],
      bloqueadas: [{ id: 'incoerente' }],
    }),
    save: async (collection, id) => { writes.push([collection, id]); },
    shouldStop: () => writes.length === 2,
  });
  assert.deepEqual(writes, [['questoes', 'n1'], ['questoes', 'n2']]);
  assert.deepEqual(report, { processados: 2, aprovadas: 2, bloqueadas: 2, erros: 0, restantes: 4 });
  assert.equal(buildGanSource({ chosen: { ...root, title: 'Mapa' }, nodes, concepts, node: nodes.at(-1) }).mapa.nodes[0].id, 'n6');
});

test('fila distingue falha na geração e falha no julgamento Gemini, preservando os nós pendentes', async () => {
  const pending = [{ id: 'a', label: 'Nó A' }, { id: 'b', label: 'Nó B' }, { id: 'c', label: 'Nó C' }];
  const visited = [];
  const config = { etapa: 'gemini', codigo: 'modelo-gemini-invalido', mensagem: 'Modelo inválido' };
  const reviewFailure = { etapa: 'gemini-discriminador', codigo: 'gemini-json-invalido', mensagem: 'JSON inválido' };
  const report = await runGanQueue({
    pending,
    chosen: { topicId: 't', title: 'Mapa' },
    generate: async node => {
      visited.push(node.id);
      return { falha: node.id === 'a' ? config : reviewFailure };
    },
    save: async () => { assert.fail('O nó que falhou não pode gravar questões.'); },
  });
  assert.deepEqual(visited, ['a', 'b']);
  assert.deepEqual(report, {
    processados: 2, aprovadas: 0, bloqueadas: 0, erros: 2, restantes: 3,
    falhas: [{ no: 'Nó A', ...config }, { no: 'Nó B', ...reviewFailure }],
  });
});

test('fila pessoal conta apenas questões cuja gravação foi confirmada', async () => {
  const report = await runGanQueue({
    pending: [{ id: 'a', label: 'Nó A' }], chosen: { topicId: 't', title: 'Mapa' },
    generate: async () => ({
      bloqueadas: [],
      aprovadas: [{ id: 'gravada', statusConfronto: 'aprovada_gan' }, { id: 'pendente', statusConfronto: 'aprovada_gan' }],
      registros: [{ id: 'gravada' }],
    }),
  });
  assert.equal(report.aprovadas, 1);
  assert.equal(report.restantes, 1);
  assert.equal(report.falhas[0].etapa, 'gravacao');
});

test('reprovação no confronto restabelece a fila após erro e não conta como falha de provedor', async () => {
  const pending = ['a', 'b', 'c'].map(id => ({ id, label: id }));
  const report = await runGanQueue({
    pending, chosen: { topicId: 't', title: 'Mapa' },
    generate: async node => {
      if (node.id === 'a') throw new Error('Mensagem interna');
      if (node.id === 'b') return { aprovadas: [], bloqueadas: [{ id: 'blocked' }] };
      return { aprovadas: [{ id: 'ok', statusConfronto: 'aprovada_gan' }], bloqueadas: [], registros: [{ id: 'ok' }] };
    },
  });
  assert.equal(report.processados, 3);
  assert.deepEqual([report.erros, report.bloqueadas, report.aprovadas, report.restantes], [1, 1, 1, 1]);
  assert.equal(report.falhas[0].etapa, 'servidor');
  assert.doesNotMatch(report.falhas[0].mensagem, /Mensagem interna/);
});

test('fila pausa no primeiro 503 do Gemini e preserva questões já gravadas e nós pendentes', async () => {
  const pending = ['a', 'b', 'c', 'd'].map(id => ({ id, label: id }));
  const visited = [];
  const writes = [];
  const unavailable = { etapa: 'gemini', codigo: 'gemini-http-503', mensagem: 'Indisponível' };
  const report = await runGanQueue({
    chosen: { topicId: 't', title: 'Mapa' },
    pending,
    maxNodes: 3,
    generate: async node => {
      visited.push(node.id);
      if (node.id === 'b') return { falha: unavailable };
      return { aprovadas: [{ id: node.id, statusConfronto: 'aprovada_gan' }], bloqueadas: [] };
    },
    save: async (_collection, id) => { writes.push(id); },
  });
  assert.deepEqual(visited, ['a', 'b']);
  assert.deepEqual(writes, ['a']);
  assert.deepEqual(report, {
    processados: 2, aprovadas: 1, bloqueadas: 0, erros: 1, restantes: 3,
    falhas: [{ no: 'b', ...unavailable }],
  });
});

test('fila grava a procedência Gemini apenas nos itens aprovados', async () => {
  const writes = [];
  const report = await runGanQueue({
    chosen: { topicId: 't', title: 'Mapa' },
    pending: [{ id: 'a', label: 'A' }],
    generate: async () => ({
      aprovadas: [{ id: 'ok', statusConfronto: 'aprovada_gan', provedorGerador: 'gemini', provedorDiscriminador: 'gemini' }],
      bloqueadas: [{ id: 'bloqueada', statusConfronto: 'divergencia_bloqueada', provedorGerador: 'gemini', provedorDiscriminador: 'gemini' }],
    }),
    save: async (_collection, _id, record) => { writes.push(record); },
  });
  assert.equal(report.aprovadas, 1);
  assert.deepEqual(writes.map(record => [record.id, record.provedorGerador, record.provedorDiscriminador]), [['ok', 'gemini', 'gemini']]);
  assert.ok(writes[0].tags.includes('Geração e revisão pelo Gemini'));
});

test('fila pausa quando a quota Gemini impede o julgamento cego', async () => {
  const pending = [{ id: 'a', label: 'Nó A' }, { id: 'b', label: 'Nó B' }];
  const visited = [];
  const quota = { etapa: 'gemini-discriminador', codigo: 'gemini-limite', mensagem: 'Limite de uso (429)' };
  const report = await runGanQueue({
    chosen: { topicId: 't', title: 'Mapa' }, pending,
    generate: async node => {
      visited.push(node.id);
      return { falha: quota };
    },
    save: async () => assert.fail('sem julgamento não pode gravar'),
  });
  assert.deepEqual(visited, ['a']);
  assert.equal(report.restantes, 2);
  assert.deepEqual(report.falhas, [{ no: 'Nó A', ...quota }]);
});

test('consulta do acervo do servidor mantém a separação entre administrador e contas', async () => {
  const calls = [];
  const original = { id: 'texto-t', topicos: ['t'], titulo: 'Regulamento',
    referenceText: 'Compete ao dirigente autorizar a despesa.' };
  const request = { topicId: 't', targetNodeLabel: 'Competência' };
  const context = id => ({
    user: id ? { role: 'user', id } : { role: 'admin' },
    getBase44: () => ({ asServiceRole: { entities: {
      ClaudeDocument: { filter: async query => {
        calls.push(query.collection);
        return [{ collection: query.collection, legacy_id: original.id, payload_json: JSON.stringify(original) }];
      } },
    } } }),
  });
  assert.equal((await prepareGanSourcePassages(context(), request))[0].texto, original.referenceText);
  assert.equal((await prepareGanSourcePassages(context('lucas'), request))[0].texto, original.referenceText);
  assert.deepEqual(calls, ['materiais', 'qbasc-conta:lucas:materiais']);
  assert.ok(calls.every(collection => !/respostas|cartoes_aval|rodadas/.test(collection)));
});
