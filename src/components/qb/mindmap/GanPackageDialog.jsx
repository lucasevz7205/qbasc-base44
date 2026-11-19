import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/qb/core/Button';

const PACKAGE_LIMIT = 8;
const NODE_LIMIT = 6;

export function GanPackageDialog({ nodes, initialNode, open, onOpenChange, onGenerate }) {
  const [counts, setCounts] = React.useState(() => ({ [initialNode.id]: 4 }));
  const allocations = nodes.flatMap(target => counts[target.id] ? [{ target, count: counts[target.id] }] : []);
  const total = allocations.reduce((sum, row) => sum + row.count, 0);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="qb-gan-review__overlay" />
        <Dialog.Content className="qb-panel qb-panel--ornate qb-gan-review">
          <header className="qb-gan-review__header">
            <div>
              <Dialog.Title>Gerar questões com O Arquiteto</Dialog.Title>
              <Dialog.Description>Escolha a quantidade de cada nó. O pacote aceita até {PACKAGE_LIMIT} questões, com até {NODE_LIMIT} por nó.</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button size="sm" variant="secondary" icon="x" aria-label="Fechar gerador" /></Dialog.Close>
          </header>
          <div className="qb-gan-review__list">
            {nodes.map(node => (
              <label className="qb-gan-review__item" key={node.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                <span>{node.label}</span>
                <select value={counts[node.id] || 0} aria-label={'Questões para ' + node.label}
                  onChange={event => {
                    const value = Number(event.target.value);
                    setCounts(current => ({ ...current, [node.id]: value }));
                  }}>
                  {Array.from({ length: NODE_LIMIT + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </label>
            ))}
          </div>
          <footer className="qb-gan-review__footer">
            <span role="status">{total} de {PACKAGE_LIMIT} questões no pacote</span>
            <Button disabled={!total || total > PACKAGE_LIMIT} onClick={() => onGenerate(allocations)}>
              Gerar pacote
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
