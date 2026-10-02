'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Worker, calcSoNgay, getProfileStatus } from '@/data/workers';
import { X, Users, Phone, CreditCard, MapPin, Calendar, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface Props {
  ktx: string;
  building: string;
  buildingRaw: string;
  room: string;
  workers: Worker[];
  adminAssignedUnit?: string;
  roomNote?: string | null;
  onClose: () => void;
  onUnitUpdated?: (newUnit: string | null) => void;
  onRoomNoteUpdated?: (newNote: string | null) => void;
}

function StatusDot({ worker }: { worker: Worker }) {
  const s = getProfileStatus(worker);
  if (s === 'full') return <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Đủ hồ sơ" />;
  if (s === 'missing_cccd_sdt') return <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Thiếu CCCD/SĐT" />;
  return <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" title="Chưa phân phòng" />;
}

export default function RoomDrawer({ ktx, building, buildingRaw, room, workers, adminAssignedUnit, roomNote, onClose, onUnitUpdated, onRoomNoteUpdated }: Props) {
  const { isAdmin } = useAuth();

  // --- Room Note state ---
  const [noteInput, setNoteInput] = useState(roomNote ?? '');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);

  /** Resolve the effective day_nha value for Supabase queries */
  const resolveEffectiveDayNha = useCallback((): string => {
    if (buildingRaw && buildingRaw.trim()) return buildingRaw.trim();
    if (building && building.trim()) {
      const afterDot = building.match(/·\s*(.+)$/);
      if (afterDot) return afterDot[1].trim();
      return building.trim();
    }
    const titleMatch = building.match(/^(Dãy\s*\S+)/i);
    if (titleMatch) return titleMatch[1].trim();
    return building || '';
  }, [buildingRaw, building]);

  // On open: fetch the latest room_note directly from Supabase to ensure freshness
  useEffect(() => {
    // Initialize from prop immediately (fast path)
    setNoteInput(roomNote ?? '');

    if (!isAdmin) return;

    // Then fetch fresh from DB to catch any updates
    const fetchNote = async () => {
      setLoadingNote(true);
      try {
        const supabase = createClient();
        const effectiveDayNha = resolveEffectiveDayNha();
        const { data, error } = await supabase
          .from('room_units')
          .select('room_note')
          .eq('ktx', ktx)
          .eq('day_nha', effectiveDayNha)
          .eq('phong_so', room)
          .maybeSingle();

        if (!error && data) {
          setNoteInput(data.room_note ?? '');
        }
      } catch {
        // Silently fall back to prop value
      } finally {
        setLoadingNote(false);
      }
    };

    fetchNote();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ktx, room, buildingRaw, building]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  /** Save room_note to room_units table */
  const handleSaveRoomNote = useCallback(async () => {
    setSavingNote(true);
    setNoteError(null);
    setNoteSuccess(false);
    try {
      const supabase = createClient();
      const trimmed = noteInput.trim();
      const effectiveDayNha = resolveEffectiveDayNha();

      console.log('[RoomDrawer] Lưu ghi chú phòng:', { ktx, day_nha: effectiveDayNha, phong_so: room, room_note: trimmed || null });

      // Step 1: Try UPDATE first (row must already exist)
      const { data: updateData, error: updateError } = await supabase
        .from('room_units')
        .update({ room_note: trimmed || null, updated_at: new Date().toISOString() })
        .eq('ktx', ktx)
        .eq('day_nha', effectiveDayNha)
        .eq('phong_so', room)
        .select();

      if (updateError) {
        throw new Error(`Lỗi cập nhật ghi chú: ${updateError.message}`);
      }

      // Step 2: If no row was updated, insert a new row
      if (!updateData || updateData.length === 0) {
        const { error: insertError } = await supabase
          .from('room_units')
          .insert({
            ktx,
            day_nha: effectiveDayNha,
            phong_so: room,
            unit: adminAssignedUnit ?? '',
            room_note: trimmed || null,
          });

        if (insertError) {
          // Fallback: upsert if insert fails (race condition)
          const { error: upsertError } = await supabase
            .from('room_units')
            .upsert(
              {
                ktx,
                day_nha: effectiveDayNha,
                phong_so: room,
                unit: adminAssignedUnit ?? '',
                room_note: trimmed || null,
              },
              { onConflict: 'ktx,day_nha,phong_so' }
            );
          if (upsertError) {
            throw new Error(`Lỗi lưu ghi chú: ${upsertError.message}`);
          }
        }
      }

      console.log('[RoomDrawer] ✅ Đã lưu ghi chú thành công!', { ktx, day_nha: effectiveDayNha, phong_so: room, room_note: trimmed || null });

      // Update state immediately (optimistic)
      onRoomNoteUpdated?.(trimmed || null);
      setNoteSuccess(true);
      setTimeout(() => setNoteSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[RoomDrawer] ❌ Lỗi lưu ghi chú:', msg);
      setNoteError(msg || 'Lỗi lưu ghi chú — vui lòng thử lại');
    } finally {
      setSavingNote(false);
    }
  }, [ktx, room, noteInput, adminAssignedUnit, resolveEffectiveDayNha, onRoomNoteUpdated]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-[#1F2937] border-l border-gray-700/80 text-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/80 bg-gray-900/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              {building} — Phòng {room}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 font-tabular">
              {workers.length} công nhân đang lưu trú
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Room Note section */}
        {isAdmin && (
          <div className="px-5 py-3 border-b border-gray-700/80 bg-amber-950/20">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={13} className="text-amber-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-amber-300">Ghi chú phòng</span>
              {loadingNote && <span className="text-[10px] text-amber-400/70 ml-auto">Đang tải...</span>}
            </div>
            <textarea
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              placeholder="Điền thông tin tự do: loại đơn vị, chú thích đặc biệt, tên phòng..."
              rows={3}
              className="w-full text-xs border border-gray-700 rounded-xl px-3 py-2 bg-gray-900/80 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50 resize-none"
              disabled={savingNote || loadingNote}
            />
            <div className="flex items-center justify-between mt-2">
              <div>
                {noteError && <p className="text-xs text-rose-400">{noteError}</p>}
                {noteSuccess && (
                  <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <span>✓</span> Đã lưu ghi chú thành công!
                  </p>
                )}
              </div>
              <button
                onClick={handleSaveRoomNote}
                disabled={savingNote || loadingNote}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-md shadow-amber-500/20"
              >
                {savingNote ? 'Đang lưu...' : 'Lưu ghi chú'}
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-b border-gray-700/60 bg-gray-900/40 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />Đủ hồ sơ</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" />Thiếu CCCD/SĐT</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Chưa phân phòng</span>
        </div>

        {/* Worker list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {workers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-3">
                <Users size={28} className="text-gray-500" />
              </div>
              <p className="text-sm font-bold text-white">Phòng trống</p>
              <p className="text-xs text-gray-400 mt-1">Chưa có công nhân nào được xếp vào phòng này</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {workers.map((w, idx) => {
                const soNgay = calcSoNgay(w.ngayVaoKTX, w.ngayRaKTX);
                return (
                  <div key={w.id} className="px-5 py-3.5 hover:bg-gray-750/70 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                        <span className="text-xs text-gray-500 w-5 text-right font-tabular">{idx + 1}</span>
                        <StatusDot worker={w} />
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">
                          {w.hoVaTen.split(' ').pop()?.charAt(0) ?? '?'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-white whitespace-nowrap truncate">{w.hoVaTen}</p>
                          {w.tieuDoan && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap shrink-0">
                              TD {w.tieuDoan}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-tabular whitespace-nowrap truncate">{w.maNV ? `#${w.maNV}` : 'Chưa có mã NV'}</p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          {w.soDienThoai && (
                            <span className="flex items-center gap-1 text-gray-300 font-tabular whitespace-nowrap">
                              <Phone size={11} className="text-gray-400 shrink-0" />{w.soDienThoai}
                            </span>
                          )}
                          {w.cccd && (
                            <span className="flex items-center gap-1 text-gray-400 font-tabular whitespace-nowrap">
                              <CreditCard size={11} className="shrink-0" />{w.cccd.slice(0,3)}****{w.cccd.slice(-3)}
                            </span>
                          )}
                          {w.hoKhauTinh && (
                            <span className="flex items-center gap-1 text-gray-400 whitespace-nowrap">
                              <MapPin size={11} className="shrink-0" />{w.hoKhauTinh}
                            </span>
                          )}
                          {soNgay !== null && (
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold font-tabular whitespace-nowrap">
                              <Calendar size={11} className="text-emerald-500 shrink-0" />{soNgay} ngày
                            </span>
                          )}
                        </div>
                        {w.toTruong && (
                          <p className="text-xs text-gray-400 mt-1">Tổ trưởng: {w.toTruong}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
