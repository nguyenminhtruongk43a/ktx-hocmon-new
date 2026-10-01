'use client';
import React from 'react';
import { Building2, Layers } from 'lucide-react';
import { ALL_KTX, useKtxScope } from '@/context/KtxScopeContext';
import { useWorkers } from '@/context/WorkerContext';

export default function GlobalKtxSwitcher() {
  const { scope, setScope, ktxList } = useKtxScope();
  const { workers, loading } = useWorkers();

  const options = [{ ktx: ALL_KTX, label: 'Toàn hệ thống', count: workers.length }, ...ktxList.map(k => ({ ...k, label: k.ktx }))];

  return (
    <div className="sticky top-14 lg:top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 lg:px-8 h-12 max-w-screen-2xl mx-auto">
        <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
          <Layers size={14} aria-hidden="true" />
          Phạm vi
        </span>
        <div
          role="radiogroup"
          aria-label="Chọn khu ký túc xá"
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin flex-1 min-w-0 py-1"
        >
          {loading && ktxList.length === 0 ? (
            <span className="text-xs text-muted-foreground">Đang tải danh sách KTX...</span>
          ) : (
            options.map(opt => {
              const active = scope === opt.ktx;
              return (
                <button
                  key={opt.ktx}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setScope(opt.ktx)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted'
                  }`}
                >
                  {opt.ktx !== ALL_KTX && <Building2 size={12} aria-hidden="true" />}
                  {opt.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold font-tabular leading-none ${
                      active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {opt.count.toLocaleString('vi-VN')}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
