import React from 'react';
import { Button } from '@/components/qb/core/Button';

const resultLabels = {
  nao_testada: 'Compreensão ainda não testada',
  compreensao_demonstrada: 'Compreensão demonstrada nesta resposta',
  parcial: 'Compreensão parcial',
  lacuna: 'Lacuna na resposta',
};
const gapLabels = { erro: 'Divergência apoiada em trecho', lacuna: 'Lacuna', possivel_lacuna: 'Possível lacuna', nao_verificavel: 'Precisa de fonte para conferir' };

function Citation({ citation }) {
  if (!citation) return null;
  return <details>
    <summary>Trecho usado na análise · {citation.title}</summary>
    <blockquote><p>“{citation.quote}”</p><cite>{citation.title} · {citation.kind === 'original_fornecida' ? 'trecho fornecido' : 'acervo da matéria'}</cite></blockquote>
    <p>A citação foi localizada no texto enviado. Confira o contexto e a versão da fonte original.</p>
  </details>;
}

export function CornellAssessmentFeedback({ analysis, answer, confidence, onAnswer, onConfidence, onCheck, busy, disabled, attempt, id }) {
  const responseChanged = attempt && (attempt.resposta !== answer.trim() || attempt.confianca !== confidence);
  return <section className="qb-cornell-assessment" aria-label="Avaliação pedagógica do Arquiteto">
    <header className="qb-cornell-assessment__header">
      <div>
        <span className="qb-overline" role="status">O Arquiteto · avaliação disponível</span>
        <h3>O que suas notas demonstram</h3>
      </div>
      <div className="qb-cornell-assessment__grade" aria-label="Nota provisória do caderno">
        <strong>{analysis.nota === null ? '—' : analysis.nota.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}<small>/10</small></strong>
        <span>Nota provisória do caderno</span>
      </div>
    </header>
    <p>{analysis.comentario}</p>
    <p>Esta nota avalia o texto do caderno. A compreensão é testada pela sua resposta sem consulta; retenção exige uma nova evocação em outro momento.</p>
    {analysis.notaParcial && <p role="status">Avaliação parcial: {analysis.criteriosAvaliados} de 4 critérios com base suficiente. A nota foi proporcionalizada; critérios sem base documental ficam sem nota.</p>}
    {analysis.contextLimited && <p>A análise usa um recorte do acervo e do mapa. Tópicos fora desse recorte não foram avaliados.</p>}
    <div className="qb-cornell-assessment__criteria">
      {analysis.criterios.map(item => <article className="qb-panel qb-panel--sunken" key={item.id}>
        <div className="qb-cornell-assessment__criterion-heading"><strong>{item.label}</strong><span>{item.pontos === null ? 'Sem base' : item.pontos.toLocaleString('pt-BR') + '/2,5'}</span></div>
        <p>{item.justificativa}</p>
        {item.limited && <p>Faltou evidência verificável para sustentar esta nota.</p>}
        {item.evidenciaCaderno && <blockquote><p>“{item.evidenciaCaderno}”</p><cite>Seu caderno</cite></blockquote>}
        <Citation citation={item.citation} />
      </article>)}
    </div>
    {analysis.acertos.length > 0 && <div><h4>Pontos bem desenvolvidos</h4><ul>
      {analysis.acertos.map((item, i) => <li key={i}><strong>{item.ideia}</strong><blockquote><p>“{item.evidencia}”</p></blockquote></li>)}
    </ul></div>}
    <div><h4>Lacunas e pontos para conferir</h4>
      {analysis.lacunas.length ? <ul>{analysis.lacunas.map((item, i) => <li key={i}>
        <span className="qb-overline">{gapLabels[item.tipo]}</span><p><strong>{item.topico}</strong></p><p>{item.comentario}</p>
        {item.pergunta && <p>{item.pergunta}</p>}<Citation citation={item.citation} />
      </li>)}</ul> : <p>Não foram apontadas lacunas neste recorte. Isso não comprova domínio nem dispensa o teste sem consulta.</p>}
    </div>
    <div className="qb-panel qb-panel--sunken qb-cornell-assessment__guidance"><h4>Orientação para o próximo passo</h4><p>{analysis.orientacao}</p></div>
    <div className="qb-cornell-assessment__test">
      <h4>Teste sua compreensão</h4>
      <p>Responda de memória, sem consultar as notas. Sua tentativa fica apenas neste painel.</p>
      <p><strong>{analysis.pergunta}</strong></p>
      <label htmlFor={id + '-answer'}>Sua explicação</label>
      <textarea id={id + '-answer'} className="qb-textarea" rows={5} maxLength={3000} value={answer} disabled={busy || disabled}
          onChange={event => onAnswer(event.target.value)} placeholder="Explique a ligação e use um exemplo ou contraste." />
      <fieldset disabled={busy || disabled}>
        <legend>Confiança antes da avaliação</legend>
        <div className="qb-cornell-assessment__confidence">{[[1, '1 · Baixa'], [2, '2 · Média'], [3, '3 · Certeza']].map(([value, label]) =>
          <label key={value}><input type="radio" name={id + '-confidence'} value={value} checked={confidence === value}
            onChange={() => onConfidence(value)} />{label}</label>)}</div>
      </fieldset>
      <Button variant="secondary" icon="list-checks" disabled={disabled || answer.trim().length < 10 || !confidence} loading={busy} onClick={onCheck}>Avaliar minha resposta</Button>
      {responseChanged && <p role="status">A resposta ou a confiança foi alterada. Avalie novamente para atualizar o comentário.</p>}
      {!responseChanged && <section aria-label="Resultado do teste de compreensão">
        <h4>{resultLabels[analysis.avaliacaoResposta.resultado]}</h4>
        <p>{analysis.avaliacaoResposta.comentario}</p>
        {analysis.avaliacaoResposta.evidencia && <blockquote><p>“{analysis.avaliacaoResposta.evidencia}”</p><cite>Sua resposta · confiança {attempt?.confianca}</cite></blockquote>}
        <p>{analysis.avaliacaoResposta.proximaAcao}</p>
      </section>}
    </div>
  </section>;
}
