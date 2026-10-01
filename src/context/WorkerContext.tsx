'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Worker, WORKERS, compareNatural } from '@/data/workers';
import { createClient } from '@/lib/supabase/client';
import { normalizeKtx, normalizeDay, normalizeRoom, normalizeText, normalizeCccd } from '@/lib/normalize';

// ─── DB row ↔ Worker mapping ───────────────────────────────────────────────

type DbRow = Record<string, unknown>;

/** Maps a DB row to a Worker with canonical KTX/Dãy/Phòng and reports whether the stored row differed. */
function dbRowToWorker(row: DbRow): { worker: Worker; dirty: boolean } {
  const rawKtx = String(row.ktx ?? '');
  const rawDay = String(row.day ?? '');
  const rawRoom = String(row.phong_so ?? '');
  const ktx = normalizeKtx(rawKtx);
  const day = normalizeDay(rawDay);
  const phongSo = normalizeRoom(rawRoom);
  const worker: Worker = {
    id: String(row.id ?? ''),
    stt: Number(row.stt ?? 0),
    hoVaTen: normalizeText(row.ho_va_ten),
    maNV: normalizeText(row.ma_nv),
    tieuDoan: normalizeText(row.tieu_doan),
    ktx,
    donVi: normalizeText(row.don_vi),
    gioiTinh: normalizeText(row.gioi_tinh),
    ngaySinh: String(row.ngay_sinh ?? row.date_of_birth ?? row.dob ?? ''),
    soDienThoai: normalizeText(row.so_dien_thoai),
    day,
    phongSo,
    giuong: normalizeText(row.giuong),
    cccd: normalizeCccd(row.cccd),
    hoKhauTinh: normalizeText(row.ho_khau_tinh),
    toTruong: normalizeText(row.to_truong),
    sdtToTruong: normalizeText(row.sdt_to_truong),
    ngayVaoKTX: String(row.ngay_vao_ktx ?? ''),
    ngayRaKTX: row.ngay_ra_ktx ? String(row.ngay_ra_ktx) : undefined,
    ghiChu: String(row.ghi_chu ?? ''),
    khoaTraCuu: String(row.khoa_tra_cuu ?? ''),
    avatar: row.avatar ? String(row.avatar) : undefined,
    tamTruStatus: row.tam_tru_status === 'registered' ? 'registered' : 'unregistered',
  };
  const dirty = rawKtx !== ktx || rawDay !== day || rawRoom !== phongSo;
  return { worker, dirty };
}

function normalizeWorker(w: Worker): Worker {
  return {
    ...w,
    hoVaTen: normalizeText(w.hoVaTen),
    maNV: normalizeText(w.maNV),
    ktx: normalizeKtx(w.ktx),
    day: normalizeDay(w.day),
    phongSo: normalizeRoom(w.phongSo),
    cccd: normalizeCccd(w.cccd),
    soDienThoai: normalizeText(w.soDienThoai),
  };
}

function workerToDbRow(input: Worker): DbRow {
  const w = normalizeWorker(input);
  return {
    id: w.id,
    stt: w.stt,
    ho_va_ten: w.hoVaTen,
    ma_nv: w.maNV,
    tieu_doan: w.tieuDoan,
    ktx: w.ktx,
    don_vi: w.donVi,
    gioi_tinh: w.gioiTinh,
    ngay_sinh: w.ngaySinh,
    so_dien_thoai: w.soDienThoai,
    day: w.day,
    phong_so: w.phongSo,
    giuong: w.giuong ?? '',
    cccd: w.cccd,
    ho_khau_tinh: w.hoKhauTinh,
    to_truong: w.toTruong,
    sdt_to_truong: w.sdtToTruong,
    ngay_vao_ktx: w.ngayVaoKTX,
    ngay_ra_ktx: w.ngayRaKTX ?? null,
    ghi_chu: w.ghiChu,
    khoa_tra_cuu: w.khoaTraCuu,
    avatar: w.avatar ?? '',
    tam_tru_status: w.tamTruStatus ?? 'unregistered',
  };
}

const bySttThenName = (a: Worker, b: Worker) => a.stt - b.stt || compareNatural(a.hoVaTen, b.hoVaTen);

// ─── Context types ─────────────────────────────────────────────────────────

interface WorkerContextValue {
  workers: Worker[];
  workerCount: number;
  totalWorkerCount: number;
  loading: boolean;
  refreshing: boolean;
  /** IDs whose stored KTX/Dãy/Phòng text is not in canonical form yet */
  unnormalizedIds: ReadonlySet<string>;
  addWorker: (worker: Worker) => Promise<void>;
  updateWorker: (worker: Worker) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>;
  deleteWorkers: (ids: string[]) => Promise<void>;
  deleteAllWorkers: () => Promise<void>;
  importWorkers: (rows: Worker[]) => Promise<void>;
  updateTamTruStatus: (id: string, status: 'registered' | 'unregistered') => Promise<void>;
  bulkUpdateKtx: (ids: string[], ktxValue: string) => Promise<void>;
  /** Rewrites non-canonical KTX/Dãy/Phòng values in Supabase. Returns number of rows fixed. */
  normalizeStoredLocations: () => Promise<number>;
  refreshWorkers: () => Promise<void>;
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
}

const WorkerContext = createContext<WorkerContextValue | null>(null);

const FETCH_PAGE_SIZE = 1000;
const WRITE_BATCH = 200;
const REALTIME_FLUSH_MS = 120;

type PendingChange = { type: 'upsert'; worker: Worker; dirty: boolean } | { type: 'delete' };

export function WorkerProvider({ children }: { children: React.ReactNode }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [unnormalizedIds, setUnnormalizedIds] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const workersRef = useRef<Worker[]>(workers);
  workersRef.current = workers;
  const hasLoadedRef = useRef(false);

  // ── Fetch ALL workers using range pagination (bypasses 1000-row limit) ────
  const fetchWorkers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const allRows: Worker[] = [];
      const dirtyIds = new Set<string>();
      let from = 0;
      let failed = false;

      while (true) {
        const { data, error } = await supabase
          .from('workers')
          .select('*')
          .order('stt', { ascending: true })
          .range(from, from + FETCH_PAGE_SIZE - 1);

        if (error) {
          console.error('Supabase load error:', error.message);
          failed = true;
          const missingTable = error.message?.includes('does not exist') || error.message?.includes('schema cache') || error.code === '42P01';
          if (missingTable && !hasLoadedRef.current) setWorkers(WORKERS);
          break;
        }

        for (const row of data ?? []) {
          const { worker, dirty } = dbRowToWorker(row as DbRow);
          allRows.push(worker);
          if (dirty) dirtyIds.add(worker.id);
        }
        if (!data || data.length < FETCH_PAGE_SIZE) break;
        from += FETCH_PAGE_SIZE;
      }

      if (!failed) {
        setWorkers(allRows);
        setUnnormalizedIds(dirtyIds);
        hasLoadedRef.current = true;
      }
    } catch (err) {
      console.error('Load workers failed:', err);
    } finally {
      if (isRefresh) setRefreshing(false);
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchWorkers(false);
  }, [fetchWorkers]);

  // ── Realtime: buffer events and apply them in one state update ───────────
  // Bulk imports emit thousands of events; applying each with a full sort froze the UI.
  useEffect(() => {
    const pending = new Map<string, PendingChange>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      timer = null;
      if (pending.size === 0) return;
      const changes = new Map(pending);
      pending.clear();

      setWorkers(prev => {
        const next: Worker[] = [];
        const seen = new Set<string>();
        let needsSort = false;
        for (const w of prev) {
          const change = changes.get(w.id);
          seen.add(w.id);
          if (!change) next.push(w);
          else if (change.type === 'upsert') {
            if (change.worker.stt !== w.stt) needsSort = true;
            next.push(change.worker);
          }
        }
        for (const [id, change] of changes) {
          if (!seen.has(id) && change.type === 'upsert') {
            next.push(change.worker);
            needsSort = true;
          }
        }
        if (needsSort) next.sort(bySttThenName);
        return next;
      });

      setUnnormalizedIds(prev => {
        const next = new Set(prev);
        for (const [id, change] of changes) {
          if (change.type === 'upsert' && change.dirty) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    };

    const schedule = () => {
      if (!timer) timer = setTimeout(flush, REALTIME_FLUSH_MS);
    };

    const workersChannel = supabase
      .channel('workers_realtime_v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workers' }, payload => {
        if (payload.eventType === 'DELETE') {
          const id = String((payload.old as DbRow).id ?? '');
          if (id) pending.set(id, { type: 'delete' });
        } else {
          const { worker, dirty } = dbRowToWorker(payload.new as DbRow);
          pending.set(worker.id, { type: 'upsert', worker, dirty });
        }
        schedule();
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(workersChannel);
    };
  }, [supabase]);

  const refreshWorkers = useCallback(async () => {
    await fetchWorkers(true);
  }, [fetchWorkers]);

  // ── CRUD operations (optimistic, realtime reconciles) ─────────────────────

  const upsertLocal = useCallback((list: Worker[]) => {
    const byId = new Map(list.map(w => [w.id, w]));
    setWorkers(prev => {
      const next = prev.map(w => byId.get(w.id) ?? w);
      const existing = new Set(prev.map(w => w.id));
      for (const w of list) if (!existing.has(w.id)) next.push(w);
      return next.sort(bySttThenName);
    });
  }, []);

  const removeLocal = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setWorkers(prev => prev.filter(w => !idSet.has(w.id)));
    setUnnormalizedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  const addWorker = useCallback(async (worker: Worker) => {
    const normalized = normalizeWorker(worker);
    const { error } = await supabase.from('workers').insert(workerToDbRow(normalized));
    if (error) throw new Error(error.message);
    upsertLocal([normalized]);
  }, [supabase, upsertLocal]);

  const updateWorker = useCallback(async (worker: Worker) => {
    const normalized = normalizeWorker(worker);
    const { error } = await supabase.from('workers').update(workerToDbRow(normalized)).eq('id', worker.id);
    if (error) throw new Error(error.message);
    upsertLocal([normalized]);
    setUnnormalizedIds(prev => {
      if (!prev.has(worker.id)) return prev;
      const next = new Set(prev);
      next.delete(worker.id);
      return next;
    });
  }, [supabase, upsertLocal]);

  const logDeletions = useCallback(async (targets: Worker[]) => {
    const now = new Date().toISOString();
    for (let i = 0; i < targets.length; i += WRITE_BATCH) {
      const batch = targets.slice(i, i + WRITE_BATCH).map(w => ({
        worker_id: w.id,
        ho_va_ten: w.hoVaTen || null,
        ma_nv: w.maNV || null,
        ktx: w.ktx || null,
        day: w.day || null,
        deleted_at: now,
      }));
      await supabase.from('worker_deletion_log').insert(batch);
    }
  }, [supabase]);

  const deleteWorkers = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    await logDeletions(workersRef.current.filter(w => idSet.has(w.id)));
    for (let i = 0; i < ids.length; i += WRITE_BATCH) {
      const { error } = await supabase.from('workers').delete().in('id', ids.slice(i, i + WRITE_BATCH));
      if (error) throw new Error(error.message);
    }
    removeLocal(ids);
  }, [supabase, logDeletions, removeLocal]);

  const deleteWorker = useCallback((id: string) => deleteWorkers([id]), [deleteWorkers]);

  const deleteAllWorkers = useCallback(async () => {
    await logDeletions(workersRef.current);
    const { error } = await supabase.from('workers').delete().neq('id', '___never___');
    if (error) throw new Error(error.message);
    setWorkers([]);
    setUnnormalizedIds(new Set());
  }, [supabase, logDeletions]);

  const importWorkers = useCallback(async (rows: Worker[]) => {
    if (rows.length === 0) return;
    const current = workersRef.current;
    const maxStt = current.reduce((max, w) => Math.max(max, w.stt), 0);
    const dbRows = rows.map((r, i) => workerToDbRow({ ...r, stt: maxStt + i + 1 }));
    for (let i = 0; i < dbRows.length; i += 100) {
      const { error } = await supabase.from('workers').upsert(dbRows.slice(i, i + 100), { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }
    await fetchWorkers(true);
  }, [supabase, fetchWorkers]);

  const updateTamTruStatus = useCallback(async (id: string, status: 'registered' | 'unregistered') => {
    const { error } = await supabase.from('workers').update({ tam_tru_status: status }).eq('id', id);
    if (error) throw new Error(error.message);
    setWorkers(prev => prev.map(w => (w.id === id ? { ...w, tamTruStatus: status } : w)));
  }, [supabase]);

  const bulkUpdateKtx = useCallback(async (ids: string[], ktxValue: string) => {
    if (ids.length === 0) return;
    const ktx = normalizeKtx(ktxValue);
    for (let i = 0; i < ids.length; i += WRITE_BATCH) {
      const { error } = await supabase.from('workers').update({ ktx }).in('id', ids.slice(i, i + WRITE_BATCH));
      if (error) throw new Error(error.message);
    }
    const idSet = new Set(ids);
    setWorkers(prev => prev.map(w => (idSet.has(w.id) ? { ...w, ktx } : w)));
  }, [supabase]);

  const normalizeStoredLocations = useCallback(async () => {
    const targets = workersRef.current.filter(w => unnormalizedIds.has(w.id));
    if (targets.length === 0) return 0;
    // Group by canonical location so each distinct combo is one UPDATE ... WHERE id IN (...)
    const groups = new Map<string, { ktx: string; day: string; phong_so: string; ids: string[] }>();
    for (const w of targets) {
      const key = `${w.ktx}||${w.day}||${w.phongSo}`;
      const g = groups.get(key) ?? { ktx: w.ktx, day: w.day, phong_so: w.phongSo, ids: [] };
      g.ids.push(w.id);
      groups.set(key, g);
    }
    for (const { ids, ...values } of groups.values()) {
      for (let i = 0; i < ids.length; i += WRITE_BATCH) {
        const { error } = await supabase.from('workers').update(values).in('id', ids.slice(i, i + WRITE_BATCH));
        if (error) throw new Error(error.message);
      }
    }
    setUnnormalizedIds(new Set());
    return targets.length;
  }, [supabase, unnormalizedIds]);

  const value = useMemo<WorkerContextValue>(() => ({
    workers,
    workerCount: workers.length,
    totalWorkerCount: workers.length,
    loading,
    refreshing,
    unnormalizedIds,
    addWorker,
    updateWorker,
    deleteWorker,
    deleteWorkers,
    deleteAllWorkers,
    importWorkers,
    updateTamTruStatus,
    bulkUpdateKtx,
    normalizeStoredLocations,
    refreshWorkers,
    setWorkers,
  }), [workers, loading, refreshing, unnormalizedIds, addWorker, updateWorker, deleteWorker, deleteWorkers, deleteAllWorkers, importWorkers, updateTamTruStatus, bulkUpdateKtx, normalizeStoredLocations, refreshWorkers]);

  return <WorkerContext.Provider value={value}>{children}</WorkerContext.Provider>;
}

export function useWorkers() {
  const ctx = useContext(WorkerContext);
  if (!ctx) throw new Error('useWorkers must be used within WorkerProvider');
  return ctx;
}
