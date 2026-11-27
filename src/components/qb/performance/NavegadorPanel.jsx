import React from 'react';
import { Panel } from '@/components/qb/core/Panel';
import { Button } from '@/components/qb/core/Button';
import { Badge } from '@/components/qb/core/Badge';
import { Icon } from '@/components/qb/core/Icon';
import { EmptyState } from '@/components/qb/data/EmptyState';
import { useRealStudy } from '@/lib/qb-real-data';
import { useQBStudy } from '@/lib/QBStudyContext';
import { navegadorExport, navegadorSemanal, navegadorTopicos, navegadorDisciplinas, analiseErros, MIN_RESPOSTAS_CONFIANCA } from '@/lib/navegador';
import { NavegadorRelatorio, Orientacao, TabelaAssuntos, TabelaMaterias, pct, tituloRelatorio } from '@/components/qb/performance/NavegadorRelatorio';
import { marcarVisto, useNavegadorRelatorios } from '@/components/qb/performance/useNavegadorRelatorios';

function DataLine({ name, data }) {
  const sim = data.contextos?.simulado;
  return <li><strong>{name} ({data.de} a {data.ate})</strong>: {data.n
    ? <>{data.C} C, {data.E} E, {data.B} em branco · nota líquida {data.liquida} · {data.certezaErros}/{data.certezaN} erros entre as respostas com certeza.
      {' '}Questões: {data.origens.oficial.n} oficiais, {data.origens['inédito'].n} inéditas, {data.origens['não informado'].n} sem origem identificada.
      {sim?.n > 0 && <>{' '}Simulado: {sim.C} C, {sim.E} E, {sim.B} em branco (incluídos acima).</>}</>
    : 'Sem primeiras tentativas identificadas.'}</li>;
}

export default function NavegadorPanel() {
  const { records, QB_DATA, QB_PLAN, QB_EDITAL } = useRealStudy();
  const { navegadorScope, setNavegadorScope } = useQBStudy();
  const { relatorios } = useNavegadorRelatorios();
  const [relatorioId, setRelatorioId] = React.useState(null);
  const today = QB_PLAN.today;
  const subjects = QB_EDITAL.subjects;
  const payload = React.useMemo(() => navegadorExport(records, QB_DATA.questions, today), [records, QB_DATA.questions, today]);
  const semanal = React.useMemo(() => navegadorSemanal(payload.respostas, today), [payload, today]);
  const analise = React.useMemo(() => navegadorTopicos(payload.respostas, today), [payload, today]);
  const materias = React.useMemo(() => navegadorDisciplinas(analise, subjects), [analise, subjects]);
  const erros = React.useMemo(() => analiseErros(payload.respostas, today), [payload, today]);
  const titles = React.useMemo(() => new Map(subjects.flatMap(s => s.topics.map(t => [t.id, t.title]))), [subjects]);

  const subject = subjects.find(s => s.id === navegadorScope?.subjectId);
  const topicIds = new Set(subject?.topics.map(t => t.id) || []);
  const topicos = subject ? analise.topicos.filter(t => topicIds.has(t.topico)) : analise.topicos;
  const materiasShown = subject ? materias.filter(m => m.id === subject.id) : materias;
  const focoTopico = navegadorScope?.topicId ? analise.topicos.find(t => t.topico === navegadorScope.topicId) : null;
  const prioridades = topicos.filter(t => t.sinal === 'fraco' || t.certezaErros > 0).slice(0, 3);
  const aberto = relatorios.find(r => r.id === relatorioId) || relatorios[0];

  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qbasc-navegador-' + today + '.json';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const limites = payload.limites;
  const excluded = [
    [semanal.repetidas, 'repetições'],
    [limites.itensSemOrdemConfirmada, 'itens sem primeira tentativa verificável'],
    [limites.tentativasApenasEmTotais, 'tentativas registradas só em totais'],
    [limites.tentativasSemData, 'tentativas sem data válida'],
    [limites.tentativasSemHorario, 'tentativas posteriores sem horário'],
    [limites.simuladoSemGabarito, 'respostas de simulado sem gabarito'],
  ].filter(([n]) => n > 0);

  return <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <Panel as="section" aria-labelledby="qb-navegador" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <h2 id="qb-navegador" style={{ font: 'var(--type-h2)', margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="compass" size={22} color="var(--qb-gold)" />Navegador</h2>
        {subject && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone="neutral" icon="scroll-text">{subject.name}</Badge>
          <Button size="sm" variant="secondary" onClick={() => setNavegadorScope(null)}>Ver análise global</Button>
        </div>}
      </div>
      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
        {subject ? 'Análise desta matéria a partir das suas primeiras tentativas nos últimos 14 dias.' : 'Compare os dois últimos períodos de sete dias e veja o que fazer em cada assunto.'}
        {' '}Só entram primeiras tentativas identificadas, de treino e de simulado; o dia atual não entra.
      </p>
      {!subject && <ul style={{ margin: 0 }}>
        <DataLine name="Semana recente" data={semanal.atual} />
        <DataLine name="Semana anterior" data={semanal.anterior} />
      </ul>}
      {excluded.length > 0 && <p style={{ margin: 0, color: 'var(--text-muted)' }}>Fora do comparativo: {excluded.map(([n, label]) => n + ' ' + label).join(', ')}.</p>}
      {!analise.geral.n && <EmptyState compact title="Sem atividade nova com dados suficientes" description="Resolva questões novas para o Navegador ter o que analisar." />}
    </Panel>

    {navegadorScope?.topicId && subject && (
      <Panel as="section" style={{ display: 'grid', gap: 10 }} aria-label="Assunto escolhido">
        <h3 style={{ font: 'var(--type-h3)', margin: 0 }}>Assunto escolhido</h3>
        {focoTopico
          ? <Orientacao stats={focoTopico} titulo={titles.get(focoTopico.topico) || focoTopico.topico} />
          : <EmptyState compact tone="empty" title={(titles.get(navegadorScope.topicId) || 'Este assunto') + ' ainda não tem primeiras tentativas no período'} description="Resolva questões novas deste assunto e volte aqui." />}
      </Panel>
    )}

    {!!materiasShown.length && !subject && <Panel as="section" style={{ display: 'grid', gap: 10 }}><h3 style={{ font: 'var(--type-h3)', margin: 0 }}>Por matéria</h3><TabelaMaterias materias={materiasShown} /></Panel>}
    {!!subject && !!materiasShown.length && <Panel as="section" style={{ display: 'grid', gap: 10 }}><h3 style={{ font: 'var(--type-h3)', margin: 0 }}>Resumo da matéria</h3><TabelaMaterias materias={materiasShown} /></Panel>}

    {!!erros.pareto.length && <Panel as="section" style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ font: 'var(--type-h3)', margin: 0 }}>Erros da semana (Pareto)</h3>
      <p style={{ margin: 0 }}>Todas as tentativas da semana recente. {erros.foco.length} de {erros.pareto.length} assuntos concentram 80% dos {erros.totalErros} erros.</p>
      <ol style={{ margin: 0, paddingLeft: 20 }}>{erros.pareto.slice(0, 6).map(g => <li key={g.topico}>
        <strong>{titles.get(g.topico) || g.topico}</strong>: {g.erros} {g.erros === 1 ? 'erro' : 'erros'} ({Math.round(g.acumulada * 100)}% acumulado)
        {erros.mitigacao.find(m => m.topico === g.topico)?.variacao != null && <> · taxa de erro {Math.round(erros.mitigacao.find(m => m.topico === g.topico).taxaAntes * 100)}% → {Math.round(erros.mitigacao.find(m => m.topico === g.topico).taxaAgora * 100)}%</>}
      </li>)}</ol>
      <p style={{ margin: 0 }}><strong>Recuperação</strong> (indicador separado): {erros.recuperacao.recuperados} de {erros.recuperacao.errosComRetorno} erros foram acertados depois, com pelo menos {erros.recuperacao.diasMinimos} dias de intervalo.</p>
      <p style={{ margin: 0 }}><strong>Meta de {pct(erros.meta.alvo)}</strong> em questões novas nos assuntos do Pareto: {erros.meta.acertoFoco === null ? 'sem respostas suficientes' : pct(erros.meta.acertoFoco) + ' (' + erros.meta.nFoco + ' respostas)'}.</p>
    </Panel>}

    {!!prioridades.length && <Panel as="section" style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ font: 'var(--type-h3)', margin: 0 }}>O que fazer agora</h3>
      {prioridades.map(t => <div key={t.topico} style={{ paddingTop: 10, borderTop: '1px solid var(--divider)' }}><Orientacao stats={t} titulo={titles.get(t.topico) || t.topico} /></div>)}
    </Panel>}

    {!!topicos.length && <Panel as="section" style={{ display: 'grid', gap: 10 }}>
      <h3 style={{ font: 'var(--type-h3)', margin: 0 }}>Chance de acerto por assunto</h3>
      <TabelaAssuntos topicos={topicos} titles={titles} />
      {analise.semTopico > 0 && <p style={{ margin: 0, color: 'var(--text-muted)' }}>{analise.semTopico} primeiras tentativas estão sem tópico e não entram na tabela. Cadastre o tópico para observá-las.</p>}
    </Panel>}

    {!subject && <Panel as="section" style={{ display: 'grid', gap: 8 }}>
      <h3 style={{ font: 'var(--type-h3)', margin: 0 }}>Acerto por nível de confiança</h3>
      <ul style={{ margin: 0 }}>{analise.calibracao.map(c => <li key={c.nivel}>Confiança {c.nivel}: {c.n ? pct(c.acerto) + ' de acerto' : 'sem respostas'} em {c.n} {c.n === 1 ? 'resposta' : 'respostas'}
        {c.amostraPequena && <> · menos de {MIN_RESPOSTAS_CONFIANCA} respostas: ainda sem regra de chute para este nível</>}.</li>)}</ul>
    </Panel>}

    {!subject && <Panel as="section" style={{ display: 'grid', gap: 12 }} aria-labelledby="qb-navegador-relatorios">
      <h3 id="qb-navegador-relatorios" style={{ font: 'var(--type-h3)', margin: 0 }}>Relatórios salvos</h3>
      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>O Navegador gera o relatório semanal no sábado e o mensal no dia 1, e apresenta quando você abre o app.</p>
      {!relatorios.length && <EmptyState compact title="Nenhum relatório ainda" description="O primeiro aparece no próximo sábado ou dia 1 em que houver primeiras tentativas registradas." />}
      {!!relatorios.length && <>
        <div role="group" aria-label="Relatórios" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {relatorios.slice(0, 8).map(r => <Button key={r.id} size="sm" variant={r.id === aberto.id ? 'primary' : 'secondary'} aria-pressed={r.id === aberto.id}
            onClick={() => { setRelatorioId(r.id); marcarVisto(r.id); }}>{tituloRelatorio(r)}</Button>)}
        </div>
        <NavegadorRelatorio relatorio={aberto} titles={titles} />
      </>}
    </Panel>}

    <p style={{ margin: 0, color: 'var(--text-muted)' }}>A nota líquida isolada não mede avanço quando o volume ou a dificuldade mudam. Os limites de amostra são hipóteses a calibrar com o seu histórico.</p>
    <div><Button variant="secondary" onClick={download} disabled={!payload.respostas.length}>Exportar histórico para o Navegador</Button></div>
  </div>;
}
