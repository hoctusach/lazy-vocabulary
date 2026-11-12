import { useMemo, useState, type ReactNode } from 'react';
import MobileTabBar from './MobileTabBar';
import { AppTabContext, type AppTab } from './appTabContext';

export function AppShell({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<AppTab>('learn');
  const value = useMemo(() => ({ tab, setTab, inShell: true }), [tab]);

  return (
    <AppTabContext.Provider value={value}>
      <div className="app-frame min-h-dvh pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-6">
        {children}
        <MobileTabBar />
      </div>
    </AppTabContext.Provider>
  );
}
