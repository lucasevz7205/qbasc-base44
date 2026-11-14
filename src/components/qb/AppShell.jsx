import React from 'react';
import { BrandHeader } from '@/components/qb/navigation/BrandHeader';
import { QB_NAV, QB_DATA } from '@/lib/qb-data';

export default function AppShell({ active, onNavigate, onProfile, children, wide }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 16px 0', maxWidth: 1312, width: '100%', margin: '0 auto' }}>
        <BrandHeader
          items={QB_NAV}
          activeId={active}
          onNavigate={onNavigate}
          notifications={1}
          user={QB_DATA.user}
          onStats={() => onNavigate('dashboard')}
          onProfile={onProfile}
        />
      </div>
      <main style={{ flex: 1, width: '100%', maxWidth: wide ? 1312 : 1272, margin: '0 auto', padding: '24px 16px 48px' }}>
        {children}
      </main>
    </div>
  );
}
export { AppShell };