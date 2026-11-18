import React from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/qb/core/Button';
import { Panel } from '@/components/qb/core/Panel';
import { exportCoberturaEstudo } from '@/lib/export-cobertura';

// Administração: baixa o JSON somente leitura da cobertura de estudo. A função confere o dono no servidor.
export default function CoverageExportPanel() {
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
    <Panel style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ font: 'var(--type-h2)' }}>Exportar cobertura</h2>
      <p>
        Gera um JSON somente leitura com subitens do edital, questões, mapas, cartões e itens de revisão.
        Nenhum dado é alterado.
      </p>
      {error && <p role="alert">{error}</p>}
      <div>
        <Button icon="arrow-down-to-line" loading={busy} disabled={busy} onClick={download}>
          {busy ? 'Gerando…' : 'Baixar JSON da cobertura'}
        </Button>
      </div>
      {counts && <pre style={{ font: '400 13px/1.5 var(--font-body)', whiteSpace: 'pre-wrap' }}>{JSON.stringify(counts, null, 2)}</pre>}
    </Panel>
  );
}
