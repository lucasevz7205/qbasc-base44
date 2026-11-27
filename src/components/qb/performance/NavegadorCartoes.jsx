import React from 'react';
import { pct } from '@/components/qb/performance/NavegadorRelatorio';

const ESTADOS = [['novo', 'Novos'], ['aprendendo', 'Aprendendo'], ['retencao', 'Em retenção'], ['dominado', 'Dominados']];

/** Bloco próprio dos flashcards. Nunca soma nem compara com a chance de acerto das questões. */
export default function NavegadorCartoes({ cartoes, titles }) {
  const p = cartoes.principal;
  const fracos = cartoes.topicos.filter(t => t.sinal === 'fraco').slice(0, 3);
  return <section className="nv-stack" aria-label="Flashcards" style={{ gap: 10 }}>
    <h3 className="nv-title nv-title--sm">Cartões: retenção</h3>
    <p className="nv-note">Medida à parte das questões. Aqui o que conta é lembrar com intervalo de 3 dias ou mais; repetições no mesmo dia (repescagem) ficam de fora.</p>
    {!cartoes.revisoesValidas
      ? <p className="nv-note">Ainda não há revisões de cartões com intervalo na janela.</p>
      : <p className="nv-note"><strong>Lembrança com intervalo:</strong> {p.n ? pct(p.taxa) : '—'} ({p.lembrou} de {p.n}
        {p.intervalo ? `, 95%: ${pct(p.intervalo.low)} a ${pct(p.intervalo.high)}` : ''}).
        {!p.amostraSuficiente && ` Amostra insuficiente: faltam ${p.falta} revisões para concluir.`}</p>}
    <p className="nv-note">{ESTADOS.map(([k, label]) => `${label}: ${cartoes.estados[k]}`).join(' · ')}</p>
    {cartoes.intervalo.maximo !== null && <p className="nv-note">Intervalo entre revisões lembradas: mediana {cartoes.intervalo.mediana} dias, máximo {cartoes.intervalo.maximo}.</p>}
    {!!cartoes.atrasados && <p className="nv-note">{cartoes.atrasados} cartões vencidos há mais de 2 dias.</p>}
    {(cartoes.repescagem.erros + cartoes.repescagem.recuperados) > 0 && <p className="nv-note">Repescagem do dia (só informativo): {cartoes.repescagem.recuperados} recuperados, {cartoes.repescagem.erros} ainda errados.</p>}
    {!!fracos.length && <p className="nv-note"><strong>Lembrança baixa:</strong> {fracos.map(t => titles.get(t.topico) || t.topico).join(', ')}.</p>}
    {!!cartoes.lapsosRepetidos.length && <p className="nv-note"><strong>Reformular:</strong> {cartoes.lapsosRepetidos.length} cartões com 2 lapsos ou mais depois de já retidos.</p>}
    {!!cartoes.limites.semData && <p className="nv-note nv-muted">{cartoes.limites.semData} avaliações sem data válida ficaram fora.</p>}
  </section>;
}
