import React from 'react';
import { Logo } from './Logo.tsx';

interface LoadingScreenProps {
  message?: string;
  subtext?: string;
  fullscreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Connecting to OX TRADERS...',
  subtext = 'Synchronizing real-time market data',
  fullscreen = true
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center max-w-xs sm:max-w-sm mx-auto select-none">
      {/* Binance Geometric Diamond Quad Loader */}
      <div className="relative w-16 h-16 mb-5 flex items-center justify-center">
        {/* Ambient Gold Glow Aura */}
        <div className="absolute inset-0 bg-[#F0B90B]/15 rounded-full blur-xl animate-pulse" />

        {/* 4 Interlocking Diamond Rhombus Constellation */}
        <div className="relative w-12 h-12">
          {/* Top Diamond */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#F0B90B] rotate-45 rounded-[2px] shadow-[0_0_10px_rgba(240,185,11,0.6)] animate-diamond-pulse"
            style={{ animationDelay: '0ms' }}
          />
          {/* Right Diamond */}
          <div
            className="absolute top-1/2 right-0 -translate-y-1/2 w-4 h-4 bg-[#FCD535] rotate-45 rounded-[2px] shadow-[0_0_10px_rgba(252,213,53,0.6)] animate-diamond-pulse"
            style={{ animationDelay: '180ms' }}
          />
          {/* Bottom Diamond */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#F0B90B] rotate-45 rounded-[2px] shadow-[0_0_10px_rgba(240,185,11,0.6)] animate-diamond-pulse"
            style={{ animationDelay: '360ms' }}
          />
          {/* Left Diamond */}
          <div
            className="absolute top-1/2 left-0 -translate-y-1/2 w-4 h-4 bg-[#FFFFFF] rotate-45 rounded-[2px] shadow-[0_0_10px_rgba(255,255,255,0.6)] animate-diamond-pulse"
            style={{ animationDelay: '540ms' }}
          />
          {/* Center Micro Spark */}
          <div className="absolute inset-0 m-auto w-2 h-2 bg-[#F0B90B] rotate-45 rounded-[1px] animate-ping" />
        </div>
      </div>

      {/* Brand Logo Display */}
      <div className="mb-4">
        <Logo variant="default" size="md" showSubtitle={false} />
      </div>

      {/* Binance-Style Laser Sweep Progress Line */}
      <div className="w-48 h-1 bg-[#1E2329] rounded-full overflow-hidden mb-3 relative border border-[#2B313A]">
        <div className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent animate-laser-sweep" />
      </div>

      {/* Status Messages */}
      <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide mb-1">
        {message}
      </h3>
      <p className="text-[11px] text-[#848E9C] font-mono">
        {subtext}
      </p>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0E11]/98 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return (
    <div className="py-20 flex items-center justify-center w-full">
      {content}
    </div>
  );
};
