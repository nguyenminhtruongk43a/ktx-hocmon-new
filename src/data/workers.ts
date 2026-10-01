import { normalizeCccd, roomKey } from '@/lib/normalize';

export interface Worker {
  id: string;
  stt: number;
  hoVaTen: string;
  maNV: string;
  tieuDoan: string;
  ktx: string;
  day: string;
  phongSo: string;
  giuong: string;
  donVi: string;
  gioiTinh: string;
  ngaySinh: string;
  soDienThoai: string;
  cccd: string;
  hoKhauTinh: string;
  toTruong: string;
  sdtToTruong: string;
  ngayVaoKTX: string;
  ngayRaKTX?: string;
  ghiChu: string;
  khoaTraCuu: string;
  avatar?: string;
  queQuan?: string;
  tamTruStatus?: 'registered' | 'unregistered';
}

export function createEmptyWorker(overrides: Partial<Worker> = {}): Worker {
  return {
    id: '',
    stt: 0,
    hoVaTen: '',
    maNV: '',
    tieuDoan: '',
    ktx: '',
    day: '',
    phongSo: '',
    giuong: '',
    donVi: '',
    gioiTinh: '',
    ngaySinh: '',
    soDienThoai: '',
    cccd: '',
    hoKhauTinh: '',
    toTruong: '',
    sdtToTruong: '',
    ngayVaoKTX: '',
    ghiChu: '',
    khoaTraCuu: '',
    tamTruStatus: 'unregistered',
    ...overrides,
  };
}

/** Offline fallback used only when the Supabase `workers` table is unreachable. */
export const WORKERS: Worker[] = [
  createEmptyWorker({ id: 'w-001', stt: 1, hoVaTen: 'Nguyễn Văn A', maNV: 'NV001', tieuDoan: '1', ktx: 'KTX 1', day: 'Dãy 1', phongSo: '101', donVi: 'XD', gioiTinh: 'Nam' }),
  createEmptyWorker({ id: 'w-002', stt: 2, hoVaTen: 'Trần Thị B', maNV: 'NV002', tieuDoan: '1', ktx: 'KTX 1', day: 'Dãy 1', phongSo: '101', donVi: 'ME', gioiTinh: 'Nữ' }),
];

export const ROOM_CAPACITY = 20;
export const BUILDINGS = ['Dãy 1', 'Dãy 2', 'Dãy 3', 'Dãy 4'];
export const ROOMS = ['1', '2', '3', '4', '5', '6'];
export const PLATOONS = ['1', '2', '3', '8', '111', '113'];

const naturalCollator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
export function compareNatural(a: string, b: string): number {
  return naturalCollator.compare(a, b);
}
export const compareKtxNames = compareNatural;

function uniqueSorted(values: Iterable<string | undefined>): string[] {
  const set = new Set<string>();
  for (const v of values) if (v) set.add(v);
  return [...set].sort(compareNatural);
}

export function getUniqueKTX(workers: Worker[] = WORKERS): string[] {
  return uniqueSorted(workers.map(w => w.ktx));
}

export function getUniqueBuildings(workers: Worker[] = WORKERS): string[] {
  return uniqueSorted(workers.map(w => w.day));
}

export function getUniqueRooms(workers: Worker[] = WORKERS, day?: string): string[] {
  const list = day ? workers.filter(w => w.day === day) : workers;
  return uniqueSorted(list.map(w => w.phongSo));
}

export function getUniquePlatoons(workers: Worker[] = WORKERS): string[] {
  return uniqueSorted(workers.map(w => w.tieuDoan));
}

export function getUniqueBuildingKeys(workers: Worker[] = WORKERS): string[] {
  return uniqueSorted(workers.filter(w => w.day).map(w => `${w.ktx}||${w.day}`));
}

export function countUniqueBuildings(workers: Worker[] = WORKERS): number {
  return getUniqueBuildingKeys(workers).length;
}

export interface KtxOccupancy {
  ktx: string;
  rooms: number;
  capacity: number;
  occupied: number;
  vacant: number;
  overflow: number;
  fillRate: number;
}

/**
 * Builds per-KTX occupancy stats from whatever KTX names exist in the data,
 * so newly added dormitories appear without code changes.
 * Capacity = distinct (Dãy, Phòng) pairs in that KTX × roomCapacity.
 */
export function aggregateKtxOccupancy(workers: Worker[], roomCapacity: number = ROOM_CAPACITY): KtxOccupancy[] {
  const buckets = new Map<string, { rooms: Set<string>; occupied: number }>();
  for (const w of workers) {
    if (!w.ktx) continue;
    let bucket = buckets.get(w.ktx);
    if (!bucket) {
      bucket = { rooms: new Set(), occupied: 0 };
      buckets.set(w.ktx, bucket);
    }
    if (w.day && w.phongSo) {
      bucket.rooms.add(`${w.day}||${w.phongSo}`);
      bucket.occupied++;
    }
  }
  return [...buckets.entries()]
    .map(([ktx, { rooms, occupied }]) => {
      const capacity = rooms.size * roomCapacity;
      return {
        ktx,
        rooms: rooms.size,
        capacity,
        occupied,
        vacant: Math.max(0, capacity - occupied),
        overflow: Math.max(0, occupied - capacity),
        fillRate: capacity > 0 ? occupied / capacity : 0,
      };
    })
    .sort((a, b) => compareNatural(a.ktx, b.ktx));
}

/** Single-pass index of workers by room key, for O(1) room lookups in large grids. */
export function indexWorkersByRoom(workers: Worker[]): Map<string, Worker[]> {
  const map = new Map<string, Worker[]>();
  for (const w of workers) {
    if (!w.ktx || !w.day || !w.phongSo) continue;
    const key = roomKey(w.ktx, w.day, w.phongSo);
    const list = map.get(key);
    if (list) list.push(w);
    else map.set(key, [w]);
  }
  return map;
}

export type ProfileStatus = 'full' | 'missing_cccd_sdt' | 'no_room';

export function matchesProfileStatus(w: Worker, status: string): boolean {
  if (status === 'no_room') return !w.ktx || !w.day || !w.phongSo;
  if (status === 'missing_cccd_sdt') return !w.cccd || !w.soDienThoai;
  if (status === 'full') return Boolean(w.ktx && w.day && w.phongSo && w.cccd && w.soDienThoai);
  return true;
}

/** Most pressing status first: room assignment, then identity documents. */
export function getProfileStatus(w: Worker): ProfileStatus {
  if (matchesProfileStatus(w, 'no_room')) return 'no_room';
  if (matchesProfileStatus(w, 'missing_cccd_sdt')) return 'missing_cccd_sdt';
  return 'full';
}

export function isValidCccd(cccd: string): boolean {
  return /^\d{12}$/.test(normalizeCccd(cccd));
}

export function calcSoNgay(startStr?: string, endStr?: string): number {
  if (!startStr) return 0;
  const start = new Date(startStr).getTime();
  if (Number.isNaN(start)) return 0;
  const endParsed = endStr ? new Date(endStr).getTime() : NaN;
  const end = Number.isNaN(endParsed) ? Date.now() : endParsed;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

export function getworkersByRoom(day: string, phongSo: string): Worker[] {
  return WORKERS.filter(w => w.day === day && w.phongSo === phongSo);
}

export function getworkersByBuilding(day: string): Worker[] {
  return WORKERS.filter(w => w.day === day);
}
