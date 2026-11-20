import React from 'react';

interface LogoProps {
  variant?: 'default' | 'white' | 'dark' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'default',
  size = 'md',
  showSubtitle = false,
  className = ''
}) => {
  const sizeMap = {
    sm: { icon: 30, text: 'text-base sm:text-lg', gap: 'gap-2.5' },
    md: { icon: 38, text: 'text-lg sm:text-xl', gap: 'gap-3' },
    lg: { icon: 48, text: 'text-xl sm:text-2xl', gap: 'gap-3.5' },
    xl: { icon: 60, text: 'text-2xl sm:text-3xl', gap: 'gap-4' }
  };

  const currentSize = sizeMap[size];

  // Premier Binance-Style Geometric "OX" Diamond Monogram
  const LogoIcon = (
    <div
      style={{ width: currentSize.icon, height: currentSize.icon }}
      className="relative flex items-center justify-center shrink-0 rounded-xl bg-[#181A20] border border-[#2B313A] shadow-md p-1 overflow-hidden select-none group transition-transform duration-200 hover:scale-105"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-[0_2px_6px_rgba(240,185,11,0.3)]"
      >
        <defs>
          {/* Binance Gold Gradient */}
          <linearGradient id="binanceGoldPrime" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF099" />
            <stop offset="30%" stopColor="#FCD535" />
            <stop offset="70%" stopColor="#F0B90B" />
            <stop offset="100%" stopColor="#D49B00" />
          </linearGradient>

          {/* Polished Platinum Accent */}
          <linearGradient id="binancePlatinum" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#EAECEF" />
            <stop offset="100%" stopColor="#A0A9B8" />
          </linearGradient>
        </defs>

        {/* Outer Geometric Diamond Ring (O-Shape) */}
        <polygon
          points="50,6 94,50 50,94 6,50"
          fill="none"
          stroke="url(#binanceGoldPrime)"
          strokeWidth="6.5"
          strokeLinejoin="round"
        />

        {/* Left Geometric Facet ("O" Arc) */}
        <path
          d="M50,18 L24,44 L24,56 L50,82 L50,70 L34,54 L34,46 L50,30 Z"
          fill="url(#binanceGoldPrime)"
        />

        {/* Right Interlocking Geometric "X" Wing 1 */}
        <polygon
          points="50,22 62,34 78,18 66,6"
          fill="url(#binancePlatinum)"
        />

        {/* Right Interlocking Geometric "X" Wing 2 */}
        <polygon
          points="50,78 62,66 78,82 66,94"
          fill="url(#binancePlatinum)"
        />

        {/* Center Interlocking Cross Core (The "X" Intersect) */}
        <polygon
          points="50,36 64,50 50,64 36,50"
          fill="url(#binanceGoldPrime)"
        />

        {/* Dynamic Right Arrow / Growth Fin (completing the X) */}
        <polygon
          points="68,42 76,50 68,58 76,50 88,38 80,30"
          fill="url(#binanceGoldPrime)"
        />
        <polygon
          points="68,58 76,50 68,42 76,50 88,62 80,70"
          fill="url(#binanceGoldPrime)"
        />

        {/* Center Luminous Precision Spark */}
        <circle cx="50" cy="50" r="3" fill="#FFFFFF" />
      </svg>
    </div>
  );

  if (variant === 'icon') {
    return LogoIcon;
  }

  return (
    <div className={`flex items-center ${currentSize.gap} ${className}`}>
      {LogoIcon}
      <div className="flex flex-col justify-center select-none text-left">
        <div className="flex items-center tracking-tight leading-none">
          <span className={`font-black text-white ${currentSize.text} tracking-tight`}>
            OX
          </span>
          <span className={`ml-1.5 font-extrabold text-[#F0B90B] tracking-wider ${currentSize.text}`}>
            TRADERS
          </span>
        </div>
        {showSubtitle && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#848E9C]">
              Exchange & Invest
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
