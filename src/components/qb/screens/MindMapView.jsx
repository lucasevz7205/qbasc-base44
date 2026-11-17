import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { MindMapCanvas } from '@/components/qb/mindmap/MindMapCanvas';
import { ConceptPanel } from '@/components/qb/mindmap/ConceptPanel';
import { GanReviewDialog } from '@/components/qb/mindmap/GanReviewDialog';
import { StudyTopicPicker } from '@/components/qb/study/StudyTopicPicker';
import { TrainingRadial } from '@/components/qb/navigation/TrainingRadial';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { Panel } from '@/components/qb/core/Panel';
import { Badge } from '@/components/qb/core/Badge';
import { Button } from '@/components/qb/core/Button';
import { useRealStudy } from '@/lib/qb-real-data';
import { StudyClockControls } from '@/components/qb/study/StudyClock';
import { useStudyActivity } from '@/lib/StudyClockContext';
import { mapNodePerformance } from '@/lib/mind-map-performance';
import { generateMindMapGanQuestions } from '@/lib/server-fns';
import { ganFailureLabel } from '@/lib/gan-diagnostics';
import { approveGanReview, ganReviewEntries } from '@/lib/gan-review';
import { findNodesWithoutQuestions, runGanQueue, buildGanSource, buildGanQuestionRecord, GAN_QUEUE_MIN_QUESTIONS, GAN_QUEUE_MAX_NODES_PER_RUN } from '@/lib/gan-queue';

export default function MindMapView({
  topicId: topicIdProp,
  studyTopicId,
  onTopic,
  recents = [],
  mapCounts = {},
  pendingReviews = [],
  selected,
  setSelected,
  returnTo,
  onReturn,
  sessionReturn,
  go,
  dispatch,
  radialOpen: radialOpenProp,
  setRadialOpen: setRadialOpenProp,
}) {
  const { QB_DATA: D, QB_EDITAL: E, save, isAdmin, accountId, cacheGanQuestions } = useRealStudy();
  const generateGanFn = useServerFn(generateMindMapGanQuestions);
  const [ganLoading, setGanLoading] = React.useState(false);
  const [ganError, setGanError] = React.useState('');
  const [ganReviews, setGanReviews] = React.useState({});
  const [ganReviewOpen, setGanReviewOpen] = React.useState(false);
  const ganReviewFocus = React.useRef(null);
  const ganReviewButton = React.useRef(null);
  const [queueRunning, setQueueRunning] = React.useState(false);
  const [queueProgress, setQueueProgress] = React.useState(null);
  const [queueReport, setQueueReport] = React.useState(null);
  const queueAutoKey = 'qb-gan-auto:' + accountId;
  const [queueAuto, setQueueAutoState] = React.useState(() => {
    try { return localStorage.getItem(queueAutoKey) === '1'; } catch { return false; }
  });
  const ganTask = React.useRef(null);
  const queueAutoDone = React.useRef(new Set());
  const setQueueAuto = value => {
    setQueueAutoState(value);
    try { localStorage.setItem(queueAutoKey, value ? '1' : '0'); } catch { /* ignore */ }
  };
  const [mapMaximized, setMapMaximized] = React.useState(false);
  const [showPanelInMax, setShowPanelInMax] = React.useState(true);

  const allSubjects = D.studySubjects?.length ? D.studySubjects : E.subjects || [];
  const foundMapByNode =
    selected && selected !== '__no_map__'
      ? D.mindMaps.find(m => m.id === selected || m.nodes.some(n => n.id === selected))
      : null;

  const topicId = topicIdProp || studyTopicId || foundMapByNode?.topicId;

  const subj =
    allSubjects.find(s => s.topics.some(t => t.id === topicId)) ||
    D.studySubjects?.find(s => s.topics.some(t => t.id === topicId));
  const topic = subj && subj.topics.find(t => t.id === topicId);

  const [localRadialOpen, setLocalRadialOpen] = React.useState(!topicId);
  const isRadialOpen = radialOpenProp !== undefined ? radialOpenProp : localRadialOpen;
  const setRadialOpen = setRadialOpenProp || setLocalRadialOpen;

  const [radialSel, setRadialSel] = React.useState({ subjectId: null, topicId: null });
  React.useEffect(() => {
    if (isRadialOpen || !topicId) setRadialSel({ subjectId: null, topicId: null });
  }, [isRadialOpen, topicId]);

  // Lookup map strictly for the chosen topicId (v3: never silently fall back to another topic's map)
  const chosen = D.mindMaps.find(m => m.topicId === topicId) || null;
  const performance = React.useMemo(() => chosen ? mapNodePerformance({
    nodes: chosen.nodes,
    rootId: chosen.id,
    topicId: chosen.topicId,
    questions: D.questions,
    flashcards: D.flashcards,
    reviews: D.reviews,
  }) : new Map(), [chosen, D.questions, D.flashcards, D.reviews]);
  const nodes = React.useMemo(() => (chosen?.nodes || []).map(item => {
    const stats = performance.get(item.id);
    return { ...item, mastery: stats?.status, performance: stats };
  }), [chosen, performance]);

  const targetNodeId =
    !selected || selected === chosen?.id
      ? chosen?.id
      : nodes.some(n => n.id === selected)
        ? selected
        : foundMapByNode && foundMapByNode.id !== chosen?.id
          ? chosen?.id
          : selected;

  const node = chosen ? nodes.find(n => n.id === targetNodeId) || null : null;
  useStudyActivity('maps', !isRadialOpen && node ? chosen.id : null);

  React.useEffect(() => {
    setGanError('');
  }, [node?.id]);

  // Fila do Arquiteto: nós-folha com resumo e menos de 2 questões vinculadas.
  const ganPending = React.useMemo(
    () => chosen ? findNodesWithoutQuestions({ nodes, concepts: D.concepts || {}, questionBank: D.questionBank || [], rootId: chosen.id }) : [],
    [chosen, nodes, D.concepts, D.questionBank],
  );
  const mapId = chosen?.id;
  const ganReview = ganReviews[mapId];
  const ganReviewPending = Boolean(ganReview?.entries.some(entry => entry.status === 'pending'));
  const openGanReview = React.useCallback(() => {
    ganReviewFocus.current = document.activeElement;
    setGanReviewOpen(true);
  }, []);
  const newGanReview = React.useCallback((entries, anchor, queue, open) => {
    if (!entries.length) return false;
    setGanReviews(current => ({ ...current, [mapId]: {
      id: entries[0].item.id, anchor, queue, entries, manual: isAdmin,
    } }));
    if (open) setGanReviewOpen(true);
    return true;
  }, [mapId, isAdmin]);
  React.useEffect(() => {
    setGanReviewOpen(false);
    setQueueReport(null);
    setQueueProgress(null);
    return () => {
      if (ganTask.current) {
        ganTask.current.stop = true;
        ganTask.current.discard = true;
      }
    };
  }, [mapId, isRadialOpen]);

  const generateNode = React.useCallback(async (target, queue, extraContext = '') => {
    const data = isAdmin
      ? buildGanSource({ chosen, nodes, concepts: D.concepts, node: target, subjectName: subj?.name })
      : { topicId: chosen.topicId, targetNodeId: target.id, count: 4, queue };
    if (isAdmin && extraContext) data.sourceContext = [data.sourceContext, extraContext].filter(Boolean).join('\n\n').slice(0, 7500);
    const res = await generateGanFn({ data });
    if (!isAdmin && !res?.falha) await cacheGanQuestions(res?.registros);
    return res;
  }, [isAdmin, chosen, nodes, D.concepts, subj?.name, generateGanFn, cacheGanQuestions]);

  const runQueue = React.useCallback(async (openReview = true) => {
    if (!chosen || isRadialOpen || ganTask.current) return;
    if (ganReviewPending) {
      if (openReview) openGanReview();
      return;
    }
    if (!ganPending.length) return;
    if (openReview) ganReviewFocus.current = document.activeElement;
    const entries = [];
    const task = { stop: false, discard: false };
    ganTask.current = task;
    setQueueRunning(true);
    setQueueReport(null);
    try {
      const report = await runGanQueue({
        chosen,
        pending: ganPending,
        generate: target => generateNode(target, true),
        onReview: isAdmin ? (target, result) => entries.push(...ganReviewEntries(target, result, true)) : undefined,
        shouldStop: () => task.stop,
        onProgress: setQueueProgress,
      });
      if (!task.discard) {
        setQueueReport(report);
        newGanReview(entries, { id: chosen.id, label: chosen.title }, true, openReview);
      }
    } finally {
      ganTask.current = null;
      setQueueRunning(false);
      setQueueProgress(null);
    }
  }, [chosen, isRadialOpen, ganPending, generateNode, isAdmin, ganReviewPending, openGanReview, newGanReview]);

  React.useEffect(() => {
    if (!queueAuto || !mapId || isRadialOpen || ganTask.current || ganReviewPending || !ganPending.length || queueAutoDone.current.has(mapId)) return;
    queueAutoDone.current.add(mapId);
    runQueue(false);
  }, [queueAuto, mapId, isRadialOpen, ganReviewPending, ganPending.length, queueRunning, ganLoading, runQueue]);

  const handleSelectTopic = nextTopicId => {
    const nextSubj = allSubjects.find(s => s.topics.some(t => t.id === nextTopicId));
    if (nextSubj) {
      setRadialSel({ subjectId: nextSubj.id, topicId: null });
    }
    setRadialOpen(false);
    if (onTopic) {
      onTopic(nextTopicId);
    } else {
      const m = D.mindMaps.find(x => x.topicId === nextTopicId);
      setSelected(m ? m.id : '__no_map__');
    }
  };

  const openRadialSelector = () => {
    setRadialSel({ subjectId: null, topicId: null });
    setRadialOpen(true);
  };

  const picker = (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, flex: '1 1 420px', maxWidth: 640, flexWrap: 'wrap' }}>
      <StudyTopicPicker
        label="Assunto do mapa"
        subjects={allSubjects}
        value={topicId}
        counts={mapCounts}
        recents={recents}
        pendingReviews={pendingReviews}
        onSelect={s => handleSelectTopic(s.topicId)}
        style={{ flex: '1 1 320px' }}
      />
      <Button
        variant={isRadialOpen ? 'primary' : 'secondary'}
        disabled={isRadialOpen && !chosen}
        icon="locate-fixed"
        onClick={() => (isRadialOpen ? setRadialOpen(false) : openRadialSelector())}
        title="Selecionar matéria e assunto pelo Menu Radial"
        style={{ minHeight: 52 }}
      >
        {isRadialOpen && chosen ? 'Ver mapa atual' : 'Menu radial'}
      </Button>
    </div>
  );

  const back = returnTo && !sessionReturn && (
    <Button variant="secondary" icon="corner-up-left" onClick={onReturn}>
      Voltar para {returnTo.label}
    </Button>
  );

  const head = (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: '1 1 280px' }}>
        <span className="qb-overline">{subj ? subj.name + ' · Mapa mental' : 'Estudo'}</span>
        <h1 style={{ font: 'var(--type-h1)', fontFamily: 'var(--font-serif)', fontWeight: 600 }}>
          {chosen ? chosen.title : topic ? `${subj.short} ${topic.num}${topic.title ? ' · ' + topic.title : ''}` : 'Mapa mental'}
        </h1>
      </div>
      {picker}
    </div>
  );

  const topicMeta = (s, t) => {
    if (!t) {
      const totalMaps = s.topics.reduce((acc, item) => acc + (mapCounts[item.id] || 0), 0);
      return {
        meta: totalMaps ? `${totalMaps} ${totalMaps > 1 ? 'mapas' : 'mapa'}` : `${s.topics.length} assuntos`,
        sub: `${s.topics.length} assuntos · ${totalMaps} com mapa mental`,
      };
    }
    const mCount = mapCounts[t.id] || 0;
    return {
      meta: mCount ? `${mCount} ${mCount > 1 ? 'mapas' : 'mapa'}` : 'Sem mapa',
      sub: mCount ? `${mCount} mapa mental disponível` : 'Sem mapa mental na base',
      badge: mCount || undefined,
      off: !mCount,
    };
  };

  if (isRadialOpen) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {head}
        <Panel variant="ornate" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Seleção anterior · Menu Radial</span>
              <h2 style={{ font: 'var(--type-h2)', fontFamily: 'var(--font-serif)', fontWeight: 600 }}>Escolha a matéria e entre no assunto</h2>
            </div>
            {chosen && (
              <Button variant="secondary" size="sm" icon="network" onClick={() => setRadialOpen(false)}>
                Abrir mapa de {subj?.short} {topic?.num}
              </Button>
            )}
          </div>
          <TrainingRadial
            subjects={allSubjects}
            value={radialSel}
            onChange={setRadialSel}
            onSelectTopic={({ topicId: pickedTopicId }) => handleSelectTopic(pickedTopicId)}
            topicMeta={topicMeta}
          />
        </Panel>
      </div>
    );
  }

  if (!chosen || !node) {
    const firstTopicWithMap = D.mindMaps[0]?.topicId;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {head}
        <Panel style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <EmptyState
            tone="unavailable"
            icon="link"
            title={!chosen ? 'Nenhum mapa vinculado a este assunto' : 'Nó não encontrado neste mapa'}
            description={
              !chosen
                ? 'Este assunto ainda não possui mapa mental na base. Nenhum outro mapa foi aberto no lugar.'
                : `O identificador “${selected}” não existe no mapa ${chosen.id}.`
            }
          />
          <code style={{ font: '400 12px/1.6 var(--font-mono)', color: 'var(--text-muted)' }}>
            topicId: {String(topicId)}{selected ? ' · nodeId: ' + selected : ''}
          </code>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {back}
            <Button icon="locate-fixed" onClick={openRadialSelector}>
              Escolher assunto no Menu Radial
            </Button>
            {chosen && (
              <Button variant="secondary" icon="network" onClick={() => setSelected(null)}>
                Abrir a raiz do mapa
              </Button>
            )}
            {!chosen && firstTopicWithMap && (
              <Button variant="secondary" icon="network" onClick={() => handleSelectTopic(firstTopicWithMap)}>
                Abrir assunto com mapa disponível
              </Button>
            )}
          </div>
        </Panel>
      </div>
    );
  }

  const expanded = [chosen.id];
  const c = D.concepts[node.id] || { summary: 'Nenhuma descrição registrada para este nó.' };
  const path = [];
  let p = nodes.find(n => n.id === node.parent);
  while (p) {
    path.unshift(p.label);
    p = nodes.find(n => n.id === p.parent);
  }
  const card = D.flashcards.filter(f => f.node === node.id || (node.id === chosen.id && f.topicId === chosen.topicId)).length;
  const qn = D.questionBank.filter(q => q.node === node.id || (node.id === chosen.id && q.topicId === chosen.topicId)).length;

  const setReviewEntry = (entry, update) => {
    setGanReviews(current => {
      const review = current[mapId];
      if (review?.id !== ganReview.id) return current;
      return { ...current, [mapId]: { ...review, entries: review.entries.map(candidate =>
        candidate.item.id === entry.item.id && candidate.status === 'pending' ? { ...candidate, ...update } : candidate,
      ) } };
    });
  };

  const approveGanEntry = async (entry, draft) => {
    if (!isAdmin || entry.status !== 'pending') return;
    const item = approveGanReview(entry.item, draft, D.questionBank);
    const record = buildGanQuestionRecord(item, { chosen, node: entry.node, queue: ganReview.queue });
    const saved = await save('questoes', record.id, record);
    if (!saved) throw new Error('Não foi possível confirmar a gravação da questão.');
    setReviewEntry(entry, { record: saved, status: 'saved' });
  };

  const trainGanReview = () => {
    const saved = ganReview.entries.filter(entry => entry.status === 'saved' && entry.record);
    if (!saved.length) return;
    const scores = saved.map(({ item }) => item.ganScore).filter(Number.isFinite);
    const questions = saved.map(({ item, node: origin, record }) => ({
      id: record.id, code: record.code, year: record.ano, tags: record.tags,
      key: record.gabarito, statement: record.enunciado, explanation: record.comentario, basis: record.ref,
      trap: record.trap, origin: record.origem, topicId: chosen.topicId, subjectId: subj?.id, subject: subj?.name,
      chapter: chosen.title, node: record.mapaNoId || origin.id, statusConfronto: record.statusConfronto,
      ganScore: item.ganScore, gabaritoGerador: item.gabaritoGerador, gabaritoDiscriminador: item.gabaritoDiscriminador,
      raw: record,
    }));
    setGanReviewOpen(false);
    go('questions', { ganBatch: {
      questions, blocked: [], originNodeId: ganReview.anchor.id, originNodeLabel: ganReview.anchor.label,
      topicId: chosen.topicId, mapTitle: chosen.title,
      summary: {
        aprovadasManual: questions.filter(q => q.statusConfronto === 'aprovada_manual').length,
        aprovadasDireto: questions.filter(q => q.statusConfronto === 'aprovada_gan').length,
        refinadasGan: questions.filter(q => q.statusConfronto === 'refinada_gan').length,
        mediaScoreGan: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      },
    } });
  };

  const handleGenerateGan = async () => {
    if (ganTask.current) return;
    if (ganReviewPending) {
      openGanReview();
      return;
    }
    ganReviewFocus.current = document.activeElement;
    const task = { stop: false, discard: false };
    ganTask.current = task;
    setGanLoading(true);
    setGanError('');

    try {
      let additionalContext = '';
      if (isAdmin) {
        const tLabel = topic
          ? (subj.short || subj.name) + ' ' + topic.num + (topic.title ? ' · ' + topic.title : '')
          : chosen.title;
        let cornell = '';
        try {
          const saved = JSON.parse(localStorage.getItem('qb-cornell::' + tLabel) || 'null');
          if (saved) cornell = [saved.cues, saved.notes, saved.summary].filter(Boolean).join('\n');
        } catch { /* storage unavailable */ }
        const relatedCards = D.flashcards
          .filter(f => f.node === node.id || f.topicId === chosen.topicId)
          .slice(0, 6)
          .map(f => `P: ${f.front} | R: ${f.back}`)
          .join('\n');
        additionalContext = [
          cornell && 'Anotações Cornell do tópico:\n' + cornell,
          relatedCards && 'Referências de revisão do tópico:\n' + relatedCards,
        ].filter(Boolean).join('\n\n');
      }
      const res = await generateNode(node, false, additionalContext);
      if (task.discard) return;
      if (res?.falha) {
        setGanError(ganFailureLabel(res.falha));
        return;
      }
      const entries = ganReviewEntries(node, res || {}, isAdmin);
      if (!newGanReview(entries, node, false, true)) setGanError('A geração não retornou questões para revisar.');
    } catch (err) {
      if (!task.discard) setGanError(err?.message || 'Não foi possível concluir o confronto GAN para este nó.');
    } finally {
      ganTask.current = null;
      setGanLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {head}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Badge tone="neutral" icon="info">Domínio baseado nas suas respostas</Badge>
        <span style={{ font: '400 12px/1.4 var(--font-mono)', color: 'var(--text-muted)' }}>
          {chosen.id} · nó {node.id}
        </span>
        <span style={{ flex: 1 }} />
        {!mapMaximized && <StudyClockControls />}
        {qn > 0 ? (
          <Button
            size="sm"
            variant="secondary"
            icon="target"
            onClick={() =>
              dispatch
                ? node.id === chosen.id
                  ? dispatch({ action: 'train', subjectId: subj?.id, topicId: chosen.topicId }, 'study')
                  : dispatch({ action: 'node-questions', subjectId: subj?.id, topicId: chosen.topicId, nodeId: node.id }, 'study')
                : go('questions', { topicId: chosen.topicId })
            }
          >
            {qn} {qn > 1 ? 'questões deste nó' : 'questão deste nó'}
          </Button>
        ) : (
          <span style={{ font: '400 13px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>
            Nenhuma questão vinculada a este nó
          </span>
        )}
      </div>
      {mapMaximized && (
        <div
          aria-hidden="true"
          onClick={() => setMapMaximized(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 69, background: 'rgba(8, 10, 15, 0.82)', backdropFilter: 'blur(6px)' }}
        />
      )}
      <div
        className={mapMaximized ? 'qb-map-full' : undefined}
        style={mapMaximized ? undefined : { display: 'flex', flexDirection: 'column', gap: 0 }}
      >
        {mapMaximized && (
          <div className="qb-map-full-header">
            <div className="qb-map-full-header__context">
              <Badge tone="gold">{subj ? subj.short : 'Mapa'} {topic?.num || ''}</Badge>
              <div className="qb-map-full-header__caption">
                <strong title={chosen.title}>{chosen.title}</strong>
                {node.id !== chosen.id && <small title={node.label}>{node.label}</small>}
              </div>
            </div>
            <div className="qb-map-full-header__picker">
              <StudyTopicPicker
                compact
                label="Trocar assunto"
                subjects={allSubjects}
                value={topicId}
                counts={mapCounts}
                recents={recents}
                pendingReviews={pendingReviews}
                onSelect={s => handleSelectTopic(s.topicId)}
              />
            </div>
            <div className="qb-map-full-header__actions">
              <StudyClockControls />
              {sessionReturn && (
                <Button size="sm" variant="secondary" icon="corner-up-left" aria-label={sessionReturn.label}
                  title={sessionReturn.label} onClick={sessionReturn.onReturn}>
                  <span className="qb-map-full-header__action-text">{sessionReturn.label}</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                icon="layout-panel-top"
                aria-label={showPanelInMax ? 'Ocultar painel lateral' : 'Mostrar painel do conceito'}
                title={showPanelInMax ? 'Ocultar painel lateral' : 'Mostrar painel do conceito'}
                onClick={() => setShowPanelInMax(v => !v)}
              >
                <span className="qb-map-full-header__action-text">{showPanelInMax ? 'Ocultar painel' : 'Mostrar painel'}</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon="x"
                aria-label="Reduzir tela (Esc)"
                title="Reduzir tela (Esc)"
                onClick={() => setMapMaximized(false)}
              >
                <span className="qb-map-full-header__action-text">Reduzir tela</span>
              </Button>
            </div>
          </div>
        )}
        {(ganPending.length > 0 || queueRunning || queueReport || ganReview) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 12px', marginBottom: 10 }}>
            <Badge tone="gold">Fila do Arquiteto</Badge>
            <span style={{ fontSize: 13 }}>
              {queueRunning && queueProgress
                ? `Gerando e confrontando ${queueProgress.atual} de ${queueProgress.total}: ${queueProgress.no}`
                : queueReport
                  ? `${isAdmin ? 'Geradas para revisão: ' + (queueReport.paraRevisao || 0) : 'Aprovadas e gravadas: ' + queueReport.aprovadas} · bloqueadas pelo confronto: ${queueReport.bloqueadas} · erros: ${queueReport.erros} · nós não processados: ${queueReport.restantes}`
                  : `${ganPending.length} nó(s) deste mapa com menos de ${GAN_QUEUE_MIN_QUESTIONS} questões.`}
            </span>
            {ganReview && (
              <Button size="sm" variant={ganReviewPending ? 'primary' : 'secondary'} icon="list-checks" ref={ganReviewButton} aria-haspopup="dialog" onClick={openGanReview}>
                {ganReviewPending ? 'Revisar questões GAN' : 'Reabrir revisão GAN'}
              </Button>
            )}
            {!queueRunning && ganPending.length > 0 && !ganReviewPending && (
              <Button size="sm" variant="secondary" icon="network" disabled={ganLoading} onClick={() => runQueue()}>
                {`Gerar pendentes (até ${GAN_QUEUE_MAX_NODES_PER_RUN} nós)`}
              </Button>
            )}
            {queueRunning && (
              <Button size="sm" variant="secondary" icon="x" onClick={() => { if (ganTask.current) ganTask.current.stop = true; }}>Parar</Button>
            )}
            <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={queueAuto} onChange={e => setQueueAuto(e.target.checked)} />
              Gerar ao abrir mapa novo
            </label>
            {queueReport?.nosComGeradorGpt > 0 && (
              <span role="status" style={{ fontSize: 13 }}>
                GPT gerou e revisou em chamadas separadas · {queueReport.nosComGeradorGpt} nó(s)
              </span>
            )}
            {queueReport?.falhas?.length > 0 && (
              <ul role="status" style={{ flexBasis: '100%', margin: 0, paddingInlineStart: 20, fontSize: 13, color: 'var(--text-secondary)', overflowWrap: 'anywhere', maxHeight: '18dvh', overflowY: 'auto' }}>
                {queueReport.falhas.map((failure, index) => (
                  <li key={index}><strong>{failure.no}</strong> · {ganFailureLabel(failure)}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div
          className={mapMaximized ? 'qb-map-full__body' : undefined}
          data-show-panel={mapMaximized ? showPanelInMax : undefined}
          style={mapMaximized ? undefined : { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch', flex: 1, minHeight: 0 }}
        >
          <MindMapCanvas
            nodes={nodes}
            selectedId={node.id}
            onSelect={setSelected}
            defaultExpanded={expanded}
            height={mapMaximized ? '100%' : 620}
            maximized={mapMaximized}
            onToggleMaximize={setMapMaximized}
            style={{ flex: '1 1 520px', minWidth: 0, height: mapMaximized ? '100%' : 620 }}
          />
          {(!mapMaximized || showPanelInMax) && (
            <ConceptPanel
              nodeId={node.id}
              title={node.label}
              path={path}
              performance={node.performance}
              summary={c.summary}
              example={c.example}
              trap={c.trap}
              connections={c.connections || []}
              sources={c.sources || []}
              onNavigate={setSelected}
              reviewCount={card || undefined}
              onReview={() => go('flashcards', { topicId: chosen.topicId })}
              onGenerateGan={handleGenerateGan}
              ganLoading={ganLoading}
              ganUnavailable={queueRunning}
              ganError={ganError}
              onOpenGanReview={ganReview?.anchor.id === node.id && !ganReview.queue ? openGanReview : undefined}
              returnTo={sessionReturn ? undefined : returnTo?.label}
              onReturn={onReturn}
              style={mapMaximized ? { height: '100%' } : { flex: '1 1 340px', maxWidth: 420, height: 620 }}
            />
          )}
        </div>
        {ganReview && <GanReviewDialog key={ganReview.id} review={ganReview} open={ganReviewOpen} onOpenChange={setGanReviewOpen}
          returnFocus={ganReviewFocus} fallbackFocus={ganReviewButton} questionBank={D.questionBank} onApprove={approveGanEntry}
          onDiscard={entry => setReviewEntry(entry, { status: 'discarded' })} onTrain={trainGanReview} />}
      </div>
    </div>
  );
}
export { MindMapView, MindMapView as MindMapScreen };