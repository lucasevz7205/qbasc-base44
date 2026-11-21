import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { access, readFile } from 'node:fs/promises';
import { basename, isAbsolute, resolve, sep } from 'node:path';
import { argv } from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { build } from 'vite';

const [chapterArg, relativeDir, ...counts] = argv.slice(2);
if (!chapterArg || !relativeDir || counts.length !== 3 || counts.some(count =>
  !/^\d+$/.test(count) || !Number.isSafeInteger(Number(count)))) {
  throw new Error('Uso: node tests/check-central-kit-build.mjs <capítulo> <pasta em src/data/kits> <nós sem raiz> <cartões> <questões>');
}

const chapter = chapterArg.toLowerCase();
const root = fileURLToPath(new URL('../', import.meta.url));
const src = resolve(root, 'src');
const kitsDir = resolve(src, 'data/kits');
const kitDir = resolve(kitsDir, relativeDir);
assert.ok(!isAbsolute(relativeDir) && kitDir.startsWith(kitsDir + sep) && basename(kitDir).toLowerCase() === chapter,
  'A pasta deve identificar o capítulo dentro de src/data/kits');
const [mapText] = await Promise.all([
  readFile(resolve(kitDir, 'mapa.json'), 'utf8'),
  access(resolve(kitDir, 'cartoes.json')),
  access(resolve(kitDir, 'itens.json')),
]);
const kitMap = JSON.parse(mapText);
const topicId = String(kitMap.topico || chapter).trim().toLowerCase();

const [{ output }] = await build({
  root,
  configFile: false,
  envFile: false,
  logLevel: 'error',
  resolve: { alias: { '@': src } },
  build: {
    write: false,
    lib: { entry: resolve(src, 'lib/qb-real-model.js'), formats: ['es'] },
  },
});
const { code } = output.find(chunk => chunk.type === 'chunk' && chunk.isEntry);
const { adaptStudy } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const topic = { id: topicId, materia: kitMap.materia || chapter.slice(0, 2), titulo: kitMap.centro, caps: [chapter] };
const { QB_DATA } = adaptStudy({ edital: [topic] }, { role: 'user' });
const map = QB_DATA.mindMaps.find(entry => entry.topicId === topicId);
assert.ok(map, `O kit compilado deve carregar o mapa de ${topicId}`);
const actual = {
  nos: map.nodes.filter(node => node.parent !== null).length,
  cartoes: QB_DATA.flashcards.filter(card => card.topicId === topicId).length,
  questoes: QB_DATA.questionBank.filter(question => question.topicId === topicId).length,
};
const [nos, cartoes, questoes] = counts.map(Number);
assert.deepEqual(actual, { nos, cartoes, questoes }, `Conteúdo compilado de ${chapter}`);
console.log(`${chapter}: ${actual.nos} nós sem raiz, ${actual.cartoes} cartões e ${actual.questoes} questões no build Vite`);
