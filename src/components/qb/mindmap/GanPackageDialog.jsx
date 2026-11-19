import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/qb/core/Button';

const PACKAGE_LIMIT = 8;
const NODE_LIMIT = 6;

export function GanPackageDialog({ nodes, initialNode, open, onOpenChange, onGenerate, onDistribute }) {
  const [counts, setCounts] = React.useState(() => ({ [initialNode.id]: 4 }));
  const allocations = nodes.flatMap(target => counts[target.id] ? [{ target, count: counts[target.id] }] : []);
  const total = allocations.reduce((sum, row) => sum + row.count, 0);
  const exceedsLimit = total > PACKAGE_LIMIT;

  function changeCount(nodeId, delta) {
    setCounts(current => ({
      ...current,
      [nodeId]: Math.min(NODE_LIMIT, Math.max(0, (current[nodeId] || 0) + delta)),
    }));
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="qb-gan-review__overlay" />
        <Dialog.Content className="qb-panel qb-panel--ornate qb-gan-review qb-gan-package">
          <header className="qb-gan-review__header">
            <div>
              <Dialog.Title>Gerar questões com O Arquiteto</Dialog.Title>
              <Dialog.Description>Escolha a quantidade de cada nó. O pacote aceita até {PACKAGE_LIMIT} questões, com até {NODE_LIMIT} por nó.</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button size="sm" variant="secondary" icon="x" aria-label="Fechar gerador" /></Dialog.Close>
          </header>
          <div className="qb-gan-review__list">
            {nodes.map(node => {
              const count = counts[node.id] || 0;
              return (
                <div className="qb-gan-package__row" key={node.id} data-selected={count > 0}>
                  <span className="qb-gan-package__node">{node.label}</span>
                  <div className="qb-gan-package__stepper" role="group" aria-label={'Quantidade de questões para ' + node.label}>
                    <Button size="sm" variant="ghost" icon="minus" disabled={count === 0}
                      aria-label={'Diminuir quantidade para ' + node.label} onClick={() => changeCount(node.id, -1)} />
                    <span className="qb-gan-package__count">{count}</span>
                    <Button size="sm" variant="ghost" icon="plus" disabled={count === NODE_LIMIT}
                      aria-label={'Aumentar quantidade para ' + node.label} onClick={() => changeCount(node.id, 1)} />
                  </div>
                </div>
              );
            })}
          </div>
          <footer className="qb-gan-review__footer qb-gan-package__footer">
            <span className="qb-gan-package__total" role="status" data-over-limit={exceedsLimit}>
              <strong>{total} / {PACKAGE_LIMIT}</strong> questões no pacote
            </span>
            <div className="qb-gan-package__actions">
              {onDistribute && <Button variant="secondary" onClick={onDistribute}>Distribuir 20 pelos ramos</Button>}
              <Button disabled={!total || exceedsLimit} onClick={() => onGenerate(allocations)}>
                Gerar pacote
              </Button>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
