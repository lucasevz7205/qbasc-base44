import React from 'react';
import { useRealStudy } from '@/lib/qb-real-data';
import { expandirRelatorio, gerarRelatorio, janelaDe, navegadorExport, referenciaDe } from '@/lib/navegador';

const TIPOS = ['semanal', 'mensal'];
const VISTO_KEY = 'qbasc-navegador-visto';

export function lerVistos() {
  try { return new Set(JSON.parse(window.localStorage.getItem(VISTO_KEY) || '[]')); } catch { return new Set(); }
}
export function marcarVisto(id) {
  try { window.localStorage.setItem(VISTO_KEY, JSON.stringify([...lerVistos().add(id)].slice(-40))); } catch { /* sem armazenamento local */ }
}

/**
 * Relatórios do Navegador: o semanal do último sábado e o mensal do último dia 1.
 * Quando o relatório devido ainda não existe, ele é gerado uma vez a partir do histórico e salvo
 * na coleção `navegador` (id fixo por período, nunca regravado). Respostas e status do edital não são tocados.
 */
export function useNavegadorRelatorios() {
  const { records, QB_DATA, QB_PLAN, QB_EDITAL, save } = useRealStudy();
  const today = QB_PLAN.today;
  const attempted = React.useRef(new Set());
  const saved = React.useMemo(() => (Array.isArray(records?.navegador) ? records.navegador : []).filter(r => r?.versao === 1 && r.id), [records]);

  React.useEffect(() => {
    if (!today || !records || !QB_DATA?.questions) return;
    for (const tipo of TIPOS) {
      const referencia = referenciaDe(today, tipo);
      const id = tipo + '-' + referencia;
      if (saved.some(r => r.id === id) || attempted.current.has(id)) continue;
      attempted.current.add(id);
      const payload = navegadorExport(records, QB_DATA.questions, referencia, { desde: janelaDe(referencia, tipo).start });
      if (!payload.respostas.length) continue;
      const doc = gerarRelatorio({ respostas: payload.respostas, today: referencia, tipo });
      Promise.resolve(save('navegador', doc.id, doc)).catch(() => attempted.current.delete(id));
    }
  }, [today, records, QB_DATA, saved, save]);

  const relatorios = React.useMemo(() => [...saved]
    .sort((a, b) => b.referencia.localeCompare(a.referencia) || a.tipo.localeCompare(b.tipo))
    .map(doc => expandirRelatorio(doc, QB_EDITAL.subjects)), [saved, QB_EDITAL.subjects]);
  return { relatorios, today };
}
