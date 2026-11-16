import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/qb/core/Button';
import { Panel } from '@/components/qb/core/Panel';
import { PageHeader } from '@/components/qb/navigation/PageHeader';
import { IMPORTABLE } from '@/lib/account-boundary';
import FlashcardBatchPanel from '@/components/qb/study/FlashcardBatchPanel';
import { listStudyAccounts, updateStudyAccount, inspectStudyAccount, importStudyDocuments, previewStudyBank, importStudyBank } from '@/lib/study-accounts';

export const Route = createFileRoute('/administracao')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Administração · Quebrando a Banca' }] }),
  component: Administration,
});

const STATUS = { pending: 'Pendente', active: 'Ativa', suspended: 'Suspensa' };
const LABELS = { edital: 'Edital', questoes: 'Questões', revisao: 'Mapas e flashcards', planejamento: 'Planejamento',
  materiais: 'Materiais', pontos: 'Pontos-chave', pegadinhas: 'Pegadinhas' };

function Administration() {
  const auth = useAuth();
  if (auth.isLoadingAuth) return <main style={{ padding: 24 }}>Verificando acesso…</main>;
  if (!auth.user) return <main style={{ padding: 24 }}><Button onClick={auth.navigateToLogin}>Entrar</Button></main>;
  if (auth.user.role !== 'admin') return <main style={{ padding: 24 }}>Acesso administrativo restrito. <Link to="/">Voltar ao início</Link></main>;
  return <AccountList />;
}

function AccountList() {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    setError('');
    try { setProfiles(await listStudyAccounts()); }
    catch (err) { setError(err.message || 'Não foi possível carregar as contas.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  const profile = profiles.find(item => item.id === selected);
  return <main style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 16px 60px', display: 'grid', gap: 16 }}>
    <PageHeader overline="Administração" title="Contas" description="Gerencie o acesso e o conteúdo dos espaços individuais." actions={<Link to="/">Voltar ao estudo</Link>} />
    <Panel style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
        <h2 style={{ font: 'var(--type-h2)' }}>Contas cadastradas</h2>
        <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>Atualizar</Button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!profiles.length && <p>{loading ? 'Carregando…' : 'Após o primeiro login, o candidato aparece aqui como pendente.'}</p>}
      {profiles.map(item => <Button key={item.id} variant={item.id === selected ? 'primary' : 'secondary'} aria-pressed={item.id === selected} onClick={() => setSelected(item.id)}>
        {item.name} {item.email ? '· ' + item.email : ''} · {STATUS[item.status] || item.status}
      </Button>)}
    </Panel>
    <FlashcardBatchPanel />
    {profile && <AccountDetails key={profile.id} profile={profile} refresh={refresh} />}
  </main>;
}

function AccountDetails({ profile, refresh }) {
  const id = profile.id;
  const [exam, setExam] = useState(profile.exam || '');
  const [status, setStatus] = useState(profile.status);
  const [summary, setSummary] = useState(null);
  const [collection, setCollection] = useState('edital');
  const [file, setFile] = useState(null);
  const [topicId, setTopicId] = useState('');
  const [chapter, setChapter] = useState('');
  const [preview, setPreview] = useState(null);
  const [chosen, setChosen] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refreshDetails = async () => setSummary(await inspectStudyAccount({ data: { id } }));
  useEffect(() => {
    let active = true;
    inspectStudyAccount({ data: { id } }).then(
      value => { if (active) setSummary(value); },
      err => { if (active) setError(err.message || 'Não foi possível carregar o espaço.'); }
    );
    return () => { active = false; };
  }, [id]);
  const run = async action => {
    setBusy(true);
    setMessage('');
    setError('');
    try { await action(); }
    catch (err) { setError(err.message || 'Não foi possível concluir a operação.'); }
    finally { setBusy(false); }
  };
  const clearPreview = () => { setPreview(null); setChosen([]); };
  const bankArgs = { id, topicId, chapter: chapter.trim() };

  return <div style={{ display: 'grid', gap: 16 }}>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <Panel as="form" style={{ display: 'grid', gap: 12 }} onSubmit={event => {
      event.preventDefault();
      void run(async () => {
        await updateStudyAccount({ data: { id, exam, status } });
        await refresh();
        setMessage('Conta atualizada.');
      });
    }}>
      <h2 style={{ font: 'var(--type-h2)' }}>{profile.name}</h2>
      <p>{profile.email || 'E-mail indisponível'} · {STATUS[profile.status] || profile.status}</p>
      <label>Concurso <input className="qb-input" value={exam} maxLength={160} onChange={event => setExam(event.target.value)} /></label>
      <label>Acesso <select className="qb-input" value={status} onChange={event => setStatus(event.target.value)}>
        {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <Button type="submit" disabled={busy}>Salvar conta</Button>
    </Panel>
    <Panel as="form" style={{ display: 'grid', gap: 12 }} onSubmit={event => {
      event.preventDefault();
      if (!file) return;
      void run(async () => {
        if (file.size > 4000000) throw new Error('Use arquivos JSON de até 4 MB.');
        const rows = JSON.parse(await file.text());
        if (!Array.isArray(rows) || !rows.length || rows.some(row => !row || typeof row.id !== 'string' || !row.id.trim()))
          throw new Error('Escolha um arquivo JSON com uma lista de registros, cada um com id.');
        let created = 0, skipped = 0;
        for (let i = 0; i < rows.length; i += 20) {
          const part = await importStudyDocuments({ data: { id, collection, rows: rows.slice(i, i + 20) } });
          created += part.created;
          skipped += part.skipped;
        }
        setMessage(created + ' importados · ' + skipped + ' já existentes.');
        await refreshDetails();
      });
    }}>
      <h2 style={{ font: 'var(--type-h2)' }}>Conteúdo do espaço</h2>
      {summary && <p>{summary.edital.length} tópicos do edital · {summary.questions} questões · {summary.revisions} documentos de revisão</p>}
      <label>Tipo de conteúdo <select className="qb-input" value={collection} onChange={event => setCollection(event.target.value)}>
        {IMPORTABLE.map(key => <option key={key} value={key}>{LABELS[key]}</option>)}
      </select></label>
      <label>Arquivo JSON <input type="file" accept=".json,application/json" onChange={event => setFile(event.target.files?.[0] || null)} /></label>
      <Button type="submit" disabled={busy || !file}>Importar para esta conta</Button>
    </Panel>
    <Panel style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ font: 'var(--type-h2)' }}>Copiar questões do banco geral</h2>
      <label>Assunto de destino <select className="qb-input" value={topicId} disabled={busy} onChange={event => { setTopicId(event.target.value); clearPreview(); }}>
        <option value="">Selecione um assunto</option>
        {(summary?.edital || []).map(row => <option key={row.id} value={row.id}>{[row.materia, row.num, row.titulo].filter(Boolean).join(' · ')}</option>)}
      </select></label>
      <label>Código do capítulo no banco <input className="qb-input" maxLength={120} value={chapter} disabled={busy} onChange={event => { setChapter(event.target.value); clearPreview(); }} /></label>
      <Button variant="secondary" disabled={busy || !topicId || !bankArgs.chapter} onClick={() => run(async () => {
        clearPreview();
        setPreview(await previewStudyBank({ data: bankArgs }));
      })}>Ver questões disponíveis</Button>
      {preview && !preview.length && <p>Nenhuma questão disponível neste capítulo.</p>}
      {!!preview?.length && <>
        <p>Selecione até 50 questões por vez.</p>
        <div style={{ display: 'grid', gap: 8, maxHeight: 340, overflowY: 'auto', overflowWrap: 'anywhere' }}>
          {preview.map(item => <label key={item.id} style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
            <input type="checkbox" disabled={busy || (chosen.length >= 50 && !chosen.includes(item.id))}
              checked={chosen.includes(item.id)} onChange={event => setChosen(event.target.checked
                ? [...chosen, item.id] : chosen.filter(value => value !== item.id))} />
            <span>{item.code ? item.code + ' · ' : ''}{item.enunciado}</span>
          </label>)}
        </div>
        <Button disabled={busy || !chosen.length} onClick={() => run(async () => {
          const result = await importStudyBank({ data: { ...bankArgs, questionIds: chosen } });
          setMessage(result.created + ' copiadas · ' + result.skipped + ' já existentes.');
          setChosen([]);
          await refreshDetails();
        })}>Copiar {chosen.length} selecionadas</Button>
      </>}
    </Panel>
  </div>;
}
