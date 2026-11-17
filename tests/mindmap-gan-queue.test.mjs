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
const { preparePersonalMapGan } = await import('../src/lib/study-accounts.js');
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

test('GAN individual usa o nó registrado na conta, salva aprovadas no acervo próprio e rejeita acesso cruzado', async () => {
  const { db, context } = fixture();
  const input = { topicId: 'lucas-t', targetNodeId: 'lucas-t::importacao::0.0', targetNodeLabel: 'falsificado', sourceContext: 'falsificado' };
  const gan = await preparePersonalMapGan(context, input);
  assert.equal(gan.data.targetNodeLabel, 'Nó de lucas');
  assert.equal(gan.data.mapa.nodes[0].id, input.targetNodeId);
  assert.match(gan.data.sourceContext, /mapa da conta lucas/);
  assert.doesNotMatch(JSON.stringify(gan.data), /falsificado|outro/);
  await assert.rejects(preparePersonalMapGan(context, { ...input, topicId: 'outro-t' }), /não pertence/);
  await assert.rejects(preparePersonalMapGan(context, { ...input, targetNodeId: 'outro-t::importacao::0.0' }), /não pertence/);
  const records = await gan.persist([
    { id: 'gan-ok', statusConfronto: 'aprovada_gan', enunciado: 'Enunciado', gabarito: 'C', mapaNoId: input.targetNodeId },
    { id: 'gan-blocked', statusConfronto: 'divergencia_bloqueada' },
  ]);
  assert.deepEqual(records.map(row => row.id), ['gan-ok']);
  assert.equal(records[0].mapaNoId, input.targetNodeId);
  assert.deepEqual(db.filter(row => row.collection.endsWith('questoes')).map(row => [row.collection, row.legacy_id]), [
    ['qbasc-conta:lucas:questoes', 'gan-ok'],
  ]);
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

test('fila distingue falha de configuração e falha HTTP do GPT, preservando os nós pendentes', async () => {
  const pending = [{ id: 'a', label: 'Nó A' }, { id: 'b', label: 'Nó B' }, { id: 'c', label: 'Nó C' }];
  const visited = [];
  const config = { etapa: 'configuracao', codigo: 'modelo-gpt-invalido', mensagem: 'Modelo inválido' };
  const quota = { etapa: 'gpt', codigo: 'gpt-http-429', mensagem: 'Limite de uso (429)' };
  const report = await runGanQueue({
    pending,
    chosen: { topicId: 't', title: 'Mapa' },
    generate: async node => {
      visited.push(node.id);
      return { falha: node.id === 'a' ? config : quota };
    },
    save: async () => { assert.fail('O nó que falhou não pode gravar questões.'); },
  });
  assert.deepEqual(visited, ['a', 'b']);
  assert.deepEqual(report, {
    processados: 2, aprovadas: 0, bloqueadas: 0, erros: 2, restantes: 3,
    falhas: [{ no: 'Nó A', ...config }, { no: 'Nó B', ...quota }],
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
