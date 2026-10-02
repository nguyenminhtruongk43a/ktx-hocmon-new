'use client';
import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import type { FilterState } from './WorkerManagementClient';
import { Worker, getUniqueKTX, getUniqueBuildings, getUniqueRooms, getUniquePlatoons } from '@/data/workers';

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  workers: Worker[];
}

export default function WorkerFilters({ filters, onChange, workers }: Props) {
  const set = (key: keyof FilterState, val: string | boolean) =>
    onChange({ ...filters, [key]: val });

  const ktxList = getUniqueKTX(workers);
  const buildingList = getUniqueBuildings(workers);
  const roomList = getUniqueRooms(workers, filters.building || undefined);
  const platoonList = getUniquePlatoons(workers);
  const toTruongList = [...new Set(workers.map(w => w.toTruong).filter(Boolean))].sort();

  const hasActive = filters.search || filters.ktx || filters.building || filters.room ||
    filters.platoon || filters.profileStatus || filters.toTruong || filters.province || filters.tamTruStatus;

  return (
    <div className="bg-[#1F2937] border border-gray-700/60 rounded-2xl p-4 sm:p-5 shadow-xl mb-5 space-y-4">
      {/* ── Spacious Top Search Bar ── */}
      <div className="relative w-full">
        <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Search size={14} className="text-blue-400" />
          <span>Tìm kiếm nhanh công nhân</span>
        </label>
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Nhập họ tên, mã nhân viên, số CCCD, số điện thoại, số phòng..."
            value={filters.search}
            onChange={e => set('search', e.target.value)}
            className="w-full pl-11 pr-10 py-3 text-sm bg-gray-800 border border-gray-700 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-inner transition-all"
          />
          {filters.search && (
            <button
              onClick={() => set('search', '')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Multi-attribute Filter Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3 items-end pt-2 border-t border-gray-750">
        {/* KTX */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">KTX</label>
          <select
            value={filters.ktx}
            onChange={e => set('ktx', e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
          >
            <option value="">Tất cả KTX</option>
            {ktxList.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {/* Building/Dãy */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Dãy</label>
          <select
            value={filters.building}
            onChange={e => { set('building', e.target.value); onChange({ ...filters, building: e.target.value, room: '' }); }}
            className="bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
          >
            <option value="">Tất cả dãy</option>
            {buildingList.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Room */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phòng</label>
          <select
            value={filters.room}
            onChange={e => set('room', e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
          >
            <option value="">Tất cả phòng</option>
            {roomList.map(r => <option key={r} value={r}>Phòng {r}</option>)}
          </select>
        </div>

        {/* Platoon */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tiểu đoàn</label>
          <select
            value={filters.platoon}
            onChange={e => set('platoon', e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
          >
            <option value="">Tất cả TD</option>
            {platoonList.map(p => <option key={p} value={p}>TD {p}</option>)}
            <option value="__none__">Chưa phân</option>
          </select>
        </div>

        {/* Tổ Trưởng filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tổ Trưởng</label>
          <select
            value={filters.toTruong}
            onChange={e => set('toTruong', e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
          >
            <option value="">Tất cả Tổ Trưởng</option>
            {toTruongList.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Profile status */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Hồ sơ</label>
          <select
            value={filters.profileStatus}
            onChange={e => set('profileStatus', e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
          >
            <option value="">Tất cả</option>
            <option value="full">✅ Đủ hồ sơ</option>
            <option value="missing_cccd_sdt">🔴 Thiếu CCCD/SĐT</option>
            <option value="no_room">🟡 Chưa phòng</option>
          </select>
        </div>

        {/* Tạm trú status */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tạm trú</label>
          <select
            value={filters.tamTruStatus}
            onChange={e => set('tamTruStatus', e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
          >
            <option value="">Tất cả</option>
            <option value="registered">🟢 Đã ĐK</option>
            <option value="unregistered">🟠 Chưa ĐK</option>
          </select>
        </div>

        {/* Province / Reset */}
        <div className="flex flex-col gap-1">
          {hasActive ? (
            <button
              onClick={() => onChange({ search: '', ktx: '', building: '', room: '', platoon: '', profileStatus: '', toTruong: '', province: '', tamTruStatus: '' })}
              className="flex items-center justify-center gap-1 text-xs text-rose-300 hover:text-white px-2.5 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 hover:bg-rose-500/30 transition-all font-semibold"
            >
              <X size={13} /> Xóa lọc
            </button>
          ) : (
            <input
              type="text"
              placeholder="Tỉnh/TP..."
              value={filters.province}
              onChange={e => set('province', e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-400 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
