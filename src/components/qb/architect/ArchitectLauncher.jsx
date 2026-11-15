import React from 'react';
import { Icon } from '@/components/qb/core/Icon';

export default function ArchitectLauncher({ onOpen, hidden }) {
  return (
    <div hidden={hidden} style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 60 }}>
      <button type="button" className="qb-btn qb-btn--primary" style={{ borderRadius: 999, boxShadow: 'var(--shadow-raised)', paddingLeft: 16 }} onClick={onOpen}>
        <Icon name="sparkles" size={18} />O Arquiteto
      </button>
    </div>
  );
}
export { ArchitectLauncher };