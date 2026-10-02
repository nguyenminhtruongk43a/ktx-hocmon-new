'use client';

export type DutyKtx = string;

export interface DutyAssignment {
  dutyKtx: DutyKtx;
  status: 'on_duty' | 'off_duty';
  note?: string;
}

export interface SpecialistWithDuty {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'staff';
  assignedBlocks: string[];
  dutyKtx: DutyKtx;
  status: 'on_duty' | 'off_duty';
}

export const DUTY_STORAGE_KEY = 'ktx_duty_roster_by_specialist_v4';

export const COMMON_KTX_OPTIONS = ['KTX 1', 'KTX 2', 'KTX 3', 'KTX 4', 'KTX 5'];

export const DEFAULT_SPECIALISTS_DUTY: SpecialistWithDuty[] = [
  {
    id: 'sp-admin-1',
    name: 'Nguyễn Minh Trường',
    email: 'admin@ktx.vn',
    phone: '0988 123 456',
    role: 'admin',
    assignedBlocks: [],
    dutyKtx: 'KTX 1',
    status: 'on_duty',
  },
  {
    id: 'sp-1',
    name: 'Trần Văn Hoàng',
    email: 'hoang.tran@ktx.vn',
    phone: '0912 345 678',
    role: 'staff',
    assignedBlocks: ['KTX 1 - Dãy 1', 'KTX 1 - Dãy 2', 'KTX 1 - Dãy 3'],
    dutyKtx: 'KTX 1',
    status: 'on_duty',
  },
  {
    id: 'sp-2',
    name: 'Lê Thị Thu Thảo',
    email: 'thao.le@ktx.vn',
    phone: '0903 888 999',
    role: 'staff',
    assignedBlocks: ['KTX 1 - Dãy 4', 'KTX 1 - Dãy 5', 'KTX 1 - Dãy 6'],
    dutyKtx: 'KTX 1',
    status: 'on_duty',
  },
  {
    id: 'sp-3',
    name: 'Phạm Đức Anh',
    email: 'anh.pham@ktx.vn',
    phone: '0977 555 333',
    role: 'staff',
    assignedBlocks: ['KTX 2 - Dãy 1', 'KTX 2 - Dãy 2', 'KTX 2 - Dãy 3'],
    dutyKtx: 'KTX 2',
    status: 'on_duty',
  },
  {
    id: 'sp-4',
    name: 'Võ Quốc Huy',
    email: 'huy.vo@ktx.vn',
    phone: '0934 111 222',
    role: 'staff',
    assignedBlocks: ['KTX 2 - Dãy 4', 'KTX 2 - Dãy 5', 'KTX 2 - Dãy 6'],
    dutyKtx: 'KTX 2',
    status: 'on_duty',
  },
  {
    id: 'sp-5',
    name: 'Đặng Ngọc Mai',
    email: 'mai.dang@ktx.vn',
    phone: '0966 777 888',
    role: 'staff',
    assignedBlocks: ['KTX 1 - Dãy 3'],
    dutyKtx: 'KTX 1',
    status: 'on_duty',
  },
  {
    id: 'sp-6',
    name: 'Hoàng Quốc Bảo',
    email: 'bao.hoang@ktx.vn',
    phone: '0945 999 111',
    role: 'staff',
    assignedBlocks: ['KTX 2 - Dãy 2'],
    dutyKtx: 'Nghỉ',
    status: 'off_duty',
  },
  {
    id: 'sp-7',
    name: 'Bùi Thanh Hương',
    email: 'huong.bui@ktx.vn',
    phone: '0918 222 333',
    role: 'staff',
    assignedBlocks: ['KTX 2 - Dãy 5'],
    dutyKtx: 'Nghỉ',
    status: 'off_duty',
  },
];

export function loadSavedDutyMap(): Record<string, DutyAssignment> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DUTY_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading duty roster storage:', err);
    return {};
  }
}

export function saveDutyMap(map: Record<string, DutyAssignment>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DUTY_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Error saving duty roster storage:', err);
  }
}
