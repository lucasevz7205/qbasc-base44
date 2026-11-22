import fs from 'node:fs';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { loadCentralKits } from '../src/lib/kits/central-kits.js';
import { pickQuestionRound } from '../src/lib/study-session-rules.js';
import { itemFromDisplayedQuestion, questionQualityProblems } from '../src/lib/item-quality.js';
import { questionTrap } from '../src/lib/question-feedback.js';

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
  const rootPath = fileURLToPath(new URL('../src/data/kits/', import.meta.url));
  const modules = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/^(mapa|cartoes|itens)\.json$/i.test(entry.name)) {
        const rel = path.relative(rootPath, full).replace(/\\/g, '/');
        modules[`../../data/kits/${rel}`] = { default: JSON.parse(fs.readFileSync(full, 'utf8')) };
      }
    }
  }
  walk(rootPath);
  return modules;
}

const editalFixture = [
  { id: 'dc-2b', sigla: 'DC', materia: 'Direito Constitucional e Regimento Interno', num: '2b', titulo: 'Direitos individuais', ordem: 1, materiaOrdem: 1 },
  { id: 'dc-3', sigla: 'DC', materia: 'Direito Constitucional e Regimento Interno', num: '3', titulo: 'Organização do Estado', ordem: 2, materiaOrdem: 1 },
  { id: 'dc-4', sigla: 'DC', materia: 'Direito Constitucional e Regimento Interno', num: '4', titulo: 'Administração pública', ordem: 3, materiaOrdem: 1 },
  { id: 'dc-5', sigla: 'DC', materia: 'Direito Constitucional e Regimento Interno', num: '5', titulo: 'Poder Legislativo', ordem: 4, materiaOrdem: 1 },
  { id: 'dc-6', sigla: 'DC', materia: 'Direito Constitucional e Regimento Interno', num: '6', titulo: 'Regime jurídico-constitucional dos parlamentares', ordem: 5, materiaOrdem: 1 },
  { id: 'da-1-2', sigla: 'DA', materia: 'Direito Administrativo e Administração Pública', num: '1.2', titulo: 'Organização administrativa', ordem: 1, materiaOrdem: 2 },
  { id: 'da-3-1', sigla: 'DA', materia: 'Direito Administrativo e Administração Pública', num: '3.1', titulo: 'Agentes públicos', ordem: 2, materiaOrdem: 2 },
  { id: 'da-4-1', sigla: 'DA', materia: 'Direito Administrativo e Administração Pública', num: '4.1', titulo: 'Direito administrativo disciplinar', ordem: 3, materiaOrdem: 2 },
  { id: 'da-5-1', sigla: 'DA', materia: 'Direito Administrativo e Administração Pública', num: '5.1', titulo: 'Poderes administrativos', ordem: 4, materiaOrdem: 2 },
  { id: 'pl-1-1', sigla: 'PL', materia: 'Processo Legislativo e Regimentos', num: '1.1', titulo: 'Tipos de procedimento', ordem: 1, materiaOrdem: 3 },
  { id: 'pl-1-3', sigla: 'PL', materia: 'Processo Legislativo e Regimentos', num: '1.3', titulo: 'Matérias legislativas', ordem: 2, materiaOrdem: 3 },
  { id: 'pl-1-5', sigla: 'PL', materia: 'Processo Legislativo e Regimentos', num: '1.5', titulo: 'Iniciativa legislativa', ordem: 3, materiaOrdem: 3 },
  { id: 'jur-2', sigla: 'JUR', materia: 'Jurisprudência (STF)', num: '2', titulo: 'Jurisprudência STF', ordem: 1, materiaOrdem: 4, foraEdital: true },
];

test('loadCentralKits e adaptStudy carregam dc-6 e jur-2 completos com nós resolvidos', () => {
  const centralKitModules = readKitModulesFromDisk();
  const loaded = loadCentralKits(centralKitModules);
  assert.ok(loaded.revisions.some(r => r.topico === 'dc-6'));
  assert.ok(loaded.revisions.some(r => r.topico === 'jur-2'));

  const adapted = adaptStudy(
    { edital: editalFixture, questoes: [], revisao: [], respostas: [] },
    { role: 'admin', full_name: 'Lucas' },
    new Date('2026-11-22T15:00:00Z'),
    { centralKitModules },
  );

  for (const [topicId, expectedCards, expectedQuestions] of [['dc-6', 32, 22], ['jur-2', 20, 22]]) {
    const map = adapted.QB_DATA.mindMaps.find(m => m.topicId === topicId);
    const cards = adapted.QB_DATA.flashcards.filter(c => c.topicId === topicId);
    const questions = adapted.QB_DATA.questionBank.filter(q => q.topicId === topicId);

    assert.ok(map, `mapa ${topicId} deve existir`);
    assert.equal(cards.length, expectedCards);
    assert.equal(questions.length, expectedQuestions);

    const nodeIds = new Set(map.nodes.map(n => n.id));
    for (const card of cards) {
      assert.ok(nodeIds.has(card.node) && card.node !== map.id, `${card.id} sem nó específico no mapa`);
    }
    for (const question of questions) {
      assert.ok(nodeIds.has(question.node) && question.node !== map.id, `${question.id} sem nó específico no mapa`);
      assert.equal(question.origin, 'inédito Codex');
    }
  }
});

test('pickQuestionRound encontra itens de jur-2 pelos tópicos e matérias relacionados sem alterar percentuais do edital', () => {
  const centralKitModules = readKitModulesFromDisk();
  const adapted = adaptStudy(
    {
      edital: editalFixture,
      questoes: [
        { id: 'dc5-base', topico: 'dc-5', enunciado: 'Questão própria de DC-5.', gabarito: 'C' },
      ],
      respostas: [
        { qid: 'dc5-base', acertos: 1, erros: 0, brancos: 0, tentativas: 1, ultimaMarcada: 'C', gabaritoUsado: 'C', hist: [{ em: '2026-11-22T12:00:00Z', ok: true, c: 3 }] },
      ],
      revisao: [],
    },
    { role: 'admin', full_name: 'Lucas' },
    new Date('2026-11-22T15:00:00Z'),
    { centralKitModules },
  );

  const bank = adapted.QB_DATA.questionBank;
  assert.equal(pickQuestionRound(bank, { topicId: 'jur-2', filter: 'all' }).length, 22);
  assert.ok(pickQuestionRound(bank, { topicId: 'dc-4', filter: 'all' }).some(q => q.id === 'jur-2-q05'));
  assert.ok(pickQuestionRound(bank, { topicId: 'dc-5', filter: 'all' }).some(q => q.id === 'jur-2-q01'));
  assert.ok(pickQuestionRound(bank, { topicId: 'pl-1-5', filter: 'all' }).some(q => q.id === 'jur-2-q21'));
  assert.ok(pickQuestionRound(bank, { topicId: 'da-3-1', filter: 'all' }).some(q => q.id === 'jur-2-q09'));
  assert.ok(pickQuestionRound(bank, { subjectId: 'da', filter: 'all' }).some(q => q.topicId === 'jur-2'));
  assert.ok(pickQuestionRound(bank, { subjectId: 'pl', filter: 'all' }).some(q => q.topicId === 'jur-2'));

  // Percentuais do edital de dc-5 consideram apenas questões próprias de dc-5 (1/1, sem diluição por jur-2).
  const dc5 = adapted.QB_EDITAL.subjects.flatMap(s => s.topics).find(t => t.id === 'dc-5');
  assert.equal(dc5.resources.questions, 1);
  assert.equal(dc5.questionsAnswered, 1);
  assert.equal(dc5.correct, 1);
});

test('todos os 44 itens de dc-6 e jur-2 passam no portão de qualidade sem pendências nem avisos', () => {
  for (const rel of ['dc/dc-6', 'jur/jur-2']) {
    const itens = JSON.parse(fs.readFileSync(fileURLToPath(new URL(`../src/data/kits/${rel}/itens.json`, import.meta.url)), 'utf8'));
    assert.equal(itens.length, 22);
    assert.equal(itens.filter(q => q.gabarito === 'C').length, 11);
    assert.equal(itens.filter(q => q.gabarito === 'E').length, 11);
    for (const q of itens) {
      const key = String(q.gabarito).toUpperCase();
      const displayed = {
        id: q.id,
        statement: q.enunciado,
        key,
        explanation: q.comentario,
        basis: q.ref,
        trap: questionTrap(q, undefined, key),
        raw: q,
      };
      const quality = questionQualityProblems(itemFromDisplayedQuestion(displayed));
      assert.deepEqual(quality, { problems: [], warnings: [] }, `${q.id} apresentou pendências: ${JSON.stringify(quality)}`);
    }
  }
});
