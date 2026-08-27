import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api';

export interface ProgramItem {
  program: string;
  notes:   string;
  atRisk:  boolean;
}

export interface ProgramStatus {
  deckName:  string;
  deckUrl:   string;
  fetchedAt: string;
  items:     ProgramItem[];
}

export function useProgramStatus() {
  const [data, setData]       = useState<ProgramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/program-status`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<ProgramStatus>;
      })
      .then(setData)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
