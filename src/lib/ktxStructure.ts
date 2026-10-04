'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { compareKtxNames } from '@/data/workers';

export interface KtxBlockGroup {
  ktx: string;
  color: 'blue' | 'orange' | 'emerald' | 'purple' | 'cyan' | 'amber' | 'rose';
  days: string[];
  blocks: string[]; // Format: "KTX X - Dãy Y"
}

const COLOR_PALETTE: ('blue' | 'orange' | 'emerald' | 'purple' | 'cyan' | 'amber' | 'rose')[] = [
  'blue',
  'orange',
  'emerald',
  'purple',
  'cyan',
  'amber',
  'rose',
];

/**
 * Natural sort helper for day/building names: "Dãy 2" before "Dãy 10"
 */
export function compareDayNames(a: string, b: string): number {
  return a.localeCompare(b, 'vi', { numeric: true, sensitivity: 'base' });
}

/**
 * Normalizes KTX label (e.g. "ktx3", "KTX3", "ktx 3" -> "KTX 3")
 */
export function normalizeKtxLabel(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^ktx\s*(\d+)$/i);
  if (match) return `KTX ${match[1]}`;
  return trimmed;
}

/**
 * Normalizes day name (e.g. "1" -> "Dãy 1", "dãy 1" -> "Dãy 1")
 */
export function normalizeDayLabel(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (/^(dãy|day)\s+/i.test(trimmed)) {
    const rest = trimmed.replace(/^(dãy|day)\s+/i, '').trim();
    return `Dãy ${rest}`;
  }
  if (/^\d+$/.test(trimmed)) return `Dãy ${trimmed}`;
  return trimmed;
}

// Module-level cache to ensure fast single-fetch across all mounting components
let _cachedKtxStructure: KtxBlockGroup[] | null = null;
let _inflightPromise: Promise<KtxBlockGroup[]> | null = null;

/**
 * Fetches dynamic KTX & block structure directly from 3 sources:
 * 1. `workers` table (ktx, day)
 * 2. `room_units` table (ktx, day_nha)
 * 3. `profiles` table (assigned_blocks)
 *
 * Uses pagination with .range(from, from + 999) on large tables to read all rows.
 * Normalizes KTX and day labels and combines unique combinations using Set.
 */
export async function fetchDynamicKtxStructure(forceRefresh = false): Promise<KtxBlockGroup[]> {
  if (!forceRefresh && _cachedKtxStructure) {
    return _cachedKtxStructure;
  }

  if (!forceRefresh && _inflightPromise) {
    return _inflightPromise;
  }

  _inflightPromise = (async () => {
    try {
      const supabase = createClient();
      const ktxMap = new Map<string, Set<string>>();

      const addEntry = (rawKtx: string, rawDay?: string) => {
        const ktx = normalizeKtxLabel(rawKtx);
        if (!ktx) return;
        if (!ktxMap.has(ktx)) {
          ktxMap.set(ktx, new Set());
        }
        if (rawDay) {
          const day = normalizeDayLabel(rawDay);
          if (day) {
            ktxMap.get(ktx)!.add(day);
          }
        }
      };

      const PAGE_SIZE = 1000;

      // Source 1: workers table (ktx, day)
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data: workerRows, error: workerErr } = await supabase
          .from('workers')
          .select('ktx, day')
          .range(from, from + PAGE_SIZE - 1);

        if (workerErr) {
          console.warn('[ktxStructure] Warning fetching workers:', workerErr.message);
          break;
        }

        if (workerRows && workerRows.length > 0) {
          workerRows.forEach(row => {
            addEntry(row.ktx, row.day);
          });

          if (workerRows.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            from += PAGE_SIZE;
          }
        } else {
          hasMore = false;
        }
      }

      // Source 2: room_units table (ktx, day_nha)
      from = 0;
      hasMore = true;
      while (hasMore) {
        const { data: roomRows, error: roomErr } = await supabase
          .from('room_units')
          .select('ktx, day_nha')
          .range(from, from + PAGE_SIZE - 1);

        if (roomErr) {
          console.warn('[ktxStructure] Warning fetching room_units:', roomErr.message);
          break;
        }

        if (roomRows && roomRows.length > 0) {
          roomRows.forEach(row => {
            addEntry(row.ktx, row.day_nha);
          });

          if (roomRows.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            from += PAGE_SIZE;
          }
        } else {
          hasMore = false;
        }
      }

      // Source 3: profiles.assigned_blocks
      const { data: profileRows, error: profileErr } = await supabase
        .from('profiles')
        .select('assigned_blocks');

      if (!profileErr && profileRows && profileRows.length > 0) {
        profileRows.forEach(p => {
          if (Array.isArray(p.assigned_blocks)) {
            p.assigned_blocks.forEach((blockStr: string) => {
              if (typeof blockStr === 'string' && blockStr.includes(' - ')) {
                const parts = blockStr.split(' - ');
                const ktx = parts[0];
                const day = parts.slice(1).join(' - ');
                addEntry(ktx, day);
              } else if (typeof blockStr === 'string' && blockStr.trim()) {
                addEntry(blockStr.trim());
              }
            });
          }
        });
      }

      // If database returned no rows, return empty array
      if (ktxMap.size === 0) {
        _cachedKtxStructure = [];
        return [];
      }

      // Sort KTX names with natural sorting (KTX 2 before KTX 10)
      const sortedKtxNames = Array.from(ktxMap.keys()).sort(compareKtxNames);

      const result: KtxBlockGroup[] = sortedKtxNames.map((ktx, index) => {
        const days = Array.from(ktxMap.get(ktx)!).sort(compareDayNames);
        const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
        const blocks = days.map(d => `${ktx} - ${d}`);

        return {
          ktx,
          color,
          days,
          blocks,
        };
      });

      _cachedKtxStructure = result;
      return result;
    } catch (err) {
      console.warn('[ktxStructure] Connection error while fetching structure:', err);
      _cachedKtxStructure = [];
      return [];
    } finally {
      _inflightPromise = null;
    }
  })();

  return _inflightPromise;
}

/**
 * React Hook for consuming dynamic KTX and block structure throughout the app
 */
export function useKtxStructure() {
  const [ktxGroups, setKtxGroups] = useState<KtxBlockGroup[]>(() => _cachedKtxStructure || []);
  const [loading, setLoading] = useState(!_cachedKtxStructure);

  const reload = useCallback(async (force = true) => {
    setLoading(true);
    try {
      const data = await fetchDynamicKtxStructure(force);
      setKtxGroups(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!_cachedKtxStructure) {
      reload(false);
    }
  }, [reload]);

  const ktxNames = ktxGroups.map(g => g.ktx);

  return {
    ktxGroups,
    ktxNames,
    loading,
    reload,
  };
}
