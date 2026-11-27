import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { gerarRelatorio, janelaDe, navegadorExport } from '@/lib/navegador';
import { dataBR } from '@/lib/navegador-visual';

const LINHAS = [['Primeiras tentativas', 'n'], ['Certas (C)', 'C'], ['Erradas (E)', 'E'], ['Em branco', 'B'], ['Nota líquida', 'liquida'], ['Erros com certeza', 'certezaErros']];
const sinal = v => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0');

/**
 * Conferência só de leitura: recalcula, com os registros de agora, a semana de um relatório salvo e compara com o que foi gravado.
 * Não grava nada. Diferença significa que o relatório salvo não reflete mais os registros (ou que foi gerado antes de uma correção).
 */
export default function NavegadorConferencia({ relatorio, records, questions }) {
  const [aberto, setAberto] = React.useState(false);
  const calculo = React.useMemo(() => {
    if (!aberto) return null;
    const payload = navegadorExport(records, questions, relatorio.referencia, { desde: janelaDe(relatorio.referencia, relatorio.tipo).start });
    const doc = gerarRelatorio({ respostas: payload.respostas, today: relatorio.referencia, tipo: relatorio.tipo });
    return { atual: doc.placar.atual, semTopico: doc.semTopico, limites: payload.limites };
  }, [aberto, records, questions, relatorio]);
  const salvo = relatorio.placar.atual;
  const diferencas = calculo ? LINHAS.filter(([, k]) => (salvo[k] ?? 0) !== (calculo.atual[k] ?? 0)) : [];
  const fora = calculo ? [
    [calculo.limites.itensSemOrdemConfirmada, 'itens sem primeira tentativa verificável'],
    [calculo.limites.tentativasSemHorario, 'tentativas sem horário exato'],
    [calculo.limites.tentativasApenasEmTotais, 'tentativas registradas só em totais'],
    [calculo.limites.tentativasSemData, 'tentativas sem data válida'],
    [calculo.limites.simuladoSemGabarito, 'respostas de simulado sem gabarito'],
  ].filter(([n]) => n > 0) : [];
  return <details className="nv-janela" onToggle={e => setAberto(e.currentTarget.open)}>
    <summary><Icon name="scale" size={16} />Conferir com os registros de agora<Icon name="chevron-down" size={16} className="nv-janela__seta" style={{ marginLeft: 'auto' }} /></summary>
    <div className="nv-janela__corpo">
      {calculo && <>
        <p className="nv-note">Semana <span className="nv-mono">{dataBR(salvo.de)} a {dataBR(salvo.ate)}</span>, recalculada agora. Só leitura: nada é gravado.</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="nv-comparativo">
            <thead><tr><th scope="col">Medida</th><th scope="col">Salvo</th><th scope="col">Agora</th></tr></thead>
            <tbody>{LINHAS.map(([rotulo, k]) => {
              const a = salvo[k] ?? 0, b = calculo.atual[k] ?? 0;
              const f = k === 'liquida' ? sinal : v => v;
              return <tr key={k}><th scope="row">{rotulo}</th><td>{f(a)}</td><td>{f(b)}{a !== b && <span className="nv-muted"> ({b > a ? '+' : '−'}{Math.abs(b - a)})</span>}</td></tr>;
            })}</tbody>
          </table>
        </div>
        <p className="nv-note" role="status">
          {diferencas.length
            ? <><Icon name="triangle-alert" size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> O relatório salvo difere dos registros atuais em {diferencas.length} {diferencas.length === 1 ? 'medida' : 'medidas'}. Ele foi gerado uma vez e não acompanha mudanças posteriores.</>
            : <><Icon name="circle-check" size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> O relatório salvo bate com os registros atuais.</>}
        </p>
        {(relatorio.semTopico > 0 || calculo.semTopico > 0 || fora.length > 0) && <ul className="nv-fora" style={{ gridColumn: 'auto' }}>
          {(relatorio.semTopico > 0 || calculo.semTopico > 0) && <li><span className="nv-mono">{calculo.semTopico}</span><span>primeiras tentativas sem tópico (entram no volume, ficam fora da análise por assunto)</span></li>}
          {fora.map(([n, label]) => <li key={label}><span className="nv-mono">{n}</span><span>{label}</span></li>)}
        </ul>}
      </>}
    </div>
  </details>;
}
