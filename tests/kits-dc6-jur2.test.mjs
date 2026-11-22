import fs from 'node:fs';
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

const editalFixture = [
  { id: 'dc-5', sigla: 'DC', materia: 'Direito Constitucional e Regimento Interno', num: '5', titulo: 'Poder Legislativo', ordem: 1, materiaOrdem: 1 },
  { id: 'dc-6', sigla: 'DC', materia: 'Direito Constitucional e Regimento Interno', num: '6', titulo: 'Regime jurídico-constitucional dos parlamentares', ordem: 2, materiaOrdem: 1 },
  { id: 'da-3-1', sigla: 'DA', materia: 'Direito Administrativo e Administração Pública', num: '3.1', titulo: 'Agentes públicos', ordem: 1, materiaOrdem: 2 },
  { id: 'pl-1-5', sigla: 'PL', materia: 'Processo Legislativo e Regimentos', num: '1.5', titulo: 'Iniciativa legislativa', ordem: 1, materiaOrdem: 3 },
  { id: 'jur-2', sigla: 'JUR', materia: 'Jurisprudência (STF)', num: '2', titulo: 'Jurisprudência STF', ordem: 1, materiaOrdem: 4, foraEdital: true },
];

function createFixtureModules() {
  return {
    '../../data/kits/dc/dc-6/mapa.json': {
      default: {
        topico: 'dc-6',
        materia: 'dc',
        centro: 'Estatuto dos Congressistas',
        ramos: [
          {
            id: 'r1',
            t: 'Imunidades',
            x: { e: 'Proteção funcional do mandato.' },
            f: [
              { id: 'r1.1', t: 'Irrenunciabilidade', x: { e: 'Prerrogativa institucional.' } },
            ],
          },
        ],
      },
    },
    '../../data/kits/dc/dc-6/cartoes.json': {
      default: [
        { id: 'dc6-c1', no: 'r1.1', pergunta: 'A imunidade é renunciável?', resposta: ['Não'], fonte: 'CF art. 53' },
      ],
    },
    '../../data/kits/dc/dc-6/itens.json': {
      default: [
        {
          id: 'dc6-q1',
          no: 'r1.1',
          enunciado: 'As imunidades parlamentares são irrenunciáveis.',
          gabarito: 'C',
          gabaritoDiscriminador: 'C',
          comentario: 'Prerrogativa institucional ratione muneris.',
          mecanismo: 'V1',
          evidencia: 'CF art. 53; Inq 510',
          vacina: 'Imunidade é do mandato, não da pessoa.',
          ref: 'CF, art. 53',
          origem: 'inédito Claude',
        },
      ],
    },
    '../../data/kits/jur/jur-2/mapa.json': {
      default: {
        topico: 'jur-2',
        materia: 'jur',
        centro: 'Jurisprudência STF 1235–1237',
        ramos: [
          {
            id: 'r1',
            t: 'Tribunais de Contas e Processo Legislativo',
            x: { e: 'Julgados recentes do Plenário.' },
            f: [
              { id: 'r1.1', t: 'Prescrição no TCE', x: { e: 'Prazo quinquenal em Constituição estadual.' } },
              { id: 'r1.2', t: 'Iniciativa reservada', x: { e: 'Regime jurídico de servidores.' } },
            ],
          },
        ],
      },
    },
    '../../data/kits/jur/jur-2/cartoes.json': {
      default: [
        { id: 'jur2-c1', no: 'r1.1', pergunta: 'Estado pode prever prescrição de 5 anos no TCE?', resposta: ['Sim'], fonte: 'ADI 7.508' },
      ],
    },
    '../../data/kits/jur/jur-2/itens.json': {
      default: [
        {
          id: 'jur2-q1',
          no: 'r1.1',
          enunciado: 'É válida norma estadual que fixa prazo prescricional de cinco anos ao TCE.',
          gabarito: 'C',
          gabaritoDiscriminador: 'C',
          comentario: 'Entendimento firmado na ADI 7.508/AM.',
          mecanismo: 'V1',
          evidencia: 'ADI 7.508/AM',
          vacina: 'Prescrição de 5 anos no TCE pode vir na CE.',
          ref: 'ADI 7.508/AM · Inf. STF 1237',
          topicosRelacionados: ['dc-5'],
          origem: 'inédito Claude',
        },
        {
          id: 'jur2-q2',
          no: 'r1.2',
          enunciado: 'Emenda estadual parlamentar pode liberar conversão de férias em pecúnia.',
          gabarito: 'E',
          gabaritoDiscriminador: 'E',
          comentario: 'Iniciativa reservada do Executivo (ADI 7.937 MC-Ref/PE).',
          mecanismo: 'F3',
          evidencia: 'ADI 7.937 MC-Ref/PE',
          vacina: 'Regime de servidores exige iniciativa do Executivo.',
          ref: 'ADI 7.937 MC-Ref/PE · Inf. STF 1237',
          topicosRelacionados: ['da-3-1', 'pl-1-5'],
          origem: 'inédito Claude',
        },
      ],
    },
  };
}

test('loadCentralKits e adaptStudy suportam siglas de 2 e 3 letras com nós resolvidos', () => {
  const centralKitModules = createFixtureModules();
  const loaded = loadCentralKits(centralKitModules);
  assert.ok(loaded.revisions.some(r => r.topico === 'dc-6'));
  assert.ok(loaded.revisions.some(r => r.topico === 'jur-2'));

  const adapted = adaptStudy(
    { edital: editalFixture, questoes: [], revisao: [], respostas: [] },
    { role: 'admin', full_name: 'Lucas' },
    new Date('2026-11-22T15:00:00Z'),
    { centralKitModules },
  );

  for (const [topicId, expectedCards, expectedQuestions] of [['dc-6', 1, 1], ['jur-2', 1, 2]]) {
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
    }
  }
});

test('pickQuestionRound encontra itens por tópicos e matérias relacionados sem alterar percentuais do edital', () => {
  const centralKitModules = createFixtureModules();
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
  assert.equal(pickQuestionRound(bank, { topicId: 'jur-2', filter: 'all' }).length, 2);
  assert.ok(pickQuestionRound(bank, { topicId: 'dc-5', filter: 'all' }).some(q => q.id === 'jur2-q1'));
  assert.ok(pickQuestionRound(bank, { topicId: 'pl-1-5', filter: 'all' }).some(q => q.id === 'jur2-q2'));
  assert.ok(pickQuestionRound(bank, { topicId: 'da-3-1', filter: 'all' }).some(q => q.id === 'jur2-q2'));
  assert.ok(pickQuestionRound(bank, { subjectId: 'da', filter: 'all' }).some(q => q.topicId === 'jur-2'));
  assert.ok(pickQuestionRound(bank, { subjectId: 'pl', filter: 'all' }).some(q => q.topicId === 'jur-2'));

  // Percentuais do edital de dc-5 consideram apenas questões próprias de dc-5 (1/1, sem diluição por jur-2).
  const dc5 = adapted.QB_EDITAL.subjects.flatMap(s => s.topics).find(t => t.id === 'dc-5');
  assert.equal(dc5.resources.questions, 1);
  assert.equal(dc5.questionsAnswered, 1);
  assert.equal(dc5.correct, 1);
});

test('kits dc-6 e jur-2 presentes no disco passam no portão de qualidade sem pendências nem avisos', () => {
  for (const rel of ['dc/dc-6', 'jur/jur-2']) {
    const itensUrl = new URL(`../src/data/kits/${rel}/itens.json`, import.meta.url);
    const itensPath = fileURLToPath(itensUrl);
    if (!fs.existsSync(itensPath)) continue;

    const itens = JSON.parse(fs.readFileSync(itensPath, 'utf8'));
    assert.ok(itens.length >= 20, `${rel} deve ter ao menos 20 itens`);
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
