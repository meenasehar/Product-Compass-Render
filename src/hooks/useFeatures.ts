import { useEffect, useState, useCallback } from 'react';
import { type Feature } from '@/data/features';
import { useApp } from '@/context/AppContext';

interface UseFeaturesResult {
  features: Feature[];
  loading: boolean;
  error: string | null;
  lastSyncedAt: Date | null;
  refetch: () => void;
  sync: () => Promise<void>;
}

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export function useFeatures(release?: string): UseFeaturesResult {
  const { syncTick } = useApp();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const sync = useCallback(async () => {
    await fetch(`${BASE}/api/features/sync`, { method: 'POST', credentials: 'include' });
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url = release
      ? `${BASE}/api/features?release=${encodeURIComponent(release)}`
      : `${BASE}/api/features`;

    fetch(url, { credentials: 'include' })
      .then(r => {
        const syncedAt = r.headers.get('X-Last-Synced-At');
        if (syncedAt && !cancelled) setLastSyncedAt(new Date(syncedAt));
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Feature[]>;
      })
      .then(data => { if (!cancelled) setFeatures(data); })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [release, tick, syncTick]);

  return { features, loading, error, lastSyncedAt, refetch, sync };
}
