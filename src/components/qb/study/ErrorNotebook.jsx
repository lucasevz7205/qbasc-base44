import React from 'react';
import { Badge } from '@/components/qb/core/Badge';
import { Button } from '@/components/qb/core/Button';

const countText = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

export default function ErrorNotebook({ notebook, go }) {
  if (!notebook?.totalQuestions) {
    return (
      <span style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-muted)' }}>
        Nenhum erro de questão registrado até agora.
      </span>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
      {notebook.subjects.map(subject => (
        <details key={subject.id} className="qb-train-fold qb-train-fold--nested">
          <summary>
            {subject.name}{' '}
            <small>
              {countText(subject.questionCount, 'questão', 'questões')} · {countText(subject.errorCount, 'erro', 'erros')}
            </small>
          </summary>
          <div className="qb-train-fold__body">
            {subject.topics.map(topic => {
              const scopeParams = {
                subjectId: subject.id === '__sem_materia__' ? undefined : subject.id,
                topicId: topic.id === '__sem_assunto__' ? undefined : topic.id,
                filter: 'all',
              };
              return (
                <details key={topic.id} className="qb-train-fold qb-train-fold--nested">
                  <summary>
                    {topic.label}{' '}
                    <small>
                      {countText(topic.questionCount, 'questão', 'questões')} · {countText(topic.errorCount, 'erro', 'erros')}
                    </small>
                  </summary>
                  <div className="qb-train-fold__body">
                    {go && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="rotate-ccw"
                        onClick={() => go('questions', { ...scopeParams, questionIds: topic.questions.map(item => item.id) })}
                        style={{ justifySelf: 'start' }}
                      >
                        Refazer erros do assunto
                      </Button>
                    )}
                    {topic.questions.map(entry => (
                      <article
                        key={entry.id}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--divider)',
                          borderRadius: 'var(--radius-control)',
                          padding: 12,
                          display: 'grid',
                          gap: 8,
                          minWidth: 0,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                            <span style={{ font: '500 12px/1.2 var(--font-mono)', color: 'var(--qb-gold)' }}>
                              {entry.code}
                            </span>
                            {entry.trapCode && (
                              <Badge tone="neutral" icon={null} title={entry.trapName || undefined}>
                                {entry.trapCode}
                              </Badge>
                            )}
                          </div>
                          <Badge tone="incorrect">
                            {countText(entry.errorCount, 'erro', 'erros')}
                          </Badge>
                        </div>
                        <p style={{ margin: 0, font: '400 14px/1.55 var(--font-body)', color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>
                          {entry.statement}
                        </p>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {go && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon="target"
                              onClick={() => go('questions', { ...scopeParams, questionIds: [entry.id] })}
                              style={{ justifySelf: 'start' }}
                            >
                              Refazer questão
                            </Button>
                          )}
                          {(entry.key || entry.explanation || entry.basis) && (
                            <details style={{ minWidth: 0 }}>
                              <summary style={{ cursor: 'pointer', font: '500 12px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>
                                Ver gabarito e fundamento
                              </summary>
                              <div style={{ display: 'grid', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--divider)', font: '400 13px/1.55 var(--font-body)', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
                                {entry.key && (
                                  <strong style={{ font: '600 13px/1.4 var(--font-body)', color: 'var(--qb-gold)' }}>
                                    Gabarito: {entry.key === 'C' ? 'Certo' : entry.key === 'E' ? 'Errado' : entry.key}
                                  </strong>
                                )}
                                {entry.explanation && <p style={{ margin: 0 }}>{entry.explanation}</p>}
                                {entry.basis && (
                                  <span style={{ font: '400 12px/1.45 var(--font-mono)', color: 'var(--text-muted)' }}>
                                    {entry.basis}
                                  </span>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
export { ErrorNotebook };
