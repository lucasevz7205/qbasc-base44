import React from 'react';
import { Button } from '@/components/qb/core/Button';
import { Badge } from '@/components/qb/core/Badge';
import { Panel } from '@/components/qb/core/Panel';
import pegadinhasV1 from '@/data/pegadinhas-v1.json';
import { mechanismDetail } from '@/lib/cebraspe-v1-taxonomy';

const clean = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const typeLabel = { troca: 'Troca de conceitos', alcance: 'Palavras de alcance', excecao: 'Regra × exceção',
  literalidade: 'Literalidade', jurisprudencia: 'Jurisprudência', extrapolacao: 'Extrapolação',
  relacao: 'Relação lógica', composicao: 'Composição', reescrita: 'Reescrita', verdade: 'Verdade aparente' };

/** Acervo da versão 1: não inventa classificação onde a V1 não a registrou. */
export default function AcervoPegadinhasV1({ questions, subjects, go }) {
  const [search, setSearch] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [code, setCode] = React.useState('');
  const [limit, setLimit] = React.useState(12);
  const indexed = React.useMemo(() => new Map((questions || []).map(q => [q.id, q])), [questions]);
  const matches = React.useMemo(() => {
    const term = clean(search.trim());
    return pegadinhasV1.filter(p => {
      if (subject && clean(p.sigla) !== clean(subject)) return false;
      if (code === 'none' && p.mecanismo) return false;
      if (code && code !== 'none' && p.mecanismo !== code) return false;
      if (!term) return true;
      return clean([p.armadilha,p.regra,p.sinal,p.ref,p.mecanismo,p.tipo,p.topico,p.sigla,...(p.par||[])].join(' ')).includes(term);
    });
  }, [subject, code, search]);
  const available = matches.slice(0, limit);
  return (
    <Panel style={{ display: 'grid', gap: 14 }}>
      <header style={{ display: 'grid', gap: 7 }}>
        <span className="qb-overline">Acervo histórico · versão 1</span>
        <h3 style={{ font: 'var(--type-h2)', margin: 0 }}>Pegadinhas registradas</h3>
        <p style={{ font: '400 14px/1.6 var(--font-body)', margin: 0, color: 'var(--text-secondary)' }}>
          186 registros originais preservados, com regra, alerta e referência. Os 106 sem mecanismo F/V informado
          permanecem sem classificação. As referências são as do acervo, não verificações jurídicas recentes.
        </p>
      </header>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
        <label style={{ display: 'grid', gap: 5, flex: '2 1 240px' }}>
          <span className="qb-overline">Pesquisar no acervo</span>
          <input className="qb-input" type="search" value={search} onChange={e => {setSearch(e.target.value);setLimit(12);}}
            placeholder="Buscar conceito, código, sinal ou assunto..." aria-label="Pesquisar pegadinhas" />
        </label>
        <label style={{ display: 'grid', gap: 5, flex: '1 1 180px' }}>
          <span className="qb-overline">Matéria</span>
          <select className="qb-input" value={subject} onChange={e => {setSubject(e.target.value);setLimit(12);}}>
            <option value="">Todas</option>
            {(subjects || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 5, flex: '1 1 160px' }}>
          <span className="qb-overline">Mecanismo registrado</span>
          <select className="qb-input" value={code} onChange={e => {setCode(e.target.value);setLimit(12);}}>
            <option value="">Todos</option>
            <option value="none">Não classificado na V1</option>
            {['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','V1','V2','V3','V4'].map(v =>
              <option key={v} value={v}>{v} · {mechanismDetail(v).n}</option>)}
          </select>
        </label>
      </div>
      <span style={{ font: '400 13px/1.5 var(--font-body)', color: 'var(--text-muted)' }}>
        {matches.length} registros correspondentes · {Math.min(limit, matches.length)} exibidos
      </span>
      <div style={{ display: 'grid', gap: 9 }}>
        {available.map(p => {
          const topic = (subjects || []).find(s => clean(s.id) === clean(p.sigla));
          const links = [...new Set(p.qids || [])].filter(id => indexed.has(id));
          const detail = mechanismDetail(p.mecanismo);
          return (
            <details key={p.id} className="qb-panel qb-panel--sunken"
              style={{ border: '1px solid rgba(208,179,134,.28)', borderRadius: 12, padding: '4px 13px' }}>
              <summary style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', padding: '12px 2px', minHeight: 54 }}>
                <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 5 }}>
                  <strong style={{ font: '500 14px/1.5 var(--font-body)', color: 'var(--text-primary)' }}>{p.armadilha}</strong>
                  <small style={{ color: 'var(--text-muted)' }}>{topic?.name || p.sigla} · {p.topico || 'assunto não informado'} · {typeLabel[p.tipo] || p.tipo}</small>
                </span>
                {detail ? <Badge tone={p.mecanismo.startsWith('F') ? 'attention' : 'correct'}>{p.mecanismo}</Badge>
                  : <Badge tone="neutral">Sem código</Badge>}
              </summary>
              <div style={{ padding: '12px 0 16px', borderTop: '1px solid var(--divider)', display: 'grid', gap: 10,
                color: 'var(--text-secondary)', font: '400 14px/1.55 var(--font-body)' }}>
                <div><strong>Regra de referência</strong><p style={{ margin: '5px 0 0', whiteSpace: 'pre-wrap' }}>{p.regra || 'Não informada.'}</p></div>
                {p.sinal && <div><strong>Sinal da armadilha</strong><p style={{ margin: '5px 0 0' }}>{p.sinal}</p></div>}
                {p.par?.length > 0 && <div><strong>Contraste</strong> · {p.par.join(' × ')}</div>}
                {detail && <div style={{ padding: 11, border: '1px solid rgba(208,179,134,.25)', borderRadius: 10 }}>
                  <strong>{detail.n} · {detail.lema}</strong>
                  <p style={{ margin: '5px 0' }}>{detail.pergunta}</p>
                  <small>Vacina: {p.vacina || detail.v}</small>
                </div>}
                <div style={{ color: 'var(--text-muted)', fontSize: 12, display: 'grid', gap: 3 }}>
                  <span>Fonte anotada na V1: {p.ref || 'Sem referência'}</span>
                  {p.fonteProva && <span>Prova informada no registro: {p.fonteProva}</span>}
                  <span>ID: {p.id} · Origem declarada: {p.origem || 'não informada'}</span>
                </div>
                <Button variant="secondary" size="sm" icon="locate-fixed" style={{ justifySelf: 'start' }}
                  disabled={!links.length} onClick={() => go('questions', { questionIds: links, filter: 'all' })}>
                  {links.length ? 'Treinar ' + links.length + (links.length===1?' questão vinculada':' questões vinculadas') :
                    'Sem questões vinculadas neste projeto'}
                </Button>
              </div>
            </details>
          );
        })}
      </div>
      {matches.length > limit && <Button variant="secondary" icon="chevrons-down" onClick={() => setLimit(v => v + 12)}>
        Mostrar mais {Math.min(12, matches.length-limit)} registros
      </Button>}
      {!matches.length && <p style={{ font: '400 14px/1.5 var(--font-body)', color: 'var(--text-muted)' }}>
        Nenhuma pegadinha corresponde aos filtros escolhidos.
      </p>}
    </Panel>
  );
}
export { AcervoPegadinhasV1 };
