'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QrDisplayProps {
  paymentUri: string;
  size?: number;
}

export function QrDisplay({ paymentUri, size = 220 }: QrDisplayProps) {
  const truncatedUri =
    paymentUri.length > 42
      ? `${paymentUri.slice(0, 20)}...${paymentUri.slice(-18)}`
      : paymentUri;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <QRCodeSVG
          value={paymentUri}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#0f172a"
        />
      </div>
      <span className="max-w-[260px] break-all text-center text-xs text-muted font-mono">
        {truncatedUri}
      </span>
    </div>
  );
}
