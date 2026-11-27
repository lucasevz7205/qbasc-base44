import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Icon } from '@/components/qb/core/Icon';
import { Button } from '@/components/qb/core/Button';
import { useRealStudy } from '@/lib/qb-real-data';
import { askNavegadorPlanner } from '@/lib/server-fns';
import { analiseErros, navegadorExport, navegadorTopicos } from '@/lib/navegador';
import {
  MAX_REVISOES_SEMANA, atrasadasParaConfirmar, pedidoDeAtrasadas, podeAlterarTarefa, registroConcluida, prefixoSemana, resumoParaPlanner, revisaoRecord, validarPropostas,
} from '@/lib/navegador-planner';
import { clampLauncherPosition } from '@/lib/architect-launcher-position';

const POS_KEY = 'qbasc-navegador-planner-position-v1';
const HIST_KEY = 'qbasc-navegador-planner-history:v1:';
const SUGESTOES = ['Ver metas atrasadas', 'Analisar minha semana', 'Onde estou errando mais?', 'Quais revisões pontuais você agendaria?'];
const SIZE = 56;
const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });
const dataBR = iso => iso.split('-').reverse().join('/');

function lerHistorico(account) {
  try { const v = JSON.parse(localStorage.getItem(HIST_KEY + account) || '[]'); return Array.isArray(v) ? v.slice(-30).map(m => (m?.grupo?.estado === 'pendente' ? { ...m, grupo: { ...m.grupo, estado: 'ignorada' } } : m?.atrasadas?.estado === 'pendente' ? { ...m, atrasadas: { ...m.atrasadas, estado: 'cancelada' } } : m)) : []; } catch { return []; }
}
function gravarHistorico(account, msgs) {
  try { localStorage.setItem(HIST_KEY + account, JSON.stringify(msgs.slice(-30))); } catch { /* sem armazenamento local */ }
}

function Bolinha({ onOpen }) {
  const [pos, setPos] = React.useState(null);
  const drag = React.useRef(null);
  const moved = React.useRef(false);
  const put = p => setPos(clampLauncherPosition(p, viewport(), { width: SIZE, height: SIZE }));
  React.useEffect(() => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(POS_KEY)); } catch { /* posição padrão */ }
    put(saved || { x: 16, y: viewport().height - SIZE - 24 });
    const onResize = () => setPos(p => p && clampLauncherPosition(p, viewport(), { width: SIZE, height: SIZE }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const move = e => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!moved.current && Math.hypot(dx, dy) < 6) return;
    moved.current = true;
    put({ x: d.px + dx, y: d.py + dy });
  };
  const end = e => {
    if (!drag.current || e.pointerId !== drag.current.id) return;
    drag.current = null;
    if (moved.current) { try { setPos(p => { localStorage.setItem(POS_KEY, JSON.stringify(p)); return p; }); } catch { /* ignora */ } }
  };
  return (
    <button type="button" aria-label="Abrir o Navegador, assistente de planejamento" title="Navegador · arraste para mover"
      onPointerDown={e => { if (e.button !== 0 && e.pointerType === 'mouse') return; moved.current = false; drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, px: pos?.x ?? 16, py: pos?.y ?? 0 }; e.currentTarget.setPointerCapture?.(e.pointerId); }}
      onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      onClick={() => { if (!moved.current) onOpen(); }}
      style={{ position: 'fixed', left: pos?.x ?? 16, top: pos?.y ?? undefined, bottom: pos ? undefined : 24, zIndex: 60, width: SIZE, height: SIZE,
        borderRadius: '50%', border: '1.5px solid rgba(208,179,134,.7)', background: 'var(--qb-navy)', color: 'var(--qb-gold)',
        boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', touchAction: 'none' }}>
      <Icon name="compass" size={28} />
    </button>
  );
}

function CartaoProposta({ grupo, onConfirmar, onIgnorar, onDesfazer, busy }) {
  const { validas, descartadas, estado } = grupo;
  return (
    <div style={{ border: '1px solid var(--divider)', borderRadius: 12, padding: 12, display: 'grid', gap: 8, background: 'var(--surface-2, transparent)' }}>
      <strong style={{ font: '600 13px/1.3 var(--font-body)' }}>
        {validas.length ? (estado === 'confirmada' ? 'Revisões agendadas' : 'Revisões propostas') : 'Nenhuma proposta válida'}
      </strong>
      {validas.map(p => (
        <div key={p.id} style={{ font: '400 13px/1.4 var(--font-body)' }}>
          <div><strong>{dataBR(p.data)}</strong> · {p.minutos} min · {p.materia}</div>
          <div style={{ color: 'var(--text-secondary)' }}>{p.titulo}</div>
          <div style={{ color: 'var(--text-muted)' }}>{p.motivo}</div>
        </div>
      ))}
      {descartadas.length > 0 && <div style={{ font: '400 12px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>
        Descartadas pelas regras: {descartadas.map(d => d.motivo).join('; ')}.
      </div>}
      {estado === 'pendente' && validas.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button size="sm" icon="check" disabled={busy} onClick={onConfirmar}>Confirmar e agendar</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={onIgnorar}>Ignorar</Button>
      </div>}
      {estado === 'confirmada' && <Button size="sm" variant="secondary" icon="undo-2" disabled={busy} onClick={onDesfazer}>Desfazer</Button>}
      {estado === 'ignorada' && <span style={{ font: '400 12px/1.3 var(--font-body)', color: 'var(--text-muted)' }}>Ignorada.</span>}
      {estado === 'desfeita' && <span style={{ font: '400 12px/1.3 var(--font-body)', color: 'var(--text-muted)' }}>Desfeita: as tarefas foram arquivadas.</span>}
    </div>
  );
}

function CartaoAtrasadas({ grupo, busy, onConfirmar, onCancelar, onDesfazer }) {
  const { itens, estado, automaticasIgnoradas } = grupo;
  return (
    <div style={{ border: '1px solid var(--divider)', borderRadius: 12, padding: 12, display: 'grid', gap: 8 }}>
      <strong style={{ font: '600 13px/1.3 var(--font-body)' }}>{itens.length ? 'Metas atrasadas (' + itens.length + ')' : 'Nenhuma meta atrasada'}</strong>
      {itens.map(t => <div key={t.id} style={{ font: '400 13px/1.4 var(--font-body)' }}>
        <strong>{dataBR(t.data)}</strong> · {t.titulo}{t.materia ? ' · ' + t.materia : ''}{t.minutos ? ' · ' + t.minutos + ' min' : ''}</div>)}
      {automaticasIgnoradas > 0 && <div style={{ font: '400 12px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>{automaticasIgnoradas} revisões automáticas atrasadas ficam como estão.</div>}
      {estado === 'pendente' && itens.length > 0 && <>
        <div style={{ font: '400 12px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>Confirmar marca estas metas como concluídas. Nada é apagado e dá para desfazer.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button size="sm" icon="check" disabled={busy} onClick={onConfirmar}>Já cumpri: marcar como concluídas</Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={onCancelar}>Cancelar</Button>
        </div></>}
      {estado === 'confirmada' && <Button size="sm" variant="secondary" icon="undo-2" disabled={busy} onClick={onDesfazer}>Desfazer</Button>}
      {estado === 'cancelada' && <span style={{ font: '400 12px/1.3 var(--font-body)', color: 'var(--text-muted)' }}>Cancelado. Nada foi alterado.</span>}
      {estado === 'desfeita' && <span style={{ font: '400 12px/1.3 var(--font-body)', color: 'var(--text-muted)' }}>Desfeito: as metas voltaram a ficar como estavam.</span>}
    </div>
  );
}


/** Borda de baixo da navegação principal (que fica fixa no topo), para o painel nunca cobrir as abas. */
function useTopoLivre() {
  const [top, setTop] = React.useState(8);
  React.useEffect(() => {
    let frame = 0;
    const medir = () => {
      frame = 0;
      const nav = document.querySelector('nav[aria-label="Navegação principal"]');
      const base = nav ? Math.ceil(nav.getBoundingClientRect().bottom) : 0;
      setTop(Math.min(Math.max(8, base + 8), Math.round(window.innerHeight * 0.4)));
    };
    const agendar = () => { if (!frame) frame = window.requestAnimationFrame(medir); };
    medir();
    window.addEventListener('resize', agendar);
    window.addEventListener('scroll', agendar, { passive: true });
    return () => { window.removeEventListener('resize', agendar); window.removeEventListener('scroll', agendar); if (frame) window.cancelAnimationFrame(frame); };
  }, []);
  return top;
}

function Painel({ onClose }) {
  const top = useTopoLivre();
  const { records, QB_DATA, QB_PLAN, QB_EDITAL, accountId, save } = useRealStudy();
  const ask = useServerFn(askNavegadorPlanner);
  const [msgs, setMsgs] = React.useState(() => lerHistorico(accountId));
  const [texto, setTexto] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState('');
  const fim = React.useRef(null);
  const today = QB_PLAN.today;
  const existentes = React.useMemo(() => new Set((records?.planejamento || []).map(r => r.id)), [records]);
  const jaNaSemana = React.useMemo(() => QB_PLAN.tasks.filter(t => t.id.startsWith(prefixoSemana(today))).length, [QB_PLAN.tasks, today]);

  React.useEffect(() => { gravarHistorico(accountId, msgs.map(({ role, text, grupo, atrasadas }) => ({ role, text, grupo, atrasadas }))); fim.current?.scrollIntoView?.({ block: 'end' }); }, [msgs, accountId]);
  React.useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const contexto = () => {
    const payload = navegadorExport(records, QB_DATA.questions, today);
    const topicos = navegadorTopicos(payload.respostas, today);
    const erros = analiseErros(payload.respostas, today);
    const resumo = resumoParaPlanner({ topicos, erros, tasks: QB_PLAN.tasks, today, subjects: QB_EDITAL.subjects, horas: QB_PLAN.hours });
    return resumo;
  };

  const enviar = async mensagem => {
    const t = mensagem.trim();
    if (!t || busy) return;
    setErro(''); setBusy(true); setTexto('');
    const anteriores = msgs;
    setMsgs([...anteriores, { role: 'user', text: t }]);
    if (pedidoDeAtrasadas(t) || t === 'Ver metas atrasadas') {
      const a = atrasadasParaConfirmar(QB_PLAN.tasks);
      setMsgs(m => [...m, { role: 'tutor', text: a.itens.length ? 'Estas são as metas atrasadas. Confirme abaixo se já foram cumpridas; eu não altero nada antes disso.' : 'Não há metas atrasadas no momento.', atrasadas: { ...a, estado: 'pendente' } }]);
      setBusy(false);
      return;
    }
    try {
      const resumo = contexto();
      const r = await ask({ data: { resumo, userMessage: t, history: anteriores.slice(-10).map(m => ({ role: m.role, text: m.text })) } });
      const { validas, descartadas } = validarPropostas(r.propostas, { today, subjects: QB_EDITAL.subjects, horas: QB_PLAN.hours, tasks: QB_PLAN.tasks, existentes, jaNaSemana });
      const grupo = r.propostas.length ? { validas, descartadas, estado: 'pendente' } : undefined;
      setMsgs(m => [...m, { role: 'tutor', text: r.resposta || 'Sem resposta.', grupo }]);
    } catch (e) {
      setErro(e?.message || 'Não foi possível falar com o Navegador agora.');
    } finally { setBusy(false); }
  };

  const mudar = (i, estado) => setMsgs(m => m.map((x, j) => (j === i ? { ...x, grupo: { ...x.grupo, estado } } : x)));
  const mudarAtrasadas = (i, estado, extra = {}) => setMsgs(m => m.map((x, j) => (j === i ? { ...x, atrasadas: { ...x.atrasadas, estado, ...extra } } : x)));
  const concluirAtrasadas = async i => {
    setBusy(true); setErro('');
    try {
      const ts = new Date().toISOString();
      const anteriores = {};
      for (const it of msgs[i].atrasadas.itens) {
        const task = QB_PLAN.tasks.find(t => t.id === it.id);
        if (!task || task.status !== 'late') continue; // só o que ainda está atrasado
        anteriores[task.id] = task.raw;
        await save('planejamento', task.id, registroConcluida(task, ts));
      }
      mudarAtrasadas(i, 'confirmada', { anteriores });
    } catch { setErro('Não foi possível salvar no Base44. Nada foi marcado como concluído; tente novamente.'); }
    finally { setBusy(false); }
  };
  const desfazerAtrasadas = async i => {
    setBusy(true); setErro('');
    try {
      const ts = new Date().toISOString();
      for (const [id, raw] of Object.entries(msgs[i].atrasadas.anteriores || {})) await save('planejamento', id, { ...raw, atualizadoEm: ts });
      mudarAtrasadas(i, 'desfeita');
    } catch { setErro('Não foi possível desfazer agora.'); }
    finally { setBusy(false); }
  };
  const confirmar = async i => {
    const grupo = msgs[i].grupo;
    setBusy(true); setErro('');
    try {
      const ts = new Date().toISOString();
      for (const p of grupo.validas) {
        if (existentes.has(p.id)) continue; // nunca sobrescreve
        await save('planejamento', p.id, revisaoRecord(p, today, ts));
      }
      mudar(i, 'confirmada');
    } catch { setErro('Não foi possível salvar no Base44. Nada foi marcado como agendado; tente novamente.'); }
    finally { setBusy(false); }
  };
  const desfazer = async i => {
    const grupo = msgs[i].grupo;
    setBusy(true); setErro('');
    try {
      const ts = new Date().toISOString();
      for (const p of grupo.validas) {
        const task = QB_PLAN.tasks.find(t => t.id === p.id);
        if (task && podeAlterarTarefa(task)) await save('planejamento', p.id, { ...task.raw, arquivadaEm: ts, atualizadoEm: ts });
      }
      mudar(i, 'desfeita');
    } catch { setErro('Não foi possível desfazer agora.'); }
    finally { setBusy(false); }
  };

  return (
    <div role="dialog" aria-label="O Navegador — planejamento em conversa" data-qb-navegador-planner className="qb-panel qb-panel--ornate"
      style={{ position: 'fixed', top, left: 8, bottom: 8, zIndex: 70, width: 'min(440px, calc(100% - 16px))', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderBottom: '1px solid var(--divider)' }}>
        <Icon name="compass" size={24} color="var(--qb-gold)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: '400 20px/1.2 var(--font-heading)', color: 'var(--text-primary)' }}>O Navegador</div>
          <div style={{ font: '400 12px/1.3 var(--font-body)', color: 'var(--text-muted)' }}>Planejamento em conversa · propõe, você confirma</div>
        </div>
        <button type="button" className="qb-iconbtn" aria-label="Fechar o Navegador" onClick={onClose}><Icon name="x" size={16} /></button>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'grid', gap: 10, alignContent: 'start' }} aria-live="polite">
        {!msgs.length && <p style={{ margin: 0, font: '400 13px/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
          Eu leio a análise semanal (erros, Pareto, recuperação e mitigação) e proponho até {MAX_REVISOES_SEMANA} revisões pontuais por semana. Nada é agendado sem a sua confirmação, e eu só mexo no que eu mesmo criei.
        </p>}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'grid', gap: 8, justifyItems: m.role === 'user' ? 'end' : 'start' }}>
            <div style={{ maxWidth: '92%', whiteSpace: 'pre-wrap', padding: '8px 12px', borderRadius: 12, font: '400 14px/1.5 var(--font-body)',
              background: m.role === 'user' ? 'var(--qb-navy)' : 'transparent', color: m.role === 'user' ? 'var(--qb-ivory)' : 'var(--text-primary)',
              border: m.role === 'user' ? 'none' : '1px solid var(--divider)' }}>{m.text}</div>
            {m.atrasadas && <CartaoAtrasadas grupo={m.atrasadas} busy={busy} onConfirmar={() => concluirAtrasadas(i)} onCancelar={() => mudarAtrasadas(i, 'cancelada')} onDesfazer={() => desfazerAtrasadas(i)} />}
            {m.grupo && <CartaoProposta grupo={m.grupo} busy={busy} onConfirmar={() => confirmar(i)} onIgnorar={() => mudar(i, 'ignorada')} onDesfazer={() => desfazer(i)} />}
          </div>
        ))}
        {busy && <span style={{ font: '400 13px/1 var(--font-body)', color: 'var(--text-muted)' }}>Analisando…</span>}
        {erro && <p role="alert" style={{ margin: 0, color: 'var(--state-incorrect)', font: '400 13px/1.4 var(--font-body)' }}>{erro}</p>}
        <div ref={fim} />
      </div>
      <div style={{ padding: 10, borderTop: '1px solid var(--divider)', display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SUGESTOES.map(s => <button key={s} type="button" className="qb-btn qb-btn--secondary qb-btn--sm" disabled={busy} onClick={() => enviar(s)}>{s}</button>)}
        </div>
        <form onSubmit={e => { e.preventDefault(); enviar(texto); }} style={{ display: 'flex', gap: 8 }}>
          <input value={texto} onChange={e => setTexto(e.target.value)} maxLength={1500} aria-label="Mensagem para o Navegador" placeholder="Pergunte ou peça um ajuste no plano"
            style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--divider)', background: 'transparent', color: 'inherit', font: '400 14px/1.4 var(--font-body)' }} />
          <Button type="submit" size="sm" icon="send" disabled={busy || !texto.trim()} aria-label="Enviar" />
        </form>
      </div>
    </div>
  );
}

const VIEWS = new Set(['plan', 'performance']);

/** Bolinha com bússola e painel à esquerda. Só na conta administradora e nas telas de Planejamento e Desempenho. */
export function NavegadorPlannerLayer({ view }) {
  const { isAdmin } = useRealStudy();
  const [open, setOpen] = React.useState(false);
  if (!isAdmin || !VIEWS.has(view)) return null;
  return open ? <Painel onClose={() => setOpen(false)} /> : <Bolinha onOpen={() => setOpen(true)} />;
}
export default NavegadorPlannerLayer;
