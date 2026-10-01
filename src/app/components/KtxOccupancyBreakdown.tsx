'use client';
import React from 'react';
import type { KtxOccupancy } from '@/data/workers';

function getFillTone(rate: number) {
  if (rate > 1) return { bar: 'bg-red-500', text: 'text-red-700' };
  if (rate >= 0.9) return { bar: 'bg-amber-500', text: 'text-amber-700' };
  if (rate >= 0.5) return { bar: 'bg-emerald-500', text: 'text-emerald-700' };
  return { bar: 'bg-blue-500', text: 'text-blue-700' };
}

export default function KtxOccupancyBreakdown({
  items,
  selectedKtx,
  onSelectKtx,
}: {
  items: KtxOccupancy[];
  selectedKtx: string;
  onSelectKtx?: (ktx: string) => void;
}) {
  if (items.length === 0) {
    return <p className="mt-2 text-xs text-muted-foreground">Chưa có dữ liệu KTX.</p>;
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between px-0.5 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {`Theo KTX (${items.length})`}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Trống</span>
      </div>
      <ul className="max-h-44 space-y-1 overflow-y-auto pr-1" aria-label="Tỷ lệ lấp đầy theo từng KTX">
        {items.map(item => {
          const pct = Math.round(item.fillRate * 100);
          const tone = getFillTone(item.fillRate);
          const isActive = selectedKtx === item.ktx;
          return (
            <li key={item.ktx}>
              <button
                type="button"
                onClick={() => onSelectKtx?.(isActive ? 'all' : item.ktx)}
                aria-pressed={isActive}
                title={`${item.ktx}: ${item.occupied}/${item.capacity} chỗ · ${item.rooms} phòng${item.overflow > 0 ? ` · vượt ${item.overflow}` : ''}`}
                className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive ? 'border-primary/40 bg-primary/5' : 'border-transparent bg-muted/50 hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-foreground">{item.ktx}</span>
                  <div className="flex items-center gap-2 font-tabular">
                    <span className={`text-[11px] font-semibold ${tone.text}`}>{pct}%</span>
                    <span className="min-w-[2.5rem] text-right text-xs font-bold text-foreground">
                      {item.vacant.toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                  <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground font-tabular">
                  {`${item.occupied.toLocaleString('vi-VN')}/${item.capacity.toLocaleString('vi-VN')} chỗ · ${item.rooms} phòng`}
                  {item.overflow > 0 && <span className="font-semibold text-red-600">{` · vượt ${item.overflow}`}</span>}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
