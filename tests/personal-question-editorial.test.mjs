import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { build } from 'esbuild';
import { canReformulateQuestions, workspaceCollection } from '../src/lib/account-boundary.js';

const stubs = {
  '@tanstack/react-start': `export const createServerFn = () => {
    let schema, guarded;
    return {
      middleware(value) { guarded = Boolean(value.length); return this; },
      validator(value) { schema = value; return this; },
      handler(fn) { return async ({ context, data }) => {
        if (guarded && !context.user) throw new Error('Sessão obrigatória');
        return fn({ context, data: schema ? schema.parse(data) : data });
      }; },
    };
  };`,
  '@/lib/auth-middleware': 'export const requireUser = Symbol("requireUser");',
  'base44:runtime': 'export const secrets={get(name){return name==="Arquiteto"?"gemini-key-for-tests":undefined;}};',
};

const { outputFiles } = await build({
  bundle: true, write: false, platform: 'node', format: 'esm',
  stdin: {
    contents: `
      export { approvePersonalQuestionEditorial, loadPersonalStudy, writePersonalStudy } from './src/lib/study-accounts.js';
      export { proposeEditorialRevision } from './src/lib/server-fns.js';
    `,
    resolveDir: process.cwd(),
  },
  plugins: [{ name: 'test-server-runtime', setup(builder) {
    builder.onResolve({ filter: /.*/ }, ({ path }) => Object.hasOwn(stubs, path) ? { path, namespace: 'stub' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path }) => ({ contents: stubs[path], loader: 'js' }));
  } }],
});
const { approvePersonalQuestionEditorial, loadPersonalStudy, writePersonalStudy, proposeEditorialRevision } =
  await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'));

const user = id => ({ id, role: 'user' });
const approval = {
  questionId: 'questao.1',
  baseRevision: null,
  issue: 'formulacao',
  note: '',
  proposal: {
    parecer: 'O contexto permite formular uma assertiva mais precisa.',
    replacement: {
      statement: 'A revisão administrativa pode corrigir um ato ilegal.',
      key: 'C',
      explanation: 'Certo, pois a legalidade vincula cada ato da Administração. Uma irregularidade comprovada justifica que a autoridade competente corrija a decisão anterior, mesmo na ausência de recurso do interessado.',
      basis: 'Fonte de teste',
      mecanismo: 'V1',
      trechoDecisivo: 'A legalidade vincula cada ato.',
      correcaoMinima: 'F3: dizer que a ilegalidade autoriza necessariamente revogar o ato.',
    },
  },
};

function fixture() {
  let nextId = 0;
  const rows = [];
  const add = (collection, id, content) => rows.push({ collection, legacy_id: id, id: String(++nextId), payload_json: JSON.stringify(content) });
  const mock = {
    async filter(filter, order, limit, offset = 0) {
      return rows.filter(row => Object.entries(filter).every(([key, value]) =>
        typeof value === 'object' ? new RegExp(value.$regex).test(row[key]) : row[key] === value)).slice(offset, offset + limit);
    },
    async create(record) { rows.push({ ...record, id: String(++nextId) }); },
  };
  for (const id of ['primo', 'novo', 'pendente']) add('qbasc-contas', id, { status: id === 'pendente' ? 'pending' : 'active' });
  add(workspaceCollection('primo', 'questoes'), 'questao.1', { enunciado: 'Questão original particular do Primo.', gabarito: 'C', comentario: 'Comentário anterior do Primo.' });
  add(workspaceCollection('novo', 'questoes'), 'questao.1', { enunciado: 'Questão original particular do usuário novo.', gabarito: 'E', comentario: 'Comentário do outro usuário.' });
  add(workspaceCollection('novo', 'questoes'), 'exclusiva', { enunciado: 'Questão exclusiva do outro usuário.', gabarito: 'E' });
  add(workspaceCollection('primo', 'respostas'), 'questao.1', { ultimaMarcada: 'E', hist: [{ m: 'E', ok: false }] });
  return { rows, context: id => ({ user: user(id), getBase44: () => ({ asServiceRole: { entities: { ClaudeDocument: mock } } }) }) };
}

test('curadoria de questões fica disponível para contas ativas sem permissão extra', () => {
  assert.equal(canReformulateQuestions(user('novo'), { id: 'novo', status: 'active' }), true);
  assert.equal(canReformulateQuestions(user('novo'), { id: 'primo', status: 'active' }), false);
  assert.equal(canReformulateQuestions(user('novo'), { id: 'novo', status: 'suspended' }), false);
  assert.equal(canReformulateQuestions({ role: 'admin' }, null), true);
});

test('proposta pessoal usa apenas o item da própria conta e bloqueia acesso indevido antes de chamar Gemini', async t => {
  const { context } = fixture();
  const transport = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.match(String(url), /generativelanguage\.googleapis\.com/);
    const prompt = JSON.parse(options.body).contents[0].parts[0].text;
    assert.match(prompt, /Questão original particular do Primo/);
    assert.doesNotMatch(prompt, /Conteúdo falso do cliente|original particular do usuário novo/);
    return { ok: true, json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(approval.proposal) }] }, finishReason: 'STOP' }],
    }) };
  });
  const data = { kind: 'question', issue: 'formulacao', topicLabel: 'Assunto', content: { id: 'questao.1', statement: 'Conteúdo falso do cliente.' } };
  await assert.rejects(proposeEditorialRevision({ context: context('primo'), data: { ...data, kind: 'flashcard' } }), /restrito/);
  await assert.rejects(proposeEditorialRevision({ context: context('primo'), data: { ...data, content: { id: 'exclusiva' } } }), /não pertence/);
  await assert.rejects(proposeEditorialRevision({ context: context('pendente'), data }), /indisponível/);
  assert.equal(transport.mock.callCount(), 0);
  const proposal = await proposeEditorialRevision({ context: context('primo'), data });
  assert.equal(proposal.baseRevision, null);
  assert.equal(proposal.replacement.statement, approval.proposal.replacement.statement);
});

test('aprovação pessoal salva uma versão privada, preserva o banco e impede propostas antigas e escritas diretas', async () => {
  const { context, rows } = fixture();
  const original = rows.slice();
  const primo = context('primo');
  await assert.rejects(approvePersonalQuestionEditorial({ context: primo, data: { ...approval, questionId: 'exclusiva' } }), /não pertence/);
  await assert.rejects(writePersonalStudy({ context: primo, data: { collection: 'curadoria', id: 'forjado', value: {} } }));
  await assert.rejects(writePersonalStudy({ context: primo, data: { collection: 'questoes', id: 'questao.1', value: {} } }));
  const saved = await approvePersonalQuestionEditorial({ context: primo, data: approval });
  assert.equal(saved.targetId, 'questao.1');
  assert.equal(saved.original.statement, 'Questão original particular do Primo.');
  assert.deepEqual(rows.slice(0, original.length), original);
  assert.equal(rows.at(-1).collection, workspaceCollection('primo', 'curadoria'));
  const first = await loadPersonalStudy({ context: primo });
  assert.equal(first.records.curadoria[0].id, saved.id);
  assert.equal(first.records.respostas[0].hist[0].ok, false);
  assert.deepEqual((await loadPersonalStudy({ context: context('novo') })).records.curadoria, []);
  await assert.rejects(approvePersonalQuestionEditorial({ context: primo, data: approval }), /versão mais recente/);
  const next = await approvePersonalQuestionEditorial({ context: primo, data: { ...approval, baseRevision: saved.id } });
  assert.equal(next.version, 2);
  assert.deepEqual(next.original, saved.original);
});
