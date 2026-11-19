import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { assessCornellNotebook } from '@/lib/server-fns';
import { prepareCornellAssessment } from '@/lib/cornell-assessment';
import { CornellAssessmentFeedback } from '@/components/qb/architect/CornellAssessmentFeedback';
import { Button } from '@/components/qb/core/Button';
import { useRealStudy } from '@/lib/qb-real-data';
import { CORNELL_VERIFICATION_LIMITS, cornellVerificationContext, reviewCornellNotebook } from '@/lib/cornell-verification';

const emptySource = () => ({ title: '', text: '' });
const labelForCheck = {
  literal: 'Correspondência literal no trecho',
  related: 'Trecho relacionado. Compare a redação.',
  pending: 'Pendente de conferência',
};

export function CornellVerification({ topicId, draft, paired, readCompanion, disabled }) {
  const { QB_DATA } = useRealStudy();
  const id = React.useId();
  const inFlight = React.useRef(false);
  const mounted = React.useRef(true);
  const assess = useServerFn(assessCornellNotebook);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [sources, setSources] = React.useState(() => [emptySource()]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [completed, setCompleted] = React.useState(null);
  const [answer, setAnswer] = React.useState('');
  const [confidence, setConfidence] = React.useState(null);
  const [answerBusy, setAnswerBusy] = React.useState(false);
  const topic = QB_DATA.studySubjects.flatMap(subject => subject.topics).find(item => item.id === topicId);
  const { map, references, mapLimited, bank } = React.useMemo(() => cornellVerificationContext(QB_DATA, topic), [QB_DATA, topic]);
  const changeSource = (index, patch) => setSources(current => current.map((source, i) => i === index ? { ...source, ...patch } : source));
  const review = async () => {
    if (disabled || inFlight.current) return;
    const sourceInputs = sources.filter(source => source.title.trim() || source.text.trim());
    setError('');
    setCompleted(null);
    if (sourceInputs.some(source => !source.title.trim() || !source.text.trim())) {
      setError('Preencha o nome e o trecho de cada fonte que quiser usar ou limpe os dois campos.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const other = await readCompanion();
      const evidence = sourceInputs.map(source => ({ title: source.title.trim(), text: source.text.trim() }));
      const notebookData = { original: paired ? other : draft, linked: paired ? draft : other, map, sources: evidence, bank };
      const feedback = reviewCornellNotebook(notebookData);
      const input = prepareCornellAssessment({ ...notebookData, topicLabel: topic?.title || topicId, mapLimited });
      const snapshot = { feedback, draft, sources, evidence, bank, input, analysis: null, attempt: null };
      if (!mounted.current) return;
      setCompleted(snapshot);
      setAnswer('');
      setConfidence(null);
      const analysis = await assess({ data: input });
      if (mounted.current) setCompleted(current => current?.input === input ? { ...current, analysis } : current);
    } catch (failure) {
      if (mounted.current) setError(failure?.message || 'Não foi possível verificar o caderno. Tente novamente.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const stale = completed && (completed.draft !== draft || completed.sources !== sources || completed.bank !== bank);
  const checkAnswer = async () => {
    if (disabled || stale || !completed?.analysis || inFlight.current || answer.trim().length < 10 || !confidence) return;
    inFlight.current = true;
    setAnswerBusy(true);
    setError('');
    const snapshot = completed;
    const tentativa = { pergunta: snapshot.analysis.pergunta, resposta: answer.trim(), confianca: confidence };
    try {
      const other = await readCompanion();
      const currentInput = prepareCornellAssessment({
        original: paired ? other : draft, linked: paired ? draft : other, map, sources: snapshot.evidence, bank,
        topicLabel: topic?.title || topicId, mapLimited,
      });
      if (JSON.stringify(currentInput.notebook) !== JSON.stringify(snapshot.input.notebook)) throw new Error('O outro caderno mudou. Verifique novamente antes de avaliar a resposta.');
      const result = await assess({ data: { ...snapshot.input, tentativa } });
      if (mounted.current) setCompleted(current => current?.input === snapshot.input ? {
        ...current, analysis: { ...current.analysis, avaliacaoResposta: result.avaliacaoResposta }, attempt: tentativa,
      } : current);
    } catch (failure) {
      if (mounted.current) setError(failure?.message || 'Não foi possível avaliar a resposta. Tente novamente.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setAnswerBusy(false);
    }
  };
  return (
    <div className="qb-cornell-verification qb-panel qb-panel--sunken">
      <p>A verificação compara suas notas com materiais, mapas, fundamentos das questões e flashcards da matéria. {map.length
        ? 'O mapa deste assunto ajuda a localizar tópicos que podem faltar nas notas.'
        : 'Este assunto não tem mapa mental para a comparação de tópicos.'}</p>
      {mapLimited && <p>O mapa é extenso. A revisão prioriza até {CORNELL_VERIFICATION_LIMITS.mapNodes} tópicos, começando pelos ramos principais.</p>}
      {references.length > 0 && <details>
        <summary>Referências do assunto</summary>
        <ul>
          {references.map(reference => <li key={reference.title}>
            {reference.url ? <a href={reference.url} target="_blank" rel="noreferrer">{reference.title}</a> : reference.title}
          </li>)}
        </ul>
      </details>}
      <details>
        <summary>Fornecer trechos das fontes originais</summary>
        <p>Abra o material de origem e cole os trechos relevantes. Sem esses trechos, as afirmações do caderno ficam pendentes de conferência.</p>
        <datalist id={id + '-references'}>{references.map(reference => <option key={reference.title} value={reference.title.slice(0, 300)} />)}</datalist>
        {sources.map((source, index) => <fieldset key={index} disabled={busy}>
          <legend>Fonte {index + 1}</legend>
          <label>
            Nome e localização na fonte
            <input className="qb-input" list={id + '-references'} value={source.title} maxLength={300}
              placeholder="Ex.: RICD, art. 55, § 1º" onChange={event => changeSource(index, { title: event.target.value })} />
          </label>
          <label>
            Trecho original
            <textarea className="qb-textarea" rows={3} maxLength={CORNELL_VERIFICATION_LIMITS.sourceText}
              value={source.text} onChange={event => changeSource(index, { text: event.target.value })} />
          </label>
          {sources.length > 1 && <Button size="sm" variant="ghost" icon="x"
            onClick={() => setSources(current => current.filter((_, i) => index !== i))}>Remover fonte {index + 1}</Button>}
        </fieldset>)}
        {sources.length < CORNELL_VERIFICATION_LIMITS.sources && <Button size="sm" variant="secondary" icon="plus" disabled={busy}
          onClick={() => setSources(current => [...current, emptySource()])}>Adicionar outra fonte</Button>}
      </details>
      <div className="qb-cornell-verification__run">
        <Button variant="secondary" icon="list-checks" disabled={disabled || answerBusy} loading={busy} onClick={review}>Analisar com O Arquiteto</Button>
        <p>Envia as notas e os trechos selecionados ao Gemini pela API do Arquiteto. A análise não modifica o caderno nem o progresso.</p>
      </div>
      {busy && <p role="status">Verificando o caderno…</p>}
      {error && <p role="alert">{error}</p>}
      {stale && <p role="status">O caderno, as fontes ou o acervo mudaram. Verifique novamente para atualizar o parecer.</p>}
      {completed?.analysis && <CornellAssessmentFeedback analysis={completed.analysis} id={id} answer={answer} confidence={confidence}
        onAnswer={setAnswer} onConfidence={setConfidence} onCheck={checkAnswer} busy={answerBusy} disabled={disabled || busy} stale={Boolean(stale)} attempt={completed.attempt} />}
      {completed && <details><summary>Comparação local de trechos e cobertura</summary><div className="qb-cornell-verification__feedback" aria-label="Comparação local do caderno">
        <div className="qb-overline">Indícios locais · comparação por termos e trechos</div>
        {completed.feedback.relations.length > 0 && <div>
          <h4>Relações entre as ideias</h4>
          <ul>{completed.feedback.relations.map((relation, i) => <li key={i}>
            <strong>{relation.label}</strong>
            {relation.excerpts?.map((excerpt, index) => <blockquote key={index}><p>“{excerpt}”</p></blockquote>)}
            <p>{relation.feedback}</p>
          </li>)}</ul>
        </div>}
        {map.length > 0 && <div>
          <h4>Cobertura do mapa mental</h4>
          <p>A busca por termos sinaliza possíveis lacunas. Sinônimos e explicações indiretas podem exigir revisão manual.</p>
          {completed.feedback.gaps.length > 0 ?
            <ul>{completed.feedback.gaps.map((gap, i) => <li key={i}><strong>{gap.label}</strong>{gap.parent && <p>Ramo do mapa · {gap.parent}</p>}<p>{gap.question}</p></li>)}</ul>
            : <p>A busca encontrou termos dos ramos analisados nas notas. Confira se cada ideia está desenvolvida.</p>}
        </div>}
        {completed.feedback.checks.length > 0 && <div>
          <h4>Comparação com o acervo e as fontes originais</h4>
          <p>Até cinco trechos do caderno por verificação. O acervo indica pontos para conferir no material de origem.</p>
          <ul>{completed.feedback.checks.map((check, i) => <li key={i}>
            <strong>{check.claim}</strong>
            {check.bank ? <>
              <p>{check.bank.literal ? 'Correspondência literal no acervo' : 'Trecho relacionado no acervo'} · {check.bank.kind} · {check.bank.topic}</p>
              <blockquote>
                <p>“{check.bank.quote}”</p>
                <cite>{check.bank.title}</cite>
                {check.bank.reference && <p style={{ whiteSpace: 'pre-line' }}>{check.bank.reference}</p>}
                {check.bank.url && <a href={check.bank.url} target="_blank" rel="noreferrer">Abrir referência do acervo</a>}
              </blockquote>
            </> : <p>{completed.bank.length ? 'Sem trecho semelhante no acervo da matéria' : 'Acervo textual indisponível para esta matéria'}</p>}
            <p>Fonte original · {labelForCheck[check.status]}</p>
            {check.quote && <blockquote>
              <p>“{check.quote}”</p>
              <cite>{completed.evidence[check.sourceId - 1].title}</cite>
            </blockquote>}
          </li>)}</ul>
        </div>}
      </div></details>}
    </div>
  );
}
