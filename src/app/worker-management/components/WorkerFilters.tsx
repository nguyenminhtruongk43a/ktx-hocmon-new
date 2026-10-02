'use client';
import React from 'react';
import { Search, X } from 'lucide-react';
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

  // Unique Tổ Trưởng list from workers
  const toTruongList = [...new Set(workers.map(w => w.toTruong).filter(Boolean))].sort();

  const hasActive = filters.search || filters.ktx || filters.building || filters.room ||
    filters.platoon || filters.profileStatus || filters.toTruong || filters.province || filters.tamTruStatus;

  return (
    <div className="card p-3 sm:p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:flex xl:flex-wrap gap-2.5 sm:gap-3 items-end">
        {/* Search */}
        <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 xl:flex-1 min-w-0 xl:min-w-[200px] form-group">
          <label className="label-field">Tìm kiếm</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tên, mã NV, CCCD, SĐT..."
              value={filters.search}
              onChange={e => set('search', e.target.value)}
              className="input-field pl-8 w-full"
            />
          </div>
        </div>

        {/* KTX */}
        <div className="form-group min-w-0">
          <label className="label-field">KTX</label>
          <select value={filters.ktx} onChange={e => set('ktx', e.target.value)} className="input-field w-full">
            <option value="">Tất cả KTX</option>
            {ktxList.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {/* Building/Dãy */}
        <div className="form-group min-w-0">
          <label className="label-field">Dãy nhà</label>
          <select value={filters.building} onChange={e => { set('building', e.target.value); onChange({ ...filters, building: e.target.value, room: '' }); }} className="input-field w-full">
            <option value="">Tất cả dãy</option>
            {buildingList.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Room */}
        <div className="form-group min-w-0">
          <label className="label-field">Phòng số</label>
          <select value={filters.room} onChange={e => set('room', e.target.value)} className="input-field w-full">
            <option value="">Tất cả phòng</option>
            {roomList.map(r => <option key={r} value={r}>Phòng {r}</option>)}
          </select>
        </div>

        {/* Platoon */}
        <div className="form-group min-w-0">
          <label className="label-field">Tiểu đoàn</label>
          <select value={filters.platoon} onChange={e => set('platoon', e.target.value)} className="input-field w-full">
            <option value="">Tất cả TD</option>
            {platoonList.map(p => <option key={p} value={p}>TD {p}</option>)}
            <option value="__none__">Chưa phân</option>
          </select>
        </div>

        {/* Tổ Trưởng filter */}
        <div className="form-group min-w-0">
          <label className="label-field">Tổ Trưởng</label>
          <select value={filters.toTruong} onChange={e => set('toTruong', e.target.value)} className="input-field w-full">
            <option value="">Tất cả Tổ Trưởng</option>
            {toTruongList.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Profile status */}
        <div className="form-group min-w-0">
          <label className="label-field">Trạng thái hồ sơ</label>
          <select value={filters.profileStatus} onChange={e => set('profileStatus', e.target.value)} className="input-field w-full">
            <option value="">Tất cả</option>
            <option value="full">✅ Đủ hồ sơ</option>
            <option value="missing_cccd_sdt">🔴 Thiếu CCCD/SĐT</option>
            <option value="no_room">🟡 Chưa phân phòng</option>
          </select>
        </div>

        {/* Tạm trú status */}
        <div className="form-group min-w-0">
          <label className="label-field">Tạm trú</label>
          <select value={filters.tamTruStatus} onChange={e => set('tamTruStatus', e.target.value)} className="input-field w-full">
            <option value="">Tất cả</option>
            <option value="registered">🟢 Đã đăng ký</option>
            <option value="unregistered">🟠 Chưa đăng ký</option>
          </select>
        </div>

        {/* Province */}
        <div className="form-group min-w-0">
          <label className="label-field">Tỉnh/TP</label>
          <input
            type="text"
            placeholder="Tỉnh/TP..."
            value={filters.province}
            onChange={e => set('province', e.target.value)}
            className="input-field w-full"
          />
        </div>

        {/* Clear */}
        {hasActive && (
          <div className="form-group col-span-1 sm:col-span-2 md:col-span-1">
            <button
              onClick={() => onChange({ search: '', ktx: '', building: '', room: '', platoon: '', profileStatus: '', toTruong: '', province: '', tamTruStatus: '' })}
              className="btn-ghost flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full py-2.5 border border-border rounded-lg"
            >
              <X size={14} />Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
