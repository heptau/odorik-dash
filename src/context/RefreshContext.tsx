import { createContext, useContext, useCallback, type ReactNode } from 'react';

interface RefreshContextValue {
  triggerRefresh: () => void;
  registerRefresh: (key: string, refresh: () => Promise<void>) => void;
  unregisterRefresh: (key: string) => void;
}

const RefreshContext = createContext<RefreshContextValue | null>(null);

const refreshFunctions: Map<string, () => Promise<void>> = new Map();

export function RefreshProvider({ children }: { children: ReactNode }) {
  const registerRefresh = useCallback((key: string, refresh: () => Promise<void>) => {
    refreshFunctions.set(key, refresh);
  }, []);

  const unregisterRefresh = useCallback((key: string) => {
    refreshFunctions.delete(key);
  }, []);

  const triggerRefresh = useCallback(async () => {
    const promises = Array.from(refreshFunctions.values()).map(fn => fn());
    await Promise.all(promises);
  }, []);

  return (
    <RefreshContext.Provider value={{ triggerRefresh, registerRefresh, unregisterRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const ctx = useContext(RefreshContext);
  if (!ctx) throw new Error('useRefresh must be used within RefreshProvider');
  return ctx;
}