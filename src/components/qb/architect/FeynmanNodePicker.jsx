import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { Icon } from '@/components/qb/core/Icon';
import { IconButton } from '@/components/qb/core/IconButton';
import './feynman-node-picker.css';

const wholeTopic = 'whole-topic';
const normalize = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const match = (_value, query, keywords = []) => {
  const text = normalize(keywords.join(' '));
  return normalize(query).split(/\s+/).every(word => text.includes(word)) ? 1 : 0;
};

export function FeynmanNodePicker({ groups, node, onChange }) {
  const [open, setOpen] = React.useState(false);
  const search = React.useRef(null);
  const choose = id => {
    onChange?.(id);
    setOpen(false);
  };
  const currentValue = node ? 'node:' + node.id : wholeTopic;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="qb-picker__trigger qb-feynman-picker__trigger">
        <Icon name="network" size={20} color="var(--text-accent)" />
        <span className="qb-feynman-picker__text">
          <span className="qb-feynman-picker__label">Nó do mapa mental</span>
          <span className="qb-feynman-picker__name">{node?.label || 'Assunto inteiro'}</span>
          {node?.path.length > 1 && <span className="qb-feynman-picker__path">{node.path.slice(0, -1).join(' › ')}</span>}
        </span>
        <Icon name="chevron-down" size={18} color="var(--text-muted)" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="qb-picker__scrim">
          <Dialog.Content className="qb-picker qb-feynman-picker"
            onOpenAutoFocus={event => { event.preventDefault(); search.current?.focus(); }}
            onEscapeKeyDown={event => event.stopPropagation()}>
            <header className="qb-feynman-picker__header">
              <Dialog.Title className="qb-feynman-picker__title">Nó do mapa mental</Dialog.Title>
              <Dialog.Description className="sr-only">Escolha o recorte da explicação Feynman.</Dialog.Description>
              <Dialog.Close asChild><IconButton icon="x" label="Fechar seletor de nós" /></Dialog.Close>
            </header>
            <Command className="qb-feynman-picker__command" label="Buscar nó por nome ou ramo" filter={match} defaultValue={currentValue}>
              <div className="qb-feynman-picker__search">
                <Icon name="search" size={18} color="var(--text-accent)" />
                <Command.Input ref={search} placeholder="Buscar por nome ou ramo…" />
              </div>
              <Command.List className="qb-picker__list qb-feynman-picker__list" label="Nós do assunto">
                <Command.Empty className="qb-feynman-picker__empty">Nenhum nó encontrado.</Command.Empty>
                <Command.Item className="qb-picker__opt qb-feynman-picker__option" value={wholeTopic} keywords={['Assunto inteiro']}
                  data-current={!node || undefined} onSelect={() => choose(undefined)}>
                  <Icon name="book-open" size={18} color="var(--text-accent)" />
                  <span className="qb-feynman-picker__name">Assunto inteiro</span>
                  {!node && <Icon name="check" size={18} color="var(--text-accent)" />}
                </Command.Item>
                {groups.map(group => <Command.Group key={group.id} value={group.id} heading={group.title}>
                  {group.nodes.map(option => (
                    <Command.Item key={option.id} className="qb-picker__opt qb-feynman-picker__option" value={'node:' + option.id}
                      keywords={[...option.path, group.title]} data-current={option.id === node?.id || undefined} onSelect={() => choose(option.id)}>
                      <Icon name="network" size={18} color="var(--text-accent)" />
                      <span className="qb-feynman-picker__text">
                        <span className="qb-feynman-picker__name">{option.label}</span>
                        {option.path.length > 1 && <span className="qb-feynman-picker__path">{option.path.slice(0, -1).join(' › ')}</span>}
                      </span>
                      {option.id === node?.id && <Icon name="check" size={18} color="var(--text-accent)" />}
                    </Command.Item>
                  ))}
                </Command.Group>)}
              </Command.List>
            </Command>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
