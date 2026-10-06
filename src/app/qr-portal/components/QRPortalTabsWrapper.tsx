'use client';

import React, { useState, useEffect } from 'react';
import QRPortalClient from './QRPortalClient';
import AttendancePortalClient from './AttendancePortalClient';
import CheckoutPortalClient from './CheckoutPortalClient';
import CheckoutApprovalPanel from './CheckoutApprovalPanel';
import { createClient } from '@/lib/supabase/client';
import { QrCode, ClipboardList, LogOut, UserCheck } from 'lucide-react';

export default function QRPortalTabsWrapper() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'registration' | 'checkout_approval' | 'checkout'>('attendance');
  const [pendingCheckoutCount, setPendingCheckoutCount] = useState<number>(0);

  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
    const fetchPendingCount = async () => {
      try {
        const { data } = await supabase
          .from('worker_registrations')
          .select('id, status, ghi_chu')
          .eq('status', 'pending');

        if (data) {
          const count = data.filter(r => r.ghi_chu?.startsWith('[CHECKOUT]')).length;
          setPendingCheckoutCount(count);
        }
      } catch (e) {
        // non-blocking
      }
    };
    fetchPendingCount();
  }, [supabase]);

  // Prevent React Hydration Mismatch by rendering matching skeleton until client mount
  if (!isMounted) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" suppressHydrationWarning>
        <div className="flex gap-2 mx-4 md:mx-6 mt-4 md:mt-6 animate-pulse">
          <div className="w-32 h-9 bg-muted rounded-lg" />
          <div className="w-32 h-9 bg-muted rounded-lg" />
          <div className="w-36 h-9 bg-muted rounded-lg" />
          <div className="w-36 h-9 bg-muted rounded-lg" />
        </div>
        <div className="h-72 bg-card border border-border/60 rounded-2xl mx-4 md:mx-6 animate-pulse" />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning>
      {/* Top-level tab switcher */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit mx-4 md:mx-6 mt-4 md:mt-6 overflow-x-auto max-w-full">
        {[
          { key: 'attendance', label: 'QR Điểm Danh', icon: <ClipboardList size={15} /> },
          { key: 'registration', label: 'Đăng ký cư trú', icon: <QrCode size={15} /> },
          {
            key: 'checkout_approval',
            label: 'Duyệt Check-out',
            icon: <UserCheck size={15} />,
            badge: pendingCheckoutCount,
          },
          { key: 'checkout', label: 'Mã QR Check-out', icon: <LogOut size={15} /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === t.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-extrabold bg-rose-600 text-white animate-pulse">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'attendance' && <AttendancePortalClient />}
      {activeTab === 'registration' && <QRPortalClient />}
      {activeTab === 'checkout_approval' && (
        <CheckoutApprovalPanel onCountChange={setPendingCheckoutCount} />
      )}
      {activeTab === 'checkout' && <CheckoutPortalClient />}
    </div>
  );
}
