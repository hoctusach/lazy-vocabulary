import { createContext, useContext } from 'react';

export type AppTab = 'learn' | 'progress' | 'sets' | 'more' | 'all';

export interface AppTabContextValue {
  tab: AppTab;
  setTab: (tab: AppTab) => void;
  inShell: boolean;
}

export const AppTabContext = createContext<AppTabContextValue | null>(null);

export function useAppTab(): AppTabContextValue {
  const value = useContext(AppTabContext);
  if (!value) {
    return { tab: 'all', setTab: () => {}, inShell: false };
  }
  return value;
}
