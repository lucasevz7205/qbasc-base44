import React from 'react';
import { Badge } from '@/components/qb/core/Badge';
import { Icon } from '@/components/qb/core/Icon';
import { Panel } from '@/components/qb/core/Panel';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { PerformanceMetricCard } from '@/components/qb/performance/PerformanceMetricCard';
import { MIN_RESPOSTAS_TOPICO, MIN_RESPOSTAS_DISCIPLINA } from '@/lib/navegador';
import { chanceDeAcerto, orientacaoEstudo, orientacaoProva, NOMES_CAUSA } from '@/lib/navegador-orientacao';

export const pct = value => (value === null || value === undefined ? '—' : Math.round(value * 100) + '%');
const SINAIS = {
  fraco: { tone: 'incorrect', label: 'Ponto fraco' },
  forte: { tone: 'correct', label: 'Desempenho inicial forte' },
  'sem-sinal': { tone: 'neutral', icon: 'minus', label: 'Sem sinal claro' },
  insuficiente: { tone: 'no-evidence', label: 'Amostra insuficiente' },
};
const ACOES = {
  marcar: { tone: 'correct', icon: 'circle-check' },
  chutar: { tone: 'attention', icon: 'triangle-alert' },
  branco: { tone: 'incorrect', icon: 'circle-x' },
  'sem-dados': { tone: 'no-evidence', icon: 'circle-dashed' },
};

export function SinalBadge({ sinal }) {
  const s = SINAIS[sinal] || SINAIS.insuficiente;
  return <Badge tone={s.tone} icon={s.icon}>{s.label}</Badge>;
}

export function ChanceTexto({ stats }) {
  const chance = chanceDeAcerto(stats);
  if (!chance) return <span style={{ color: 'var(--text-muted)' }}>Sem respostas válidas</span>;
  return <>{chance.valor}% <span style={{ color: 'var(--text-muted)' }}>({chance.min}% a {chance.max}%)</span></>;
}

/** Orientação de prova e de estudo para um assunto ou matéria. */
export function Orientacao({ stats, titulo }) {
  const prova = orientacaoProva(stats);
  const estudo = orientacaoEstudo(stats);
  const acao = ACOES[prova.acao];
  return (
    <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ font: '600 15px/1.3 var(--font-body)', color: 'var(--text-primary)' }}>{titulo}</strong>
        <SinalBadge sinal={stats.sinal} />
      </div>
      <p style={{ margin: 0, font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
        Se este assunto cair na prova: chance estimada de acerto de <strong><ChanceTexto stats={stats} /></strong>, com {stats.validas} {stats.validas === 1 ? 'resposta válida' : 'respostas válidas'}.
      </p>
      <p style={{ margin: 0, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start', font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
        <Badge tone={acao.tone} icon={acao.icon}>{prova.titulo}</Badge><span style={{ flex: '1 1 240px', minWidth: 0 }}>{prova.texto}</span>
      </p>
      {estudo && (
        <p style={{ margin: 0, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start', font: '400 14px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
          <Badge tone="neutral" icon="lightbulb">{estudo.titulo}</Badge>
          <span style={{ flex: '1 1 240px', minWidth: 0 }}>{estudo.texto}{estudo.causa !== 'indeterminada' && <> Causa mais marcada: {NOMES_CAUSA[estudo.causa]}.</>}</span>
        </p>
      )}
    </div>
  );
}

export function TabelaAssuntos({ topicos, titles }) {
  if (!topicos.length) return null;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="qb-table">
        <caption style={{ textAlign: 'left', color: 'var(--text-muted)', paddingBottom: 6 }}>Taxa de erro e chance estimada de acerto por assunto. Com menos de {MIN_RESPOSTAS_TOPICO} respostas válidas (acertos e erros) o número não sustenta conclusão.</caption>
        <thead><tr>
          <th>Assunto</th><th className="num">Respostas</th><th className="num">Erros</th><th className="num">Taxa de erro</th>
          <th className="num">Chance de acerto</th><th className="num">Brancos</th><th className="num">Erros com certeza</th><th>Sinal</th>
        </tr></thead>
        <tbody>{topicos.map(t => <tr key={t.topico}>
          <td style={{ color: 'var(--text-primary)' }}>{titles.get(t.topico) || t.topico}{t.simulado > 0 && <> · {t.simulado} em simulado</>}</td>
          <td className="num">{t.validas}</td>
          <td className="num">{t.E}</td>
          <td className="num">{pct(t.taxaErro)}</td>
          <td className="num"><ChanceTexto stats={t} /></td>
          <td className="num">{t.B}</td>
          <td className="num">{t.certezaErros}/{t.certezaN}</td>
          <td><SinalBadge sinal={t.sinal} />{t.sinal === 'insuficiente' && t.validas < MIN_RESPOSTAS_TOPICO && <> faltam {MIN_RESPOSTAS_TOPICO - t.validas}</>}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}

export function TabelaMaterias({ materias }) {
  if (!materias.length) return null;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="qb-table">
        <caption style={{ textAlign: 'left', color: 'var(--text-muted)', paddingBottom: 6 }}>Matéria prioritária só com ao menos {MIN_RESPOSTAS_DISCIPLINA} respostas válidas.</caption>
        <thead><tr><th>Matéria</th><th className="num">Respostas</th><th className="num">Erros</th><th className="num">Taxa de erro</th><th className="num">Chance de acerto</th><th>Sinal</th></tr></thead>
        <tbody>{materias.map(m => <tr key={m.id}>
          <td style={{ color: 'var(--text-primary)' }}>{m.nome}</td>
          <td className="num">{m.validas}</td>
          <td className="num">{m.E}</td>
          <td className="num">{pct(m.taxaErro)}</td>
          <td className="num"><ChanceTexto stats={m} /></td>
          <td><SinalBadge sinal={m.sinal} />{m.sinal === 'insuficiente' && m.validas < MIN_RESPOSTAS_DISCIPLINA && <> faltam {MIN_RESPOSTAS_DISCIPLINA - m.validas}</>}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}

const periodo = r => r.periodo.de.split('-').reverse().join('/') + ' a ' + r.periodo.ate.split('-').reverse().join('/');
export const tituloRelatorio = r => (r.tipo === 'mensal' ? 'Relatório mensal' : 'Relatório semanal') + ' · ' + periodo(r);

/** Relatório salvo, já expandido por `expandirRelatorio`. */
export function NavegadorRelatorio({ relatorio, titles, compacto = false }) {
  const { placar, geral, topicos, disciplinas, comparacao } = relatorio;
  const delta = placar.atual.liquida - placar.anterior.liquida;
  const prioridades = topicos.filter(t => t.sinal === 'fraco' || t.certezaErros > 0).slice(0, compacto ? 3 : 5);
  const neutros = topicos.filter(t => !prioridades.includes(t)).slice(0, compacto ? 0 : 5);
  return (
    <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
        <PerformanceMetricCard compact icon="scale" label="Nota líquida (C − E)" value={placar.atual.liquida} state={placar.atual.n ? 'ok' : 'empty'}
          detail={placar.atual.C + ' C · ' + placar.atual.E + ' E · ' + placar.atual.B + ' em branco'}
          comparison={comparacao.conclusivo ? { delta, label: (delta > 0 ? '+' : '') + delta + ' contra o período anterior' } : undefined}
          warning={comparacao.conclusivo ? undefined : 'Comparação inconclusiva: precisa de ' + comparacao.minimo + ' ou mais primeiras tentativas nos dois períodos (agora ' + comparacao.nAtual + ' e ' + comparacao.nAnterior + ').'} />
        <PerformanceMetricCard compact icon="target" label="Chance geral de acerto" value={chanceDeAcerto(geral) ? chanceDeAcerto(geral).valor : '—'} unit="%"
          state={geral.validas ? 'ok' : 'empty'} detail={geral.validas ? 'Entre ' + chanceDeAcerto(geral).min + '% e ' + chanceDeAcerto(geral).max + '%, com ' + geral.validas + ' respostas válidas' : undefined} />
        <PerformanceMetricCard compact icon="triangle-alert" label="Erros com certeza" value={geral.certezaErros} unit={'de ' + geral.certezaN}
          state={geral.certezaN ? 'ok' : 'empty'} tone={geral.certezaErros ? 'incorrect' : 'neutral'} detail="Erros marcados com confiança 3, os de maior urgência." />
      </div>
      {!compacto && !!disciplinas.length && <section style={{ display: 'grid', gap: 8 }}><h3 style={{ font: 'var(--type-h3)', margin: 0 }}>Por matéria</h3><TabelaMaterias materias={disciplinas} /></section>}
      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ font: 'var(--type-h3)', margin: 0 }}>{prioridades.length ? 'Assuntos para priorizar' : 'Assuntos'}</h3>
        {!topicos.length && <EmptyState compact tone="empty" title="Sem primeiras tentativas com tópico neste período" />}
        {!!topicos.length && !prioridades.length && <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Nenhum assunto com ponto fraco ou erro com certeza neste período.</p>}
        {prioridades.map(t => <Panel key={t.topico} padding={14}><Orientacao stats={t} titulo={titles.get(t.topico) || t.topico} /></Panel>)}
        {neutros.length > 0 && <TabelaAssuntos topicos={neutros} titles={titles} />}
      </section>
      {relatorio.semTopico > 0 && <p style={{ margin: 0, color: 'var(--text-muted)', font: '400 13px/1.5 var(--font-body)' }}><Icon name="info" size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {relatorio.semTopico} primeiras tentativas estão sem tópico e não entram na análise por assunto.</p>}
    </div>
  );
}
