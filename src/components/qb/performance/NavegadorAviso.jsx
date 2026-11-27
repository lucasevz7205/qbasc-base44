import React from 'react';
import { Icon } from '@/components/qb/core/Icon';
import { Button } from '@/components/qb/core/Button';
import { useRealStudy } from '@/lib/qb-real-data';
import { NavCartaoAcao } from '@/components/qb/navegador';
import { NavResumoNumeros, prioridadesDe, tituloRelatorio } from '@/components/qb/performance/NavegadorRelatorio';
import { lerVistos, marcarVisto, useNavegadorRelatorios } from '@/components/qb/performance/useNavegadorRelatorios';

// Um relatório só aparece ao abrir o app enquanto é recente: 6 dias para o semanal, 31 para o mensal.
const DIAS = { semanal: 6, mensal: 31 };
const days = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000);

/** Janela do relatório: medidor, três números e as duas ações mais urgentes. */
export function NavegadorAvisoConteudo({ relatorio, titles, onClose, onOpen, closeRef }) {
  const prioridades = prioridadesDe(relatorio.topicos, 2);
  return <>
    <div className="nv-aviso__cab">
      <span className="nv-emblema" aria-hidden="true" style={{ width: 44, height: 44 }}><Icon name="compass" size={22} /></span>
      <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
        <span className="nv-selo-marca" style={{ fontSize: 12 }}>Navegador</span>
        <h2 id="qb-navegador-aviso" className="nv-title" style={{ fontSize: 21 }}>{tituloRelatorio(relatorio)}</h2>
      </div>
    </div>
    <NavResumoNumeros stats={relatorio.geral} placar={relatorio.placar} comparacao={relatorio.comparacao} compacto />
    <section className="nv-stack" aria-label="Faça agora">
      <h3 className="nv-title nv-title--sm">{prioridades.length ? 'Faça agora' : 'Nada urgente'}</h3>
      {prioridades.length
        ? <div className="nv-acoes">{prioridades.map(t => <NavCartaoAcao key={t.topico} stats={t} titulo={titles.get(t.topico) || t.topico} />)}</div>
        : <p className="nv-note">Nenhum assunto com ponto fraco ou erro com certeza neste período.</p>}
    </section>
    <div className="nv-aviso__botoes">
      <button ref={closeRef} type="button" className="qb-btn qb-btn--secondary" onClick={onClose}>Fechar</button>
      <Button variant="primary" icon="compass" onClick={onOpen}>Ver análise completa</Button>
    </div>
  </>;
}

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
    <div className="nv" style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={close} aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,15,.7)' }} />
      <div role="dialog" aria-modal="true" aria-labelledby="qb-navegador-aviso" className="qb-panel qb-panel--ornate nv-aviso">
        <NavegadorAvisoConteudo relatorio={pendente} titles={titles} closeRef={closeRef} onClose={close}
          onOpen={() => { close(); go && go('performance', 'navegador'); }} />
      </div>
    </div>
  );
}
export default NavegadorAviso;
