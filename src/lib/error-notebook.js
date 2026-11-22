const clean = value => (typeof value === 'string' ? value.trim() : '');
const answerKey = value => clean(value).toUpperCase();
const nonNegInt = value => (Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0);

/**
 * Conta quantas vezes o estudante errou uma questão (exclusivamente marcações erradas C/E).
 * Brancos, acertos com baixa confiança (chute) e itens bloqueados retornam 0.
 */
export function questionErrorCount(question) {
  if (!question?.response || question.statusConfronto === 'divergencia_bloqueada') return 0;
  const response = question.response;
  const history = Array.isArray(response.hist) ? response.hist : [];
  const graded = history.filter(item => /^(C|E)$/i.test(item?.m) && typeof item.ok === 'boolean');
  let wrong = Math.max(nonNegInt(response.erros), graded.filter(item => !item.ok).length);
  const correct = Math.max(nonNegInt(response.acertos), graded.filter(item => item.ok).length);

  if (!wrong && !correct && /^(C|E)$/i.test(response.ultimaMarcada || '')) {
    const key = answerKey(response.gabaritoUsado || question.raw?.gabarito || question.key);
    if ((key === 'C' || key === 'E') && answerKey(response.ultimaMarcada) !== key) {
      wrong = 1;
    }
  }

  return wrong;
}

/**
 * Monta o caderno de erros somente leitura agrupado por matéria e assunto,
 * incluindo apenas questões com pelo menos 1 erro registrado.
 */
export function buildErrorNotebook(questions = [], subjects = []) {
  const subjectMeta = new Map();
  const topicMeta = new Map();

  (subjects || []).forEach((subject, subjectIndex) => {
    if (!subject?.id) return;
    subjectMeta.set(subject.id, {
      id: subject.id,
      name: subject.name || subject.id,
      short: subject.short || subject.id,
      order: subjectIndex,
    });
    (subject.topics || []).forEach((topic, topicIndex) => {
      if (!topic?.id) return;
      topicMeta.set(topic.id, {
        id: topic.id,
        subjectId: subject.id,
        num: String(topic.num ?? ''),
        title: topic.title || '',
        order: topicIndex,
      });
    });
  });

  const seenIds = new Set();
  const bySubject = new Map();

  for (const question of Array.isArray(questions) ? questions : []) {
    if (!question?.id || seenIds.has(question.id)) continue;
    seenIds.add(question.id);

    const errorCount = questionErrorCount(question);
    if (!errorCount) continue;

    const topicInfo = question.topicId ? topicMeta.get(question.topicId) : null;
    const subjectId = topicInfo?.subjectId || question.subjectId || '__sem_materia__';
    const sMeta = subjectMeta.get(subjectId);

    let subjectEntry = bySubject.get(subjectId);
    if (!subjectEntry) {
      subjectEntry = {
        id: subjectId,
        name: sMeta?.name || question.subject || 'Sem matéria definida',
        short: sMeta?.short || subjectId,
        order: sMeta ? sMeta.order : Number.MAX_SAFE_INTEGER,
        questionCount: 0,
        errorCount: 0,
        topicsMap: new Map(),
      };
      bySubject.set(subjectId, subjectEntry);
    }

    const topicId = question.topicId || '__sem_assunto__';
    let topicEntry = subjectEntry.topicsMap.get(topicId);
    if (!topicEntry) {
      const label = topicInfo
        ? [topicInfo.num, topicInfo.title].filter(Boolean).join(' · ') || topicInfo.id
        : question.chapter || (topicId === '__sem_assunto__' ? 'Sem assunto vinculado' : topicId);
      topicEntry = {
        id: topicId,
        num: topicInfo?.num || '',
        title: topicInfo?.title || '',
        label,
        order: topicInfo ? topicInfo.order : Number.MAX_SAFE_INTEGER,
        questionCount: 0,
        errorCount: 0,
        questions: [],
      };
      subjectEntry.topicsMap.set(topicId, topicEntry);
    }

    topicEntry.questions.push({
      id: question.id,
      code: String(question.code || question.id),
      statement: clean(question.statement),
      key: answerKey(question.key || question.raw?.gabarito),
      explanation: clean(question.explanation),
      basis: clean(question.basis),
      trapCode: question.trap?.code || '',
      trapName: question.trap?.name || '',
      errorCount,
      subjectId,
      topicId,
    });
    topicEntry.questionCount += 1;
    topicEntry.errorCount += errorCount;
    subjectEntry.questionCount += 1;
    subjectEntry.errorCount += errorCount;
  }

  let totalQuestions = 0;
  let totalErrors = 0;

  const groupedSubjects = [...bySubject.values()]
    .map(subjectEntry => {
      const topics = [...subjectEntry.topicsMap.values()]
        .map(topicEntry => ({
          id: topicEntry.id,
          num: topicEntry.num,
          title: topicEntry.title,
          label: topicEntry.label,
          order: topicEntry.order,
          questionCount: topicEntry.questionCount,
          errorCount: topicEntry.errorCount,
          questions: topicEntry.questions.sort(
            (a, b) => b.errorCount - a.errorCount || a.code.localeCompare(b.code),
          ),
        }))
        .filter(topicEntry => topicEntry.questionCount > 0)
        .sort((a, b) => b.errorCount - a.errorCount || a.order - b.order);

      totalQuestions += subjectEntry.questionCount;
      totalErrors += subjectEntry.errorCount;

      return {
        id: subjectEntry.id,
        name: subjectEntry.name,
        short: subjectEntry.short,
        order: subjectEntry.order,
        questionCount: subjectEntry.questionCount,
        errorCount: subjectEntry.errorCount,
        topics,
      };
    })
    .filter(subjectEntry => subjectEntry.questionCount > 0)
    .sort((a, b) => b.errorCount - a.errorCount || a.order - b.order);

  return {
    totalQuestions,
    totalErrors,
    subjects: groupedSubjects.map(({ order: _order, ...rest }) => ({
      ...rest,
      topics: rest.topics.map(({ order: _topicOrder, ...topicRest }) => topicRest),
    })),
  };
}
