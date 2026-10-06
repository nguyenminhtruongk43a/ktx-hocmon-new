'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Printer,
  ExternalLink,
  Copy,
  Check,
  LogOut,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
  FileCheck2,
  ClipboardList,
} from 'lucide-react';

export default function CheckoutPortalClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('/checkout');
  const [copied, setCopied] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      setCheckoutUrl(`${window.location.origin}/checkout`);
    }
  }, []);

  if (!isMounted) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-pulse" suppressHydrationWarning>
        <div className="h-6 w-60 bg-muted rounded" />
        <div className="h-72 bg-card border border-border/60 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 bg-card border border-border/60 rounded-xl" />
          <div className="h-28 bg-card border border-border/60 rounded-xl" />
          <div className="h-28 bg-card border border-border/60 rounded-xl" />
          <div className="h-28 bg-card border border-border/60 rounded-xl" />
        </div>
      </div>
    );
  }

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    checkoutUrl
  )}&margin=10&color=991b1b&bgcolor=ffffff`;
  const qrLargeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
    checkoutUrl
  )}&margin=20&color=991b1b&bgcolor=ffffff`;

  const handleDownload = async () => {
    try {
      const response = await fetch(qrLargeUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'qr-check-out-ktx.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(qrLargeUrl, '_blank');
    }
  };

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 300);
  };

  const handleCopyLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Print Overlay */}
      {showPrintView && (
        <div
          className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-8 print:block text-black"
          id="print-area"
        >
          <div className="text-center space-y-4 max-w-md mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full font-bold text-sm">
              <LogOut size={16} /> THỦ TỤC TRẢ PHÒNG KTX
            </div>
            <h2 className="text-2xl font-bold text-gray-900 uppercase">
              Mã QR Khai Báo Check-Out KTX
            </h2>
            <p className="text-gray-600 text-sm">
              Công nhân quét mã QR bên dưới bằng Camera điện thoại hoặc Zalo để thực hiện thủ tục bàn giao phòng và dọn ra.
            </p>
            <div className="p-4 bg-white border-4 border-red-500 rounded-2xl inline-block shadow-lg">
              <img
                src={qrLargeUrl}
                alt="QR Code Check-out KTX"
                className="w-64 h-64 mx-auto"
              />
            </div>
            <p className="text-xs text-gray-500 font-mono break-all max-w-xs mx-auto">
              {checkoutUrl}
            </p>
            <div className="text-xs text-gray-500 border-t pt-3">
              Ban Quản Lý Ký Túc Xá • Vui lòng bàn giao chìa khóa cho Quản lý / Bảo vệ trước khi rời khỏi
            </div>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-1.5">
            <LogOut size={13} />
            <span>Thủ tục trả phòng & dọn ra</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Cổng QR Check-out KTX (Dọn Ra)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tạo và chia sẻ mã QR chuyên biệt cho công nhân thực hiện bàn giao phòng và hoàn tất thủ tục dọn ra khỏi KTX.
          </p>
        </div>
      </div>

      {/* Main QR Card */}
      <div className="bg-gradient-to-br from-rose-500/5 via-card to-amber-500/5 dark:from-rose-950/20 dark:via-card dark:to-muted/30 border border-rose-500/20 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center gap-6 md:gap-8">
          {/* QR Box & Action Buttons */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3.5">
            <div className="bg-white rounded-2xl border-2 border-rose-500/30 p-3.5 shadow-xl transition-transform hover:scale-[1.02]">
              <img
                src={qrApiUrl}
                alt="Mã QR Check-out KTX"
                width={200}
                height={200}
                className="w-48 h-48 sm:w-52 sm:h-52 rounded-lg object-contain"
              />
            </div>
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>Tải xuống</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 border border-border bg-card hover:bg-muted text-foreground rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Printer size={14} />
                <span>In ấn</span>
              </button>
            </div>
          </div>

          {/* Description & Link Details */}
          <div className="flex-1 text-center lg:text-left space-y-4 w-full">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 mb-1.5">
                MÃ QR TRẢ PHÒNG CHÍNH THỨC
              </div>
              <h2 className="font-bold text-foreground text-xl md:text-2xl">
                Mã QR Khai Báo Check-out KTX
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                In và dán mã QR này tại các bảng tin, cửa ra vào từng KTX hoặc quầy bảo vệ trực để công nhân chủ động quét mã khai báo bàn giao cơ sở vật chất, trả phòng và hoàn tất thủ tục dọn ra.
              </p>
            </div>

            {/* URL Box */}
            <div className="bg-background/80 dark:bg-muted/40 rounded-xl border border-border p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <span className="font-semibold text-muted-foreground">Đường dẫn Check-out:</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Sao chép link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted/80 dark:bg-muted px-3 py-1.5 rounded-lg font-mono text-foreground break-all flex-1 border border-border/60 select-all">
                  {checkoutUrl}
                </code>
              </div>

              <div className="pt-1 flex items-center gap-3">
                <a
                  href="/checkout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                >
                  <ExternalLink size={13} /> Mở trang check-out để xem thử giao diện
                </a>
              </div>
            </div>

            {/* Feature Badges */}
            <div className="flex flex-wrap gap-2 pt-1 text-xs font-medium">
              <span className="flex items-center gap-1.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                <CheckCircle2 size={13} /> Khai báo 24/7 trực tuyến
              </span>
              <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                <ShieldCheck size={13} /> Bàn giao chìa khóa & nệm
              </span>
              <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                <Building2 size={13} /> Tự động ghi nhận ngày rời KTX
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step Guide Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            step: 'Bước 1',
            title: 'Quét mã QR',
            desc: 'Công nhân dùng Camera điện thoại hoặc Zalo để quét mã QR dán tại KTX.',
            icon: <ClipboardList className="text-rose-500" size={20} />,
          },
          {
            step: 'Bước 2',
            title: 'Điền thông tin',
            desc: 'Nhập Mã NV / Họ tên, xác nhận số phòng và dãy nhà đang lưu trú.',
            icon: <FileCheck2 className="text-amber-500" size={20} />,
          },
          {
            step: 'Bước 3',
            title: 'Bàn giao tài sản',
            desc: 'Kiểm tra tài sản giường nệm, thiết bị và nộp lại chìa khóa phòng.',
            icon: <KeyRound className="text-blue-500" size={20} />,
          },
          {
            step: 'Bước 4',
            title: 'Xác nhận hoàn tất',
            desc: 'Ban Quản trị / Bảo vệ kiểm tra xác nhận, hệ thống giải phóng chỗ trống.',
            icon: <CheckCircle2 className="text-emerald-500" size={20} />,
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-card border border-border rounded-xl p-4 space-y-2 hover:border-primary/40 transition-colors shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {item.step}
              </span>
              <div className="p-2 rounded-lg bg-muted/60">{item.icon}</div>
            </div>
            <h3 className="font-bold text-foreground text-sm">{item.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Notice Card for Dormitory Managers */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-foreground">
        <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
            Lưu ý nghiệp vụ dành cho Quản lý & Bảo vệ KTX
          </h4>
          <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
            Trước khi công nhân dọn ra, bộ phận trực KTX cần đối chiếu danh mục tài sản đã bàn giao trong trang Quản Lý Cơ Sở Vật Chất (phòng, giường, nệm, remote điều hòa, quạt). Khi đã bàn giao đầy đủ, công nhân quét mã QR để ghi nhận ngày rời KTX chính thức.
          </p>
        </div>
      </div>
    </div>
  );
}
