import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { base44 } from '@/api/base44Client';
import { Icon } from '@/components/qb/core/Icon';
import { Badge } from '@/components/qb/core/Badge';
import { Button } from '@/components/qb/core/Button';
import { Flashcard } from '@/components/qb/flashcards/Flashcard';
import { extractMaterialText, generateFlashcardsFromMaterial } from '@/lib/server-fns';
import { stripFlashcardContext } from '@/lib/flashcard-standard';
import { validateFlashcard } from '@/lib/flashcard-quality';
import { canPersistFlashcardCandidate } from '@/lib/node-flashcards';
import { useMapGeneration } from '@/lib/map-generation';
import { useRealStudy } from '@/lib/qb-real-data';

const SAMPLE = 'O fiscal do contrato acompanha a execução, anota ocorrências em registro próprio e determina o que for necessário à regularização de faltas ou defeitos observados (Lei 14.133/2021, art. 117). O gestor do contrato coordena as atividades relacionadas à fiscalização técnica, administrativa e setorial, bem como os atos preparatórios à instrução processual.';

const STATUS_BADGE = {
  approved: { tone: 'correct', label: 'Aprovado na triagem' },
  needs_review: { tone: 'attention', label: 'Requer revisão' },
  rejected: { tone: 'incorrect', label: 'Bloqueado na validação' },
};

export default function ScannerFlashcards({ topicId, topicLabel = 'o tópico', subjectName, topicName, style }) {
  const { QB_DATA, save } = useRealStudy();
  const mapGen = useMapGeneration();
  const extractTextFn = useServerFn(extractMaterialText);
  const generateCardsFn = useServerFn(generateFlashcardsFromMaterial);

  const [tab, setTab] = React.useState('cards');
  const [i, setI] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [rated, setRated] = React.useState([]);
  const [localState, setLocalState] = React.useState({ scan: null, drafts: [], generating: false, error: null, pipeline: null });
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(null);
  const fileRef = React.useRef(null);

  const stateKey = topicId || '__default__';
  const persistedState = mapGen?.scannerByTopic?.[stateKey];
  const currentState = mapGen ? (persistedState || { scan: null, drafts: [], generating: false, error: null, pipeline: null }) : localState;
  const { scan, drafts, generating, error } = currentState;

  const setScanner = React.useCallback(updater => {
    if (mapGen?.updateScannerTopic) {
      mapGen.updateScannerTopic(stateKey, updater);
    } else {
      setLocalState(prev => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));
    }
  }, [mapGen, stateKey]);

  const fullDeck = React.useMemo(() => QB_DATA.flashcards.filter(card => card.topicId === topicId), [QB_DATA.flashcards, topicId]);
  const card = fullDeck[i % Math.max(1, fullDeck.length)];

  const handleFileChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setScanner({ error: null });
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const res = await extractTextFn({ data: { file_uri, topicLabel } });
      setScanner({ scan: res?.text || '', error: null });
    } catch (err) {
      setScanner({ error: err?.message || 'Não foi possível ler o arquivo enviado.' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleGenerateCards = async () => {
    const clean = (scan || '').trim();
    if (!topicId || clean.length < 20 || generating || saving) return;
    const task = { discard: false };
    if (mapGen?.scannerTasks?.current) mapGen.scannerTasks.current[stateKey] = task;
    setScanner({ generating: true, error: null });
    mapGen?.setNotice?.(`Gerando e validando flashcards em ${topicName || topicLabel}. Você pode sair desta tela; os candidatos serão preservados para revisão.`);
    try {
      const existingCards = fullDeck.slice(0, 200).map(item => ({ id: item.id, front: item.front, back: item.back }));
      const res = await generateCardsFn({
        data: {
          topicId,
          topicLabel: (topicName || topicLabel).slice(0, 300),
          subjectName,
          sourceText: clean,
          count: 4,
          existingCards,
        },
      });
      if (task.discard) return;
      const generatedDrafts = (res?.cards || []).map(item => ({
        ...item,
        id: item.id || ('scanner-card-' + crypto.randomUUID()),
        status: 'pending',
        approvedByUser: false,
        edited: false,
      }));
      setScanner({
        drafts: generatedDrafts,
        generating: false,
        pipeline: res?.pipeline || null,
        error: generatedDrafts.length ? null : (res?.pipeline?.message || 'A fonte não sustentou flashcards válidos.'),
      });
      if (generatedDrafts.length) {
        mapGen?.setNotice?.(`${generatedDrafts.length} flashcards prontos para revisão no Scanner (${topicName || topicLabel}). Nenhum foi gravado automaticamente.`);
      }
    } catch (err) {
      if (!task.discard) {
        setScanner({ generating: false, error: err?.message || 'Não foi possível gerar os flashcards com IA.' });
      }
    } finally {
      if (mapGen?.scannerTasks?.current?.[stateKey] === task) {
        delete mapGen.scannerTasks.current[stateKey];
      }
    }
  };

  const approveDraft = async draft => {
    if (!topicId || saving || draft.status === 'saved' || draft.status === 'discarded') return;
    const existingPeers = fullDeck.map(item => ({ id: item.id, front: item.front, back: item.back }));
    const gate = canPersistFlashcardCandidate(
      { ...draft, topicId, approvedByUser: true },
      {
        topicId,
        subjectName,
        topics: [topicName, topicLabel].filter(Boolean),
        sourceText: (scan || '').trim(),
        existingCards: existingPeers,
        requireSource: Boolean((scan || '').trim().length >= 20),
      },
    );
    if (!gate.allowed) {
      setScanner({ error: gate.reason || 'Este flashcard não passou na validação pedagógica.' });
      return;
    }
    const front = gate.validation.normalizedFront;
    const back = draft.back.trim();
    setSaving(draft.id);
    setScanner({ error: null });
    try {
      await save('revisao', draft.id, {
        topico: topicId,
        cartoes: [{
          id: draft.id,
          q: front,
          a: back,
          tipo: draft.cardType || gate.validation.cardType,
          ...(draft.basis || draft.normativeRef ? { ref: draft.basis || draft.normativeRef } : {}),
          ...(draft.vigencia ? { vigencia: draft.vigencia } : {}),
          ...(draft.validation?.evidence ? { evidenciaRevisao: draft.validation.evidence } : {}),
          src: draft.basis || 'O Arquiteto · Scanner IA',
        }],
      });
      setScanner(prev => ({
        ...prev,
        drafts: prev.drafts.map(item => (item.id === draft.id ? { ...item, front, back, status: 'saved', ok: true, approvedByUser: true } : item)),
      }));
    } catch (err) {
      setScanner({ error: err?.message || 'Não foi possível gravar o flashcard.' });
    } finally {
      setSaving(null);
    }
  };

  const discardDraft = draftId => {
    setScanner(prev => ({
      ...prev,
      drafts: prev.drafts.map(item => (item.id === draftId ? { ...item, status: 'discarded' } : item)),
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, ...style }}>
      <div className="qb-seg" role="group" aria-label="Ferramenta" style={{ alignSelf: 'flex-start' }}>
        <button className="qb-seg__opt" aria-pressed={tab === 'cards'} onClick={() => setTab('cards')}>
          Flashcards 3D ({fullDeck.length})
        </button>
        <button className="qb-seg__opt" aria-pressed={tab === 'scan'} onClick={() => setTab('scan')}>
          Scanner IA{drafts.some(d => d.status !== 'saved' && d.status !== 'discarded') ? ` (${drafts.filter(d => d.status !== 'saved' && d.status !== 'discarded').length})` : ''}
        </button>
      </div>
      {tab === 'cards' ? (
        fullDeck.length ? (
          <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ font: '400 13px/1 var(--font-mono)', color: 'var(--text-muted)', textAlign: 'center' }}>
              Cartão {(i % fullDeck.length) + 1} de {fullDeck.length} · {rated.length} avaliados
            </span>
            <Flashcard
              key={i}
              height={300}
              deck={topicLabel}
              front={stripFlashcardContext(card.front, subjectName, [topicName, topicLabel])}
              back={card.back}
              flipped={flipped}
              onFlip={() => setFlipped(f => !f)}
              onRate={r => {
                setRated(x => [...x, r]);
                setFlipped(false);
                setI(n => n + 1);
              }}
            />
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Sem cartões para este tópico.</p>
        )
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>1 · Entrada do material</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,.txt,.md"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {error && (
              <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--state-incorrect)', font: '400 13px/1.4 var(--font-body)' }}>
                <Icon name="circle-x" size={16} />
                <span>{error}</span>
              </div>
            )}
            {scan === null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="qb-dropzone" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Icon name={uploading ? 'loader-circle' : 'scan-line'} size={28} color="var(--qb-gold)" className={uploading ? 'qb-spin' : undefined} />
                  <span style={{ font: '600 15px/1.3 var(--font-body)', color: 'var(--text-primary)' }}>
                    {uploading ? 'Extraindo texto com IA…' : 'Enviar foto, imagem ou PDF'}
                  </span>
                  <span style={{ font: '400 13px/1.4 var(--font-body)' }}>
                    O Arquiteto transcreve o conteúdo do seu arquivo e submete candidatos à validação e revisão cega antes da aprovação.
                  </span>
                </button>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" variant="secondary" icon="file-text" disabled={uploading} onClick={() => setScanner({ scan: '' })}>
                    Colar texto manualmente
                  </Button>
                  <Button size="sm" variant="ghost" icon="sparkles" disabled={uploading} onClick={() => setScanner({ scan: SAMPLE })}>
                    Carregar trecho de exemplo
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <textarea
                  className="qb-textarea"
                  style={{ minHeight: 180 }}
                  value={scan}
                  onChange={e => setScanner({ scan: e.target.value })}
                  placeholder="Cole ou edite aqui o texto da lei, doutrina ou resumo para gerar os cartões…"
                  aria-label="Texto reconhecido — revise antes de gerar"
                />
                <span style={{ font: '400 12px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>
                  Revise o texto antes de gerar: cada cartão passa por validação pedagógica e revisão cega independente antes de poder ser gravado.
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" icon="sparkles" loading={generating} disabled={!topicId || scan.trim().length < 20 || generating || Boolean(saving)} onClick={handleGenerateCards}>
                    Gerar cartões com IA
                  </Button>
                  <Button size="sm" variant="secondary" icon="upload" disabled={uploading || generating || Boolean(saving)} onClick={() => fileRef.current?.click()}>
                    Trocar arquivo
                  </Button>
                  <Button size="sm" variant="ghost" disabled={generating || Boolean(saving)} onClick={() => setScanner({ scan: null, drafts: [], error: null, pipeline: null })}>
                    Descartar
                  </Button>
                </div>
              </>
            )}
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>2 · Revisão dos cartões gerados</span>
            {!drafts.length ? (
              <p style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-muted)' }}>
                Os cartões criados pela IA aparecem aqui para conferência, edição e aprovação. Nenhum cartão é gravado automaticamente no baralho.
              </p>
            ) : (
              drafts.map((d, k) => {
                const liveValidation = validateFlashcard(
                  { ...d, topicId },
                  {
                    topicId,
                    subjectName,
                    topics: [topicName, topicLabel].filter(Boolean),
                    sourceText: (scan || '').trim(),
                    existingCards: fullDeck.map(item => ({ id: item.id, front: item.front, back: item.back })),
                    requireSource: Boolean((scan || '').trim().length >= 20),
                  },
                );
                const blockingErrors = liveValidation.reasons.filter(r => r.severity === 'error');
                const effectiveStatus = d.edited ? liveValidation.status : (d.validation?.status || liveValidation.status);
                const badgeMeta = STATUS_BADGE[effectiveStatus] || STATUS_BADGE.needs_review;
                const locked = d.status === 'saved' || d.status === 'discarded' || Boolean(saving);
                const reasons = d.edited ? liveValidation.reasons : (d.validation?.reasons || liveValidation.reasons);
                const blind = d.validation?.blindReview;
                const evidence = d.validation?.evidence;

                return (
                  <div key={d.id} className="qb-panel qb-panel--sunken" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {d.status === 'saved' || d.status === 'discarded' ? (
                        <Badge tone={d.status === 'saved' ? 'correct' : 'neutral'}>
                          {d.status === 'saved' ? 'Gravado no assunto' : 'Descartado'}
                        </Badge>
                      ) : (
                        <Badge tone={badgeMeta.tone}>{badgeMeta.label}</Badge>
                      )}
                      <Badge tone="neutral">{liveValidation.cardType}</Badge>
                      {d.canSplit && <Badge tone="attention">Sugerido dividir</Badge>}
                    </div>

                    {!!reasons.length && (
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)' }}>
                        {reasons.map((r, idx) => (
                          <li key={`${r.code}-${idx}`}><strong>[{r.rule}]</strong> {r.message}</li>
                        ))}
                      </ul>
                    )}

                    {blind?.executed && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <div><strong>Revisão cega:</strong> {blind.agreed ? 'compatível (triagem)' : 'divergência/pendência'}</div>
                        {blind.recoveredAnswer && <div><strong>Recuperado:</strong> {blind.recoveredAnswer}</div>}
                        {evidence?.reviewerExcerpt && <div><strong>Evidência:</strong> “{evidence.reviewerExcerpt}”</div>}
                      </div>
                    )}

                    <input
                      className="qb-input"
                      value={d.front}
                      disabled={locked}
                      onChange={e => setScanner(prev => ({
                        ...prev,
                        drafts: prev.drafts.map((y, j) => (j === k ? { ...y, front: e.target.value, edited: true } : y)),
                      }))}
                      aria-label={'Frente do cartão ' + (k + 1)}
                    />
                    <textarea
                      className="qb-textarea"
                      style={{ minHeight: 60 }}
                      value={d.back}
                      disabled={locked}
                      onChange={e => setScanner(prev => ({
                        ...prev,
                        drafts: prev.drafts.map((y, j) => (j === k ? { ...y, back: e.target.value, edited: true } : y)),
                      }))}
                      aria-label={'Verso do cartão ' + (k + 1)}
                    />
                    {d.status !== 'saved' && d.status !== 'discarded' && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon="plus"
                          disabled={locked || generating || blockingErrors.length > 0 || !d.front.trim() || !d.back.trim()}
                          loading={saving === d.id}
                          onClick={() => approveDraft(d)}
                        >
                          Aprovar e gravar
                        </Button>
                        <Button size="sm" variant="ghost" icon="x" disabled={locked} onClick={() => discardDraft(d.id)}>
                          Descartar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </div>
      )}
    </div>
  );
}
export { ScannerFlashcards };
