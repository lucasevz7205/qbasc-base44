import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { MindMapCanvas } from '@/components/qb/mindmap/MindMapCanvas';
import { ConceptPanel } from '@/components/qb/mindmap/ConceptPanel';
import { useRealStudy } from '@/lib/qb-real-data';
import { generateMindMapGanQuestions } from '@/lib/server-fns';

export default function MindMapView({ selected, setSelected, returnTo, onReturn, go }) {
  const { QB_DATA: D, QB_EDITAL, save } = useRealStudy();
  const generateGanFn = useServerFn(generateMindMapGanQuestions);
  const [ganLoading, setGanLoading] = React.useState(false);
  const [ganError, setGanError] = React.useState('');
  const [ganBlockedReport, setGanBlockedReport] = React.useState(null);

  const chosen = D.mindMaps.find(m => m.nodes.some(n => n.id === selected)) || (selected === '__no_map__' ? null : D.mindMaps[0]);
  const nodes = chosen?.nodes || [];
  const node = nodes.find(n => n.id === selected) || nodes[0];

  React.useEffect(() => {
    setGanError('');
    setGanBlockedReport(null);
  }, [node?.id]);

  if (!node) {
    return (
      <section>
        <p>Este tópico ainda não tem mapa mental.</p>
        {returnTo && <button onClick={onReturn}>Voltar</button>}
        <select aria-label="Escolher mapa" value="" onChange={e => setSelected(e.target.value)}>
          <option value="" disabled>Escolher outro mapa</option>
          {D.mindMaps.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </section>
    );
  }

  const c = D.concepts[node.id] || { summary: 'Nenhuma descrição registrada para este nó.' };
  const path = [];
  let p = nodes.find(n => n.id === node.parent);
  while (p) {
    path.unshift(p.label);
    p = nodes.find(n => n.id === p.parent);
  }
  const card = D.flashcards.filter(f => f.node === node.id).length;
  const expanded = nodes.filter(n => !n.parent || n.parent === chosen.id).map(n => n.id);

  const handleGenerateGan = async () => {
    if (ganLoading) return;
    setGanLoading(true);
    setGanError('');
    setGanBlockedReport(null);

    try {
      const subj = QB_EDITAL?.subjects?.find(s => s.topics.some(t => t.id === chosen.topicId));
      const topic = subj?.topics?.find(t => t.id === chosen.topicId);
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
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="qb-overline">Mapa mental</span>
          <h1 style={{ font: 'var(--type-h1)' }}>{chosen.title}</h1>
        </div>
        <select className="qb-select" style={{ width: 'auto', minWidth: 260 }} aria-label="Escolher mapa" value={chosen.id} onChange={e => setSelected(e.target.value)}>
          {D.mindMaps.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 20, alignItems: 'stretch' }}>
        <MindMapCanvas key={chosen.id} nodes={nodes} selectedId={node.id} onSelect={setSelected} defaultExpanded={expanded} height={620} />
        <ConceptPanel
          key={node.id}
          title={node.label}
          path={path}
          mastery={node.mastery ? { state: node.mastery, text: D.masteryText[node.mastery] } : undefined}
          summary={c.summary}
          example={c.example}
          connections={c.connections || []}
          sources={c.sources || []}
          onNavigate={setSelected}
          reviewCount={card || undefined}
          onReview={() => go('flashcards', { topicId: chosen.topicId })}
          onGenerateGan={handleGenerateGan}
          ganLoading={ganLoading}
          ganError={ganError}
          ganBlockedReport={ganBlockedReport}
          returnTo={returnTo && returnTo.label}
          onReturn={onReturn}
          style={{ height: 620 }}
        />
      </div>
    </div>
  );
}
export { MindMapView, MindMapView as MindMapScreen };