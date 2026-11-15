import React from 'react';
import { Panel } from '@/components/qb/core/Panel';
import { Button } from '@/components/qb/core/Button';
import { Badge } from '@/components/qb/core/Badge';
import { Icon } from '@/components/qb/core/Icon';
import {
  CEBRASPE_V1_ORDER, mechanismDetail,
} from '@/lib/cebraspe-v1-taxonomy';
import { mechanismPractice } from '@/lib/cebraspe-v1-performance';

const FOCUS = [
  ['all', 'Todos'],
  ['errors', 'Errei nesses mecanismos'],
  ['new', 'Preciso praticar'],
  ['available', 'Com questões vinculadas'],
];

function MechanismCard({ code, stats, onTrain }) {
  const detail = mechanismDetail(code);
  const n = stats?.questionIds?.length || 0;
  return (
    <details className="qb-panel qb-panel--sunken"
      style={{ border: '1px solid rgba(208,179,134,.3)', borderRadius: 14, padding: '4px 14px', minWidth: 0 }}>
      <summary style={{ minHeight: 56, padding: '9px 2px', display: 'flex', gap: 10,
        alignItems: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}>
        <Badge tone={code.startsWith('F') ? 'attention' : 'correct'}>{code}</Badge>
        <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 4 }}>
          <strong style={{ font: '600 15px/1.4 var(--font-body)' }}>{detail.n}</strong>
          <span style={{ font: '400 13px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>{detail.lema}</span>
        </span>
        <span style={{ color: 'var(--qb-gold)', font: '500 12px/1.3 var(--font-mono)' }}>{n} itens</span>
      </summary>
      <div style={{ borderTop: '1px solid var(--divider)', padding: '14px 0', display: 'grid', gap: 13,
        font: '400 14px/1.6 var(--font-body)', color: 'var(--text-secondary)' }}>
        <p style={{ margin: 0 }}><strong>O que a banca faz</strong> · {detail.o}</p>
        <p style={{ margin: 0 }}><strong>Sinais que merecem atenção</strong> · {detail.s}</p>
        <div style={{ padding: 13, border: '1px solid rgba(208,179,134,.28)', borderRadius: 10,
          display: 'grid', gap: 6, background: 'var(--surface)' }}>
          <strong style={{ color: 'var(--qb-gold)' }}>{detail.pergunta}</strong>
          <span><strong>Vacina:</strong> {detail.v}</span>
          <span><strong>Na prática:</strong> {detail.acao}</span>
        </div>
        {detail.strategy?.maxima && (
          <div style={{ borderLeft: '2px solid var(--qb-gold)', paddingLeft: 12 }}>
            <p style={{ margin: 0, color: 'var(--qb-ivory)', font: 'italic 400 15px/1.5 var(--font-heading)' }}>
              “{detail.strategy.maxima}”
            </p>
            <small style={{ display: 'block', marginTop: 5, color: 'var(--text-muted)' }}>
              Adaptação pedagógica inspirada em {detail.strategy.autor} ({detail.strategy.obra}), não citação literal.
            </small>
          </div>
        )}
        {stats && stats.answered > 0 ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
            <span>{stats.correct}/{stats.answered} últimas respostas corretas</span>
            <span>{stats.wrong} erros na última resposta</span>
            {stats.highConfidenceErrors > 0 && <strong style={{ color: 'var(--state-incorrect)' }}>
              {stats.highConfidenceErrors} erros com certeza
            </strong>}
            {stats.repeatedErrors > 0 && <span>{stats.repeatedErrors} itens com erro repetido</span>}
          </div>
        ) : <span style={{ color: 'var(--text-muted)' }}>{n ? 'Sem respostas válidas neste mecanismo.' : 'Ainda sem questão com classificação verificável nesta matéria.'}</span>}
        <Button variant="secondary" size="sm" icon="locate-fixed"
          disabled={!n} onClick={() => onTrain(stats.questionIds, code)} style={{ justifySelf: 'start' }}>
          Treinar {n ? n + (n === 1 ? ' questão vinculada' : ' questões vinculadas') : 'quando houver itens'}
        </Button>
      </div>
    </details>
  );
}

/**
 * Réplica funcional do laboratório V1: reconhecimento do sinal → pergunta
 * preventiva → prática vinculada. Não usa dados fictícios de incidência.
 */
export default function PegadinhasLab({ questions, subjects, go }) {
  const [subject, setSubject] = React.useState('');
  const [focus, setFocus] = React.useState('all');
  const stats = React.useMemo(() => mechanismPractice(questions, subject), [questions, subject]);
  const all = CEBRASPE_V1_ORDER.filter(code => {
    const s = stats.get(code);
    if (focus === 'errors') return !!s && (s.wrong > 0 || s.repeatedErrors > 0);
    if (focus === 'new') return !!s && s.answered < 5 && s.questionIds.length > 0;
    if (focus === 'available') return !!s?.questionIds.length;
    return true;
  });
  const number = all.filter(code => code.startsWith('F'));
  const trueCodes = all.filter(code => code.startsWith('V'));
  const practiced = [...stats.values()].reduce((n,s) => n + s.answered,0);
  const errors = [...stats.values()].reduce((n,s) => n + s.wrong,0);
  const highConf = [...stats.values()].reduce((n,s) => n + s.highConfidenceErrors,0);
  const eligible = stats.size;
  const launch = (questionIds) => go('questions',{ questionIds, filter: 'all' });
  return (
    <section id="qb-pegadinhas-lab" aria-label="Laboratório de mecanismos e pegadinhas"
      style={{ display: 'grid', gap: 16, scrollMarginTop: 80 }}>
      <Panel variant="ornate" style={{ display: 'grid', gap: 13 }}>
        <span className="qb-overline">Quebrando a banca · Taxonomia original V1</span>
        <h2 style={{ font: 'var(--type-h2)', margin: 0 }}>Laboratório de pegadinhas</h2>
        <p style={{ margin: 0, font: '400 15px/1.6 var(--font-body)', color: 'var(--text-secondary)' }}>
          Reconheça o sinal. Faça a pergunta preventiva. Confira a fonte. Treine a questão.
          A classificação F1–F10 / V1–V4 é uma ferramenta pedagógica do aplicativo, não uma nomenclatura oficial do CEBRASPE.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Badge tone="gold">14 mecanismos</Badge>
          <Badge tone="neutral">{practiced} itens classificados respondidos</Badge>
          <Badge tone="attention">{errors} erros na última resposta</Badge>
          {highConf > 0 && <Badge tone="incorrect">{highConf} erros com certeza</Badge>}
          <Badge tone="neutral">{eligible}/14 com questões vinculadas</Badge>
        </div>
        <small style={{ color: 'var(--text-muted)' }}>
          Contagens da sua base pessoal, não frequência estatística da banca. Itens de versões incompatíveis não são contados até revisão.
        </small>
      </Panel>
      <Panel style={{ display: 'grid', gap: 14 }}>
        <span className="qb-overline">Filtrar por matéria</span>
        <div role="group" aria-label="Filtrar por matéria" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[{id:'',name:'Todas as matérias'}, ...(subjects || [])].map(s => (
            <button key={s.id} type="button" className="qb-chip" aria-pressed={subject === s.id}
              onClick={() => setSubject(s.id)}
              style={subject === s.id ? { borderColor: 'var(--qb-gold)', color: 'var(--qb-gold)' } : undefined}>
              {s.name}
            </button>
          ))}
        </div>
        <span className="qb-overline">Prioridade</span>
        <div role="group" aria-label="Priorizar mecanismos" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FOCUS.map(([id,label]) => (
            <button key={id} type="button" className="qb-chip" aria-pressed={focus === id} onClick={() => setFocus(id)}
              style={focus === id ? { borderColor: 'var(--qb-gold)', color: 'var(--qb-gold)' } : undefined}>
              {label}
            </button>
          ))}
        </div>
      </Panel>
      {[['F',number,'Falsificações que tornam a questão errada'],['V',trueCodes,'Assertivas verdadeiras que parecem falsas']].map(([prefix,codes,title]) => (
        <section key={prefix} style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ font: 'var(--type-h3)', margin: 0 }}>{title}</h3>
          {codes.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px,100%), 1fr))', gap: 10 }}>
              {codes.map(code => <MechanismCard key={code} code={code} stats={stats.get(code)} onTrain={launch} />)}
            </div>
          ) : <p style={{ color: 'var(--text-muted)', font: '400 14px/1.5 var(--font-body)' }}>
            Nenhum mecanismo desta categoria corresponde aos filtros atuais.
          </p>}
        </section>
      ))}
    </section>
  );
}
export { PegadinhasLab };
