'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  UserCheck, Users, Shield, CheckCircle2, Search,
  Phone, Mail, ArrowRight, UserPlus, X,
  Calendar, Check, Plus
} from 'lucide-react';
import {
  DutyKtx,
  DutyAssignment,
  SpecialistWithDuty,
  DEFAULT_SPECIALISTS_DUTY,
  COMMON_KTX_OPTIONS,
  loadSavedDutyMap,
  saveDutyMap
} from '@/lib/dutyRoster';

interface ExecutiveSpecialistsCardProps {
  specialists?: {
    id: string;
    name: string;
    email?: string;
    role: 'admin' | 'staff';
    assignedBlocks?: string[];
  }[];
  onDutyRosterChange?: (specialists: SpecialistWithDuty[]) => void;
}

export default function ExecutiveSpecialistsCard({
  specialists: propsSpecialists,
  onDutyRosterChange,
}: ExecutiveSpecialistsCardProps) {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [dutyMap, setDutyMap] = useState<Record<string, DutyAssignment>>({});
  const [showModal, setShowModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load saved duty assignments on client mount
  useEffect(() => {
    const saved = loadSavedDutyMap();
    setDutyMap(saved);
  }, []);

  // Compute merged list of specialists with dynamic duty roster
  const mergedSpecialists = useMemo<SpecialistWithDuty[]>(() => {
    const baseList: SpecialistWithDuty[] = (propsSpecialists && propsSpecialists.length > 0)
      ? propsSpecialists.map((p, idx) => {
          const defaultRef = DEFAULT_SPECIALISTS_DUTY[idx % DEFAULT_SPECIALISTS_DUTY.length];
          return {
            id: p.id,
            name: p.name,
            email: p.email,
            phone: defaultRef?.phone ?? '0988 123 456',
            role: p.role,
            assignedBlocks: p.role === 'admin' ? [] : (p.assignedBlocks ?? []),
            dutyKtx: defaultRef?.dutyKtx ?? 'KTX 1',
            status: defaultRef?.status ?? 'on_duty',
          };
        })
      : DEFAULT_SPECIALISTS_DUTY;

    // Apply dynamic duty overrides from dutyMap
    return baseList.map(sp => {
      const override = dutyMap[sp.id];
      if (override) {
        return {
          ...sp,
          dutyKtx: override.dutyKtx,
          status: override.status,
        };
      }
      return sp;
    });
  }, [propsSpecialists, dutyMap]);

  // Notify parent if changed
  useEffect(() => {
    if (onDutyRosterChange) {
      onDutyRosterChange(mergedSpecialists);
    }
  }, [mergedSpecialists, onDutyRosterChange]);

  const updateDuty = useCallback((
    id: string,
    dutyKtx: string,
    specialistName?: string
  ) => {
    const isOff = dutyKtx === 'Nghỉ' || !dutyKtx.trim();
    const targetStatus: 'on_duty' | 'off_duty' = isOff ? 'off_duty' : 'on_duty';
    const targetKtx: string = isOff ? 'Nghỉ' : dutyKtx.trim();

    setDutyMap(prev => {
      const updatedItem: DutyAssignment = {
        dutyKtx: targetKtx,
        status: targetStatus,
      };

      const nextMap = { ...prev, [id]: updatedItem };
      saveDutyMap(nextMap);
      return nextMap;
    });

    const actionText = isOff ? 'Chuyển sang Nghỉ ca' : `Phân công trực ${targetKtx}`;
    setToastMessage(`Đã cập nhật: ${specialistName || 'Nhân sự'} → ${actionText}`);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleBatchDuty = (targetKtx: string) => {
    const isOff = targetKtx === 'Nghỉ';
    const targetStatus: 'on_duty' | 'off_duty' = isOff ? 'off_duty' : 'on_duty';

    setDutyMap(() => {
      const nextMap: Record<string, DutyAssignment> = {};
      mergedSpecialists.forEach(sp => {
        nextMap[sp.id] = {
          dutyKtx: targetKtx,
          status: targetStatus,
        };
      });
      saveDutyMap(nextMap);
      return nextMap;
    });

    setToastMessage(`Đã cập nhật toàn bộ: ${isOff ? 'Tất cả nghỉ ca' : `Tất cả trực ${targetKtx}`}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const onDutyList = useMemo(() => mergedSpecialists.filter(s => s.status === 'on_duty' && s.dutyKtx !== 'Nghỉ'), [mergedSpecialists]);
  const offDutyList = useMemo(() => mergedSpecialists.filter(s => s.status === 'off_duty' || s.dutyKtx === 'Nghỉ'), [mergedSpecialists]);

  // Unique KTX values currently in use
  const activeKtxList = useMemo(() => {
    const set = new Set<string>();
    mergedSpecialists.forEach(s => {
      if (s.dutyKtx && s.dutyKtx !== 'Nghỉ') set.add(s.dutyKtx);
    });
    return Array.from(set);
  }, [mergedSpecialists]);

  // Filtered list for the modal dialog
  const modalFilteredList = useMemo(() => {
    return mergedSpecialists.filter(sp => {
      const isOnDuty = sp.status === 'on_duty' && sp.dutyKtx !== 'Nghỉ';

      if (activeFilter === 'on_duty' && !isOnDuty) return false;
      if (activeFilter === 'off_duty' && isOnDuty) return false;
      if (activeFilter !== 'all' && activeFilter !== 'on_duty' && activeFilter !== 'off_duty') {
        if (sp.dutyKtx !== activeFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = sp.name.toLowerCase().includes(q);
        const matchEmail = sp.email?.toLowerCase().includes(q);
        const matchDuty = sp.dutyKtx.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDuty) return false;
      }

      return true;
    });
  }, [mergedSpecialists, activeFilter, searchQuery]);

  return (
    <>
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 bg-gray-900 border border-emerald-500/50 text-white rounded-xl shadow-2xl animate-fade-in backdrop-blur-md max-w-[90vw]">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold whitespace-normal break-words">{toastMessage}</span>
        </div>
      )}

      {/* ── Main Executive Card on Dashboard ── */}
      <div className="rounded-2xl border border-gray-700/60 bg-[#1F2937] p-3.5 sm:p-5 shadow-xl transition-all duration-200 hover:border-blue-500/40 hover:shadow-2xl flex flex-col justify-between group w-full">
        <div>
          {/* Card Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 group-hover:text-blue-300 transition-colors block">
                Danh Sách Các Chuyên Viên
              </span>
              <div className="flex items-baseline gap-2 sm:gap-2.5 flex-wrap">
                <p className="text-2xl sm:text-4xl font-extrabold font-tabular tracking-tight text-white">
                  {mergedSpecialists.length}
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    {onDutyList.length} trực ban hôm nay
                  </span>
                  {offDutyList.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-gray-700/60 text-gray-400 border border-gray-600/40">
                      {offDutyList.length} nghỉ ca
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Phân công trực ban (Đang trực: {activeKtxList.length > 0 ? activeKtxList.join(', ') : 'Chưa phân công'})
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              title="Mở bảng phân công trực ban theo ngày"
              className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center flex-shrink-0 border bg-gradient-to-tr from-indigo-500/15 to-blue-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25 hover:border-indigo-400 transition-all cursor-pointer shadow-md"
            >
              <UserCheck size={22} className="sm:w-[26px] sm:h-[26px]" />
            </button>
          </div>

          {/* Quick List (Clean view with Full Name Display without truncation) */}
          <div className="space-y-2 sm:space-y-2.5 mt-3 pt-2.5 border-t border-gray-700/60">
            {mergedSpecialists.slice(0, 4).map((sp) => {
              const isAdminUser = sp.role === 'admin';
              const isOnDuty = sp.status === 'on_duty' && sp.dutyKtx !== 'Nghỉ';

              return (
                <div
                  key={sp.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl bg-gray-800/80 border border-gray-700/50 p-2.5 sm:p-3 hover:bg-gray-750/90 hover:border-gray-600 transition-all duration-150 gap-2 sm:gap-3 w-full"
                >
                  {/* Left: Avatar & Full Name without truncation */}
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="relative flex-shrink-0 mt-0.5 sm:mt-0">
                      <div className={`w-8 h-8 rounded-lg border text-xs font-bold flex items-center justify-center ${
                        isAdminUser
                          ? 'bg-purple-600/25 border-purple-500/40 text-purple-300'
                          : 'bg-blue-600/25 border-blue-500/40 text-blue-300'
                      }`}>
                        {sp.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${
                        isOnDuty ? 'bg-emerald-400' : 'bg-gray-500'
                      }`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-gray-100 whitespace-normal break-words leading-tight">
                          {sp.name}
                        </span>
                        {isAdminUser ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold shrink-0">
                            Quản trị viên
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold shrink-0">
                            Chuyên viên
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-gray-400 whitespace-normal break-words font-tabular mt-0.5">
                        {sp.phone || sp.email || 'Nhân sự vận hành'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Dynamic KTX Duty Selector / Badge */}
                  <div className="flex items-center justify-between sm:justify-end gap-1.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-gray-750/60 flex-shrink-0">
                    {isAdmin ? (
                      <select
                        value={isOnDuty ? sp.dutyKtx : 'Nghỉ'}
                        onChange={(e) => updateDuty(sp.id, e.target.value, sp.name)}
                        className={`text-[11px] font-bold py-1 px-2.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                          isOnDuty
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-gray-750 text-gray-400 border-gray-650 hover:bg-gray-700'
                        }`}
                      >
                        {COMMON_KTX_OPTIONS.map(ktx => (
                          <option key={ktx} value={ktx} className="bg-gray-800 text-white">
                            Trực {ktx}
                          </option>
                        ))}
                        <option value="Nghỉ" className="bg-gray-800 text-gray-400">
                          Nghỉ ca
                        </option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold border ${
                        isOnDuty
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-gray-750 text-gray-400 border-gray-650'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                        <span>{isOnDuty ? `Trực ${sp.dutyKtx}` : 'Nghỉ ca'}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Action Footer */}
        <div className="mt-3.5 pt-3 border-t border-gray-700/60 flex items-center justify-between gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors group/btn"
          >
            <span>Phân công trực ban ({mergedSpecialists.length})</span>
            <ArrowRight size={13} className="group-hover/btn:translate-x-1 transition-transform shrink-0" />
          </button>

          <button
            onClick={() => router.push('/user-management')}
            className="text-[11px] font-semibold text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors shrink-0"
          >
            <span>Tài khoản</span>
          </button>
        </div>
      </div>

      {/* ── Comprehensive Duty Roster Modal (Cuộn Tự Nhiên & Compact Grid Layout) ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm flex items-center justify-center overflow-y-auto">
          <div className="bg-[#1F2937] border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col my-auto text-gray-100 overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-gray-700/80 bg-gray-800/95 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Calendar size={20} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-lg font-bold text-white tracking-tight whitespace-normal break-words">
                      Phân Công Trực Ban Chuyên Viên Theo Ngày
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full shrink-0">
                      {onDutyList.length}/{mergedSpecialists.length} Trực ban
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                    Chỉ định khu vực KTX trực ban linh hoạt hôm nay
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Compact Grid Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 sm:p-3 bg-gray-850/60 border-b border-gray-700/60 shrink-0">
              <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-2 sm:p-2.5">
                <p className="text-[10px] sm:text-[11px] font-semibold text-blue-300 uppercase">Tổng nhân sự</p>
                <p className="text-base sm:text-lg font-bold text-blue-400 font-tabular mt-0.5">{mergedSpecialists.length} người</p>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2 sm:p-2.5">
                <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-300 uppercase">Đang trực ban</p>
                <p className="text-base sm:text-lg font-bold text-emerald-400 font-tabular mt-0.5">{onDutyList.length} người</p>
              </div>

              <div className="bg-gray-800/80 border border-gray-700/60 rounded-xl p-2 sm:p-2.5">
                <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase">Nghỉ ca</p>
                <p className="text-base sm:text-lg font-bold text-gray-300 font-tabular mt-0.5">{offDutyList.length} người</p>
              </div>

              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-2 sm:p-2.5">
                <p className="text-[10px] sm:text-[11px] font-semibold text-indigo-300 uppercase">Khu vực có trực</p>
                <p className="text-base sm:text-lg font-bold text-indigo-400 font-tabular mt-0.5">
                  {activeKtxList.length} KTX
                </p>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="p-2.5 sm:p-3 border-b border-gray-700/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              <div className="relative w-full max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, email, KTX trực..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 text-xs bg-gray-800 text-gray-100 placeholder-gray-400 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs & Batch Admin Actions */}
              <div className="flex items-center gap-1.5 flex-wrap justify-between sm:justify-end">
                <div className="flex rounded-lg bg-gray-800 p-0.5 border border-gray-700">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                      activeFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Tất cả ({mergedSpecialists.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('on_duty')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                      activeFilter === 'on_duty'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Đang trực ({onDutyList.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('off_duty')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                      activeFilter === 'off_duty'
                        ? 'bg-gray-700 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Nghỉ ({offDutyList.length})
                  </button>
                </div>

                {/* Batch Actions */}
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleBatchDuty('KTX 1')}
                      className="px-2 py-1 text-xs font-semibold rounded-md bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
                    >
                      Trực KTX 1
                    </button>
                    <button
                      onClick={() => handleBatchDuty('Nghỉ')}
                      className="px-2 py-1 text-xs font-semibold rounded-md bg-gray-750 text-gray-300 border border-gray-650 hover:bg-gray-700 transition-colors"
                    >
                      Nghỉ hết
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Specialist List with Full Natural Text Display */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-2.5 scrollbar-thin">
              {modalFilteredList.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Users size={28} className="mx-auto mb-2 text-gray-500" />
                  <p className="text-xs sm:text-sm font-semibold">Không tìm thấy nhân sự phù hợp</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Thử thay đổi từ khóa hoặc bộ lọc</p>
                </div>
              ) : (
                modalFilteredList.map((sp) => {
                  const isAdminUser = sp.role === 'admin';
                  const isOnDuty = sp.status === 'on_duty' && sp.dutyKtx !== 'Nghỉ';

                  return (
                    <div
                      key={sp.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border transition-all duration-150 gap-3 w-full ${
                        isOnDuty
                          ? 'bg-gray-800/90 border-gray-700/80 hover:border-emerald-500/40'
                          : 'bg-gray-800/40 border-gray-750 hover:border-gray-650 opacity-80'
                      }`}
                    >
                      {/* Left: Full Name & Details without any truncation */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="relative flex-shrink-0 mt-0.5">
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border font-bold text-sm flex items-center justify-center ${
                            isAdminUser
                              ? 'bg-purple-600/25 border-purple-500/40 text-purple-300'
                              : 'bg-blue-600/25 border-blue-500/40 text-blue-300'
                          }`}>
                            {sp.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
                            isOnDuty ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-gray-500'
                          }`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm sm:text-base font-bold text-white whitespace-normal break-words leading-snug">
                              {sp.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                              isAdminUser
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            }`}>
                              {isAdminUser ? 'Quản trị viên' : 'Chuyên viên'}
                            </span>
                          </div>

                          {/* Contact Info without cutting */}
                          <div className="flex items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-300 flex-wrap">
                            {sp.phone && (
                              <span className="flex items-center gap-1 font-tabular">
                                <Phone size={11} className="text-gray-400 shrink-0" />
                                <span>{sp.phone}</span>
                              </span>
                            )}
                            {sp.email && (
                              <span className="flex items-center gap-1 whitespace-normal break-all text-gray-400">
                                <Mail size={11} className="text-gray-400 shrink-0" />
                                <span>{sp.email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Dynamic KTX Duty Selector & Toggle */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-750/70 w-full sm:w-auto shrink-0">
                        <div className="space-y-1 flex-1 sm:flex-initial sm:min-w-[160px]">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            KTX TRỰC HÔM NAY
                          </label>
                          {isAdmin ? (
                            <select
                              value={isOnDuty ? sp.dutyKtx : 'Nghỉ'}
                              onChange={(e) => updateDuty(sp.id, e.target.value, sp.name)}
                              className={`w-full bg-gray-750 border rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer ${
                                isOnDuty
                                  ? 'text-emerald-300 border-emerald-500/40'
                                  : 'text-gray-400 border-gray-650'
                              }`}
                            >
                              {COMMON_KTX_OPTIONS.map(ktx => (
                                <option key={ktx} value={ktx} className="bg-gray-800 text-white">
                                  Trực {ktx}
                                </option>
                              ))}
                              {sp.dutyKtx && !COMMON_KTX_OPTIONS.includes(sp.dutyKtx) && sp.dutyKtx !== 'Nghỉ' && (
                                <option value={sp.dutyKtx} className="bg-gray-800 text-emerald-300">
                                  Trực {sp.dutyKtx}
                                </option>
                              )}
                              <option value="Nghỉ" className="bg-gray-800 text-gray-400">
                                Nghỉ ca
                              </option>
                            </select>
                          ) : (
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              isOnDuty ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-gray-750 text-gray-400 border-gray-650'
                            }`}>
                              {isOnDuty ? `Trực ${sp.dutyKtx}` : 'Nghỉ ca'}
                            </span>
                          )}
                        </div>

                        {/* Quick Toggle Button */}
                        <div className="pt-4 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (isOnDuty) {
                                updateDuty(sp.id, 'Nghỉ', sp.name);
                              } else {
                                updateDuty(sp.id, 'KTX 1', sp.name);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer select-none active:scale-95 ${
                              isOnDuty
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-gray-700 text-gray-300 border-gray-650 hover:bg-gray-650'
                            }`}
                          >
                            {isOnDuty ? 'Đang trực' : 'Bật trực'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-5 py-3 border-t border-gray-700/80 bg-gray-800/95 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2 text-xs text-gray-400 w-full sm:w-auto">
                <Shield size={14} className="text-blue-400 shrink-0" />
                <span>Phân công KTX trực ban được lưu tự động và đồng bộ ngay</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setShowModal(false);
                    router.push('/user-management');
                  }}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-650 text-gray-200 text-xs font-bold border border-gray-600 transition-colors"
                >
                  <UserPlus size={13} />
                  <span>Quản lý tài khoản</span>
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-colors"
                >
                  Hoàn tất
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
