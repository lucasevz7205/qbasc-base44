import fs from 'node:fs';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { loadCentralKits } from '../src/lib/kits/central-kits.js';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/lib/')) {
      return nextResolve(new URL('../src/lib/' + specifier.slice(6) + '.js', import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { adaptStudy } = await import('../src/lib/qb-real-model.js');
hooks.deregister();

function readKitModulesFromDisk() {
  const root = new URL('../src/data/kits/', import.meta.url);
  const rootPath = fileURLToPath(root);
  const modules = {};

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/^(mapa|cartoes|itens)\.json$/i.test(entry.name)) {
        const rel = path.relative(rootPath, full).replace(/\\/g, '/');
        modules[`../../data/kits/${rel}`] = { default: JSON.parse(fs.readFileSync(full, 'utf8')) };
      }
    }
  }

  walk(rootPath);
  return modules;
}

test('central-kits carrega da-10-1 completo no adaptStudy preservando respostas existentes', () => {
  const centralKitModules = readKitModulesFromDisk();
  const loaded = loadCentralKits(centralKitModules);
  const daRev = loaded.revisions.find(r => r.topico === 'da-10-1');
  const daQuestions = loaded.questions.filter(q => q.topico === 'da-10-1');

  assert.ok(daRev, 'revisao da-10-1 deve existir');
  assert.equal(daRev.cartoes.filter(c => !c.arquivadoPorDivisao && !c.arquivadoPorDuplicacao).length, 83);
  assert.equal(daQuestions.length, 100);

  const records = {
    edital: [
      { id: 'da-10-1', sigla: 'DA', materia: 'Direito Administrativo', num: '10.1', titulo: 'Licitação pública', ordem: 1, materiaOrdem: 1, caps: ['da-10-1'] },
    ],
    questoes: [],
    respostas: [
      { qid: 'da101-01', acertos: 1, erros: 0, brancos: 0, tentativas: 1, ultimaMarcada: 'E', gabaritoUsado: 'E', hist: [{ em: '2026-11-21T12:00:00Z', ok: true, c: 3 }] },
    ],
    revisao: [],
  };

  const adapted = adaptStudy(records, { role: 'admin', full_name: 'Lucas' }, new Date('2026-11-21T15:00:00Z'), { centralKitModules });
  const daTopic = adapted.QB_EDITAL.subjects.flatMap(s => s.topics).find(t => t.id === 'da-10-1');
  const daMap = adapted.QB_DATA.mindMaps.find(m => m.topicId === 'da-10-1');
  const daCards = adapted.QB_DATA.flashcards.filter(c => c.topicId === 'da-10-1');
  const daBank = adapted.QB_DATA.questionBank.filter(q => q.topicId === 'da-10-1');

  assert.ok(daMap, 'mapa da-10-1 deve ser carregado no QB_DATA.mindMaps');
  assert.equal(daMap.nodes.filter(n => n.parent !== null).length, 124);
  assert.equal(daCards.length, 83);
  assert.equal(daBank.length, 100);
  assert.equal(daTopic.resources.cards, 83);
  assert.equal(daTopic.resources.questions, 100);
  assert.equal(daTopic.correct, 1);
  assert.equal(daBank.find(q => q.id === 'da101-01')?.response?.ultimaMarcada, 'E');
});

test('registros do Base44 têm precedência sobre kits locais e não são sobrescritos', () => {
  const centralKitModules = readKitModulesFromDisk();
  const records = {
    edital: [
      { id: 'da-10-1', sigla: 'DA', materia: 'Direito Administrativo', num: '10.1', titulo: 'Licitação pública', ordem: 1, materiaOrdem: 1, status: 'reviewing' },
    ],
    questoes: [
      { id: 'da101-01', topico: 'da-10-1', enunciado: 'Enunciado customizado do Base44', gabarito: 'C' },
    ],
    revisao: [
      { id: 'da-10-1.base44', topico: 'da-10-1', mapa: { centro: 'Mapa Base44', ramos: [{ id: 'b1', t: 'Nó Base44' }] }, cartoes: [{ id: 'c-base44', q: 'P?', a: 'R!' }] },
    ],
  };

  const adapted = adaptStudy(records, { role: 'admin' }, new Date('2026-11-21T15:00:00Z'), { centralKitModules });
  const daMap = adapted.QB_DATA.mindMaps.find(m => m.topicId === 'da-10-1');
  const daCards = adapted.QB_DATA.flashcards.filter(c => c.topicId === 'da-10-1');
  const daQ1 = adapted.QB_DATA.questionBank.find(q => q.id === 'da101-01');
  const daTopic = adapted.QB_EDITAL.subjects.flatMap(s => s.topics).find(t => t.id === 'da-10-1');

  assert.equal(daMap.title, 'Mapa Base44');
  assert.equal(daCards.length, 1);
  assert.equal(daQ1.statement, 'Enunciado customizado do Base44');
  assert.equal(daQ1.key, 'C');
  assert.equal(daTopic.status, 'reviewing');
});

test('DA 8.1 mantém o mapa e os cartões do kit depois de gravar um flashcard de nó', () => {
  const topicId = 'da-8-1';
  const centralKitModules = readKitModulesFromDisk();
  const records = {
    edital: [{ id: topicId, sigla: 'DA', materia: 'Direito Administrativo', num: '8.1', titulo: 'Nova Governança Pública' }],
    revisao: [],
  };
  const load = () => adaptStudy(records, { role: 'admin' }, new Date('2026-11-22T22:55:00Z'), { centralKitModules }).QB_DATA;
  const before = load();
  const map = before.mindMaps.find(entry => entry.topicId === topicId);
  assert.equal(map.nodes.filter(node => node.parent !== null).length, 31);
  const target = map.nodes.find(node => node.id === 'da-8-1::da-8-1.mapa::0.0.0');
  assert.ok(target);
  const cardId = 'node-card-e5258708-882c-41bf-b290-0a51ad41015f';
  records.revisao.push({ id: cardId, topico: topicId, cartoes: [{ id: cardId, q: 'Qual é o paradigma posterior à NPM?', a: 'Nova Governança Pública.', mapaNoId: target.id }] });
  const after = load();
  assert.deepEqual(after.mindMaps.find(entry => entry.topicId === topicId), map);
  const cards = after.flashcards.filter(card => card.topicId === topicId);
  assert.equal(cards.length, 29);
  assert.equal(cards.find(card => card.id === cardId)?.node, target.id);
});

test('central-kits usa import.meta.glob para empacotar src/data/kits no Vite', () => {
  const src = fs.readFileSync(new URL('../src/lib/kits/central-kits.js', import.meta.url), 'utf8');
  assert.match(src, /import\.meta\.glob\(['"]\.\.\/\.\.\/data\/kits\/\*\*\/\{mapa,cartoes,itens\}\.json['"]/);
});
