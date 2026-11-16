import React from 'react';
import { Button } from '@/components/qb/core/Button';
import { useRealStudy } from '@/lib/qb-real-data';
import { CORNELL_VERIFICATION_LIMITS, cornellVerificationContext, reviewCornellNotebook } from '@/lib/cornell-verification';

const emptySource = () => ({ title: '', text: '' });
const labelForCheck = {
  literal: 'Correspondência literal no trecho',
  related: 'Trecho relacionado. Compare a redação.',
  pending: 'Pendente de fonte original',
};

export function CornellVerification({ topicId, draft, paired, readCompanion, disabled }) {
  const { QB_DATA } = useRealStudy();
  const id = React.useId();
  const inFlight = React.useRef(false);
  const [sources, setSources] = React.useState(() => [emptySource()]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [completed, setCompleted] = React.useState(null);
  const topic = QB_DATA.studySubjects.flatMap(subject => subject.topics).find(item => item.id === topicId);
  const { map, references, mapLimited } = React.useMemo(() => cornellVerificationContext(QB_DATA, topic), [QB_DATA, topic]);
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
      const feedback = reviewCornellNotebook({
        original: paired ? other : draft,
        linked: paired ? draft : other,
        map,
        sources: evidence,
      });
      setCompleted({ feedback, draft, sources, evidence });
    } catch (failure) {
      setError(failure?.message || 'Não foi possível verificar o caderno. Tente novamente.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const stale = completed && (completed.draft !== draft || completed.sources !== sources);
  return (
    <div className="qb-cornell-verification qb-panel qb-panel--sunken">
      <p>Revise a ligação entre suas ideias nas anotações originais e nas pistas vinculadas. {map.length
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
        <Button variant="secondary" icon="list-checks" disabled={disabled} loading={busy} onClick={review}>Verificar caderno</Button>
        <p>A conferência é feita no navegador. Abra a fonte para confirmar o contexto de cada trecho.</p>
      </div>
      {busy && <p role="status">Verificando o caderno…</p>}
      {error && <p role="alert">{error}</p>}
      {stale && <p role="status">O caderno ou as fontes mudaram. Verifique novamente para atualizar o parecer.</p>}
      {completed && <div className="qb-cornell-verification__feedback" aria-label="Parecer do Arquiteto">
        <div role="status" className="qb-overline">Parecer do Arquiteto disponível</div>
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
          <h4>Conferência com as fontes originais</h4>
          <p>Até cinco trechos do caderno por verificação.</p>
          <ul>{completed.feedback.checks.map((check, i) => <li key={i}>
            <strong>{check.claim}</strong>
            <p>{labelForCheck[check.status]}</p>
            {check.quote && <blockquote>
              <p>“{check.quote}”</p>
              <cite>{completed.evidence[check.sourceId - 1].title}</cite>
            </blockquote>}
          </li>)}</ul>
        </div>}
      </div>}
    </div>
  );
}
