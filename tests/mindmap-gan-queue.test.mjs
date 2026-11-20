import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { URL } from 'node:url';
import { centralGanRound } from '../src/lib/gan-queue.js';
import { saveGeneratedNodeFlashcards } from '../src/lib/node-flashcards.js';
import { conceptReviewItems } from '../src/lib/concept-review.js';

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

test('geração grava cartões no assunto e no nó e mantém falhas com o mesmo ID para nova tentativa', async () => {
  const { db, context } = fixture();
  const topicId = 'lucas-t';
  const targetNodeId = 'lucas-t::importacao::0.0';
  const cards = [2, 3].map(index => ({
    id: 'node-card-00000000-0000-4000-8000-00000000000' + index,
    front: 'Qual é a regra do nó ' + index + '?',
    back: 'A regra consta no resumo.',
  }));
  const saveCard = (cardId, front, back) =>
    savePersonalNodeFlashcard({ context, data: { cardId, front, back, topicId, targetNodeId } });

  const results = await saveGeneratedNodeFlashcards(cards, (id, front, back) => {
    if (id === cards[0].id) throw new Error('Falha temporária');
    return saveCard(id, front, back);
  });
  assert.equal(results[0].saveError, 'Falha temporária');
  assert.equal(results[0].id, cards[0].id);
  assert.equal(results[1].status, 'saved');
  assert.deepEqual(db.filter(row => row.legacy_id.startsWith('node-card-')).map(row => row.legacy_id), [cards[1].id]);
  await saveCard(results[0].id, results[0].front, results[0].back);

  const own = collection => db.filter(row => row.collection === 'qbasc-conta:lucas:' + collection)
    .map(row => ({ ...JSON.parse(row.payload_json), id: row.legacy_id }));
  const { QB_DATA } = adaptStudy({ edital: own('edital'), revisao: own('revisao') });
  const deck = QB_DATA.flashcards.filter(card => card.topicId === topicId);
  assert.deepEqual(deck.map(card => card.id).sort(), cards.map(card => card.id));
  const map = QB_DATA.mindMaps.find(item => item.topicId === topicId);
  assert.deepEqual(conceptReviewItems(map, targetNodeId, [], deck).cardIds.sort(), cards.map(card => card.id));
});

test('GAN individual recusa conta suspensa', async () => {
  const { db, context } = fixture();
  db.find(row => row.collection === 'qbasc-contas' && row.legacy_id === 'lucas').payload_json = '{"status":"suspended"}';
  await assert.rejects(preparePersonalMapGan(context, { topicId: 'lucas-t', targetNodeId: 'lucas-t::importacao::0.0' }), /indisponível/);
});

test('gerador distribui vinte questões equilibrando os ramos pelo acervo existente', () => {
  const root = { id: 'root', label: 'Mapa' };
  const first = { id: 'a', label: 'Ramo A', parent: root.id };
  const second = { id: 'b', label: 'Ramo B', parent: root.id };
  const nodes = [root, first, second];
  const batches = centralGanRound(nodes, root.id, [{ node: first.id }, { mapaNoId: first.id }]);
  assert.ok(batches.every(batch => batch.count > 0 && batch.count <= 4));
  assert.equal(batches.filter(batch => batch.target.id === first.id).reduce((total, batch) => total + batch.count, 0), 9);
  assert.equal(batches.filter(batch => batch.target.id === second.id).reduce((total, batch) => total + batch.count, 0), 11);
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
