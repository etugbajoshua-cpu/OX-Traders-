import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  currency?: 'BTC' | 'USDT';
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 200,
  currency = 'BTC',
  className = ''
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size * 2, // 2x for sharp retina rendering
      margin: 1.5,
      color: {
        dark: '#070A10', // Deep dark navy
        light: '#FFFFFF' // Clean white background for optical contrast
      },
      errorCorrectionLevel: 'H' // High error correction allows center branding
    })
      .then((url) => {
        setDataUrl(url);
        setError('');
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
        setError('Failed to generate QR code');
      });
  }, [value, size]);

  return (
    <div className={`relative flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl shadow-xl border-4 border-slate-800/80 group ${className}`}>
      {dataUrl ? (
        <div className="relative">
          <img
            src={dataUrl}
            alt={`${currency} Deposit Address QR Code`}
            style={{ width: size, height: size }}
            className="rounded-lg object-contain"
          />
          {/* Subtle center watermark/badge */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-md border-2 border-white ${
              currency === 'BTC' ? 'bg-[#F7931A]' : 'bg-[#26A17B]'
            }`}>
              {currency === 'BTC' ? '₿' : '₮'}
            </div>
          </div>
        </div>
      ) : error ? (
        <div style={{ width: size, height: size }} className="flex items-center justify-center text-xs text-rose-500">
          {error}
        </div>
      ) : (
        <div style={{ width: size, height: size }} className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
