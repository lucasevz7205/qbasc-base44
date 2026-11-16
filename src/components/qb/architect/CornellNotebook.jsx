import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/qb/core/Button';
import { ConfirmDialog } from '@/components/qb/feedback/ConfirmDialog';
import { Icon } from '@/components/qb/core/Icon';
import StudyTopicPicker from '@/components/qb/study/StudyTopicPicker';
import { cornellPairsTopicId, readCornellPairs } from '@/lib/cornell-pairs';
import { CornellLinkedBoard } from '@/components/qb/architect/CornellLinkedBoard';
import { CornellFormatting, CornellRichEditor } from '@/components/qb/architect/CornellFormatting';
import { cornellPlainText } from '@/lib/cornell-rich';
import { generateCornellCues } from '@/lib/server-fns';
import {
  LEGACY_CORNELL_PREFIX, emptyCornell, cleanCornell,
  cornellSignature, hasCornellContent, cornellDraftKey, reconcileCornell,
  getCornellNote, saveCornellNote, createCornellVersion, listCornellVersions,
  shouldCreateCornellVersion,
} from '@/lib/cornell-storage';

const SAVE_DELAY = 1300;

function localRead(key) {
  try {
    const raw = key && localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function localWrite(key, draft) {
  try {
    // Cópia local de segurança; o legado original nunca é apagado.
    localStorage.setItem(key, JSON.stringify({ ...cleanCornell(draft), lastEditedAt: new Date().toISOString() }));
    return true;
  } catch { return false; }
}
const initial = () => ({
  identity: '', loaded: false, dirty: false, offline: false,
  draft: emptyCornell(), recovery: null, status: 'Carregando…', error: '',
});

export default function CornellNotebook({ topicId, topicLabel = 'o tópico', subjects = [], onTopicChange, style }) {
  const currentDocument = React.useRef(null);
  const switchingLock = React.useRef(false);
  const [switching, setSwitching] = React.useState(false);
  const [showPairs, setShowPairs] = React.useState(true);
  const paired = Boolean(topicId && showPairs);
  const documentId = paired ? cornellPairsTopicId(topicId) : topicId;
  const switchDocument = async change => {
    if (switchingLock.current) return;
    switchingLock.current = true;
    setSwitching(true);
    try {
      if (await currentDocument.current?.() !== false) change();
    } finally {
      switchingLock.current = false;
      setSwitching(false);
    }
  };
  const selectTopic = selection => {
    if (onTopicChange && selection.topicId !== topicId) void switchDocument(() => onTopicChange(selection));
  };
  return <section aria-label="Caderno Cornell" style={{ display: 'grid', gap: 13, ...style }}>
    <div aria-busy={switching}>
      <StudyTopicPicker label="Matéria e assunto do Cornell" subjects={subjects} value={topicId} onSelect={selectTopic} />
    </div>
    <CornellDocument key={documentId} topicId={documentId} topicLabel={topicLabel} flushRef={currentDocument}
      switching={switching} paired={paired}
      onTogglePairs={topicId ? () => switchDocument(() => setShowPairs(value => !value)) : undefined} />
  </section>;
}

function CornellDocument({ topicId, topicLabel, flushRef, switching, paired, onTogglePairs }) {
  const { user } = useAuth();
  const ownerId = user?.id;
  const resolvedTopic = String(topicId || topicLabel).trim();
  const identity = ownerId && resolvedTopic ? cornellDraftKey(ownerId, resolvedTopic) : '';
  const legacyKey = paired ? null : LEGACY_CORNELL_PREFIX + topicLabel;
  const generateCuesFn = useServerFn(generateCornellCues);

  const [state, setState] = React.useState(initial);
  const [hide, setHide] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [versions, setVersions] = React.useState([]);
  const [restore, setRestore] = React.useState(null);
  const [recoverLocal, setRecoverLocal] = React.useState(false);
  const identityRef = React.useRef(identity);
  const cloudRef = React.useRef(null);
  const lastSavedRef = React.useRef('');
  const lastVersionAtRef = React.useRef(null);
  const queueRef = React.useRef(Promise.resolve());
  const currentDraftRef = React.useRef(emptyCornell());
  const dirtyRef = React.useRef(false);
  const localCopyRef = React.useRef(true);

  React.useEffect(() => {
    identityRef.current = identity;
    cloudRef.current = null;
    lastSavedRef.current = '';
    lastVersionAtRef.current = null;
    currentDraftRef.current = emptyCornell();
    dirtyRef.current = false;
    localCopyRef.current = true;
    setState({ ...initial(), identity });
    setVersions([]);
    setShowHistory(false);
    if (!identity) {
      setState(s => ({ ...s, loaded: true, status: 'Conta ou assunto indisponível', error: 'Entre novamente para sincronizar o caderno.' }));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const cached = localRead(identity);
        const legacy = localRead(legacyKey);
        const row = await getCornellNote(ownerId, resolvedTopic);
        if (cancelled || identityRef.current !== identity) return;
        const result = reconcileCornell(row, cached, legacy);
        cloudRef.current = row;
        lastSavedRef.current = row ? cornellSignature(row) : '';
        currentDraftRef.current = result.data;
        dirtyRef.current = result.importFromBrowser;
        setState({ identity, loaded: true, draft: result.data,
          dirty: result.importFromBrowser, offline: false, recovery: result.recovery,
          status: result.importFromBrowser ? 'Importando anotações do navegador…' :
            result.source === 'cloud' ? 'Salvo na nuvem' : 'Caderno pronto',
          error: '' });
      } catch (error) {
        if (cancelled || identityRef.current !== identity) return;
        // Não carregar um rascunho por cima de um registro remoto sem checar o servidor.
        const local = localRead(identity) || localRead(legacyKey);
        if (local && hasCornellContent(local)) {
          currentDraftRef.current = cleanCornell(local);
          dirtyRef.current = true;
        }
        setState({ identity, loaded: true, offline: true, draft: cleanCornell(local),
          dirty: !!local, recovery: null, status: 'Offline: salvo somente neste navegador',
          error: 'Não foi possível verificar a versão da nuvem: ' + (error?.message || 'erro desconhecido') +
            '. Você pode continuar anotando neste dispositivo e tentar reconectar depois.' });
      }
    })();
    return () => { cancelled = true; };
  }, [identity, ownerId, resolvedTopic, legacyKey]);

  const edit = (updates) => {
    if (!state.loaded || state.identity !== identity || !identity || switching) return;
    const draft = { ...currentDraftRef.current, ...updates };
    currentDraftRef.current = draft;
    dirtyRef.current = true;
    const localSaved = localWrite(identity, draft);
    localCopyRef.current = localSaved;
    setState(s => s.identity !== identity ? s : ({ ...s, draft, dirty: true,
      error: !localSaved ? 'O navegador impediu a cópia local. Não saia antes de confirmar a sincronização na nuvem.' :
        (s.offline ? s.error : ''),
      status: s.offline ? 'Offline: salvo somente neste navegador' : 'Alterações pendentes…' }));
  };

  const saveNow = React.useCallback(async (snapshot, targetIdentity, forceHistory = false) => {
    if (!ownerId || !resolvedTopic || !targetIdentity) return;
    const sig = cornellSignature(snapshot);
    const task = queueRef.current.catch(() => {}).then(async () => {
      if (identityRef.current !== targetIdentity) return;
      if (!forceHistory && sig === lastSavedRef.current) {
        if (cornellSignature(currentDraftRef.current) === sig) {
          dirtyRef.current = false;
          setState(s => s.identity === targetIdentity ? { ...s, dirty: false, error: '', status: 'Salvo na nuvem' } : s);
        }
        return;
      }
      setSaving(true);
      try {
        const current = cloudRef.current;
        const saved = await saveCornellNote({
          ownerId, topicId: resolvedTopic, topicLabel,
          draft: snapshot, knownRevision: Number(current?.revision || 0),
        });
        if (identityRef.current !== targetIdentity) return;
        cloudRef.current = saved;
        lastSavedRef.current = cornellSignature(snapshot);
        const unchanged = cornellSignature(currentDraftRef.current) === sig;
        dirtyRef.current = !unchanged;
        setState(s => s.identity === targetIdentity ?
          ({ ...s, dirty: !unchanged, error: '', status: unchanged ? 'Salvo na nuvem' : 'Salvando alterações recentes…' }) : s);
        if ((forceHistory || shouldCreateCornellVersion(lastVersionAtRef.current)) && hasCornellContent(snapshot)) {
          try {
            const version = await createCornellVersion({
              ownerId, topicId: resolvedTopic, topicLabel,
              draft: snapshot, revision: saved.revision,
            });
            if (identityRef.current === targetIdentity) {
              lastVersionAtRef.current = version.saved_at || new Date().toISOString();
              setVersions(old => [version, ...old].slice(0, 15));
            }
          } catch (error) {
            if (identityRef.current === targetIdentity) {
              setState(s => s.identity === targetIdentity ? ({
                ...s, error: 'Notas sincronizadas, mas não foi possível criar a versão de segurança: ' + (error?.message || 'erro'),
              }) : s);
            }
          }
        }
      } catch (error) {
        if (identityRef.current === targetIdentity) {
          dirtyRef.current = true;
          setState(s => s.identity === targetIdentity ? ({
            ...s, dirty: true, status: 'Não sincronizado',
            error: 'Falha ao salvar na nuvem: ' + (error?.message || 'erro desconhecido') +
              '. A cópia neste navegador foi preservada.',
          }) : s);
        }
      } finally {
        if (identityRef.current === targetIdentity) setSaving(false);
      }
    });
    queueRef.current = task;
    await task;
  }, [ownerId, resolvedTopic, topicLabel]);

  React.useImperativeHandle(flushRef, () => async () => {
    if (!dirtyRef.current) return true;
    if (!state.offline) await saveNow(currentDraftRef.current, identity);
    return !dirtyRef.current || localCopyRef.current;
  }, [identity, saveNow, state.offline]);

  React.useEffect(() => {
    if (!state.loaded || state.offline || !state.dirty || state.identity !== identity) return;
    const snapshot = cleanCornell(state.draft);
    const timer = setTimeout(() => saveNow(snapshot, identity), SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [state.loaded, state.offline, state.dirty, state.draft, state.identity, identity, saveNow]);

  const suggest = async () => {
    const clean = cornellPlainText(currentDraftRef.current.notes).trim();
    if (clean.length < 20 || busy || !state.loaded) return;
    setBusy(true);
    setState(s => ({ ...s, error: '' }));
    try {
      const res = await generateCuesFn({ data: { topicLabel, notes: clean } });
      const suggestions = {};
      if (Array.isArray(res?.cues) && res.cues.length) {
        suggestions.cues = res.cues.map(c => String(c).startsWith('•') ? c : '• ' + c).join('\n');
      }
      if (res?.summary && !cornellPlainText(currentDraftRef.current.summary).trim()) suggestions.summary = res.summary;
      if (Object.keys(suggestions).length) edit(suggestions);
    } catch (error) {
      setState(s => ({ ...s, error: 'Falha ao gerar pistas pelo Gemini: ' + (error?.message || 'erro desconhecido') }));
    } finally { setBusy(false); }
  };

  const refreshVersions = async () => {
    setShowHistory(true);
    try {
      const list = await listCornellVersions(ownerId, resolvedTopic);
      if (identityRef.current === identity) setVersions(list);
    } catch (error) {
      setState(s => ({ ...s, error: 'Não foi possível carregar versões anteriores: ' + (error?.message || 'erro') }));
    }
  };

  const recover = () => {
    if (!state.recovery) return;
    edit(cleanCornell(state.recovery));
    setState(s => ({ ...s, recovery: null }));
    setRecoverLocal(false);
  };

  const draft = state.draft;
  const linkedPairs = paired ? readCornellPairs(draft.notes) : [];
  const disabled = !state.loaded || switching;
  const syncStatus = state.loaded && !state.offline && !state.error && (state.dirty || saving)
    ? 'Sincronização pendente' : state.status;
  return (
    <section aria-label="Quadro do Cornell" style={{ display: 'flex', flexDirection: 'column', gap: 13, minWidth: 0 }}>
      <div className="qb-panel qb-panel--sunken" style={{ padding: '12px 16px', border: '1px solid rgba(208,179,134,.35)', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Icon name="notebook-pen" color="var(--qb-gold)" size={19} />
          <span style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)', flex: 1 }}>
            Caderno de <strong style={{ color: 'var(--qb-ivory)' }}>{topicLabel}</strong>
          </span>
          {state.offline ?
            <Button size="sm" variant="secondary" icon="refresh-cw" onClick={() => window.location.reload()}>Reconectar</Button> :
            <Button size="sm" variant="secondary" icon="save" onClick={() => saveNow(currentDraftRef.current, identity)} disabled={!state.loaded || saving || switching || !state.dirty}>Salvar agora</Button>}
          <Button size="sm" variant="ghost" icon="history" onClick={refreshVersions} disabled={!state.loaded || state.offline}>Versões</Button>
          {!paired && <Button size="sm" variant="secondary" icon="sparkles" loading={busy}
            disabled={!state.loaded || cornellPlainText(draft.notes).trim().length < 20 || busy} onClick={suggest}>
            Sugerir pistas com Gemini
          </Button>}
          <Button size="sm" variant="ghost" icon={hide ? 'eye' : 'eye-off'} aria-pressed={hide} onClick={() => setHide(h => !h)}>
            {hide ? 'Mostrar notas' : 'Esconder para evocar'}
          </Button>
        </div>
        {state.recovery && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', paddingTop: 10 }}>
            <span style={{ flex: 1, color: 'var(--text-secondary)', font: '400 13px/1.5 var(--font-body)' }}>
              Há anotações diferentes neste navegador. A versão da nuvem foi carregada; a cópia local está preservada.
            </span>
            <Button size="sm" variant="secondary" icon="refresh-ccw" onClick={() => setRecoverLocal(true)}>
              Recuperar cópia local
            </Button>
          </div>
        )}
      </div>
      <div className="qb-train-fold qb-train-fold--nested">
        <CornellFormatting disabled={disabled} actions={onTogglePairs && <Button size="sm" variant="ghost" icon={paired ? 'notebook-pen' : 'link'}
          disabled={switching} onClick={onTogglePairs}>
          {paired ? 'Anotações originais' : 'Pistas e notas vinculadas'}
        </Button>}>
        <div className="qb-train-fold__body">
          {paired ? <CornellLinkedBoard pairs={linkedPairs} notesHidden={hide} disabled={disabled}
            onChange={value => edit({ notes: JSON.stringify(value) })} /> : <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px,100%),1fr))', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Pistas / perguntas</span>
                <CornellRichEditor label="Pistas / perguntas" height={220}
                  value={draft.cues} onChange={value => edit({ cues: value })}
                  disabled={disabled} placeholder="Perguntas de evocação ativa que suas notas respondem" />
              </div>
              <div style={{ display: 'grid', alignContent: 'start', gap: 6, minWidth: 0 }}>
                <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Notas</span>
                {hide ? (
                  <div className="qb-textarea" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Notas ocultas. Responda às pistas de memória.
                  </div>
                ) : (
                  <CornellRichEditor label="Notas" height={220}
                    value={draft.notes} onChange={value => edit({ notes: value })}
                    disabled={disabled} placeholder="Registre as anotações de leitura e aula. Salvas automaticamente na sua conta." />
                )}
              </div>
            </div>
          </>}
          <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>{paired ? 'Síntese das pistas vinculadas' : 'Síntese'}</span>
            <CornellRichEditor label={paired ? 'Síntese das pistas vinculadas' : 'Síntese'} height={92}
              value={draft.summary} onChange={value => edit({ summary: value })}
              disabled={disabled} placeholder="Resuma em 2–3 frases, com suas palavras" />
          </div>
        </div>
        </CornellFormatting>
      </div>
      <p role="status" title={syncStatus} style={{ font: '500 12px/1.4 var(--font-body)', color: state.error ? 'var(--state-incorrect)' : 'var(--qb-gold)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {syncStatus}
      </p>
      {state.error && <p role="alert" style={{ color: 'var(--state-incorrect)', font: '400 13px/1.5 var(--font-body)', margin: 0 }}>{state.error}</p>}
      {showHistory && (
        <div className="qb-panel qb-panel--sunken" style={{ border: '1px solid rgba(208,179,134,.34)', borderRadius: 12, padding: 14, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <strong style={{ font: '500 16px/1.4 var(--font-heading)', color: 'var(--qb-ivory)' }}>Histórico Cornell</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="sm" variant="secondary" icon="bookmark-plus" disabled={saving || !state.loaded}
                onClick={() => saveNow(currentDraftRef.current, identity, true)}>Criar versão de segurança</Button>
              <Button size="sm" variant="ghost" icon="x" onClick={() => setShowHistory(false)}>Fechar</Button>
            </div>
          </div>
          {versions.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma versão anterior registrada.</p> : versions.map(version => (
            <div key={version.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid var(--divider)' }}>
              <span style={{ flex: 1, color: 'var(--text-secondary)', font: '400 13px/1.5 var(--font-body)' }}>
                Versão {version.revision} · {new Date(version.saved_at).toLocaleString('pt-BR')}
              </span>
              <Button size="sm" variant="secondary" icon="rotate-ccw" onClick={() => setRestore(version)}>Restaurar esta versão</Button>
            </div>
          ))}
        </div>
      )}
      {!paired && <p style={{ margin: 0, color: 'var(--text-muted)', font: '400 12px/1.5 var(--font-body)' }}>
        Sincronização na conta do QBAsc. As alterações são salvas após uma pausa na digitação. Uma cópia no navegador permanece como segurança.
      </p>}
      <ConfirmDialog open={Boolean(restore)} tone="attention"
        title="Restaurar uma versão anterior?" description="A versão selecionada será carregada como nova edição. As versões já salvas e a cópia antiga não serão excluídas."
        confirmLabel="Restaurar como nova edição" onCancel={() => setRestore(null)}
        onConfirm={() => { if (restore) edit(cleanCornell(restore)); setRestore(null); }} />
      <ConfirmDialog open={recoverLocal} tone="attention"
        title="Recuperar o rascunho do navegador?"
        description="A cópia local será carregada como uma nova edição. O registro da nuvem poderá ser recuperado pelo histórico."
        confirmLabel="Recuperar rascunho" onCancel={() => setRecoverLocal(false)} onConfirm={recover} />
    </section>
  );
}
export { CornellNotebook };
