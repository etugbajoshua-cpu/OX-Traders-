import React, { useEffect, useState } from 'react';
import { Logo } from './Logo.tsx';

interface LoadingScreenProps {
  message?: string;
  subtext?: string;
  fullscreen?: boolean;
}

interface PageTransitionLoaderProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  transitionKey?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Connecting to OX TRADERS...',
  subtext = 'Synchronizing oxtraders.online trading nodes',
  fullscreen = true
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center max-w-xs sm:max-w-sm mx-auto select-none">
      {/* Geometric Diamond Orbital Constellation */}
      <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
        <div className="absolute inset-0 bg-[#F0B90B]/15 rounded-full blur-xl" />

        {/* Rotating Outer Precision Ring */}
        <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full ox-orb-spin">
          <circle cx="40" cy="40" r="35" fill="none" stroke="#2B313A" strokeWidth="1.5" />
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            stroke="#F0B90B"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="65 160"
          />
        </svg>

        {/* 4 Interlocking Diamond Rhombus Constellation */}
        <div className="relative w-10 h-10">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-[#F0B90B] rounded-[2px] animate-diamond-pulse"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="absolute top-1/2 right-0 -translate-y-1/2 w-3.5 h-3.5 bg-[#FCD535] rounded-[2px] animate-diamond-pulse"
            style={{ animationDelay: '180ms' }}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-[#F0B90B] rounded-[2px] animate-diamond-pulse"
            style={{ animationDelay: '360ms' }}
          />
          <div
            className="absolute top-1/2 left-0 -translate-y-1/2 w-3.5 h-3.5 bg-[#FFFFFF] rounded-[2px] animate-diamond-pulse"
            style={{ animationDelay: '540ms' }}
          />
          <div className="absolute inset-0 m-auto w-2 h-2 bg-[#F0B90B] rotate-45 rounded-[1px]" />
        </div>
      </div>

      <div className="mb-4">
        <Logo variant="default" size="md" showSubtitle={false} />
      </div>

      {/* Laser Sweep Progress Line */}
      <div className="w-52 h-1 bg-[#1E2329] rounded-full overflow-hidden mb-3 relative border border-[#2B313A]">
        <div className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent animate-laser-sweep" />
      </div>

      <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide mb-1">{message}</h3>
      <p className="text-[11px] text-[#848E9C] font-mono">{subtext}</p>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0E11]/98 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return <div className="py-20 flex items-center justify-center w-full">{content}</div>;
};

/* Signature Unique Page-Click Kinetic Vault Transition */
export const PageTransitionLoader: React.FC<PageTransitionLoaderProps> = ({
  visible,
  title = 'Loading Workspace',
  subtitle = 'oxtraders.online',
  transitionKey = 0
}) => {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    if (!visible) {
      setStageIdx(0);
      return;
    }
    const t1 = window.setTimeout(() => setStageIdx(1), 150);
    const t2 = window.setTimeout(() => setStageIdx(2), 300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [visible, transitionKey]);

  if (!visible) return null;

  const stageSteps = ['Routing Channel', 'Syncing Desk', 'Ready'];
  const pctLabels = ['36%', '78%', '100%'];

  return (
    <div
      key={transitionKey}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0B0E11]/90 backdrop-blur-lg select-none"
      role="status"
      aria-live="polite"
      aria-label={`Loading ${title}`}
    >
      {/* Top Edge Gold Precision Laser Beam */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-[#1E2329] overflow-hidden">
        <div className="h-full w-full bg-gradient-to-r from-[#D49B00] via-[#F0B90B] to-[#FFFFFF] ox-progress-fill" />
      </div>

      {/* Subtle Radial Binance Aura */}
      <div className="absolute w-72 h-72 rounded-full bg-[#F0B90B]/10 blur-[90px] pointer-events-none" />

      {/* Center Obsidian Vault Console */}
      <div className="ox-reveal-in relative flex flex-col items-center text-center px-7 py-7 rounded-2xl bg-[#181A20]/96 border border-[#2B313A] shadow-2xl min-w-[276px] max-w-xs overflow-hidden">
        {/* Corner Precision Reticle Ticks */}
        <span className="absolute top-2.5 left-2.5 w-2.5 h-2.5 border-t-2 border-l-2 border-[#F0B90B]/60 rounded-tl-[2px]" />
        <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 border-t-2 border-r-2 border-[#F0B90B]/60 rounded-tr-[2px]" />
        <span className="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 border-b-2 border-l-2 border-[#F0B90B]/60 rounded-bl-[2px]" />
        <span className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 border-b-2 border-r-2 border-[#F0B90B]/60 rounded-br-[2px]" />

        {/* 3-Layer Orbital + Diamond Constellation */}
        <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
          {/* Outer Clockwise Segmented Orbit */}
          <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full ox-orb-spin">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#2B313A" strokeWidth="1.5" strokeDasharray="3 5" />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#F0B90B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="62 175"
            />
          </svg>

          {/* Middle Counter-Rotating Platinum Arc */}
          <svg viewBox="0 0 64 64" className="absolute inset-2 w-16 h-16 ox-orb-counter-spin">
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="#EAECEF"
              strokeOpacity="0.5"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="28 140"
            />
          </svg>

          {/* Inner 4-Diamond Constellation + Core */}
          <div className="relative w-8 h-8">
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#F0B90B] rounded-[1.5px] animate-diamond-pulse"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="absolute top-1/2 right-0 -translate-y-1/2 w-2.5 h-2.5 bg-[#FCD535] rounded-[1.5px] animate-diamond-pulse"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#F0B90B] rounded-[1.5px] animate-diamond-pulse"
              style={{ animationDelay: '300ms' }}
            />
            <div
              className="absolute top-1/2 left-0 -translate-y-1/2 w-2.5 h-2.5 bg-[#FFFFFF] rounded-[1.5px] animate-diamond-pulse"
              style={{ animationDelay: '450ms' }}
            />
            <div className="absolute inset-0 m-auto w-2 h-2 bg-[#F0B90B] rotate-45 rounded-[1px]" />
          </div>
        </div>

        <div className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[#F0B90B] mb-1">
          {subtitle}
        </div>
        <div className="text-sm font-extrabold text-white tracking-tight mb-3">
          {title}
        </div>

        {/* Sweep Progress Bar */}
        <div className="w-48 h-1.5 rounded-full bg-[#1E2329] border border-[#2B313A] overflow-hidden relative mb-2.5">
          <div className="h-full w-full bg-gradient-to-r from-[#F0B90B] via-[#FCD535] to-[#FFFFFF] ox-progress-fill" />
        </div>

        {/* Kinetic Stage Readout */}
        <div className="w-48 flex items-center justify-between text-[10px] font-mono tabular-nums text-[#848E9C]">
          <span className="text-[#EAECEF]">{stageSteps[stageIdx]}</span>
          <span className="text-[#F0B90B] font-bold">{pctLabels[stageIdx]}</span>
        </div>
      </div>
    </div>
  );
};
