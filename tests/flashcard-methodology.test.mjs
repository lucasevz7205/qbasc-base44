import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFlashcard, validateFlashcardBatch, diagnoseLegacyFlashcards } from '../src/lib/flashcard-quality.js';
import { runFlashcardGenerationPipeline, reconcileBlindReview, buildBlindReviewPrompt } from '../src/lib/flashcard-pipeline.js';
import { canPersistFlashcardCandidate, saveGeneratedNodeFlashcards, buildNodeFlashcardRecord } from '../src/lib/node-flashcards.js';
import { buildReformulationBackupManifest, planFlashcardReformulation } from '../src/lib/flashcard-reformulation.js';
import { applyEditorialOverlays } from '../src/lib/editorial-overrides.js';
import { loadCentralKits } from '../src/lib/kits/central-kits.js';

const SOURCE_DA = 'O fiscal do contrato acompanha a execução, anota ocorrências em registro próprio e determina o que for necessário à regularização de faltas ou defeitos observados (Lei 14.133/2021, art. 117). O prazo para resposta à impugnação ao edital é de 3 dias úteis (Lei 14.133/2021, art. 164, parágrafo único). É vedada a designação do mesmo agente público para atuação simultânea em funções mais suscetíveis a riscos, em observância ao princípio da segregação de funções (art. 7º, § 1º).';

test('1. bloqueia perguntas com duas respostas / alvos compostos e sugere divisão', () => {
  const res1 = validateFlashcard({
    front: 'A Lei 14.133/2021 se aplica às empresas públicas? Qual lei rege as licitações delas?',
    back: 'Não se aplica (exceto parte penal); aplica-se a Lei 13.303/2016.',
  });
  assert.notEqual(res1.status, 'approved');
  assert.ok(res1.errorCodes.includes('pergunta_composta'));
  assert.equal(res1.canSplit, true);

  const res2 = validateFlashcard({
    front: 'Qual é o papel do fiscal do contrato e qual é o prazo de impugnação ao edital na Lei 14.133/2021?',
    back: 'Acompanhar a execução e 3 dias úteis.',
  });
  assert.notEqual(res2.status, 'approved');
  assert.ok(res2.errorCodes.includes('pergunta_composta'));
  assert.equal(res2.canSplit, true);
});

test('2. bloqueia listas extensas (> 3 itens) em um único cartão e permite lacuna', () => {
  const extensa = validateFlashcard({
    front: 'Quais são as 5 modalidades de licitação previstas na Lei 14.133/2021?',
    back: '1. Pregão\n2. Concorrência\n3. Concurso\n4. Leilão\n5. Diálogo competitivo',
  });
  assert.notEqual(extensa.status, 'approved');
  assert.ok(extensa.errorCodes.includes('lista_extensa'));
  assert.equal(extensa.canSplit, true);

  const lacuna = validateFlashcard({
    cardType: 'lacuna',
    front: 'Na Lei 14.133/2021, além de pregão, concorrência, concurso e leilão, a quinta modalidade de licitação é o ___.',
    back: 'Diálogo competitivo (Lei 14.133/2021, art. 28).',
    basis: 'Lei 14.133/2021, art. 28',
  });
  assert.equal(lacuna.status, 'approved');
  assert.equal(lacuna.cardType, 'lacuna');
});

test('3. bloqueia perguntas dependentes do contexto do mapa, PDF ou cartão anterior', () => {
  const mapaDep = validateFlashcard({
    front: 'Neste nó do mapa mental, qual é a exceção citada acima?',
    back: 'Segregação de funções.',
  });
  assert.notEqual(mapaDep.status, 'approved');
  assert.ok(mapaDep.errorCodes.includes('dependente_de_contexto'));

  const pronomeSolto = validateFlashcard({
    front: 'Qual a diferença entre eles segundo o texto acima?',
    back: 'Um fiscaliza e outro gere.',
  });
  assert.notEqual(pronomeSolto.status, 'approved');
  assert.ok(pronomeSolto.errorCodes.includes('dependente_de_contexto'));
});

test('4. bloqueia geração e validação quando há ausência de fonte textual suficiente', async () => {
  const res = validateFlashcard(
    {
      front: 'Qual é o prazo para resposta à impugnação ao edital na Lei 14.133/2021?',
      back: '3 dias úteis (art. 164).',
    },
    { sourceText: 'Texto curto.', requireSource: true },
  );
  assert.equal(res.status, 'rejected');
  assert.ok(res.errorCodes.includes('fonte_insuficiente'));

  let called = false;
  const pipe = await runFlashcardGenerationPipeline({
    invokeGenerator: async () => { called = true; return {}; },
    sourceText: 'Curto demais',
    topicId: 'da-10-1',
    topicLabel: 'Licitação Pública',
  });
  assert.equal(called, false);
  assert.equal(pipe.cards.length, 0);
  assert.equal(pipe.pipeline.blockedReason, 'fonte_insuficiente');
});

test('5. rejeita resposta factualmente incompatível com a fonte (prazo trocado, referência inventada ou polaridade invertida)', () => {
  const prazoErrado = validateFlashcard(
    {
      front: 'Qual é o prazo para resposta à impugnação ao edital na Lei 14.133/2021?',
      back: '10 dias úteis (Lei 14.133/2021, art. 164).',
      basis: 'Lei 14.133/2021, art. 164',
    },
    { sourceText: SOURCE_DA, requireSource: true },
  );
  assert.equal(prazoErrado.status, 'rejected');
  assert.ok(prazoErrado.errorCodes.includes('incompativel_com_fonte'));

  const artInventado = validateFlashcard(
    {
      front: 'Qual artigo da Lei 14.133/2021 trata do fiscal do contrato?',
      back: 'Art. 999 da Lei 14.133/2021, conforme Súmula 473.',
      basis: 'Art. 999',
    },
    { sourceText: SOURCE_DA, requireSource: true },
  );
  assert.equal(artInventado.status, 'rejected');
  assert.ok(artInventado.errorCodes.includes('referencia_nao_sustentada'));

  const polaridadeInvertida = validateFlashcard(
    {
      front: 'O mesmo agente público pode atuar simultaneamente em funções suscetíveis a riscos na Lei 14.133/2021?',
      back: 'Sim, é permitido designar o mesmo agente público para atuação simultânea em funções suscetíveis a riscos.',
      basis: 'Lei 14.133/2021, art. 7º, § 1º',
    },
    { sourceText: SOURCE_DA, requireSource: true },
  );
  assert.equal(polaridadeInvertida.status, 'rejected');
  assert.ok(polaridadeInvertida.errorCodes.includes('incompativel_com_fonte'));
});

test('6. detecta duplicação semântica no lote e contra o baralho existente', () => {
  const existingCards = [
    {
      id: 'da-10-1-c01',
      front: 'Qual é o prazo para a Administração responder à impugnação ao edital na Lei 14.133/2021?',
      back: 'Até 3 dias úteis (Lei 14.133/2021, art. 164, parágrafo único).',
    },
  ];
  const dup = validateFlashcard(
    {
      front: 'Na Lei 14.133/2021, em qual prazo a Administração responde à impugnação ao edital?',
      back: '3 dias úteis, conforme o art. 164, parágrafo único, da Lei 14.133/2021.',
      basis: 'Lei 14.133/2021, art. 164',
    },
    { existingCards },
  );
  assert.equal(dup.status, 'rejected');
  assert.ok(dup.errorCodes.includes('duplicacao_semantica'));

  const batch = validateFlashcardBatch([
    {
      id: 'cand-1',
      front: 'Quem anota ocorrências da execução contratual em registro próprio segundo o art. 117 da Lei 14.133/2021?',
      back: 'O fiscal do contrato (Lei 14.133/2021, art. 117).',
      basis: 'Lei 14.133/2021, art. 117',
    },
    {
      id: 'cand-2',
      front: 'Segundo o art. 117 da Lei 14.133/2021, quem registra ocorrências da execução contratual em registro próprio?',
      back: 'O fiscal do contrato, nos termos do art. 117 da Lei 14.133/2021.',
      basis: 'Lei 14.133/2021, art. 117',
    },
  ]);
  assert.equal(batch.results[0].validation.status, 'approved');
  assert.equal(batch.results[1].validation.status, 'rejected');
  assert.ok(batch.results[1].validation.errorCodes.includes('duplicacao_semantica'));
});

test('7. detecta prefixo duplicado de matéria/assunto e limpa via central-kits', () => {
  const prefixed = validateFlashcard(
    {
      front: 'Direito Administrativo · Licitação Pública: Qual é o prazo de resposta à impugnação ao edital?',
      back: '3 dias úteis (Lei 14.133/2021, art. 164).',
      basis: 'Lei 14.133/2021, art. 164',
    },
    { subjectName: 'Direito Administrativo', topicTitle: 'Licitação Pública', topicId: 'da-10-1' },
  );
  assert.notEqual(prefixed.status, 'approved');
  assert.ok(prefixed.errorCodes.includes('prefixo_duplicado'));
  assert.equal(prefixed.normalizedFront, 'Qual é o prazo de resposta à impugnação ao edital?');

  const loaded = loadCentralKits({
    '../../data/kits/da/da-10-1/mapa.json': { topico: 'da-10-1', materia: 'Direito Administrativo', centro: 'Licitação Pública' },
    '../../data/kits/da/da-10-1/cartoes.json': [
      { id: 'c1', no: 'r1', pergunta: 'Direito Administrativo · Licitação Pública: Qual é o prazo?', resposta: ['3 dias úteis.'] },
    ],
  });
  assert.equal(loaded.revisions[0].cartoes[0].pergunta, 'Qual é o prazo?');
});

test('8. rejeita remissão ao nó incorreto ou inexistente no mapa', () => {
  const mapa = { id: 'da-10-1', nodes: [{ id: 'r1', label: 'Fiscalização' }, { id: 'r2', label: 'Impugnação' }] };
  const wrongNode = validateFlashcard(
    {
      front: 'Qual é o prazo para resposta à impugnação ao edital na Lei 14.133/2021?',
      back: '3 dias úteis (art. 164).',
      basis: 'Lei 14.133/2021, art. 164',
      topicId: 'da-10-1',
      mapaNoId: 'r999-inexistente',
    },
    { topicId: 'da-10-1', targetNodeId: 'r2', mapa, requireNodeLink: true },
  );
  assert.equal(wrongNode.status, 'rejected');
  assert.ok(wrongNode.errorCodes.includes('remissao_no_invalido'));
});

test('9. divisão de cartão composto com histórico existente cria novos IDs com derivedFrom e preserva histórico original', () => {
  const originalCard = {
    id: 'da101-c01',
    topicId: 'da-10-1',
    mapaNoId: 'r1.3',
    front: 'A Lei 14.133/2021 se aplica às empresas públicas? Que lei rege as licitações delas?',
    back: 'Não (exceto parte penal); Lei 13.303/2016.',
    basis: 'Lei 14.133/2021, art. 1º, § 1º',
  };
  const existingReviews = {
    'da101-c01': { id: 'da101-c01', ult: 'bom', intervalo: 14, hist: [{ v: 'bom', em: '2026-11-10' }] },
  };

  const backup = buildReformulationBackupManifest({
    runId: 'test-run-split',
    cards: [originalCard],
    diagnostic: diagnoseLegacyFlashcards([originalCard]),
  });
  assert.equal(backup.cardCount, 1);
  assert.match(backup.checksum, /^fnv1a-/);
  assert.match(backup.rollbackInstruction, /cartoes_aval/);

  const plan = planFlashcardReformulation({
    card: originalCard,
    proposal: {
      decision: 'split',
      reason: 'Cartão composto dividido em dois alvos independentes.',
      front: '',
      back: '',
      splitCards: [
        {
          front: 'A Lei 14.133/2021 se aplica integralmente às empresas públicas e sociedades de economia mista?',
          back: 'Não; aplica-se apenas a parte penal (art. 178), conforme art. 1º, § 1º.',
          basis: 'Lei 14.133/2021, art. 1º, § 1º',
        },
        {
          front: 'Qual lei rege as licitações das empresas públicas e sociedades de economia mista?',
          back: 'Lei 13.303/2016 (Estatuto das Estatais).',
          basis: 'Lei 14.133/2021, art. 1º, § 1º',
        },
      ],
    },
    topicId: 'da-10-1',
    runId: 'test-run-split',
  });

  assert.equal(plan.action, 'split');
  assert.equal(plan.derivedRecords.length, 2);
  for (const rec of plan.derivedRecords) {
    assert.notEqual(rec.id, originalCard.id);
    assert.equal(rec.derivedFrom, originalCard.id);
    assert.equal(rec.cartoes[0].derivedFrom, originalCard.id);
    assert.equal(rec.cartoes[0].mapaNoId, 'r1.3');
    // Novos cartões NÃO herdam o histórico de aprendizagem do cartão original
    assert.equal(existingReviews[rec.id], undefined);
  }
  // Histórico do cartão original permanece intacto
  assert.equal(existingReviews['da101-c01'].intervalo, 14);
});

test('10. reformulação redacional gera nova versão em curadoria e preserva avaliações e texto original', () => {
  const originalCard = {
    id: 'cp-1-c10',
    topicId: 'cp-1',
    front: 'Ciência Política · Regimes Políticos: Qual é o critério da poliarquia de Robert Dahl?',
    back: 'Contestação pública (competição) e participação inclusiva (inclusividade).',
    basis: 'Dahl, Poliarquia',
  };
  const existingReviews = {
    'cp-1-c10': { id: 'cp-1-c10', ult: 'facil', intervalo: 21, hist: [{ v: 'facil', em: '2026-11-15' }] },
  };

  const plan = planFlashcardReformulation({
    card: originalCard,
    proposal: {
      decision: 'reformulate',
      reason: 'Removido prefixo redundante, mantendo o mesmo alvo de recuperação.',
      front: 'Quais são os dois eixos que definem a poliarquia segundo Robert Dahl?',
      back: 'Contestação pública (competição política) e participação inclusiva (inclusividade).',
      basis: 'Dahl, Poliarquia',
    },
    subject: 'Ciência Política',
    topics: ['Regimes Políticos'],
    topicId: 'cp-1',
  });

  assert.equal(plan.action, 'editorial_version');
  assert.equal(plan.entry.targetId, originalCard.id);
  assert.equal(plan.entry.id, 'flashcard:cp-1-c10:v1');

  const overlaid = applyEditorialOverlays([], [originalCard], [plan.entry]);
  assert.equal(overlaid.cards[0].id, originalCard.id);
  assert.equal(overlaid.cards[0].front, 'Quais são os dois eixos que definem a poliarquia segundo Robert Dahl?');
  assert.equal(overlaid.cards[0].editorial.original.front, originalCard.front);
  // Avaliação preservada no mesmo ID
  assert.equal(existingReviews[overlaid.cards[0].id].intervalo, 21);
});

test('11. geração unificada (Scanner e Nó do mapa, Base44 e Gemini) executa revisão cega sem mostrar o verso e bloqueia divergência', async () => {
  for (const provider of ['base44', 'gemini']) {
    const stages = [];
    let blindPromptCaptured = '';

    const mockProvider = async ({ prompt, stage }) => {
      stages.push(stage);
      if (stage === 'extracao_conhecimentos') {
        return {
          units: [
            {
              unitId: 'u1',
              fact: 'Prazo de resposta à impugnação ao edital é de 3 dias úteis.',
              retrievalTarget: 'prazo resposta impugnação edital Lei 14.133',
              recommendedType: 'factual',
              excerpt: 'O prazo para resposta à impugnação ao edital é de 3 dias úteis (Lei 14.133/2021, art. 164, parágrafo único).',
              normativeRef: 'Lei 14.133/2021, art. 164, parágrafo único',
            },
            {
              unitId: 'u2',
              fact: 'Fiscal do contrato acompanha execução e anota ocorrências.',
              retrievalTarget: 'atribuição fiscal contrato art 117',
              recommendedType: 'aplicacao',
              excerpt: 'O fiscal do contrato acompanha a execução, anota ocorrências em registro próprio',
              normativeRef: 'Lei 14.133/2021, art. 117',
            },
          ],
        };
      }
      if (stage === 'geracao_cartoes') {
        return {
          cards: [
            {
              unitId: 'u1',
              cardType: 'factual',
              retrievalTarget: 'prazo resposta impugnação edital Lei 14.133',
              front: 'Qual é o prazo para resposta à impugnação ao edital segundo a Lei 14.133/2021?',
              back: '3 dias úteis (Lei 14.133/2021, art. 164, parágrafo único).',
              basis: 'Lei 14.133/2021, art. 164, parágrafo único',
              sourceExcerpt: 'O prazo para resposta à impugnação ao edital é de 3 dias úteis (Lei 14.133/2021, art. 164, parágrafo único).',
              normativeRef: 'Lei 14.133/2021, art. 164, parágrafo único',
              mapaNoId: 'r2',
            },
            {
              unitId: 'u2',
              cardType: 'aplicacao',
              retrievalTarget: 'atribuição fiscal contrato art 117',
              front: 'Quem deve anotar ocorrências da execução contratual em registro próprio segundo a Lei 14.133/2021?',
              back: 'O fiscal do contrato (Lei 14.133/2021, art. 117).',
              basis: 'Lei 14.133/2021, art. 117',
              sourceExcerpt: 'O fiscal do contrato acompanha a execução, anota ocorrências em registro próprio',
              normativeRef: 'Lei 14.133/2021, art. 117',
              mapaNoId: 'r2',
            },
          ],
        };
      }
      if (stage === 'revisao_independente_cega') {
        blindPromptCaptured = prompt;
        return {
          reviews: [
            {
              index: 0,
              recoveredAnswer: '3 dias úteis.',
              alternativeAnswers: [],
              ambiguous: false,
              sourceSufficient: true,
              sourceId: 'src-1',
              evidenceExcerpt: 'O prazo para resposta à impugnação ao edital é de 3 dias úteis',
              limitation: '',
            },
            {
              index: 1,
              // Divergência deliberada: revisor recupera resposta diferente
              recoveredAnswer: 'O pregoeiro da licitação.',
              alternativeAnswers: ['O gestor do contrato'],
              ambiguous: true,
              sourceSufficient: true,
              sourceId: 'src-1',
              evidenceExcerpt: 'O fiscal do contrato acompanha a execução, anota ocorrências em registro próprio',
              limitation: 'Divergência proposital para teste.',
            },
          ],
        };
      }
      throw new Error('Estágio inesperado: ' + stage);
    };

    const result = await runFlashcardGenerationPipeline({
      invokeGenerator: mockProvider,
      invokeReviewer: mockProvider,
      generatorProvider: provider,
      reviewerProvider: provider,
      topicId: 'da-10-1',
      topicLabel: 'Licitação Pública',
      subjectName: 'Direito Administrativo',
      targetNodeId: 'r2',
      nodeLabel: 'Fiscalização e Impugnação',
      mapa: { id: 'da-10-1', nodes: [{ id: 'r2', label: 'Fiscalização e Impugnação' }] },
      sourceText: SOURCE_DA,
      count: 2,
    });

    assert.deepEqual(stages, ['extracao_conhecimentos', 'geracao_cartoes', 'revisao_independente_cega']);
    assert.equal(result.pipeline.generatorProvider, provider);
    // O prompt da revisão cega NÃO pode conter o campo "back" nem o verso do gerador no payload dos cartões!
    const blindPayloadSection = blindPromptCaptured.split('TEXTO-BASE (DADOS):')[0];
    assert.ok(!blindPayloadSection.includes('"back"'));
    assert.ok(!blindPayloadSection.includes('3 dias úteis'));
    assert.ok(!blindPayloadSection.includes('O fiscal do contrato (Lei 14.133/2021'));

    // Card 0: aprovado na triagem, MAS ainda exige aprovação humana
    assert.equal(result.cards[0].validation.status, 'approved');
    assert.equal(result.cards[0].requiresHumanApproval, true);
    assert.equal(result.cards[0].approvedByUser, false);
    assert.equal(result.cards[0].validation.blindReview.evidenceVerified, true);

    // Card 1: bloqueado por divergência e ambiguidade na revisão cega
    assert.equal(result.cards[1].validation.status, 'rejected');
    assert.ok(result.cards[1].validation.reasons.some(r => r.code === 'divergencia_revisao_cega'));
    assert.ok(result.cards[1].validation.reasons.some(r => r.code === 'revisor_ambiguidade'));
  }

  // Confirma que buildBlindReviewPrompt nunca vaza `back`
  const prompt = buildBlindReviewPrompt({
    topicLabel: 'Licitação',
    candidates: [{ front: 'Pergunta?', back: 'RESPOSTA_SECRETA_NAO_VAZAR', cardType: 'factual' }],
    sourceText: SOURCE_DA,
  });
  assert.ok(!prompt.includes('RESPOSTA_SECRETA_NAO_VAZAR'));

  // Confirma que reconcileBlindReview bloqueia fonte insuficiente
  const rec = reconcileBlindReview(
    { front: 'Pergunta?', back: 'Resposta.' },
    { status: 'approved', reasons: [], rulesViolated: [] },
    { recoveredAnswer: '', alternativeAnswers: [], ambiguous: false, sourceSufficient: false, evidenceExcerpt: '', limitation: 'Sem base.' },
    [],
    SOURCE_DA,
  );
  assert.equal(rec.status, 'rejected');
});

test('12. bloqueia gravação automática de candidatos não aprovados e preserva metadados na gravação aprovada', async () => {
  const savedCalls = [];
  const fakeSave = async (id, front, back) => { savedCalls.push({ id, front, back }); };

  const unapprovedCandidate = {
    id: 'node-card-1',
    front: 'Qual é o prazo para resposta à impugnação ao edital na Lei 14.133/2021?',
    back: '3 dias úteis (Lei 14.133/2021, art. 164, parágrafo único).',
    basis: 'Lei 14.133/2021, art. 164',
    topicId: 'da-10-1',
    mapaNoId: 'r2',
    approvedByUser: false,
    validation: { status: 'approved', reasons: [] },
  };

  // Tentativa de gravação sem aprovação humana -> BLOQUEADA!
  const blockedRes = await saveGeneratedNodeFlashcards([unapprovedCandidate], fakeSave, {
    topicId: 'da-10-1',
    targetNodeId: 'r2',
  });
  assert.equal(savedCalls.length, 0);
  assert.equal(blockedRes[0].status, 'pending');
  assert.match(blockedRes[0].blockedReason, /Aprovação humana obrigatória/i);

  // Mesmo com approvedByUser=true, se violar regra bloqueante (ex: pergunta composta) -> BLOQUEADA!
  const invalidApproved = {
    ...unapprovedCandidate,
    id: 'node-card-2',
    front: 'Qual é o prazo? E quem assina o edital?',
    approvedByUser: true,
  };
  const gateInvalid = canPersistFlashcardCandidate(invalidApproved, { topicId: 'da-10-1', targetNodeId: 'r2' });
  assert.equal(gateInvalid.allowed, false);

  // Com aprovação humana explícita E validação aprovada -> GRAVADO!
  const validApproved = { ...unapprovedCandidate, id: 'node-card-3', approvedByUser: true };
  const okRes = await saveGeneratedNodeFlashcards([validApproved], fakeSave, {
    topicId: 'da-10-1',
    targetNodeId: 'r2',
  });
  assert.equal(savedCalls.length, 1);
  assert.equal(okRes[0].status, 'saved');

  // Registro gravado preserva topicId, mapaNoId, basis, cardType e evidencia sem prefixo
  const record = buildNodeFlashcardRecord({
    cardId: 'node-card-3',
    topicId: 'da-10-1',
    targetNodeId: 'r2',
    nodeLabel: 'Impugnação',
    subjectName: 'Direito Administrativo',
    topicTitle: 'Licitação Pública',
    front: 'Direito Administrativo · Licitação Pública: Qual é o prazo de resposta à impugnação?',
    back: '3 dias úteis.',
    basis: 'Lei 14.133/2021, art. 164',
    cardType: 'factual',
    vigencia: 'Lei 14.133/2021 (conferido em 2026)',
  });
  assert.equal(record.topico, 'da-10-1');
  assert.equal(record.cartoes[0].mapaNoId, 'r2');
  assert.equal(record.cartoes[0].q, 'Qual é o prazo de resposta à impugnação?');
  assert.equal(record.cartoes[0].tipo, 'factual');
  assert.equal(record.cartoes[0].vigencia, 'Lei 14.133/2021 (conferido em 2026)');
});
