import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { IconButton } from '@/components/qb/core/IconButton';
import { Badge } from '@/components/qb/core/Badge';
import { Button } from '@/components/qb/core/Button';

const H = ({ children }) => (
  <h3 className="qb-overline" style={{ color: 'var(--qb-gold)' }}>
    {children}
  </h3>
);

export default function ConceptPanel({
  nodeId,
  title,
  path = [],
  mastery,
  performance,
  summary,
  example,
  trap,
  connections = [],
  sources = [],
  onNavigate,
  onReviewQuestions,
  onReviewCards,
  questionCount = 0,
  flashcardCount = 0,
  reviewIncludesChildren = false,
  assessmentQuota,
  onAssessQuestions,
  onAssessCards,
  onGenerateGan,
  onGenerateFlashcards,
  hasPendingFlashcards = false,
  flashcardsLoading = false,
  ganLoading = false,
  ganError = '',
  onOpenGanReview,
  returnTo,
  onReturn,
  onClose,
  style,
}) {
  const tone = mastery && mastery.state;
  const [generationOpen, setGenerationOpen] = React.useState(false);
  const optionsId = React.useId();
  const reviewOptionsId = React.useId();
  const [reviewNode, setReviewNode] = React.useState(null);
  const reviewOpen = reviewNode === nodeId;
  const generating = ganLoading || flashcardsLoading;
  return (
    <aside className="qb-panel" aria-label={`Conceito: ${title}`} style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', ...style }}>
      {returnTo && (
        <button
          onClick={onReturn}
          className="qb-navlink"
          style={{
            height: 44,
            borderRadius: 0,
            justifyContent: 'flex-start',
            padding: '0 20px',
            borderBottom: '1px solid var(--divider)',
            background: 'rgba(242,199,110,.06)',
            color: 'var(--qb-gold-bright)',
            width: '100%',
          }}
        >
          <Icon name="corner-up-left" size={16} />
          Voltar à {returnTo}
        </button>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, padding: 24, overflowY: 'auto' }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, font: '400 13px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>
              {path.map((p, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <Icon name="chevron-right" size={13} />}
                  <span>{p}</span>
                </React.Fragment>
              ))}
            </div>
            {onClose && <IconButton icon="x" label="Fechar painel" size="sm" onClick={onClose} />}
          </div>
          <h2 style={{ font: '400 26px/1.2 var(--font-heading)', color: 'var(--text-primary)' }}>{title}</h2>
          {mastery && (
            <div>
              <Badge tone={tone === 'progress' ? 'attention' : tone}>{mastery.text}</Badge>
            </div>
          )}
        </header>
        {summary && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <H>Resumo</H>
            <p style={{ font: '400 16px/1.65 var(--font-body)', color: 'var(--text-secondary)', maxWidth: 'var(--measure)', whiteSpace: 'pre-wrap' }}>{summary}</p>
          </section>
        )}
        {example && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <H>Exemplo</H>
            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--surface-sunken)', font: '400 15px/1.6 var(--font-body)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
              {example}
            </div>
          </section>
        )}
        {trap && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <H>Pegadinha</H>
            <p style={{ font: '400 15px/1.6 var(--font-body)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{trap}</p>
          </section>
        )}
        {connections.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <H>Conexões</H>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {connections.map((c) => (
                <button key={c.id} className="qb-chip" onClick={() => onNavigate && onNavigate(c.id)}>
                  {c.relation && <span style={{ color: 'var(--text-muted)' }}>{c.relation}</span>}
                  {c.label}
                  <Icon name="arrow-right" size={14} />
                </button>
              ))}
            </div>
          </section>
        )}
        {(onReviewQuestions || onReviewCards || onGenerateGan || onGenerateFlashcards) && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <H>Revisão ativa</H>
            {(onGenerateGan || onGenerateFlashcards) && (
              <>
                <Button icon="astrolabe" iconRight={generationOpen ? 'chevron-up' : 'chevron-down'}
                  aria-expanded={generationOpen} aria-controls={optionsId} loading={generating}
                  onClick={() => setGenerationOpen(value => !value)} fullWidth>
                  {generating ? 'Gerando…' : 'Gerar'}
                </Button>
                <div id={optionsId} hidden={!generationOpen}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {onGenerateGan && <Button variant="secondary" icon="list-checks" disabled={generating} onClick={onGenerateGan} fullWidth>Escolher quantidade de questões</Button>}
                    {onGenerateFlashcards && <Button variant="secondary" icon="layers" disabled={generating} onClick={onGenerateFlashcards}
                      aria-haspopup={hasPendingFlashcards ? 'dialog' : undefined} fullWidth>
                      {hasPendingFlashcards ? 'Revisar flashcards pendentes' : 'Gerar e gravar flashcards'}
                    </Button>}
                  </div>
                </div>
              </>
            )}
            {ganError && (
              <div role="alert" style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--state-incorrect-bg)', border: '1px solid rgba(238,138,124,.4)', font: '400 13px/1.45 var(--font-body)', color: 'var(--state-incorrect)' }}>
                {ganError}
              </div>
            )}
            {onOpenGanReview && (
              <Button variant="secondary" icon="list-checks" aria-haspopup="dialog" onClick={onOpenGanReview} fullWidth>
                Ver revisão GAN deste nó
              </Button>
            )}
            {(onReviewQuestions || onReviewCards) && (
              <>
                <Button variant="secondary" icon="layers" iconRight={reviewOpen ? 'chevron-up' : 'chevron-down'}
                  aria-expanded={reviewOpen} aria-controls={reviewOptionsId}
                  onClick={() => setReviewNode(reviewOpen ? null : nodeId)} fullWidth>
                  Revisar este conceito
                </Button>
                <div id={reviewOptionsId} hidden={!reviewOpen}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {reviewIncludesChildren && <small style={{ color: 'var(--text-muted)' }}>Inclui itens vinculados aos sub-ramos.</small>}
                    <Button variant="secondary" icon="layers" disabled={!flashcardCount} onClick={onReviewCards} fullWidth>
                      Flashcards ({flashcardCount})
                    </Button>
                    <Button variant="secondary" icon="list-checks" disabled={!questionCount} onClick={onReviewQuestions} fullWidth>
                      Questões ({questionCount})
                    </Button>
                    {assessmentQuota > 1 && (onAssessQuestions || onAssessCards) && (
                      <>
                        <small style={{ color: 'var(--text-muted)' }}>Amostra de avaliação ({assessmentQuota} itens, 1 por parte antes de repetir):</small>
                        <Button variant="secondary" icon="list-checks" disabled={!questionCount} onClick={onAssessQuestions} fullWidth>
                          Avaliar com questões
                        </Button>
                        <Button variant="secondary" icon="layers" disabled={!flashcardCount} onClick={onAssessCards} fullWidth>
                          Avaliar com flashcards
                        </Button>
                      </>
                    )}
                    {!flashcardCount && !questionCount && <small style={{ color: 'var(--text-muted)' }}>Este conceito ainda não tem itens vinculados.</small>}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {sources.length > 0 && (
          <details key={nodeId}>
            <summary className="qb-overline" style={{ color: 'var(--qb-gold)', cursor: 'pointer', padding: '6px 0' }}>
              Fontes ({sources.length})
            </summary>
            <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sources.map((s, i) => {
                const label = typeof s === 'object' && s !== null ? s.label : s;
                return (
                  <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', font: '400 13px/1.45 var(--font-mono)', color: 'var(--text-muted)' }}>
                    <Icon name="file-text" size={14} style={{ marginTop: 2 }} />
                    {label}
                  </li>
                );
              })}
            </ul>
          </details>
        )}
        {performance && (
          <section aria-label="Aproveitamento do nó" style={{ display: 'grid', gap: 8 }}>
            <H>Aproveitamento{performance.includesChildren ? ' · inclui sub-ramos' : ''}</H>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {[
                ['Questões', performance.questions],
                ['Flashcards', performance.flashcards],
              ].map(([label, stats]) => (
                <div key={label} style={{ background: 'var(--surface-sunken)', padding: 10, borderRadius: 10, display: 'grid', gap: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  {stats.rate === null ? <small>Sem evidência</small> : <>
                    <strong style={{ color: 'var(--state-' + (stats.status === 'progress' ? 'progress' : stats.status) + ')' }}>{Math.round(stats.rate)}%</strong>
                    <small>{stats.correct}/{stats.total} {label === 'Questões' ? 'respostas válidas' : 'avaliações'}</small>
                  </>}
                </div>
              ))}
            </div>
            <small style={{ color: 'var(--text-muted)' }}>Questões em branco ficam fora do cálculo. Em flashcards, Bom e Fácil contam como acerto.</small>
          </section>
        )}
      </div>
    </aside>
  );
}
export { ConceptPanel };