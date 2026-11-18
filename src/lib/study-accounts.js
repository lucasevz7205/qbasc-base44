import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireUser } from '@/lib/auth-middleware';
import { adaptStudy } from './qb-real-model.js';
import { STUDY_ACTIVITIES, mergeStudyClockRecord, studyTimeTotal } from './study-clock.js';
import { ganSourcePassages } from './gan-grounding.js';
import { buildGanSource, buildGanQuestionRecord, isApprovedGanQuestion } from './gan-queue.js';
import { ACCOUNT_COLLECTION, IMPORTABLE, PERSONAL_WRITE, READABLE, workspaceCollection, bankQuestion, resetImportedDocument, canUseArchitect } from './account-boundary';

const accountId = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const documentId = z.string().min(1).max(160).refine(id => !['__proto__', 'prototype', 'constructor'].includes(id));
const document = z.record(z.string(), z.unknown());
const admin = context => {
  if (context.user.role !== 'admin') throw new Error('Acesso administrativo restrito.');
  return context.getBase44().asServiceRole.entities;
};

async function pageAll(entity, filter, order = 'id') {
  const output = [];
  for (let offset = 0; offset < 20000; offset += 250) {
    const rows = await entity.filter(filter, order, 250, offset);
    output.push(...rows);
    if (rows.length < 250) return output;
  }
  throw new Error('A coleção excede o limite de consulta.');
}

async function unique(entities, collection, id) {
  const rows = await entities.ClaudeDocument.filter({ collection, legacy_id: id }, 'id', 2);
  if (rows.length > 1) throw new Error('Identificador duplicado na coleção.');
  return rows[0];
}

async function decode(entities, row) {
  const value = JSON.parse(row.payload_json);
  if (!value._claudeParts) return { ...value, id: row.legacy_id };
  const fragmentId = value.fragmentId || row.legacy_id;
  const pieces = await pageAll(entities.ClaudeDocumentPart, { collection: row.collection, legacy_id: fragmentId }, 'part');
  if (pieces.length !== value._claudeParts || pieces.some((piece, index) => piece.part !== index)) throw new Error('Documento incompleto.');
  return { ...JSON.parse(pieces.map(piece => piece.payload_chunk).join('')), id: row.legacy_id };
}

async function loadDocuments(entities, collection) {
  const rows = await pageAll(entities.ClaudeDocument, { collection });
  const out = [];
  for (let i = 0; i < rows.length; i += 8)
    out.push(...await Promise.all(rows.slice(i, i + 8).map(row => decode(entities, row))));
  return out;
}

async function write(entities, collection, id, data, skipExisting = false, merge) {
  const prior = await unique(entities, collection, id);
  if (prior && skipExisting) return false;
  const value = { ...(prior && merge ? merge(await decode(entities, prior), data) : data), id };
  // Reserved fragment markers belong to storage, not to imported data.
  delete value._claudeParts;
  delete value.fragmentId;
  let payload_json = JSON.stringify(value);
  if (payload_json.length > 150000) throw new Error('Documento acima de 150 mil caracteres.');
  if (payload_json.length > 6500) {
    const fragmentId = 'qbasc-fragment-' + crypto.randomUUID();
    const codePoints = Array.from(payload_json);
    let part = 0;
    for (let i = 0; i < codePoints.length; i += 3100)
      await entities.ClaudeDocumentPart.create({ collection, legacy_id: fragmentId, part: part++, payload_chunk: codePoints.slice(i, i + 3100).join('') });
    payload_json = JSON.stringify({ _claudeParts: part, fragmentId });
  }
  if (prior) await entities.ClaudeDocument.update(prior.id, { payload_json });
  else await entities.ClaudeDocument.create({ collection, legacy_id: id, payload_json, source: 'qbasc-espaço-individual' });
  return value;
}

async function account(entities, id) {
  accountId.parse(id);
  const row = await unique(entities, ACCOUNT_COLLECTION, id);
  return row ? decode(entities, row) : null;
}

async function requireAccount(entities, id) {
  const result = await account(entities, id);
  if (!result) throw new Error('Conta não cadastrada no ambiente de estudo.');
  return result;
}

export async function prepareGanSourcePassages(context, request) {
  const user = context.user;
  const entities = context.getBase44().asServiceRole.entities;
  const collection = user.role === 'admin' ? 'materiais' : workspaceCollection(accountId.parse(user.id), 'materiais');
  const materials = await loadDocuments(entities, collection);
  return ganSourcePassages(materials, request);
}

export async function preparePersonalMapGan(context, request) {
  const { user } = context;
  if (user?.role !== 'user') throw new Error('Acesso ao espaço de estudo indisponível.');
  const id = accountId.parse(user.id);
  const entities = context.getBase44().asServiceRole.entities;
  const profile = await requireAccount(entities, id);
  if (profile.status !== 'active') throw new Error('Acesso ao espaço de estudo indisponível.');
  const topic = await unique(entities, workspaceCollection(id, 'edital'), documentId.parse(request.topicId));
  if (!topic) throw new Error('O assunto não pertence ao seu espaço de estudo.');
  const revisions = await loadDocuments(entities, workspaceCollection(id, 'revisao'));
  const { QB_DATA } = adaptStudy({
    edital: [await decode(entities, topic)],
    revisao: revisions.filter(row => (row.topico || row.id.replace(/\.(mapa|cartoes)$/, '')) === request.topicId),
  }, user);
  const chosen = QB_DATA.mindMaps.find(map => map.topicId === request.topicId);
  const node = chosen?.nodes.find(entry => entry.id === request.targetNodeId);
  if (!node) throw new Error('O nó não pertence ao mapa deste assunto.');
  return {
    data: buildGanSource({ chosen, nodes: chosen.nodes, concepts: QB_DATA.concepts, node, count: request.count }),
    async persist(items) {
      const records = [];
      for (const item of items.filter(isApprovedGanQuestion)) {
        const record = buildGanQuestionRecord(item, { chosen, node, queue: request.queue });
        const stored = await write(entities, workspaceCollection(id, 'questoes'), record.id, record, true);
        if (!stored) throw new Error('O identificador desta questão já está em uso.');
        records.push(stored);
      }
      return records;
    },
  };
}

export async function requireArchitectAccess(context) {
  const { user } = context;
  if (user?.role === 'admin') return null;
  if (user?.role !== 'user' || !user.id) throw new Error('O Arquiteto ainda não está liberado para esta conta.');
  const profile = await account(context.getBase44().asServiceRole.entities, user.id);
  if (!canUseArchitect(user, profile)) throw new Error('O Arquiteto ainda não está liberado para esta conta.');
  return profile;
}

export const loadPersonalStudy = createServerFn({ method: 'POST' })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { user } = context;
    if (user.role === 'admin') throw new Error('O ambiente administrativo usa o espaço original.');
    const id = accountId.parse(user.id);
    const entities = context.getBase44().asServiceRole.entities;
    let profile = await account(entities, id);
    if (!profile) {
      await write(entities, ACCOUNT_COLLECTION, id, {
        name: user.full_name || user.name || 'Candidato',
        email: user.email || '',
        status: 'pending',
        exam: '',
        requestedAt: new Date().toISOString(),
      }, true);
      profile = await requireAccount(entities, id);
    }
    if (profile.status !== 'active') return { profile, records: null };
    const records = {};
    for (let i = 0; i < READABLE.length; i += 4) {
      await Promise.all(READABLE.slice(i, i + 4).map(async key => {
        records[key] = await loadDocuments(entities, workspaceCollection(id, key));
      }));
    }
    return { profile, records };
  });

export const writePersonalStudy = createServerFn({ method: 'POST' })
  .middleware([requireUser])
  .validator(z.object({ collection: z.enum(PERSONAL_WRITE), id: documentId, value: document }).strict())
  .handler(async ({ context, data }) => {
    const id = context.user.id;
    const entities = context.getBase44().asServiceRole.entities;
    const profile = await requireAccount(entities, id);
    if (profile.status !== 'active') throw new Error('Acesso ao espaço de estudo indisponível.');
    return write(entities, workspaceCollection(id, data.collection), data.id, data.value);
  });

const clockTime = z.number().int().min(0).max(25 * 60 * 60 * 1000);
const clockRecord = z.object({
  id: z.string().max(48),
  sessionId: z.uuid(),
  date: z.iso.date(),
  startedAt: z.number().int().positive().max(253402300799999),
  time: z.object(Object.fromEntries(Object.keys(STUDY_ACTIVITIES).map(kind => [kind, clockTime]))).strict(),
}).strict().refine(row => row.id === row.sessionId + ':' + row.date && studyTimeTotal(row.time) > 0);

async function studyClockAccess(context) {
  const user = context.user;
  const id = accountId.parse(user.id);
  const entities = context.getBase44().asServiceRole.entities;
  if (user.role !== 'admin' && (user.role !== 'user' || (await requireAccount(entities, id)).status !== 'active')) {
    throw new Error('Acesso ao espaço de estudo indisponível.');
  }
  return { entities, collection: 'qbasc-tempo:' + id };
}

export const listStudyClockRecords = createServerFn({ method: 'GET' })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { entities, collection } = await studyClockAccess(context);
    return loadDocuments(entities, collection);
  });

export const saveStudyClockRecords = createServerFn({ method: 'POST' })
  .middleware([requireUser])
  .validator(z.object({ accountId, records: z.array(clockRecord).min(1).max(20) }).strict())
  .handler(async ({ context, data }) => {
    if (context.user.id !== data.accountId) throw new Error('A conta da sessão mudou.');
    const { entities, collection } = await studyClockAccess(context);
    const saved = [];
    for (const record of data.records) {
      saved.push(await write(entities, collection, record.id, record, false, mergeStudyClockRecord));
    }
    return saved;
  });

export const listStudyAccounts = createServerFn({ method: 'GET' })
  .middleware([requireUser])
  .handler(({ context }) => loadDocuments(admin(context), ACCOUNT_COLLECTION));

export const updateStudyAccount = createServerFn({ method: 'POST' })
  .middleware([requireUser])
  .validator(z.object({ id: accountId, exam: z.string().trim().max(160), status: z.enum(['pending', 'active', 'suspended']) }).strict())
  .handler(async ({ context, data }) => {
    const entities = admin(context);
    const profile = await requireAccount(entities, data.id);
    return write(entities, ACCOUNT_COLLECTION, data.id, { ...profile, exam: data.exam, status: data.status });
  });

export const inspectStudyAccount = createServerFn({ method: 'GET' })
  .middleware([requireUser])
  .validator(z.object({ id: accountId }).strict())
  .handler(async ({ context, data }) => {
    const entities = admin(context);
    await requireAccount(entities, data.id);
    const edital = await loadDocuments(entities, workspaceCollection(data.id, 'edital'));
    const counts = await Promise.all(['questoes', 'revisao'].map(async key =>
      (await pageAll(entities.ClaudeDocument, { collection: workspaceCollection(data.id, key) })).length));
    return { edital: edital.map(({ id, materia, num, titulo }) => ({ id, materia, num, titulo })), questions: counts[0], revisions: counts[1] };
  });

export const importStudyDocuments = createServerFn({ method: 'POST' })
  .middleware([requireUser])
  .validator(z.object({ id: accountId, collection: z.enum(IMPORTABLE), rows: z.array(document).min(1).max(20) }).strict())
  .handler(async ({ context, data }) => {
    const entities = admin(context);
    await requireAccount(entities, data.id);
    const rows = data.rows.map(row => {
      documentId.parse(row.id);
      if (data.collection === 'edital' && (typeof row.materia !== 'string' || !row.materia.trim() || typeof row.titulo !== 'string')) {
        throw new Error('Cada tópico do edital precisa de id, materia e titulo.');
      }
      const clean = resetImportedDocument(data.collection, row);
      if (JSON.stringify(clean).length > 150000) throw new Error('Documento acima de 150 mil caracteres.');
      return clean;
    });
    const collection = workspaceCollection(data.id, data.collection);
    let created = 0;
    for (const row of rows) if (await write(entities, collection, row.id, row, true)) created++;
    return { created, skipped: rows.length - created };
  });

const bankFilter = z.object({ id: accountId, topicId: documentId, chapter: z.string().trim().min(1).max(120) }).strict();

async function selectBank(entities, { id, topicId, chapter }) {
  await requireAccount(entities, id);
  const target = await unique(entities, workspaceCollection(id, 'edital'), topicId);
  if (!target) throw new Error('Escolha um assunto já cadastrado nesta conta.');
  const normalized = chapter.trim().toUpperCase();
  const topic = await decode(entities, target);
  const excluded = new Set((await pageAll(entities.ClaudeDocument, { collection: 'questoes_excluidas' })).map(row => row.legacy_id));
  const records = await loadDocuments(entities, 'questoes');
  return records.filter(row => String(row.cap || '').trim().toUpperCase() === normalized
    && !excluded.has(row.id) && !row.anulada && !row.anulado && !row.foraEdital && !row.foraNivel
    && typeof row.enunciado === 'string' && row.enunciado.trim() && typeof row.gabarito === 'string' && row.gabarito.trim())
    .map(row => bankQuestion(row, topic));
}

export const previewStudyBank = createServerFn({ method: 'GET' })
  .middleware([requireUser])
  .validator(bankFilter)
  .handler(async ({ context, data }) => (await selectBank(admin(context), data)).map(({ id, code, enunciado }) => ({ id, code, enunciado })));

export const importStudyBank = createServerFn({ method: 'POST' })
  .middleware([requireUser])
  .validator(bankFilter.extend({ questionIds: z.array(documentId).min(1).max(50) }))
  .handler(async ({ context, data }) => {
    const entities = admin(context);
    const available = new Map((await selectBank(entities, data)).map(row => [row.id, row]));
    const ids = [...new Set(data.questionIds)];
    if (ids.some(id => !available.has(id))) throw new Error('Atualize a prévia e confira sua seleção.');
    let created = 0;
    for (const id of ids) if (await write(entities, workspaceCollection(data.id, 'questoes'), id, available.get(id), true)) created++;
    return { created, skipped: ids.length - created };
  });
