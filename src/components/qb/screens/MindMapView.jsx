import { useMapGeneration } from '@/lib/map-generation';
import { MapImport } from '@/components/qb/mindmap/MapImport';
import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { MindMapCanvas } from '@/components/qb/mindmap/MindMapCanvas';
import { ConceptPanel } from '@/components/qb/mindmap/ConceptPanel';
import { GanPackageDialog } from '@/components/qb/mindmap/GanPackageDialog';
import { GanReviewDialog } from '@/components/qb/mindmap/GanReviewDialog';
import { NodeFlashcardReviewDialog } from '@/components/qb/mindmap/NodeFlashcardReviewDialog';
import { StudyTopicPicker } from '@/components/qb/study/StudyTopicPicker';
import { TrainingRadial } from '@/components/qb/navigation/TrainingRadial';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { Panel } from '@/components/qb/core/Panel';
import { Badge } from '@/components/qb/core/Badge';
import { Button } from '@/components/qb/core/Button';
import { useRealStudy } from '@/lib/qb-real-data';
import { StudyClockControls } from '@/components/qb/study/StudyClock';
import { useStudyActivity } from '@/lib/StudyClockContext';
import { conceptReviewItems } from '@/lib/concept-review';
import { mapNodePerformance } from '@/lib/mind-map-performance';
import { generateMindMapFlashcards, generateMindMapGanQuestions } from '@/lib/server-fns';
import { approvePersonalMapGan } from '@/lib/study-accounts';
import { buildNodeFlashcardRecord } from '@/lib/node-flashcards';
import { ganFailureLabel } from '@/lib/gan-diagnostics';
import { approveGanReview, ganReviewEntries } from '@/lib/gan-review';
import { centralGanRound, buildGanSource, buildGanQuestionRecord } from '@/lib/gan-queue';

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
  radialOpen: radialOpenProp,
  setRadialOpen: setRadialOpenProp,
}) {
  const { QB_DATA: D, QB_EDITAL: E, save, importMap, isAdmin, cacheGanQuestions, saveNodeFlashcard } = useRealStudy();
  const generateGanFn = useServerFn(generateMindMapGanQuestions);
  const approvePersonalGanFn = useServerFn(approvePersonalMapGan);
  const generateFlashcardsFn = useServerFn(generateMindMapFlashcards);
  const [flashcardReviewOpen, setFlashcardReviewOpen] = React.useState(false);
  const flashcardFocus = React.useRef(null);
  const [ganPackageNode, setGanPackageNode] = React.useState(null);
  const [ganReviewOpen, setGanReviewOpen] = React.useState(false);
  const ganReviewFocus = React.useRef(null);
  const ganReviewButton = React.useRef(null);
  const { flashcardsLoading, setFlashcardsLoading, flashcardReviews, setFlashcardReviews, ganLoading, setGanLoading, ganError, setGanError, ganReviews, setGanReviews, ganTask, setNotice } = useMapGeneration();
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
  const chosen = (foundMapByNode?.topicId===topicId && foundMapByNode) || D.mindMaps.find(m => m.topicId === topicId) || null;
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
    setFlashcardReviewOpen(false);
  }, [node?.id, isRadialOpen]);
  const flashcardReview = flashcardReviews[node?.id];

  const mapId = chosen?.id;
  const ganReview = ganReviews[mapId];
  const ganReviewPending = Boolean(ganReview?.entries.some(entry => entry.status === 'pending'));
  const openGanReview = React.useCallback(event => {
    ganReviewFocus.current = event.currentTarget;
    setGanReviewOpen(true);
  }, []);
  const newGanReview = (entries, anchor) => {
    if (!entries.length) return;
    setGanReviews(current => ({ ...current, [mapId]: {
      id: entries[0].item.id, anchor, entries, manual: true,
    } }));

  };
  React.useEffect(() => {
    setGanReviewOpen(false);
    setGanPackageNode(null);

  }, [mapId, isRadialOpen]);

  const generateNode = async (target, count, extraContext) => {
    const data = isAdmin
      ? buildGanSource({ chosen, nodes, concepts: D.concepts, node: target, count, subjectName: subj?.name })
      : { topicId: chosen.topicId, targetNodeId: target.id, count };
    if (isAdmin && extraContext) data.sourceContext = [data.sourceContext, extraContext].filter(Boolean).join('\n\n').slice(0, 7500);
    const result = await generateGanFn({ data });
    if (result?.registros?.length) await cacheGanQuestions(result.registros);
    return result;
  };

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
      <MapImport topics={allSubjects.flatMap(s=>s.topics.map(t=>({id:t.id,label:s.name+' · '+t.title})))} maps={D.mindMaps.map(m=>({...m,active:m.id===chosen?.id}))} initial={topicId} onSave={importMap} onOpen={(tid,id)=>{handleSelectTopic(tid);setSelected(id)}}/>
      {D.mindMaps.filter(m=>m.topicId===topicId).length>1 && <label>Mapa <select value={chosen?.id} onChange={e=>{setSelected(e.target.value);setRadialOpen(false)}}>{D.mindMaps.filter(m=>m.topicId===topicId).map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>}
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
  const review = conceptReviewItems(chosen, node.id, D.questionBank, D.flashcards);
  const concept = { nodeId: node.id, label: node.label, topicId: chosen.topicId, cardIds: review.cardIds };
  const reviewQuestions = () => go('questions', { topicId: chosen.topicId, questionIds: review.questionIds, filter: 'all', concept });
  const reviewCards = () => go('flashcards', { topicId: chosen.topicId, cardIds: review.cardIds, concept });
  const qn = review.questionIds.length;

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
    if (entry.status !== 'pending') return;
    let saved;
    if (isAdmin) {
      const item = approveGanReview(entry.item, draft, D.questionBank);
      const record = buildGanQuestionRecord(item, { chosen, node: entry.node });
      saved = await save('questoes', record.id, record);
    } else {
      saved = await approvePersonalGanFn({ data: {
        topicId: chosen.topicId, targetNodeId: entry.node.id, reviewId: entry.reviewId, questionId: entry.item.id, draft,
      } });
      if (saved) await cacheGanQuestions([saved]);
    }
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

  const updateFlashcard = (cardId, update) => {
    setFlashcardReviews(current => ({
      ...current,
      [node.id]: current[node.id].map(item => item.id === cardId ? { ...item, ...update } : item),
    }));
  };

  const approveFlashcard = async (cardId, front, back) => {
    const data = { cardId, topicId: chosen.topicId, targetNodeId: node.id, front, back };
    if (isAdmin) {
      const record = buildNodeFlashcardRecord({ ...data, nodeLabel: node.label });
      await save('revisao', record.id, record);
    } else {
      await saveNodeFlashcard(data);
    }
    updateFlashcard(cardId, { front, back, status: 'saved' });
  };

  const handleGenerateFlashcards = async event => {
    if (ganTask.current) return;
    flashcardFocus.current = event.currentTarget;
    if (flashcardReview?.some(item => !item.status)) {
      setFlashcardReviewOpen(true);
      return;
    }
    const task = { discard: false };
    ganTask.current = task;
    setFlashcardsLoading(true);
    setNotice('Gerando flashcards de ' + node.label + '. Você pode sair do mapa.');
    setGanError('');
    try {
      const data = isAdmin
        ? buildGanSource({ chosen, nodes, concepts: D.concepts, node, subjectName: subj?.name })
        : { topicId: chosen.topicId, targetNodeId: node.id, count: 4 };
      const result = await generateFlashcardsFn({ data });
      if (task.discard) return;
      if (!result.cards?.length) {
        setNotice('O nó ' + node.label + ' não retornou flashcards para revisar.');
        return;
      }
      setFlashcardReviews(current => ({ ...current, [node.id]: result.cards }));
      setNotice(result.cards.length + ' flashcards de ' + node.label + ' prontos para revisar no mapa.');
    } catch (err) {
      if (!task.discard) setNotice(err?.message || 'Não foi possível gerar flashcards.');
    } finally {
      ganTask.current = null;
      setFlashcardsLoading(false);
    }
  };

  const openGanPackage = event => {
    if (ganTask.current) return;
    if (ganReviewPending) {
      openGanReview(event);
      return;
    }
    ganReviewFocus.current = event.currentTarget;
    setGanPackageNode(node);
  };

  const handleGenerateGan = async batches => {
    if (ganTask.current) return;
    setGanPackageNode(null);
    const task = { discard: false };
    ganTask.current = task;
    setGanLoading(true);
    setNotice('Gerando questões de ' + chosen.title + '. Você pode sair do mapa.');
    setGanError('');

    try {
      let additionalContext = '';
      if (isAdmin) {
        const tLabel = topic
          ? (subj?.short || subj?.name || '') + ' ' + topic.num + (topic.title ? ' · ' + topic.title : '')
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
      const entries = [];
      let failure = '';
      let saveFailures = 0;
      const requested = batches.reduce((sum, batch) => sum + batch.count, 0);
      const parts = batches.flatMap(({ target, count }) => Array.from({length: Math.ceil(count / 4)}, (_, i) => ({ target, count: Math.min(4, count - 4 * i) })));
      for (const {target,count} of parts) {
        if (task.discard) return;
        try {
          const res = await generateNode(target, count, additionalContext);
          if (task.discard) return;
          if (res?.falha) { failure = ganFailureLabel(res.falha); break; }
          entries.push(...ganReviewEntries(target,res || {},true).slice(0,count));
          saveFailures += res?.falhasGravacao || 0;
        } catch (err) { failure = err.message || 'Falha na geração.'; break; }
      }
      if (task.discard) return;
      newGanReview(entries, node);
      setNotice(entries.length + ' de ' + requested + ' questões geradas · ' + chosen.title + (failure ? '. ' + failure : '') + (saveFailures ? '. Confira as gravações pendentes no mapa.' : ''));
      if (failure || entries.length < requested) setGanError(entries.length + ' de ' + requested + ' questões geradas. ' + failure);
      if (saveFailures) setGanError(previous => [previous, 'Parte das gravações automáticas falhou. Confira as questões na revisão.'].filter(Boolean).join(' '));
    } catch (err) {
      if (!task.discard) setNotice(err?.message || 'Não foi possível concluir o confronto GAN para este nó.');
    } finally {
      ganTask.current = null;
      setGanLoading(false);
    }
  };

  const ganActionLabel = ganReviewPending ? 'Revisar questões GAN' : 'Gerar questões com O Arquiteto';
  const ganActions = <>
    <Button size="sm" icon="list-checks" disabled={ganLoading || flashcardsLoading} ref={ganReviewButton}
      aria-haspopup="dialog" aria-label={ganActionLabel} onClick={openGanPackage}>
      {mapMaximized ? <span className="qb-map-full-header__action-text">{ganReviewPending ? 'Revisar questões' : 'Gerar questões'}</span> : ganActionLabel}
    </Button>
    {!ganReviewPending && ganReview?.entries.some(entry => entry.status === 'saved') && (
      <Button size="sm" variant="secondary" icon="target" aria-label="Treinar pacote"
        disabled={ganLoading || flashcardsLoading} onClick={trainGanReview}>
        {mapMaximized ? <span className="qb-map-full-header__action-text">Treinar pacote</span> : 'Treinar pacote'}
      </Button>
    )}
  </>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {head}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Badge tone="neutral" icon="info">Domínio baseado nas suas respostas</Badge>
        <span style={{ font: '400 12px/1.4 var(--font-mono)', color: 'var(--text-muted)' }}>
          {chosen.id} · nó {node.id}
        </span>
        <span style={{ flex: 1 }} />
        {!mapMaximized && <>
          <StudyClockControls />
          {ganActions}
        </>}
        {qn > 0 ? (
          <Button
            size="sm"
            variant="secondary"
            icon="target"
            onClick={reviewQuestions}
          >
            {qn} {qn > 1 ? 'questões vinculadas' : 'questão vinculada'}
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
              {ganActions}
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
        {ganError && <p role="alert" className="qb-gan-review__problems">{ganError}</p>}
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
              questionCount={review.questionIds.length}
              flashcardCount={review.cardIds.length}
              reviewIncludesChildren={review.includesChildren}
              onReviewQuestions={reviewQuestions}
              onReviewCards={reviewCards}
              onGenerateGan={openGanPackage}
              onGenerateFlashcards={handleGenerateFlashcards}
              flashcardsLoading={flashcardsLoading}
              ganLoading={ganLoading}
              onOpenGanReview={ganReviewPending && ganReview.anchor.id === node.id ? openGanReview : undefined}
              returnTo={sessionReturn ? undefined : returnTo?.label}
              onReturn={onReturn}
              style={mapMaximized ? { height: '100%' } : { flex: '1 1 340px', maxWidth: 420, height: 620 }}
            />
          )}
        </div>
        {flashcardReview && <NodeFlashcardReviewDialog key={flashcardReview[0].id} cards={flashcardReview}
          nodeLabel={node.label} open={flashcardReviewOpen} onOpenChange={setFlashcardReviewOpen}
          returnFocus={flashcardFocus} onApprove={approveFlashcard} onDiscard={id => updateFlashcard(id, { status: 'discarded' })}
          onStudy={cardIds => { setFlashcardReviewOpen(false); go('flashcards', { topicId: chosen.topicId, cardIds }); }} />}
        {ganPackageNode && <GanPackageDialog key={ganPackageNode.id} nodes={nodes} initialNode={ganPackageNode}
          open onOpenChange={open => { if (!open) setGanPackageNode(null); }} onGenerate={handleGenerateGan}
          onDistribute={ganPackageNode.id === chosen.id ? () => handleGenerateGan(centralGanRound(nodes, chosen.id, D.questionBank || [])) : undefined} />}
        {ganReview && <GanReviewDialog key={ganReview.id} review={ganReview} open={ganReviewOpen} onOpenChange={setGanReviewOpen}
          returnFocus={ganReviewFocus} fallbackFocus={ganReviewButton} questionBank={D.questionBank} onApprove={approveGanEntry}
          onDiscard={entry => setReviewEntry(entry, { status: 'discarded' })} onTrain={trainGanReview} />}
      </div>
    </div>
  );
}
export { MindMapView, MindMapView as MindMapScreen };