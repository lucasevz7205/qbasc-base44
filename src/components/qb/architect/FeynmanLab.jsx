import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Icon } from '@/components/qb/core/Icon';
import { Button } from '@/components/qb/core/Button';
import { Badge } from '@/components/qb/core/Badge';
import { FeynmanNodePicker } from '@/components/qb/architect/FeynmanNodePicker';
import StudyTopicPicker from '@/components/qb/study/StudyTopicPicker';
import { useRealStudy } from '@/lib/qb-real-data';
import { FEYNMAN_AUDIENCES, FEYNMAN_SCOPE_LIMITS as scopeLimits, feynmanMapGroups } from '@/lib/feynman-scope';
import { evaluateFeynmanExplanation } from '@/lib/server-fns';

function FeedbackItem({ ok, children }) {
  return (
    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start', font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
      <Icon name={ok ? 'circle-check' : 'triangle-alert'} size={16} color={ok ? 'var(--state-correct)' : 'var(--state-attention)'} style={{ marginTop: 2 }} />
      <span>{children}</span>
    </li>
  );
}

export default function FeynmanLab({ subjects, subjectName, topicId, topicLabel, nodeId, onTopicChange, onNodeChange, personal = false, style }) {
  const { QB_DATA } = useRealStudy();
  const evaluateFn = useServerFn(evaluateFeynmanExplanation);
  const groups = React.useMemo(() => feynmanMapGroups(QB_DATA.mindMaps, topicId), [QB_DATA.mindMaps, topicId]);
  const node = groups.flatMap(group => group.nodes).find(option => option.id === nodeId);
  const focus = node?.label || topicLabel;
  const parent = node?.path.at(-2);
  const [audience, setAudience] = React.useState('exam');
  const profile = FEYNMAN_AUDIENCES[audience];
  const scopeKey = JSON.stringify([topicId, node?.id, audience]);
  const [attempts, setAttempts] = React.useState({});
  const [busyKey, setBusyKey] = React.useState(null);
  const lock = React.useRef(false);
  const { text = '', fb, error } = attempts[scopeKey] || {};
  const busy = busyKey === scopeKey;
  const updateAttempt = changes => setAttempts(current => ({
    ...current, [scopeKey]: { ...current[scopeKey], ...changes },
  }));

  const evaluate = async () => {
    const clean = text.trim();
    if (!topicId || clean.length < 20 || lock.current) return;
    lock.current = true;
    setBusyKey(scopeKey);
    updateAttempt({ error: null });
    try {
      const res = await evaluateFn({
        data: {
          topicLabel: topicLabel.slice(0, scopeLimits.topic),
          subjectLabel: subjectName?.slice(0, scopeLimits.subject),
          ...(node && { node: {
            label: node.label.slice(0, scopeLimits.node),
            path: node.path.slice(-scopeLimits.path).map(label => label.slice(0, scopeLimits.node)),
            summary: QB_DATA.concepts[node.id]?.summary?.slice(0, scopeLimits.summary),
          } }),
          audience, explanation: clean,
        },
      });
      updateAttempt({ fb: res });
    } catch (err) {
      updateAttempt({ error: err?.message || 'Não foi possível avaliar sua explicação agora.' });
    } finally {
      lock.current = false;
      setBusyKey(null);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16, ...style }}>
      <div className="qb-feynman-scope">
        <StudyTopicPicker label="Matéria e assunto" subjects={subjects} value={topicId}
          onSelect={onTopicChange} style={{ display: 'grid' }} />
        {groups.length > 0 ? (
          <FeynmanNodePicker key={topicId} groups={groups} node={node} onChange={onNodeChange} />
        ) : topicId && <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>Este assunto ainda não tem mapa mental. A avaliação pode cobrir o assunto inteiro.</p>}
      </div>
      {topicId && <div style={{ display: 'grid', gap: 6, justifyItems: 'start' }}>
        <span className="qb-overline">Para quem você vai explicar?</span>
        <div className="qb-seg" role="group" aria-label="Público da explicação" style={{ flexWrap: 'wrap' }}>
          {Object.entries(FEYNMAN_AUDIENCES).map(([id, option]) => (
            <button type="button" className="qb-seg__opt" key={id} aria-pressed={audience === id} onClick={() => setAudience(id)}>{option.label}</button>
          ))}
        </div>
      </div>}
      {!topicId ? <p>Selecione uma matéria e um assunto para começar.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(300px,100%),1fr))', gap: 16 }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>1 · Explique com suas palavras</span>
            <p style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)', margin: 0 }}>
              Explique <strong style={{ color: 'var(--text-primary)' }}>{focus}</strong> para {profile.listener}.
            </p>
            <ol style={{ margin: 0, paddingInlineStart: 20, font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
              <li>{profile.guide}</li>
              <li>{parent ? <>Mostre como ela se relaciona com <strong>{parent}</strong>.</> : 'Explique como funciona ou faça um contraste com um conceito que se confunde com ela.'}</li>
              <li>Dê um exemplo concreto e mostre como ele ilustra a ideia.</li>
            </ol>
            <textarea
              className="qb-textarea"
              style={{ minHeight: 200 }}
              value={text}
              onChange={e => updateAttempt({ text: e.target.value, fb: null, error: null })}
              readOnly={busy}
              placeholder={profile.guide}
              aria-label="Sua explicação"
              maxLength={5000}
            />
            {personal && <small style={{ color: 'var(--text-muted)' }}>Ao avaliar, a Base44 recebe sua explicação e o recorte selecionado.</small>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button icon="astrolabe" loading={busy} disabled={text.trim().length < 20 || busyKey !== null} onClick={evaluate}>
                Avaliar com IA
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => updateAttempt({ text: '', fb: null, error: null })}>
                Recomeçar
              </Button>
            </div>
          </section>
          <section className="qb-panel qb-panel--sunken" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }} aria-live="polite">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>2 · Diagnóstico Feynman (IA)</span>
              {fb && typeof fb.clarityScore === 'number' && (
                <Badge tone={fb.clarityScore >= 80 ? 'correct' : fb.clarityScore >= 60 ? 'gold' : 'attention'}>
                  Clareza: {Math.round(fb.clarityScore)}/100
                </Badge>
              )}
            </div>
            {error && (
              <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--state-incorrect)', font: '400 13px/1.4 var(--font-body)' }}>
                <Icon name="circle-x" size={16} />
                <span>{error}</span>
              </div>
            )}
            {!fb && !error ? (
              <p style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-muted)' }}>
                {busy ? 'Avaliando este recorte…' : busyKey ? 'Aguarde a avaliação do outro recorte.' : <>Escreva pelo menos 20 caracteres e clique em <strong>Avaliar com IA</strong>. O Arquiteto avaliará clareza, precisão conceitual e o exemplo no recorte selecionado.</>}
              </p>
            ) : fb ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.isArray(fb.gaps) && fb.gaps.length > 0 && (
                  <div style={{ paddingTop: 8, borderTop: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className="qb-overline" style={{ color: 'var(--state-attention)' }}>Pontos técnicos para reforçar</span>
                    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, font: '400 13px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
                      {fb.gaps.map((g, idx) => (
                        <li key={idx}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {fb.nextStep && (
                  <p style={{ font: '400 13px/1.5 var(--font-body)', color: 'var(--qb-gold)', marginTop: 2 }}>
                    <strong>Próximo passo:</strong> {fb.nextStep}
                  </p>
                )}
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <FeedbackItem ok={fb.isAdequateLength}>
                    <strong>{fb.words} palavras:</strong> {fb.lengthFeedback}
                  </FeedbackItem>
                  <FeedbackItem ok={!fb.jargonDetected?.length}>
                    {fb.jargonDetected?.length
                      ? `Jargão detectado (${fb.jargonDetected.join(', ')}): ${fb.jargonFeedback}`
                      : fb.jargonFeedback || 'Linguagem acessível e sem jargão excessivo.'}
                  </FeedbackItem>
                  <FeedbackItem ok={fb.sentenceClarityOk}>{fb.sentenceFeedback}</FeedbackItem>
                  <FeedbackItem ok={fb.hasConcreteExample}>{fb.exampleFeedback}</FeedbackItem>
                </ul>
                <section style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
                  <h3 className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Resposta-modelo · {profile.label}</h3>
                  <p style={{ whiteSpace: 'pre-line', font: '400 14px/1.5 var(--font-body)', color: 'var(--text-primary)' }}>{fb.modelAnswer}</p>
                </section>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
export { FeynmanLab };
