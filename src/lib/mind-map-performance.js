import {
  classifyNodes, cappedChildContribution, requiredQuestionsFor, requiredFlashcardsFor, enoughChildCoverage,
} from './mind-map-quota.js';

const cardPass = new Set(['b', 'f', 's', 'bom', 'facil', 'fácil', 'lembrei']);
const cardPartial = new Set(['d', 'p', 'dificil', 'difícil', 'parcial']);
const cardFail = new Set(['n', 'errei', 'novamente', 'não lembrei', 'nao lembrei']);
const normalize = value => String(value ?? '').trim().toLowerCase();

function cardOutcome(value) {
  const grade = normalize(value);
  if (cardPass.has(grade)) return 'correct';
  if (cardPartial.has(grade)) return 'partial';
  if (cardFail.has(grade)) return 'wrong';
  return null;
}

function questionOutcome(mark, ok, key) {
  const answer = normalize(mark);
  if (answer !== 'c' && answer !== 'e') return null;
  if (typeof ok === 'boolean') return ok ? 'correct' : 'wrong';
  const expected = normalize(key);
  return ['c','e'].includes(expected) ? (answer === expected ? 'correct' : 'wrong') : null;
}

const nonnegative = value => Math.max(0, Math.trunc(Number(value) || 0));
const bucket = () => ({ correct: 0, wrong: 0, partial: 0, evaluated: 0, latest: null });

function remember(out, outcome, timestamp) {
  if (!outcome) return;
  const parsed = Date.parse(timestamp);
  const time = Number.isFinite(parsed) ? parsed : 0;
  if (!out.latest || time > out.latest.time || (time === out.latest.time && outcome === 'wrong')) {
    out.latest = { outcome, time };
  }
}

function countQuestion(out, response, key) {
  if (!response) return;
  const history = Array.isArray(response.hist) ? response.hist : [];
  const outcomes = history.map(entry => questionOutcome(entry?.m, entry?.ok, key));
  const correct = nonnegative(response.acertos), wrong = nonnegative(response.erros);
  const countedCorrect = correct || outcomes.filter(result => result === 'correct').length;
  const countedWrong = wrong || outcomes.filter(result => result === 'wrong').length;
  const legacyOutcome = questionOutcome(response.ultimaMarcada, undefined, response.gabaritoUsado || key);
  if (countedCorrect || countedWrong || legacyOutcome) out.evaluated++;
  out.correct += countedCorrect;
  out.wrong += countedWrong;
  const last = history.findLast(entry => questionOutcome(entry?.m, entry?.ok, key));
  if (last) remember(out, questionOutcome(last.m, last.ok, key), last.em || response.atualizadoEm);
  else remember(out, legacyOutcome, response.atualizadoEm);
}

function countCard(out, review) {
  if (!review) return;
  const history = Array.isArray(review.hist) ? review.hist : [];
  const valid = history.filter(entry => cardOutcome(entry?.v));
  if (valid.length) {
    out.evaluated++;
    for (const entry of valid) out[cardOutcome(entry.v)]++;
    const last = valid.at(-1);
    remember(out, cardOutcome(last.v), last.em || review.atualizadoEm);
    return;
  }
  const current = cardOutcome(review.ult);
  if (current) {
    out[current]++;
    out.evaluated++;
  }
  remember(out, current, review.atualizadoEm);
}

function merge(target, child) {
  target.correct += child.correct;
  target.wrong += child.wrong;
  target.partial += child.partial;
  target.evaluated += child.evaluated;
  const last = child.latest;
  if (last && (!target.latest || last.time > target.latest.time || (last.time === target.latest.time && last.outcome === 'wrong'))) {
    target.latest = last;
  }
}

function summarize(stats) {
  const total = stats.correct + stats.wrong + stats.partial;
  const rate = total ? stats.correct / total * 100 : null;
  const status = !total ? 'no-evidence' : stats.latest?.outcome === 'wrong' ? 'incorrect' : rate >= 85 ? 'correct' : 'progress';
  return { ...stats, total, rate, status };
}

export function mapNodePerformance({ nodes, rootId, topicId, questions, flashcards, reviews }) {
  const keys = new Map(nodes.map(node => [node.id, { questions: bucket(), flashcards: bucket(), children: [], counted: 0, own: 0 }]));
  const structure = classifyNodes(nodes, rootId);
  for (const node of nodes) keys.get(node.parent)?.children.push(node.id);
  const scopedNode = item => keys.has(item.node) ? keys.get(item.node) : item.topicId === topicId ? keys.get(rootId) : undefined;

  for (const q of questions) {
    if (q.raw?.foraNivel || /^SIM/i.test(String(q.raw?.cap || ''))) continue;
    const node = scopedNode(q);
    if (node) countQuestion(node.questions, q.response, q.key);
  }
  for (const card of flashcards) {
    const node = scopedNode(card);
    if (node) countCard(node.flashcards, reviews[card.id]);
  }

  const visited = new Set();
  function rollup(id) {
    const node = keys.get(id);
    if (!node || visited.has(id)) return;
    visited.add(id);
    node.own = node.questions.evaluated + node.flashcards.evaluated;
    const shape = structure.get(id);
    let counted = node.own, covered = 0;
    for (const childId of node.children) {
      rollup(childId);
      const child = keys.get(childId);
      merge(node.questions, child.questions);
      merge(node.flashcards, child.flashcards);
      const childEvaluated = child.questions.evaluated + child.flashcards.evaluated;
      if (childEvaluated) covered++;
      counted += cappedChildContribution(childEvaluated, shape?.quota || 0, node.children.length);
    }
    node.counted = counted;
    node.covered = covered;
  }
  rollup(rootId);
  return new Map([...keys].map(([id, node]) => {
    const questions = summarize(node.questions);
    const flashcards = summarize(node.flashcards);
    const evidence = [questions, flashcards].filter(item => item.total);
    const shape = structure.get(id) || { kind: 'subramo', quota: 1, leaves: 1, children: [] };
    const requiredQuestions = Math.max(0, requiredQuestionsFor(shape.kind, shape.quota) - questions.evaluated);
    const requiredFlashcards = Math.max(0, requiredFlashcardsFor(shape.kind) - flashcards.evaluated);
    const coverageOk = enoughChildCoverage(shape.children.length, node.covered || 0);
    const remaining = Math.max(shape.quota - node.counted, requiredQuestions + requiredFlashcards, coverageOk ? 0 : 1);
    const status = remaining ? 'insufficient'
      : !evidence.length ? 'no-evidence'
      : evidence.some(item => item.latest?.outcome === 'wrong') ? 'incorrect'
        : evidence.every(item => item.rate >= 85) ? 'correct' : 'progress';
    return [id, { questions, flashcards, status, remaining, requiredQuestions, requiredFlashcards, quota: shape.quota, kind: shape.kind, coverageOk, includesChildren: node.children.length > 0 }];
  }));
}
