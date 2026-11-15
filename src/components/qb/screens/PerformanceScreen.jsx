import React from 'react';
import { PageHeader } from '@/components/qb/navigation/PageHeader';
import { Tabs } from '@/components/qb/navigation/Tabs';
import { Panel } from '@/components/qb/core/Panel';
import { Button } from '@/components/qb/core/Button';
import { Badge } from '@/components/qb/core/Badge';
import { StatCard } from '@/components/qb/data/StatCard';
import { LineChart } from '@/components/qb/data/LineChart';
import { BarChart } from '@/components/qb/data/BarChart';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { SelectField } from '@/components/qb/data/SelectField';
import { Icon } from '@/components/qb/core/Icon';
import { QB_METRICS } from '@/lib/qb-data';
import { useRealStudy } from '@/lib/qb-real-data';

function Daily({ go }) {
  const { QB_EDITAL, QB_PLAN, QB_PERF } = useRealStudy();
  const M = QB_METRICS, PF = QB_PERF, P = QB_PLAN;
  const [date, setDate] = React.useState(P.today);
  const idx = PF.days.findIndex(d => d.date === date);
  const d = M.dayStats(PF.days[idx >= 0 ? idx : PF.days.length - 1]);
  const tasks = Object.values(P.weeks).flat().filter(t => t.date === date);
  const series = PF.days.slice(0, (idx >= 0 ? idx : PF.days.length - 1) + 1).slice(-14).map(x => { const s = M.dayStats(x); return { x: M.fmtDate(x.date), y: s.valid ? s.accuracy : null, n: s.valid }; });
  const tiers = QB_EDITAL.subjects.flatMap(s => s.topics).filter(t => t.correct + t.wrong >= 10 && t.correct / (t.correct + t.wrong) < 0.6).length;
  const prev = PF.days.slice(0, idx >= 0 ? idx : PF.days.length - 1).filter(x => x.correct + x.wrong).slice(-1)[0];
  const delta = prev && d.valid ? Math.round(d.accuracy - M.dayStats(prev).accuracy) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '500 13px/1 var(--font-body)', color: 'var(--text-secondary)' }}>Data<input type="date" className="qb-input" style={{ width: 170, colorScheme: 'dark' }} min={PF.days[0].date} max={P.today} value={date} onChange={e => e.target.value && setDate(e.target.value)} /></label>
        <Button size="sm" variant="secondary" disabled={date === P.today} onClick={() => setDate(P.today)}>Hoje</Button>
        <Badge tone="neutral" icon="info">Somente rodadas de treino</Badge>
      </div>
      {!d.n ? <EmptyState title={'Sem respostas em ' + M.fmtDate(date)} description="Nenhuma rodada de treino registrada neste dia." /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
          <StatCard label="Itens julgados" value={d.n} detail={d.correct + ' certos · ' + d.wrong + ' errados · ' + d.blank + ' em branco'} warning={d.valid < 10 ? 'Amostra pequena' : null} />
          <StatCard label="Taxa de acerto" tone="correct" value={M.pct(d.accuracy)} detail={d.correct + ' de ' + d.valid + ' respostas válidas (brancos fora)'} trend={delta != null ? { delta, label: (delta > 0 ? '+' : '') + delta + ' p.p. vs. dia anterior' } : null} />
          <StatCard label="Nota líquida" tone="gold" value={(d.net > 0 ? '+' : '') + d.net} detail="Regra: +1 certo · −1 errado · 0 branco" />
          <StatCard label="Certeza calibrada" value="—" detail="Comparação entre confiança declarada e acerto observado." warning="Definição da métrica pendente" note="A fórmula não está nos arquivos do projeto; não é estimada aqui." />
          <StatCard label="Tarefas concluídas" value={tasks.filter(t => t.status === 'done').length + '/' + tasks.length} detail="Do planejamento do dia" onClick={() => go('plan', 'hoje')} />
          <StatCard label="Flashcards avaliados" value={PF.cardsByDay[date] || 0} detail={'Avaliações registradas na data'} />
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16, alignItems: 'start' }}>
        <Panel style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Evolução da precisão · até {M.fmtDate(date)}</span>
          <LineChart data={series} label="Taxa de acerto diária" height={230} />
        </Panel>
        <Panel style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Prioridades</span>
          {[[tasks.filter(t => t.status !== 'done').length + ' tarefas do dia pendentes', 'Reagende o que não couber, sem perder revisões automáticas.', 'Reorganizar planejamento', () => go('plan', 'semana')],
            [d.wrong + ' itens errados no dia', 'Revise pela origem do erro antes de nova rodada.', 'Treinar erros', () => go('train')],
            [tiers + ' tópicos abaixo de 60%', 'Com pelo menos 10 respostas válidas cada.', 'Ver mapa de calor', () => go('edital', 'calor')]].map(([t, s, a, fn], i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr) auto', gap: 10, alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--divider)' }}>
              <span style={{ font: '600 13px/1 var(--font-mono)', color: 'var(--qb-gold)' }}>0{i + 1}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ font: '600 14px/1.3 var(--font-body)', color: 'var(--text-primary)' }}>{t}</span><span style={{ font: '400 13px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>{s}</span></span>
              <Button size="sm" variant="secondary" onClick={fn}>{a}</Button>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Historic() {
  const {QB_PERF,QB_EDITAL,QB_SIM}=useRealStudy();
  const M = QB_METRICS, PF = QB_PERF, E = QB_EDITAL, S = QB_SIM;
  const [period, setPeriod] = React.useState('14');
  const [group, setGroup] = React.useState('dia');
  const [subj, setSubj] = React.useState('all');
  const days = PF.days.slice(-(+period)).map(M.dayStats);
  const pts = group === 'dia' ? days.map(d => ({ x: M.fmtDate(d.date), y: d.valid ? d.accuracy : null, n: d.valid, vol: d.n }))
    : [days.slice(0, days.length - 7), days.slice(-7)].filter(w => w.length).map(w => { const c = w.reduce((a, d) => a + d.correct, 0), v = w.reduce((a, d) => a + d.valid, 0); return { x: M.fmtDate(w[0].date) + '–' + M.fmtDate(w[w.length - 1].date), y: v ? c / v * 100 : null, n: v, vol: w.reduce((a, d) => a + d.n, 0) }; });
  const tr = days.reduce((a, d) => ({ c: a.c + d.correct, v: a.v + d.valid, n: a.n + d.n }), { c: 0, v: 0, n: 0 });
  const sim = S.history.filter(h => h.correct != null).reduce((a, h) => ({ c: a.c + h.correct, v: a.v + h.correct + h.wrong, n: a.n + h.items }), { c: 0, v: 0, n: 0 });
  const rows = (subj === 'all' ? E.subjects.map(s => ({ name: s.name, ...M.totals([s]) })) : E.subjects.find(s => s.id === subj).topics.map(t => ({ name: t.num + ' ' + (t.title || ''), ...M.totals([{ topics: [t] }]) })));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Panel padding={12} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
        <SelectField label="Período" value={period} onChange={setPeriod} options={[{ value: '7', label: 'Últimos 7 dias' }, { value: '14', label: 'Últimos 14 dias' }]} />
        <SelectField label="Agrupar por" value={group} onChange={setGroup} options={[{ value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês (sem dados suficientes)' }]} />
        <SelectField label="Matéria (comparação)" value={subj} onChange={setSubj} options={[{ value: 'all', label: 'Todas — comparar matérias' }, ...E.subjects.map(s => ({ value: s.id, label: s.name + ' — por tópico' }))]} />
      </Panel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
        <StatCard compact label="Treino no período" tone="correct" value={M.pct(tr.v ? tr.c / tr.v * 100 : null)} detail={tr.c + '/' + tr.v + ' válidas · ' + tr.n + ' itens'} />
        <StatCard compact label="Revisões" value={M.pct(PF.review.correct + PF.review.wrong ? PF.review.correct / (PF.review.correct + PF.review.wrong) * 100 : null)} detail={PF.review.correct + '/' + (PF.review.correct + PF.review.wrong) + ' · contadas à parte'} />
        <StatCard compact label="Simulados (histórico)" value={M.pct(sim.v ? sim.c / sim.v * 100 : null)} detail={sim.c + '/' + sim.v + ' válidas · ' + S.history.filter(h => h.correct != null).length + ' provas'} note="Não somado ao treino" />
      </div>
      {group === 'mes' ? <EmptyState tone="small-sample" title="Agrupamento mensal indisponível" description="Selecione o agrupamento diário ou semanal." /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16 }}>
          <Panel style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Taxa de acertos · treino</span><LineChart data={pts} height={220} label="Taxa de acertos por período" /></Panel>
          <Panel style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span className="qb-overline" style={{ color: 'var(--qb-gold)' }}>Volume de itens julgados</span><BarChart height={220} color="var(--viz-2)" data={pts.map(p => ({ label: p.x, value: p.vol || null }))} label="Volume por período" /></Panel>
        </div>
      )}
      <Panel>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}><h2 style={{ font: 'var(--type-h2)' }}>{subj === 'all' ? 'Comparação entre matérias' : 'Tópicos de ' + E.subjects.find(s => s.id === subj).name}</h2><span style={{ font: '400 12px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>Acumulado do edital (treino). Percentual sempre acompanhado das respostas que o sustentam.</span></div>
        <div style={{ overflowX: 'auto' }}><table className="qb-table"><thead><tr><th>{subj === 'all' ? 'Matéria' : 'Tópico'}</th><th className="num">Taxa de acertos</th><th className="num">Válidas</th><th className="num">Brancos</th><th>Amostra</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.name}><td style={{ color: 'var(--text-primary)' }}>{r.name}</td><td className="num">{M.pct(r.accuracy)}</td><td className="num">{r.valid}</td><td className="num">{r.blank}</td><td>{r.valid === 0 ? <Badge tone="no-evidence">Sem dados</Badge> : r.valid < 20 ? <Badge tone="attention">Pequena</Badge> : <Badge tone="neutral" icon={null}>Adequada</Badge>}</td></tr>)}</tbody></table></div>
      </Panel>
    </div>
  );
}

const METHOD = [
  ['target', 'Taxa de acertos', 'acertos ÷ (acertos + erros). Itens em branco não entram no denominador. Sempre exibida com as respostas válidas que a sustentam.'],
  ['circle-dashed', 'Itens em branco', 'Contados no volume (itens julgados) e mostrados à parte. Valem 0 na nota líquida.'],
  ['scale', 'Nota líquida', 'Regra configurável. Padrão CEBRASPE de exemplo: +1 por acerto, −1 por erro, 0 por branco. A regra aparece junto ao número.'],
  ['scroll-text', 'Cobertura do edital', 'tópicos com status diferente de "Não iniciado" ÷ total de tópicos previstos. Não usa acertos.'],
  ['book-open', 'Status de estudo', 'Não iniciado · Em estudo · Revisando · Dominado. Informação de progresso, independente da faixa de acertos do mapa de calor.'],
  ['grid-3x3', 'Faixas do mapa de calor', '< 60% · 60–74% · 75–84% · 85–89% · ≥ 90% · sem respostas. Calculadas pela taxa de acertos do tópico.'],
  ['circle-help', 'Certeza calibrada', 'Pendente: a definição não consta nos arquivos. Quando definida, comparará confiança declarada com acerto observado — nunca deve ser confundida com a taxa de acertos.'],
  ['split', 'Limites das comparações', 'Treino, revisão e simulado são séries separadas. Amostras com menos de 10 (gráficos) ou 20 (tabelas) respostas são sinalizadas. Indicadores de estudo não são diagnósticos.'],
];

export default function PerformanceScreen({ tab = 'diaria', setTab, go }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader overline="Desempenho" title="Desempenho" description="Números calculados a partir das respostas registradas. Nenhum indicador é um diagnóstico."
        actions={<Tabs label="Análises" value={tab} onChange={setTab} items={[{ id: 'diaria', label: 'Análise diária', icon: 'calendar' }, { id: 'historica', label: 'Análise histórica', icon: 'activity' }, { id: 'metodo', label: 'Método', icon: 'scale' }]} />} />
      {tab === 'diaria' && <Daily go={go} />}
      {tab === 'historica' && <Historic />}
      {tab === 'metodo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 12 }}>
          {METHOD.map(([i, t, d]) => <Panel key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><span style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(208,179,134,.55)', color: 'var(--qb-gold)' }}><Icon name={i} size={18} /></span><span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ font: '600 15px/1.3 var(--font-body)', color: 'var(--text-primary)' }}>{t}</span><span style={{ font: '400 14px/1.55 var(--font-body)', color: 'var(--text-secondary)' }}>{d}</span></span></Panel>)}
        </div>
      )}
    </div>
  );
}
export { PerformanceScreen };
