export interface Worker {
  id: string;
  stt: number;
  hoVaTen: string;
  maNV: string;
  tieuDoan: string;
  ktx: string;
  day: string;
  phongSo: string;
  donVi: string;
  gioiTinh: string;
  ngaySinh?: string;
  queQuan?: string;
  cccd?: string;
}

// 💥 DÁN DANH SÁCH CÔNG NHÂN THỰC TẾ CỦA BẠN VÀO MẢNG NÀY 💥
export const WORKERS: Worker[] = [
  {
    id: 'w-001',
    stt: 1,
    hoVaTen: 'Nguyễn Văn A',
    maNV: 'NV001',
    tieuDoan: '1',
    ktx: 'KTX 1',
    day: 'Dãy 1',
    phongSo: '101',
    donVi: 'XD',
    gioiTinh: 'Nam',
  },
  {
    id: 'w-002',
    stt: 2,
    hoVaTen: 'Trần Thị B',
    maNV: 'NV002',
    tieuDoan: '1',
    ktx: 'KTX 1',
    day: 'Dãy 1',
    phongSo: '101',
    donVi: 'ME',
    gioiTinh: 'Nữ',
  },
];

export const ROOM_CAPACITY = 20;
export const BUILDINGS = ['Dãy 1', 'Dãy 2', 'Dãy 3', 'Dãy 4'];
export const ROOMS = ['1', '2', '3', '4', '5', '6'];
export const PLATOONS = ['1', '2', '3', '8', '111', '113'];

export function compareKtxNames(a: string, b: string): number {
  return a.localeCompare(b, 'vi', { numeric: true, sensitivity: 'base' });
}

export function getUniqueKTX(workers: Worker[] = WORKERS): string[] {
  return [...new Set(workers.map(w => w.ktx?.trim()).filter(Boolean) as string[])].sort(compareKtxNames);
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
 * so newly added dormitories (KTX 3, 4, 5, ...) appear without code changes.
 * Capacity = number of distinct (Dãy, Phòng) pairs seen in that KTX × ROOM_CAPACITY.
 */
export function aggregateKtxOccupancy(workers: Worker[], roomCapacity: number = ROOM_CAPACITY): KtxOccupancy[] {
  const buckets = new Map<string, { rooms: Set<string>; occupied: number }>();

  for (const w of workers) {
    const ktx = w.ktx?.trim();
    if (!ktx) continue;
    let bucket = buckets.get(ktx);
    if (!bucket) {
      bucket = { rooms: new Set(), occupied: 0 };
      buckets.set(ktx, bucket);
    }
    if (w.day && w.phongSo) {
      bucket.rooms.add(`${w.day.trim()}||${w.phongSo.trim()}`);
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
    .sort((a, b) => compareKtxNames(a.ktx, b.ktx));
}

export function getUniqueBuildingKeys(workers: Worker[] = WORKERS): string[] {
  const keys = new Set<string>();
  workers.forEach(w => {
    if (!w.day) return;
    keys.add(`${w.ktx || ''}||${w.day}`);
  });
  return [...keys].sort();
}

export function countUniqueBuildings(workers: Worker[] = WORKERS): number {
  return getUniqueBuildingKeys(workers).length;
}

export function getUniqueRooms(workers: Worker[] = WORKERS, day?: string): string[] {
  const list = day ? workers.filter(w => w.day === day) : workers;
  return [...new Set(list.map(w => w.phongSo).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
}

export function getUniquePlatoons(workers: Worker[] = WORKERS): string[] {
  return [...new Set(workers.map(w => w.tieuDoan).filter(Boolean))].sort();
}

export function getworkersByRoom(day: string, phongSo: string): Worker[] {
  return WORKERS.filter(w => w.day === day && w.phongSo === phongSo);
}

export function getworkersByBuilding(day: string): Worker[] {
  return WORKERS.filter(w => w.day === day);
}

export function getProfileStatus(w: Worker): 'DU' | 'THIEU' {
  return w.hoVaTen && w.maNV ? 'DU' : 'THIEU';
}

export function calcSoNgay(dateStr?: string): number {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}export function getUniqueBuildings(workers: Worker[] = WORKERS): string[] {
  const list = workers || WORKERS;
  return [...new Set(list.map(w => w.day).filter(Boolean))].sort();
}
