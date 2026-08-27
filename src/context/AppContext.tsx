import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Page = 'features' | 'backlog' | 'roadmap' | 'action' | 'ccdeck';

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

interface AppContextValue {
  page: Page;
  setPage: (p: Page) => void;
  syncTick: number;
  syncing: boolean;
  lastSyncedAt: Date | null;
  triggerSync: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>('features');
  const [syncTick, setSyncTick] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const triggerSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await fetch(`${BASE}/api/features/sync`, { method: 'POST', credentials: 'include' });
      setLastSyncedAt(new Date());
      setSyncTick(t => t + 1);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  return (
    <AppContext.Provider value={{ page, setPage, syncTick, syncing, lastSyncedAt, triggerSync }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
