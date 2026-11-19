import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';
import { build } from 'esbuild';
import { FEYNMAN_SCOPE_LIMITS, feynmanMapGroups } from '../src/lib/feynman-scope.js';

test('lista os nós de todos os mapas do assunto com seus caminhos', () => {
  const maps = [
    { id: 'm1', topicId: 'cp-4', title: 'Poderes', nodes: [
      { id: 'm1', label: 'Poderes' },
      { id: 'r1', label: 'Executivo', parent: 'm1' },
      { id: 'n1', label: 'Controle', parent: 'r1' },
      { id: 'r2', label: 'Judiciário', parent: 'm1' },
      { id: 'n2', label: 'Controle', parent: 'r2' },
    ] },
    { id: 'm2', topicId: 'cp-4', title: 'Instituições', nodes: [{ id: 'm2', label: 'Instituições' }] },
    { id: 'm3', topicId: 'cp-9', title: 'Estado', nodes: [{ id: 'm3', label: 'Estado' }] },
  ];
  const groups = feynmanMapGroups(maps, 'cp-4');
  assert.deepEqual(groups.map(group => group.id), ['m1', 'm2']);
  assert.deepEqual(groups[0].nodes.filter(node => node.label === 'Controle').map(node => node.path), [
    ['Poderes', 'Executivo', 'Controle'], ['Poderes', 'Judiciário', 'Controle'],
  ]);
  assert.deepEqual(feynmanMapGroups(maps, 'sem-mapa'), []);
});

const mocks = {
  '@tanstack/react-start': `export const createServerFn = () => {
    let schema;
    let guarded = false;
    return {
      middleware(list) { guarded = Boolean(list.length); return this; },
      validator(input) { schema = input; return this; },
      handler(run) { return async ({ context, data }) => {
        if (guarded && !context.user) throw new Error('Sessão obrigatória');
        return run({ context, data: schema.parse(data) });
      }; },
    };
  };`,
  '@/lib/auth-middleware': 'export const requireUser = Symbol();',
  '@/lib/study-accounts': `export const requireArchitectAccess = async () => null;
    export const preparePersonalMapGan = () => {}; export const prepareGanSourcePassages = () => {};
    export const preparePersonalQuestionEditorial = () => {}; export const saveAutoApprovedMapGan = () => {};`,
  'base44:runtime': 'export const secrets = {};',
};

test('avaliações por nó recebem o recorte e a referência sem excluir o formato por assunto', async () => {
  const bundle = await build({
    bundle: true, write: false, platform: 'node', format: 'esm',
    entryPoints: ['src/lib/server-fns.js'],
    plugins: [{ name: 'mock-feynman', setup(plugin) {
      plugin.onResolve({ filter: /.*/ }, ({ path }) => Object.hasOwn(mocks, path) ? { path, namespace: 'mocks' } : undefined);
      plugin.onLoad({ filter: /.*/, namespace: 'mocks' }, ({ path }) => ({ contents: mocks[path] }));
    } }],
  });
  const { evaluateFeynmanExplanation } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
  const prompts = [];
  const context = { user: { role: 'admin' }, getBase44: () => ({
    asServiceRole: { integrations: { Core: { InvokeLLM: async ({ prompt }) => {
      prompts.push(prompt);
      return { clarityScore: 85 };
    } } } },
  }) };
  const data = { topicLabel: 'Poderes e relações entre poderes', explanation: 'O controle compara a lei com o parâmetro constitucional.' };
  const node = { label: 'Controle de constitucionalidade', path: ['Poderes', 'Judiciário', 'Controle de constitucionalidade'], summary: 'Exame de compatibilidade com a Constituição.' };

  const result = await evaluateFeynmanExplanation({ context, data: { ...data, subjectLabel: 'Ciência política', node } });
  assert.equal(result.clarityScore, 85);
  assert.ok(prompts[0].includes(JSON.stringify({ materia: 'Ciência política', assunto: data.topicLabel, no: node })));
  assert.match(prompts[0], /Avalie o nó escolhido, sem exigir cobertura de outros ramos/);
  await evaluateFeynmanExplanation({ context, data });
  assert.ok(prompts[1].includes(JSON.stringify({ assunto: data.topicLabel })));
  await assert.rejects(evaluateFeynmanExplanation({ context, data: { ...data, node: { ...node, summary: 'x'.repeat(FEYNMAN_SCOPE_LIMITS.summary + 1) } } }));
  await assert.rejects(evaluateFeynmanExplanation({ context: {}, data }), /Sessão obrigatória/);
  assert.match(prompts[1], /colega de estudo iniciante/);
  for (const [audience, expected] of [['child', 'criança curiosa de 10 anos'], ['exam', 'banca avaliadora Cebraspe']]) {
    await evaluateFeynmanExplanation({ context, data: { ...data, audience } });
    assert.ok(prompts.at(-1).includes(expected));
  }
  await assert.rejects(evaluateFeynmanExplanation({ context, data: { ...data, audience: 'outro' } }));
  assert.equal(prompts.length, 4);
});
