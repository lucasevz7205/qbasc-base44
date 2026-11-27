import React from 'react';
import { mechanismDetail } from '@/lib/cebraspe-v1-taxonomy';
import { reviewDay } from '@/lib/spaced-review';
import { buildAnswerRecord } from '@/lib/study-store';
import { PILOT_TASKS } from '@/lib/nexo/pilot-recommendation';
import { PILOT_ACTIVITIES, PILOT_VERSION, dueDay, pilotNavigator, readPilotAttempts, submitPilotAttempt } from '@/lib/nexo/controlled-pilot';

function TransferItem({ item, attempt, source, topicId, onSubmit, onBack }) {
  const heading = React.useRef(null);
  const [marked, setMarked] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const lock = React.useRef(false);
  React.useEffect(() => heading.current?.focus(), []);
  const evaluation = attempt && buildAnswerRecord({
    question: { id: item.id, gabarito: item.gabarito, cap: topicId },
    marked: attempt.marked,
    now: new Date(attempt.at),
  }).record.hist[0];
  const submit = async event => {
    event.preventDefault();
    if (!marked || lock.current || attempt) return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      await onSubmit(marked);
    } catch (failure) {
      setError(failure.message || 'Não foi possível registrar a tentativa local.');
    } finally {
      setSaving(false);
      lock.current = false;
    }
  };
  const parts = /^([\s\S]*?)(\u201c[\s\S]*?\u201d)\s*Julgue o item\.\s*([\s\S]+)$/.exec(item.enunciado);
  const alt = !parts && /^([\s\S]*?)\s*Julgue o item\.\s*([\s\S]+)$/.exec(item.enunciado);
  return <section className="nexo-exp nexo-pilot" aria-label="Item de transferência">
    <h2 tabIndex={-1} ref={heading}>Item de transferência</h2>
    <form onSubmit={submit} className="nexo-instrument nexo-transfer-form">
      {parts?<>
        <p className="nexo-transfer-instruction">{parts[1].trim()}</p>
        <blockquote className="nexo-transfer-text">{parts[2]}</blockquote>
        <p className="nexo-transfer-claim">{parts[3]}</p>
      </>:alt?<>
        <blockquote className="nexo-transfer-text">{alt[1]}</blockquote>
        <p className="nexo-transfer-claim">{alt[2]}</p>
      </>:<p className="nexo-transfer-claim">{item.enunciado}</p>}
      <fieldset disabled={Boolean(attempt)||saving}>
        <legend>Julgue o item</legend>
        {[['C','Certo'],['E','Errado']].map(([value,label])=><label key={value} className="nexo-choice">
          <input type="radio" name="julgamento" value={value}
            checked={(attempt?.marked || marked)===value} onChange={()=>setMarked(value)} /><span>{label}</span>
        </label>)}
      </fieldset>
      {!attempt&&<div className="nexo-transfer-actions">
        <button type="submit" className="qb-btn qb-btn--primary" disabled={!marked||saving}>Confirmar julgamento</button>
        {!marked&&<span className="nexo-transfer-hint">Escolha Certo ou Errado.</span>}
      </div>}
      {error&&<p role="alert">{error}</p>}
      {evaluation&&<div role="status" className="nexo-training-result">
        <strong>{evaluation.ok?'Você acertou.':'Você errou.'} Gabarito {item.gabarito==='C'?'Certo':'Errado'}.</strong>
        <p>{item.comentario}</p>
        <p><strong>Trecho decisivo</strong> {item.trechoDecisivo}</p>
        {item.correcaoMinima&&<p><strong>Correção mínima</strong> {item.correcaoMinima}</p>}
        <p>{item.mecanismo} · {mechanismDetail(item.mecanismo)?.n}</p>
        <p><strong>Fonte do conceito</strong> {source}</p>
      </div>}
    </form>
    <div><button type="button" className="qb-btn qb-btn--secondary" onClick={onBack}>Voltar ao piloto</button></div>
  </section>;
}

export default function NexoControlledPilot({ accountId, recommend, renderers, sources, onBack }) {
  const key = 'qbasc:' + PILOT_VERSION + ':' + accountId;
  const [selected, setSelected] = React.useState(PILOT_TASKS[0].id);
  const [attempts, setAttempts] = React.useState(null);
  const [today, setToday] = React.useState(null);
  const [storageError, setStorageError] = React.useState('');
  const [activeItem, setActiveItem] = React.useState(null);
  const [practiced, setPracticed] = React.useState(false);
  const [prediction, setPrediction] = React.useState(false);
  const heading = React.useRef(null);
  const activitySelect = React.useId();
  const task = PILOT_TASKS.find(entry=>entry.id===selected);
  const activity = PILOT_ACTIVITIES.find(entry=>entry.modelId===task.modelId);
  const { modelId, topicId, nodeId, items } = activity;
  const decision = recommend(task, activity);
  const model = decision.model;
  const Renderer = renderers[modelId];

  React.useEffect(()=>{
    const sync = () => {
      try {
        setAttempts(readPilotAttempts(window.localStorage, key));
        setStorageError('');
      } catch {
        setStorageError('O armazenamento local do piloto está indisponível.');
      }
    };
    const syncDate = () => setToday(reviewDay(new Date()));
    const onStorage = event => { if (event.key===key || event.key===null) sync(); };
    sync();
    syncDate();
    window.addEventListener('storage',onStorage);
    const timer = window.setInterval(syncDate, 30000);
    return ()=>{
      window.removeEventListener('storage',onStorage);
      window.clearInterval(timer);
    };
  },[key]);
  React.useEffect(()=>{
    if(!activeItem) heading.current?.focus();
  },[activeItem]);

  const submit = async marked => {
    const storage = window.localStorage;
    const locks = window.navigator.locks;
    if(!locks) throw new Error('Use um navegador com suporte a bloqueios de armazenamento local.');
    const next = await locks.request(key, () => {
      const current = readPilotAttempts(storage, key);
      const updated = submitPilotAttempt(current, activeItem.id, marked, new Date());
      if(updated!==current) storage.setItem(key, JSON.stringify(updated));
      return updated;
    });
    setAttempts(next);
  };

  if(activeItem&&model) return <TransferItem key={activeItem.id} item={activeItem}
    attempt={attempts?.[activeItem.id]} source={decision.reference} topicId={topicId}
    onSubmit={submit} onBack={()=>{setActiveItem(null);setPrediction(false);}}/>;

  const [first, followUp] = items;
  const due = dueDay(attempts?.[first.id]);
  const navigator = attempts && pilotNavigator(attempts, accountId);
  return <section className="nexo-exp nexo-pilot" aria-label="Piloto curado do NEXO">
    <header>
      <h2 ref={heading} tabIndex={-1}>Piloto curado do NEXO</h2>
      <p>Explore o modelo, faça o treino e julgue um item em outro cenário. As tentativas do piloto ficam neste navegador.</p>
      <button type="button" className="qb-btn qb-btn--secondary qb-btn--sm" onClick={onBack}>Voltar ao Laboratório Visual</button>
    </header>
    <div className="nexo-control">
      <label htmlFor={activitySelect}>Tarefa de estudo</label>
      <select id={activitySelect} className="qb-input" value={selected} onChange={event=>{
        setSelected(event.target.value);
        setPracticed(false);
        setPrediction(false);
      }}>
        {PILOT_TASKS.map(entry=><option key={entry.id} value={entry.id}>{entry.title}</option>)}
      </select>
    </div>
    {model && <div aria-live="polite">
      <h3>{model.title}</h3>
      <p>{decision.reason}</p>
    </div>}
    {model?<div className="nexo-exp-workbench">
      <div className="nexo-exp-main">
        <Renderer key={modelId} nodeId={nodeId} source={sources[modelId]} sourceNode={model.source}
          onPredictionMode={setPrediction} onPracticeComplete={()=>setPracticed(true)} />
      </div>
      <aside className="nexo-exp-context" aria-label="Fonte do experimento">
        <strong>Fonte registrada</strong>
        <p>{decision.reference}</p>
        {!prediction&&<details key={selected}><summary>{modelId==='lg32-leitura'?'Síntese da fonte por etapa':'Evidência por etapa da tarefa'}</summary>
          <dl>{decision.evidence.map(row=><React.Fragment key={row.part}>
            <dt>{row.part}</dt><dd>{row.excerpt}</dd>
          </React.Fragment>)}</dl>
        </details>}
      </aside>
    </div>:<p role="status">Revisão necessária. {decision.reason}</p>}
    {storageError&&<p role="alert">{storageError}</p>}
    <section className="nexo-instrument nexo-pilot-results" aria-label="Transferência e Navegador">
      <h3>Transferência</h3>
      {!practiced&&!due&&<p>Confira suas respostas no modelo para liberar o primeiro item.</p>}
      <div className="nexo-pilot-actions">
        <button type="button" className="qb-btn qb-btn--primary" disabled={!model||!attempts||Boolean(storageError)||!(practiced||due)}
          onClick={()=>setActiveItem(first)}>{due?'Ver a tentativa inicial':'Sair do modelo e julgar o item'}</button>
        <button type="button" className="qb-btn qb-btn--secondary" disabled={!model||!today||!due||today<due||Boolean(storageError)}
          onClick={()=>setActiveItem(followUp)}>{attempts?.[followUp.id]?'Ver a tentativa D+7':'Julgar item D+7'}</button>
      </div>
      {due&&<p>D+7 disponível em <time dateTime={due}>{due.split('-').reverse().join('/')}</time>.</p>}
      <h3>Navegador · prévia local</h3>
      {navigator?.nodes.length?<ul>{PILOT_ACTIVITIES.map(entry=>{
        const signal = navigator.nodes.find(node=>node.nodeId===entry.nodeId)?.recognition;
        return signal&&<li key={entry.nodeId}>{entry.label} · {signal.correct}/{signal.total} itens C/E corretos</li>;
      })}</ul>:<p>Aguardando o primeiro julgamento C/E.</p>}
    </section>
  </section>;
}
