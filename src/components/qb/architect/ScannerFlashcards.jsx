import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { base44 } from '@/api/base44Client';
import { Icon } from '@/components/qb/core/Icon';
import { Button } from '@/components/qb/core/Button';
import { Flashcard } from '@/components/qb/flashcards/Flashcard';
import { extractMaterialText, generateFlashcardsFromMaterial } from '@/lib/server-fns';
import { stripFlashcardContext } from '@/lib/flashcard-standard';
import { useRealStudy } from '@/lib/qb-real-data';

const SAMPLE = 'O fiscal do contrato acompanha a execução, anota ocorrências em registro próprio e determina o que for necessário à regularização de faltas ou defeitos observados (Lei 14.133/2021, art. 117). O gestor do contrato coordena as atividades relacionadas à fiscalização técnica, administrativa e setorial, bem como os atos preparatórios à instrução processual.';

export default function ScannerFlashcards({ topicId, topicLabel = 'o tópico', subjectName, topicName, style }) {
  const { QB_DATA, save } = useRealStudy();
  const extractTextFn = useServerFn(extractMaterialText);
  const generateCardsFn = useServerFn(generateFlashcardsFromMaterial);

  const [tab, setTab] = React.useState('cards');
  const [i, setI] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [rated, setRated] = React.useState([]);
  const [scan, setScan] = React.useState(null);
  const [drafts, setDrafts] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [saving, setSaving] = React.useState(null);
  const [error, setError] = React.useState(null);
  const fileRef = React.useRef(null);

  const fullDeck = React.useMemo(() => QB_DATA.flashcards.filter(card => card.topicId === topicId), [QB_DATA.flashcards, topicId]);
  const card = fullDeck[i % Math.max(1, fullDeck.length)];

  const handleFileChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const res = await extractTextFn({ data: { file_uri, topicLabel } });
      setScan(res?.text || '');
    } catch (err) {
      setError(err?.message || 'Não foi possível ler o arquivo enviado.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleGenerateCards = async () => {
    const clean = (scan || '').trim();
    if (!topicId || clean.length < 20 || generating || saving) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await generateCardsFn({
        data: {
          topicLabel: (topicName || topicLabel).slice(0, 300),
          subjectName,
          sourceText: clean,
          count: 4,
        },
      });
      setDrafts(
        (res?.cards || []).map(({ front, back }) => ({ id: 'scanner-card-' + crypto.randomUUID(), front, back })),
      );
    } catch (err) {
      setError(err?.message || 'Não foi possível gerar os flashcards com IA.');
    } finally {
      setGenerating(false);
    }
  };

  const approveDraft = async draft => {
    if (!topicId || saving || draft.ok) return;
    const front = stripFlashcardContext(draft.front, subjectName, [topicName, topicLabel], topicId);
    const back = draft.back.trim();
    if (!front || !back) return;
    setSaving(draft.id);
    setError(null);
    try {
      await save('revisao', draft.id, {
        topico: topicId,
        cartoes: [{ id: draft.id, q: front, a: back, src: 'O Arquiteto · Scanner IA' }],
      });
      setDrafts(current => current.map(card => card.id === draft.id ? { ...card, ok: true } : card));
    } catch (err) {
      setError(err?.message || 'Não foi possível gravar o flashcard.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, ...style }}>
      <div className="qb-seg" role="group" aria-label="Ferramenta" style={{ alignSelf: 'flex-start' }}>
        <button className="qb-seg__opt" aria-pressed={tab === 'cards'} onClick={() => setTab('cards')}>
          Flashcards 3D ({fullDeck.length})
        </button>
        <button className="qb-seg__opt" aria-pressed={tab === 'scan'} onClick={() => setTab('scan')}>
          Scanner IA
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
                    O Arquiteto transcreve o conteúdo do seu arquivo e sugere flashcards automaticamente.
                  </span>
                </button>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" variant="secondary" icon="file-text" disabled={uploading} onClick={() => setScan('')}>
                    Colar texto manualmente
                  </Button>
                  <Button size="sm" variant="ghost" icon="sparkles" disabled={uploading} onClick={() => setScan(SAMPLE)}>
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
                  onChange={e => setScan(e.target.value)}
                  placeholder="Cole ou edite aqui o texto da lei, doutrina ou resumo para gerar os cartões…"
                  aria-label="Texto reconhecido — revise antes de gerar"
                />
                <span style={{ font: '400 12px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>
                  Revise o texto antes de gerar: a IA criará perguntas e respostas diretamente a partir deste trecho.
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" icon="sparkles" loading={generating} disabled={!topicId || scan.trim().length < 20 || generating || Boolean(saving)} onClick={handleGenerateCards}>
                    Gerar cartões com IA
                  </Button>
                  <Button size="sm" variant="secondary" icon="upload" disabled={uploading || generating || Boolean(saving)} onClick={() => fileRef.current?.click()}>
                    Trocar arquivo
                  </Button>
                  <Button size="sm" variant="ghost" disabled={generating || Boolean(saving)} onClick={() => { setScan(null); setDrafts([]); setError(null); }}>
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
                Os cartões criados pela IA aparecem aqui para edição e aprovação. Ao aprovar um cartão, ele é gravado no baralho do assunto.
              </p>
            ) : (
              drafts.map((d, k) => (
                <div key={d.id} className="qb-panel qb-panel--sunken" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    className="qb-input"
                    value={d.front}
                    disabled={d.ok || Boolean(saving)}
                    onChange={e => setDrafts(x => x.map((y, j) => (j === k ? { ...y, front: e.target.value } : y)))}
                    aria-label={'Frente do cartão ' + (k + 1)}
                  />
                  <textarea
                    className="qb-textarea"
                    style={{ minHeight: 60 }}
                    value={d.back}
                    disabled={d.ok || Boolean(saving)}
                    onChange={e => setDrafts(x => x.map((y, j) => (j === k ? { ...y, back: e.target.value } : y)))}
                    aria-label={'Verso do cartão ' + (k + 1)}
                  />
                  <Button
                    size="sm"
                    variant={d.ok ? 'primary' : 'secondary'}
                    icon={d.ok ? 'check' : 'plus'}
                    disabled={d.ok || Boolean(saving) || generating || !d.front.trim() || !d.back.trim()}
                    loading={saving === d.id}
                    onClick={() => approveDraft(d)}
                  >
                    {d.ok ? 'Gravado no assunto' : 'Aprovar e gravar'}
                  </Button>
                </div>
              ))
            )}
          </section>
        </div>
      )}
    </div>
  );
}
export { ScannerFlashcards };