import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { MindMapCanvas } from '@/components/qb/mindmap/MindMapCanvas';
import { ConceptPanel } from '@/components/qb/mindmap/ConceptPanel';
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
  go,
  dispatch,
  radialOpen: radialOpenProp,
  setRadialOpen: setRadialOpenProp,
}) {
  const { QB_DATA: D, QB_EDITAL: E, save, isAdmin } = useRealStudy();
  const generateGanFn = useServerFn(generateMindMapGanQuestions);
  const [ganLoading, setGanLoading] = React.useState(false);
  const [ganError, setGanError] = React.useState('');
  const [ganBlockedReport, setGanBlockedReport] = React.useState(null);
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
    setGanBlockedReport(null);
  }, [node?.id]);

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

  const back = returnTo && (
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

  const handleGenerateGan = async () => {
    if (ganLoading) return;
    setGanLoading(true);
    setGanError('');
    setGanBlockedReport(null);

    try {
      const tLabel = topic
        ? (subj.short || subj.name) + ' ' + topic.num + (topic.title ? ' · ' + topic.title : '')
        : chosen.title;

      let cornellText = '';
      try {
        const savedCornell = JSON.parse(localStorage.getItem('qb-cornell::' + tLabel) || 'null');
        if (savedCornell) {
          cornellText = [savedCornell.cues, savedCornell.notes, savedCornell.summary].filter(Boolean).join('\n');
        }
      } catch {
        // ignore storage errors
      }

      const relatedCards = D.flashcards
        .filter(f => f.node === node.id || f.topicId === chosen.topicId)
        .slice(0, 6)
        .map(f => `P: ${f.front} | R: ${f.back}`)
        .join('\n');

      const sourceParts = [
        c.summary && `Resumo do nó (${node.label}): ${c.summary}`,
        c.example && `Exemplo do nó: ${c.example}`,
        Array.isArray(c.sources) && c.sources.length
          ? `Fontes vinculadas: ${c.sources.map(s => (typeof s === 'object' ? s.label : s)).join('; ')}`
          : '',
        cornellText && `Anotações Cornell do tópico:\n${cornellText}`,
        relatedCards && `Referências de revisão do tópico:\n${relatedCards}`,
      ].filter(Boolean);

      const mapaPayload = {
        id: chosen.id,
        title: chosen.title,
        nodes: nodes.slice(0, 100).map(n => ({
          id: n.id,
          parent: n.parent || null,
          label: n.label,
          summary: D.concepts[n.id]?.summary || '',
          example: D.concepts[n.id]?.example || '',
        })),
      };

      const res = await generateGanFn({
        data: {
          topicId: chosen.topicId || chosen.id,
          topicTitle: chosen.title,
          subjectName: subj?.name || 'Câmara dos Deputados',
          targetNodeId: node.id,
          targetNodeLabel: node.label,
          targetNodePath: [...path, node.label],
          count: 4,
          mapa: mapaPayload,
          sourceContext: sourceParts.join('\n\n').slice(0, 7500),
        },
      });

      const aprovadas = Array.isArray(res?.aprovadas) ? res.aprovadas : [];
      const bloqueadas = Array.isArray(res?.bloqueadas) ? res.bloqueadas : [];
      const resumoConfronto = res?.resumoConfronto || {
        totalGeradas: aprovadas.length + bloqueadas.length,
        aprovadasDireto: aprovadas.filter(q => q.statusConfronto === 'aprovada_gan').length,
        refinadasGan: aprovadas.filter(q => q.statusConfronto === 'refinada_gan').length,
        bloqueadasDivergencia: bloqueadas.length,
        mediaScoreGan: 85,
      };

      if (!aprovadas.length) {
        setGanBlockedReport({ bloqueadas, resumoConfronto });
        setGanError('Todos os itens gerados apresentaram divergência no teste cego e foram bloqueados pelo portão determinístico. Tente gerar novamente.');
        return;
      }

      const formattedQuestions = [];
      for (const item of aprovadas) {
        const statusLabel = item.statusConfronto === 'refinada_gan' ? 'Refinada pela GAN' : 'Aprovada no teste cego';
        const trap = {
          name: `${item.mecanismo} — ${item.mecanismoNome} (${statusLabel} · Gerador: ${item.gabaritoGerador} × Discriminador Cego: ${item.gabaritoDiscriminador})`,
          description: [
            item.correcaoMinima && `Ponto decisivo / correção mínima: ${item.correcaoMinima}`,
            item.teseGerador && `Tese avaliada: ${item.teseGerador}`,
            item.criticaAdversaria && `Parecer do Discriminador Cego: ${item.criticaAdversaria}`,
          ]
            .filter(Boolean)
            .join(' · '),
        };
        const explanation = [
          item.comentario,
          item.criticaAdversaria ? `Auditoria Cega (Score GAN ${item.ganScore}%): ${item.criticaAdversaria}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');
        const basis = item.trechoDecisivo ? `Trecho decisivo: ${item.trechoDecisivo}` : `Conceito: ${item.nodeTitle}`;
        const tags = [
          item.nodeTitle || node.label,
          `${item.mecanismo} · ${item.mecanismoNome}`,
          statusLabel,
          `Score GAN ${item.ganScore}%`,
        ].filter(Boolean);

        const rawRecord = {
          id: item.id,
          code: item.code,
          ano: 'GAN · CEBRASPE',
          cap: chosen.topicId,
          capNome: chosen.title,
          topico: chosen.topicId,
          tema: item.tema || node.label,
          enunciado: item.enunciado,
          gabarito: item.gabarito,
          comentario: explanation,
          ref: basis,
          origem: 'GAN · Mapa Mental',
          mapaNoId: item.mapaNoId || node.id,
          mecanismo: item.mecanismo,
          mecanismoNome: item.mecanismoNome,
          correcaoMinima: item.correcaoMinima,
          criticaAdversaria: item.criticaAdversaria,
          statusConfronto: item.statusConfronto,
          ganScore: item.ganScore,
          tags,
          trap,
        };

        try {
          await save('questoes', item.id, rawRecord);
        } catch {
          // Segue na sessão mesmo se a gravação no banco falhar
        }

        formattedQuestions.push({
          id: item.id,
          code: item.code,
          year: 'GAN · CEBRASPE',
          tags,
          key: item.gabarito,
          statement: item.enunciado,
          explanation,
          basis,
          trap,
          origin: 'GAN · Mapa Mental',
          topicId: chosen.topicId,
          subjectId: subj?.id,
          subject: subj?.name || 'Câmara dos Deputados',
          chapter: `${node.label} · ${chosen.title}`,
          node: item.mapaNoId || node.id,
          statusConfronto: item.statusConfronto,
          ganScore: item.ganScore,
          gabaritoGerador: item.gabaritoGerador,
          gabaritoDiscriminador: item.gabaritoDiscriminador,
          raw: rawRecord,
        });
      }

      go('questions', {
        ganBatch: {
          questions: formattedQuestions,
          blocked: bloqueadas,
          summary: resumoConfronto,
          originNodeId: node.id,
          originNodeLabel: node.label,
          topicId: chosen.topicId,
          mapTitle: chosen.title,
        },
      });
    } catch (err) {
      setGanError(err?.message || 'Não foi possível concluir o confronto GAN para este nó.');
    } finally {
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
        style={
          mapMaximized
            ? {
                position: 'fixed',
                inset: '14px',
                zIndex: 70,
                background: 'var(--canvas)',
                border: '1px solid rgba(208, 179, 134, 0.55)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--shadow-raised)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                overflow: 'hidden',
              }
            : { display: 'flex', flexDirection: 'column', gap: 0 }
        }
      >
        {mapMaximized && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingBottom: 8, borderBottom: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 260px' }}>
              <Badge tone="gold">{subj ? subj.short : 'Mapa'} {topic?.num || ''}</Badge>
              <strong style={{ font: '600 17px/1.25 var(--font-heading)', color: 'var(--qb-ivory)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {chosen.title}
              </strong>
              <span style={{ font: '400 12px/1.2 var(--font-mono)', color: 'var(--text-muted)' }}>
                nó: {node.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <StudyTopicPicker
                label="Trocar assunto"
                subjects={allSubjects}
                value={topicId}
                counts={mapCounts}
                recents={recents}
                pendingReviews={pendingReviews}
                onSelect={s => handleSelectTopic(s.topicId)}
                style={{ width: 340, maxWidth: '100%' }}
              />
              <StudyClockControls />
              <Button
                size="sm"
                variant="secondary"
                icon="layout-panel-top"
                onClick={() => setShowPanelInMax(v => !v)}
              >
                {showPanelInMax ? 'Ocultar painel lateral' : 'Mostrar painel do conceito'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon="x"
                onClick={() => setMapMaximized(false)}
              >
                Reduzir tela (Esc)
              </Button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: mapMaximized ? 'nowrap' : 'wrap', gap: 20, alignItems: 'stretch', flex: 1, minHeight: 0 }}>
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
              onGenerateGan={isAdmin ? handleGenerateGan : undefined}
              ganLoading={ganLoading}
              ganError={ganError}
              ganBlockedReport={ganBlockedReport}
              returnTo={returnTo && returnTo.label}
              onReturn={onReturn}
              style={{
                flex: mapMaximized ? '0 0 380px' : '1 1 340px',
                maxWidth: 420,
                height: mapMaximized ? '100%' : 620,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
export { MindMapView, MindMapView as MindMapScreen };