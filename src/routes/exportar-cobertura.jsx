import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { exportCoberturaEstudo } from '@/lib/export-cobertura';

export const Route = createFileRoute('/exportar-cobertura')({
  head: () => ({
    meta: [{ title: 'Exportar cobertura — Quebrando a Banca' }],
  }),
  component: ExportarCoberturaRoute,
});

// Página de administração: gera o JSON somente leitura da cobertura. A função confere o dono no servidor.
function ExportarCoberturaRoute() {
  const run = useServerFn(exportCoberturaEstudo);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [counts, setCounts] = React.useState(null);

  const download = async () => {
    setBusy(true);
    setError('');
    setCounts(null);
    try {
      const data = await run();
      setCounts(data.contagens);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cobertura-qbasc.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || 'Não foi possível gerar a exportação.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: 16, display: 'grid', gap: 12 }}>
      <h1 style={{ font: '600 20px/1.25 system-ui, sans-serif' }}>Exportar cobertura</h1>
      <p style={{ font: '400 14px/1.5 system-ui, sans-serif' }}>
        Gera um arquivo JSON somente leitura com subitens do edital, questões, mapas, cartões e itens de revisão.
        Nenhum dado é alterado.
      </p>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        style={{ justifySelf: 'start', padding: '10px 16px', font: '600 14px system-ui, sans-serif', cursor: busy ? 'wait' : 'pointer' }}
      >
        {busy ? 'Gerando…' : 'Baixar JSON'}
      </button>
      {error && <p role="alert" style={{ color: '#b00020', font: '400 14px/1.5 system-ui, sans-serif' }}>{error}</p>}
      {counts && (
        <pre style={{ font: '400 13px/1.5 ui-monospace, monospace', whiteSpace: 'pre-wrap' }}>{JSON.stringify(counts, null, 2)}</pre>
      )}
    </main>
  );
}
