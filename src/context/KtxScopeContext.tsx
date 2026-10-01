'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useWorkers } from '@/context/WorkerContext';
import { Worker, compareNatural } from '@/data/workers';
import { normalizeKtx } from '@/lib/normalize';

export const ALL_KTX = 'all';
const STORAGE_KEY = 'ktx-scope';

export interface KtxSummary {
  ktx: string;
  count: number;
}

interface KtxScopeValue {
  /** `ALL_KTX` or a canonical KTX name like "KTX 3" */
  scope: string;
  setScope: (ktx: string) => void;
  isAll: boolean;
  ktxList: KtxSummary[];
  /** Workers visible under the current scope */
  scopedWorkers: Worker[];
}

const KtxScopeContext = createContext<KtxScopeValue | null>(null);

export function KtxScopeProvider({ children }: { children: React.ReactNode }) {
  const { workers, loading } = useWorkers();
  const [scope, setScopeState] = useState<string>(ALL_KTX);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) setScopeState(stored);
  }, []);

  const setScope = useCallback((ktx: string) => {
    const next = !ktx || ktx === ALL_KTX ? ALL_KTX : normalizeKtx(ktx);
    setScopeState(next);
    sessionStorage.setItem(STORAGE_KEY, next);
  }, []);

  const ktxList = useMemo<KtxSummary[]>(() => {
    const counts = new Map<string, number>();
    for (const w of workers) if (w.ktx) counts.set(w.ktx, (counts.get(w.ktx) ?? 0) + 1);
    return [...counts.entries()]
      .map(([ktx, count]) => ({ ktx, count }))
      .sort((a, b) => compareNatural(a.ktx, b.ktx));
  }, [workers]);

  // Fall back to "all" if the stored KTX no longer exists (e.g. dormitory removed)
  useEffect(() => {
    if (loading || scope === ALL_KTX || ktxList.length === 0) return;
    if (!ktxList.some(k => k.ktx === scope)) setScope(ALL_KTX);
  }, [loading, scope, ktxList, setScope]);

  const scopedWorkers = useMemo(
    () => (scope === ALL_KTX ? workers : workers.filter(w => w.ktx === scope)),
    [workers, scope]
  );

  const value = useMemo(
    () => ({ scope, setScope, isAll: scope === ALL_KTX, ktxList, scopedWorkers }),
    [scope, setScope, ktxList, scopedWorkers]
  );

  return <KtxScopeContext.Provider value={value}>{children}</KtxScopeContext.Provider>;
}

export function useKtxScope() {
  const ctx = useContext(KtxScopeContext);
  if (!ctx) throw new Error('useKtxScope must be used within KtxScopeProvider');
  return ctx;
}
