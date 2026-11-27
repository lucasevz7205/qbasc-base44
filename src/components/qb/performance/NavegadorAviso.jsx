import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { Button } from '@/components/qb/core/Button';
import { useRealStudy } from '@/lib/qb-real-data';
import { NavegadorRelatorio, tituloRelatorio } from '@/components/qb/performance/NavegadorRelatorio';
import { lerVistos, marcarVisto, useNavegadorRelatorios } from '@/components/qb/performance/useNavegadorRelatorios';

// Um relatório só aparece ao abrir o app enquanto é recente: 6 dias para o semanal, 31 para o mensal.
const DIAS = { semanal: 6, mensal: 31 };
const days = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000);

/** Apresenta o relatório salvo do Navegador na abertura do app. Fechar apenas marca como visto neste navegador. */
export function NavegadorAviso({ go }) {
  const { relatorios, today } = useNavegadorRelatorios();
  const { QB_EDITAL } = useRealStudy();
  const titles = React.useMemo(() => new Map(QB_EDITAL.subjects.flatMap(s => s.topics.map(t => [t.id, t.title]))), [QB_EDITAL.subjects]);
  const [dismissed, setDismissed] = React.useState(() => new Set());
  const vistos = React.useMemo(() => lerVistos(), [dismissed]);
  const pendente = relatorios.find(r => !vistos.has(r.id) && !dismissed.has(r.id) && days(today, r.referencia) <= DIAS[r.tipo] && days(today, r.referencia) >= 0);
  const closeRef = React.useRef(null);
  const close = React.useCallback(() => {
    if (!pendente) return;
    marcarVisto(pendente.id);
    setDismissed(set => new Set(set).add(pendente.id));
  }, [pendente]);
  React.useEffect(() => {
    if (!pendente) return undefined;
    closeRef.current?.focus();
    const onKey = event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [pendente, close]);
  if (!pendente) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={close} aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,15,.65)' }} />
      <div role="dialog" aria-modal="true" aria-labelledby="qb-navegador-aviso" className="qb-panel qb-panel--ornate"
        style={{ position: 'relative', width: 'min(760px,100%)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--qb-gold)', color: 'var(--qb-gold-bright)' }}><Icon name="compass" size={18} /></span>
          <div style={{ display: 'grid', gap: 4 }}>
            <span className="qb-overline">Navegador</span>
            <h2 id="qb-navegador-aviso" style={{ font: '400 22px/1.25 var(--font-heading)', color: 'var(--text-primary)', margin: 0 }}>{tituloRelatorio(pendente)}</h2>
          </div>
        </div>
        <NavegadorRelatorio relatorio={pendente} titles={titles} compacto />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button ref={closeRef} type="button" className="qb-btn qb-btn--secondary" onClick={close}>Fechar</button>
          <Button variant="primary" icon="compass" onClick={() => { close(); go && go('performance', 'navegador'); }}>Ver análise completa</Button>
        </div>
      </div>
    </div>
  );
}
export default NavegadorAviso;
