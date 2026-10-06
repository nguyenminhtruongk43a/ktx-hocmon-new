'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  CheckCircle2,
  Clock,
  LogOut,
  Building2,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  Loader2,
  X,
  AlertCircle,
  Phone,
  KeyRound,
  ShieldCheck,
  Home,
  Calendar,
  Check,
  XCircle,
} from 'lucide-react';

export interface CheckoutRequest {
  id: string;
  ho_va_ten: string;
  ma_nv: string;
  so_cccd: string;
  so_dien_thoai: string;
  ktx: string;
  day: string;
  phong_so: string;
  giuong: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  ghi_chu: string;
  created_at: string;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Chờ duyệt dọn ra',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    icon: <Clock size={13} />,
  },
  approved: {
    label: 'Đã duyệt (Đã giải phóng)',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    icon: <CheckCircle2 size={13} />,
  },
  rejected: {
    label: 'Từ chối',
    color: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-300 dark:border-red-700',
    icon: <XCircle size={13} />,
  },
};

/** Clean [CHECKOUT] prefix from note */
function parseCheckoutNote(rawNote: string = '') {
  const note = rawNote.replace(/^\[CHECKOUT\]\s*/i, '');
  return note || 'Khai báo dọn ra KTX';
}

/** Detail Modal */
function CheckoutDetailModal({
  req,
  onClose,
  onApprove,
  onReject,
  processing,
}: {
  req: CheckoutRequest;
  onClose: () => void;
  onApprove: (r: CheckoutRequest) => void;
  onReject: (id: string) => void;
  processing: string | null;
}) {
  const isProcessing = processing === req.id;
  const cfg = STATUS_CONFIG[req.status];
  const cleanNote = parseCheckoutNote(req.ghi_chu);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <LogOut size={18} />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Chi tiết yêu cầu Check-out</h3>
              <p className="text-xs text-muted-foreground">Khai báo dọn ra và bàn giao phòng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </div>

          <div className="grid grid-cols-2 gap-3.5 text-sm bg-muted/20 p-4 rounded-xl border border-border">
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground block">Họ và tên công nhân</span>
              <p className="font-bold text-foreground text-base mt-0.5">{req.ho_va_ten}</p>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Mã nhân viên</span>
              <p className="font-mono font-medium text-foreground mt-0.5">{req.ma_nv || '—'}</p>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Số CCCD</span>
              <p className="font-mono font-medium text-foreground mt-0.5">{req.so_cccd || '—'}</p>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Số điện thoại</span>
              <p className="font-medium text-foreground mt-0.5">{req.so_dien_thoai || '—'}</p>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Thời gian gửi</span>
              <p className="font-medium text-foreground mt-0.5">
                {new Date(req.created_at).toLocaleString('vi-VN')}
              </p>
            </div>

            <div className="col-span-2 pt-2 border-t border-border">
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 block mb-1">
                📍 Vị trí phòng ở cần giải phóng:
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800">
                  {req.ktx}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-muted text-foreground font-semibold border border-border">
                  {req.day}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-muted text-foreground font-semibold border border-border">
                  Phòng {req.phong_so}
                </span>
                {req.giuong && (
                  <span className="px-2.5 py-1 rounded-md bg-muted text-foreground font-semibold border border-border">
                    {req.giuong}
                  </span>
                )}
              </div>
            </div>

            <div className="col-span-2 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground block">Lý do dọn ra & Ghi chú</span>
              <p className="font-medium text-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">
                {cleanNote}
              </p>
            </div>

            {req.reviewed_at && (
              <div className="col-span-2 pt-2 border-t border-border text-xs text-muted-foreground">
                Đã xử lý lúc: {new Date(req.reviewed_at).toLocaleString('vi-VN')}
              </div>
            )}
          </div>

          {req.status === 'pending' && (
            <div className="flex gap-3 pt-2 border-t border-border">
              <button
                onClick={() => onReject(req.id)}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                Từ chối
              </button>
              <button
                onClick={() => onApprove(req)}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Duyệt dọn ra & Giải phóng phòng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutApprovalPanel({
  onCountChange,
}: {
  onCountChange?: (count: number) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [checkouts, setCheckouts] = useState<CheckoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailReq, setDetailReq] = useState<CheckoutRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CheckoutRequest | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const { currentUser } = useAuth();
  const supabase = createClient();

  // Keep latest onCountChange in a ref to avoid infinite re-renders or updates during render
  const onCountChangeRef = useRef(onCountChange);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const fetchCheckouts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('worker_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const checkoutRows = (data as CheckoutRequest[]).filter(r =>
          r.ghi_chu?.startsWith('[CHECKOUT]')
        );
        setCheckouts(checkoutRows);
      }
    } catch (e: any) {
      console.error('Fetch checkouts error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCheckouts();
  }, [fetchCheckouts]);

  // Compute stats safely via useMemo without state updates during render
  const pendingCount = useMemo(
    () => checkouts.filter(c => c.status === 'pending').length,
    [checkouts]
  );

  const approvedCount = useMemo(
    () => checkouts.filter(c => c.status === 'approved').length,
    [checkouts]
  );

  // Safely inform parent component in an effect asynchronously using setTimeout, NEVER during render
  useEffect(() => {
    if (!onCountChangeRef.current) return;
    const timer = setTimeout(() => {
      onCountChangeRef.current?.(pendingCount);
    }, 0);
    return () => clearTimeout(timer);
  }, [pendingCount]);

  /**
   * Approve Check-out Request:
   * 1. Updates worker_registrations status to 'approved'
   * 2. Finds matching worker in workers table, logs deletion to worker_deletion_log
   * 3. Completely deletes worker from workers table so:
   *    - 100% bed and room is instantly liberated on Dashboard, Heatmap, and room stats
   *    - Worker is NOT kept in "chờ gán" or "chưa có KTX" state
   */
  const handleApprove = async (req: CheckoutRequest) => {
    setProcessingId(req.id);
    setActionSuccessMsg(null);
    try {
      const nowStr = new Date().toISOString();

      // 1. Update status in worker_registrations
      const { error: updateErr } = await supabase
        .from('worker_registrations')
        .update({
          status: 'approved',
          reviewed_by: currentUser?.id,
          reviewed_at: nowStr,
        })
        .eq('id', req.id);

      if (updateErr) throw new Error(updateErr.message);

      // 2. Find matching worker in workers table
      let matchedWorker: any = null;

      if (req.ma_nv && req.ma_nv.trim()) {
        const { data: byCode } = await supabase
          .from('workers')
          .select('*')
          .eq('ma_nv', req.ma_nv.trim())
          .limit(1);
        if (byCode && byCode.length > 0) matchedWorker = byCode[0];
      }

      if (!matchedWorker && req.so_cccd && req.so_cccd.trim()) {
        const { data: byCccd } = await supabase
          .from('workers')
          .select('*')
          .eq('cccd', req.so_cccd.trim())
          .limit(1);
        if (byCccd && byCccd.length > 0) matchedWorker = byCccd[0];
      }

      if (!matchedWorker && req.ho_va_ten && req.phong_so) {
        const { data: byLocation } = await supabase
          .from('workers')
          .select('*')
          .eq('ho_va_ten', req.ho_va_ten.trim())
          .eq('ktx', req.ktx.trim())
          .eq('phong_so', req.phong_so.trim())
          .limit(1);
        if (byLocation && byLocation.length > 0) matchedWorker = byLocation[0];
      }

      // 3. Log to worker_deletion_log AND completely delete from workers table!
      if (matchedWorker) {
        try {
          await supabase.from('worker_deletion_log').insert({
            worker_id: matchedWorker.id,
            ho_va_ten: matchedWorker.ho_va_ten || req.ho_va_ten,
            ma_nv: matchedWorker.ma_nv || req.ma_nv,
            ktx: matchedWorker.ktx || req.ktx,
            day: matchedWorker.day || req.day,
            deleted_at: nowStr,
          });
        } catch {
          // ignore log error
        }

        // PERMANENT HARD DELETE from workers table:
        // Completely liberates room, bed, and occupancy across Dashboard and Heatmap,
        // and guarantees worker will NEVER be in "chờ gán" or "chưa có KTX"!
        await supabase
          .from('workers')
          .delete()
          .eq('id', matchedWorker.id);
      }

      // Clean up any remaining records matching this worker's code/cccd
      if (req.ma_nv && req.ma_nv.trim()) {
        await supabase.from('workers').delete().eq('ma_nv', req.ma_nv.trim());
      }
      if (req.so_cccd && req.so_cccd.trim()) {
        await supabase.from('workers').delete().eq('cccd', req.so_cccd.trim());
      }

      // 4. Update local state inside event handler
      setCheckouts(prev =>
        prev.map(c =>
          c.id === req.id ? { ...c, status: 'approved' as const, reviewed_at: nowStr } : c
        )
      );

      if (detailReq?.id === req.id) {
        setDetailReq(prev => (prev ? { ...prev, status: 'approved', reviewed_at: nowStr } : null));
      }

      const roomLiberatedText = `${req.ktx} - ${req.day} - Phòng ${req.phong_so}`;
      setActionSuccessMsg(
        `✓ Đã duyệt Check-out cho công nhân "${req.ho_va_ten}". Giường phòng tại ${roomLiberatedText} đã được giải phóng và hoàn trả chỗ trống thành công trên cơ sở dữ liệu Supabase!`
      );
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setActionSuccessMsg(null), 8000);
    } catch (err: any) {
      alert(`Lỗi khi phê duyệt: ${err?.message || 'Không thể cập nhật'}`);
    } finally {
      setProcessingId(null);
    }
  };

  /** Reject */
  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const nowStr = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('worker_registrations')
        .update({
          status: 'rejected',
          reviewed_by: currentUser?.id,
          reviewed_at: nowStr,
        })
        .eq('id', id);

      if (updateErr) throw new Error(updateErr.message);

      setCheckouts(prev =>
        prev.map(c =>
          c.id === id ? { ...c, status: 'rejected' as const, reviewed_at: nowStr } : c
        )
      );

      if (detailReq?.id === id) {
        setDetailReq(prev => (prev ? { ...prev, status: 'rejected', reviewed_at: nowStr } : null));
      }
    } catch (err: any) {
      alert(`Lỗi khi từ chối: ${err?.message || 'Không thể cập nhật'}`);
    } finally {
      setProcessingId(null);
    }
  };

  /** Delete */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('worker_registrations')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw new Error(error.message);

      setCheckouts(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message || 'Không thể xóa'}`);
    }
  };

  // Compute filtered rows purely via useMemo
  const filteredCheckouts = useMemo(() => {
    return checkouts.filter(c => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          c.ho_va_ten.toLowerCase().includes(q) ||
          (c.ma_nv && c.ma_nv.toLowerCase().includes(q)) ||
          (c.so_cccd && c.so_cccd.toLowerCase().includes(q)) ||
          c.ktx.toLowerCase().includes(q) ||
          c.day.toLowerCase().includes(q) ||
          c.phong_so.toLowerCase().includes(q) ||
          (c.ghi_chu && c.ghi_chu.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [checkouts, filterStatus, searchQuery]);

  if (!isMounted) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-pulse" suppressHydrationWarning>
        <div className="h-32 bg-card border border-border/60 rounded-2xl" />
        <div className="h-12 bg-card border border-border/60 rounded-2xl" />
        <div className="h-72 bg-card border border-border/60 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" suppressHydrationWarning>
      {/* Detail Modal */}
      {detailReq && (
        <CheckoutDetailModal
          req={detailReq}
          onClose={() => setDetailReq(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          processing={processingId}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Xóa yêu cầu Check-out</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Thao tác này không thể hoàn tác.</p>
              </div>
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              Bạn có chắc muốn xóa bản ghi yêu cầu dọn ra của <strong>{deleteTarget.ho_va_ten}</strong> (Phòng {deleteTarget.phong_so})?
            </p>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-rose-500/10 via-card to-amber-500/5 dark:from-rose-950/30 dark:via-card dark:to-muted/30 border border-rose-500/20 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 mb-2">
              <UserCheck size={14} />
              <span>Duyệt Check-out & Giải Phóng Phòng</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>Danh Sách Chờ Check-out (Phê Duyệt Dọn Ra)</span>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white shadow-sm animate-pulse">
                  {pendingCount} yêu cầu chờ xử lý
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
              Theo dõi và xác nhận các công nhân vừa gửi yêu cầu dọn ra KTX. Khi bấm <strong>&quot;Duyệt / Xác nhận dọn ra&quot;</strong>, hệ thống sẽ tự động cập nhật trạng thái đơn thành approved, đồng thời xóa và giải phóng thông tin cư trú của công nhân đó khỏi phòng/giường trên Supabase để hoàn trả chỗ trống.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchCheckouts(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-border bg-card hover:bg-muted text-foreground rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Làm mới danh sách</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 mt-4 border-t border-border/80">
          <div className="bg-background/80 dark:bg-muted/40 p-3 rounded-xl border border-border flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Đang chờ duyệt</span>
              <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{pendingCount}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-background/80 dark:bg-muted/40 p-3 rounded-xl border border-border flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Đã duyệt giải phóng</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{approvedCount}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-background/80 dark:bg-muted/40 p-3 rounded-xl border border-border flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Tổng yêu cầu</span>
              <span className="text-xl font-extrabold text-foreground">{checkouts.length}</span>
            </div>
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <LogOut size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-3 rounded-2xl shadow-sm">
        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: 'pending', label: `Chờ duyệt (${pendingCount})` },
            { key: 'approved', label: `Đã duyệt (${approvedCount})` },
            { key: 'rejected', label: `Từ chối` },
            { key: 'all', label: `Tất cả (${checkouts.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === tab.key
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã NV, phòng, KTX..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/40 text-foreground"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-3">
            <RefreshCw size={26} className="animate-spin text-rose-500" />
            <p className="text-xs font-semibold">Đang tải danh sách chờ check-out...</p>
          </div>
        ) : filteredCheckouts.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <LogOut size={26} />
            </div>
            <p className="text-sm font-bold text-foreground">Không có yêu cầu check-out nào</p>
            <p className="text-xs max-w-sm leading-relaxed">
              {filterStatus === 'pending'
                ? 'Hiện không có công nhân nào đang chờ duyệt dọn ra. Khi công nhân quét mã khai báo, danh sách sẽ hiển thị ngay tại đây.'
                : 'Không tìm thấy bản ghi phù hợp với bộ lọc tìm kiếm hiện tại.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-bold border-b border-border">
                <tr>
                  <th className="px-4 py-3.5">Họ tên công nhân</th>
                  <th className="px-4 py-3.5">Mã công nhân</th>
                  <th className="px-4 py-3.5">KTX - Dãy - Phòng hiện tại</th>
                  <th className="px-4 py-3.5">Lý do dọn ra</th>
                  <th className="px-4 py-3.5">Thời gian gửi</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCheckouts.map(req => {
                  const cfg = STATUS_CONFIG[req.status];
                  const cleanNote = parseCheckoutNote(req.ghi_chu);
                  const isProcessing = processingId === req.id;

                  return (
                    <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                      {/* Họ tên */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground text-sm">{req.ho_va_ten}</div>
                        {req.so_dien_thoai && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone size={11} className="text-muted-foreground" />
                            <span>{req.so_dien_thoai}</span>
                          </div>
                        )}
                      </td>

                      {/* Mã công nhân */}
                      <td className="px-4 py-3.5 font-mono text-xs">
                        <span className="font-semibold text-foreground">
                          {req.ma_nv || req.so_cccd || '—'}
                        </span>
                        {req.ma_nv && req.so_cccd && req.ma_nv !== req.so_cccd && (
                          <div className="text-[11px] text-muted-foreground font-sans">
                            CCCD: {req.so_cccd}
                          </div>
                        )}
                      </td>

                      {/* Vị trí KTX - Dãy - Phòng */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            {req.ktx}
                          </span>
                          <span className="text-xs font-semibold text-foreground px-2 py-0.5 rounded bg-muted">
                            {req.day}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                            Phòng {req.phong_so}
                          </span>
                          {req.giuong && (
                            <span className="text-[11px] text-muted-foreground">
                              ({req.giuong})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Lý do dọn ra */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="text-xs text-foreground truncate font-medium" title={cleanNote}>
                          {cleanNote}
                        </p>
                      </td>

                      {/* Thời gian gửi */}
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="font-medium text-foreground">
                          {new Date(req.created_at).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(req)}
                                disabled={isProcessing}
                                title="Phê duyệt dọn ra & Giải phóng giường phòng trên Supabase"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                              >
                                {isProcessing ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={13} />
                                )}
                                <span>Duyệt dọn ra</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(req.id)}
                                disabled={isProcessing}
                                title="Từ chối yêu cầu dọn ra"
                                className="p-1.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDetailReq(req)}
                              title="Xem chi tiết"
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                            >
                              Chi tiết
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDetailReq(req)}
                            title="Xem chi tiết"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(req)}
                            title="Xóa bản ghi"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
